import * as Tress from 'tress';

const tress =require('tress');

import * as async from 'async';

import { Storage } from './storage-postgres';
import { getCollectList, getCommentList, getCollectDataPage } from './parser';

import * as minimist from 'minimist';

import {CollectionItem} from './types';
import {LogItem} from './types';

const cmdLineParams = minimist(process.argv.slice(2));

const storage = new Storage();

var rootBookId: number;

enum jobType {
    connect = 'connect',
    getCollectList = 'getCollectList',
    getCollectDataPage = 'getCollectDataPage',
    getCommentPage = 'getCommentPage',
    getCommentPageOther = 'getCommentPageOther',
    loadAuthorComments = 'loadAuthorComments',
    getGenreDataPage = 'getGenreDataPage'
}

class tjob {
    type: jobType;
    url?: string;
    id?: number;
    bookId?: number;
    page?: number;
    authorId?: number;
    item?: CollectionItem;
    loadCollectionOnly?: boolean;
}

class Counter {
    private cnt: number;
    private func: Function;

    constructor(initValue: number, func: Function) {
        this.cnt = initValue;
        this.func = func;
    }

    public dec(): void {
        this.cnt = this.cnt - 1;
        if (this.cnt <= 0) {
            this.func();
        }
    }
}

const counters: { [index: string]: Counter; } = {};

async function getCollectListJob(job: tjob): Promise<void> {
    var logItem: LogItem = new LogItem();
    if (!job.url) {
        if (!job.page) {
            job.url = `https://ficbook.net/collections/${job.id}/list`;
        } else {
            job.url = `https://ficbook.net/collections/${job.id}/list?p=${job.page}`;
        }
    }

    if (job.loadCollectionOnly && !job.page) {
        let lastCollectionsLoad :Date;
        lastCollectionsLoad = await storage.getLastCollectionsLoad(job.id);
        if (!!lastCollectionsLoad && (Date.now() - lastCollectionsLoad.valueOf()) < (60 * 60 * 24 * 1000 * 3)) {
            console.log('Коллекция уже была загружена '+lastCollectionsLoad.toString());
            return;
        }
    }

    logItem.rootBookId = rootBookId;
    logItem.url = job.url;
    logItem.startTime = new Date();
    var collections: CollectionItem[];
    //var t: any;
    var pages: number;
    try {
        var t = await getCollectList(job.url);
        collections = t.collections;
        pages = t.pages;
        logItem.downloadTime = +(new Date()) - +logItem.startTime;
    } catch (err) {
        if ((err.name === 'StatusCodeError') && (err.statusCode === 404)) {
            console.log(`Книга ${job.id} не найдена на сайте и будет удалена из всех сборников.`);
            await storage.deleteBook(job.id);
        } else {
            console.log(err);
        }
        return;
    };
    if (!job.page) {
        await storage.cleanCollectionsByBook(job.id);
    }
    await storage.collectListToDb(collections, job.id);
    await storage.setLastCollectionsLoad(job.id, new Date());
    if (!job.page) {
        // сгенерить задачи на загрузку страниц
        for (let i = 2; i <= pages; i++) {
            var tmpItem = Object.assign({},job);
            tmpItem.page = i;
            tmpItem.url = undefined;
            queue.push(tmpItem);
        }
    }
    if (job.loadCollectionOnly) {
        return;
    }
    //получаем данные по коллекциям из БД
    collections = await async.mapLimit < CollectionItem,CollectionItem>(collections,5,async function(item) {
            item.cntDb = await storage.getCollectionCount(item.id);
            return item;
        });

    logItem.updateTime = +(new Date()) - +logItem.startTime - logItem.downloadTime;
    //для каждой коллекции:
    await async.eachOfLimit<CollectionItem>(collections, 5,
        async function (item: CollectionItem) {
            // проверить нужно ли ее загружать
            var needLoad = Math.abs((item.cnt / item.cntDb) - 1) > 0.01;
            if (!needLoad) {
                console.log('collection %s (%s) already loaded', item.name, item.id);
            } else {
                // если нужно, то
                // подсчитать кол-во страниц
                item.pages = Math.ceil(item.cnt / 20);
                // зачистить коллекцию в базе
                await storage.clearCollectionData(item.id);
                // сгенерить задачи на загрузку страниц
                for (let i = 1; i <= item.pages; i++) {
                    queue.push({
                        url: `https://ficbook.net${item.url}?p=${i}`,
                        id: item.id,
                        page:i,
                        item: item,
                        type: jobType.getCollectDataPage
                    });
                }
                //параллельно генерить структуру для статистики и подсчета оставшегося времени
                counters['getCollectDataPage_' + item.id] =
                    new Counter(item.pages, () => { console.log('all_done ' + item.id) });
            }
        });
    logItem.parseTime = +(new Date()) - +logItem.startTime - logItem.downloadTime - logItem.updateTime;
    storage.appendLog(logItem);
}

function getCommentsLink(params: tjob): string {
    let url: string;
    if (params.bookId) {
        url = `https://ficbook.net/readfic/${params.bookId}/comments`;
    } else if (params.authorId) {
        url = `https://ficbook.net/authors/${params.authorId}/comments`;
    } else {
        url = params.url;
    }
    if (!url) return '';
    if (params.page) {
        url = url + '?p=' + params.page;
    }
    return url;
}

async function getComments(job: tjob):Promise<void> {
    let url: string = getCommentsLink(job);
    if (!url) {
        console.error('Ошибка распознавания урла');
        console.error(job);
        return;
    }
    //Получаем кол-во комментариев в БД по автору/книге
    let commCount: number;
    if (job.bookId) {
        commCount = await storage.getBookCommentsCount(job.bookId);
    } else {
        commCount = await storage.getAuthorCommentsCount(job.authorId);
    }
    let loadedPages = Math.floor(commCount / 30);
    if (loadedPages < 1) {
        loadedPages = 1;
    }
    job.page = loadedPages;
    url = getCommentsLink(job);
    const collection = await getCommentList(url);

    counters['getCommentPage_' + job.bookId] = new Counter(collection.commentPagesCount - loadedPages - 2,
        () => queue.push({ bookId: job.bookId, type: jobType.loadAuthorComments }));
    for (var i = loadedPages+1; i <= collection.commentPagesCount; i++) {
        queue.push({bookId:job.bookId,authorId:job.authorId,page:i, type: jobType.getCommentPageOther });
    }
    await storage.commentItemsToDb(collection.comments);
    //q.unshift({ result: collection, type: "commentItemsToDb" });
}

async function processJobAsync(job: tjob) {
    if (job.type === 'connect') {
        await storage.initDb();
        if (process.argv[2]) {
            if (cmdLineParams.g) {
                queue.push({ url: cmdLineParams._[0], type: jobType.getGenreDataPage });
            } else {
                var bookId: number = Number.parseInt(cmdLineParams._[0]);
                if (cmdLineParams.x) {
                    var t: number[] = await storage.getSimilarBooks2(bookId);
                    t.forEach(id => queue.push({ id: id, type: jobType.getCollectList, loadCollectionOnly: true }));
                } else {
                    rootBookId = bookId;
                    queue.push({ id: bookId, type: jobType.getCollectList, loadCollectionOnly: cmdLineParams.c });
                    //q.push({ bookId: bookId, type: "getCommentPage" });
                }
            }
        }
    } else if (job.type === 'getCollectList') {
        await getCollectListJob(job);
    } else if (job.type === 'getCollectDataPage') {
        var logItem: LogItem = new LogItem();
        logItem.rootBookId = rootBookId;
        logItem.url = job.url;
        logItem.startTime = new Date();
        const collection = await getCollectDataPage(job.url);
        logItem.downloadTime = +(new Date()) - +logItem.startTime;
        logItem.parseTime = 0;
        if (counters['getCollectDataPage_' + job.id]) {
            counters['getCollectDataPage_' + job.id].dec();
        }
        await storage.collectDataToDbPage(collection, job.item.id);
        logItem.updateTime = +(new Date()) - +logItem.startTime - logItem.downloadTime;
        storage.appendLog(logItem);
    } else if (job.type === 'getCommentPage') {
        await getComments(job);
    } else if (job.type === 'getCommentPageOther') {
        let url: string = getCommentsLink(job);
        if (!url) {
            console.error('Ошибка распознавания урла');
            console.error(job);
            return;
        }
        console.log(url);
        const collection = await getCommentList(url);
        await storage.commentItemsToDb(collection.comments);
        //q.unshift({ result: collection, type: "commentItemsToDb" });
        if (job.bookId) {
            counters['getCommentPage_' + job.bookId].dec();
        }
    } else if (job.type === 'loadAuthorComments') {
        var auths:number[] = await storage.getAllAuthorsCommentedBook(job.bookId);
        auths.forEach(item => queue.push({ authorId:item, type: jobType.getCommentPage }) );
    } else if (job.type === 'getGenreDataPage') {
        const collection = await getCollectDataPage(job.url);
        await storage.collectDataToDbPage(collection);
    } else {
        console.error(`Unhandled job ${job.type}`);
    }
    console.log(job.type +' Осталось %d задач', queue.length());
}

function processJob(job: tjob, done: any): void {
    processJobAsync(job).then(
        function () {
            done(null);
        }
    ).catch(function (err) {
        console.log(job.type);
        console.error(err);
        done(err);
        //throw err;
    });
}

// create a queue object with worker and concurrency
//var queue: Tress.TressStatic = tress(processJob, 3);
var queue: async.AsyncQueue<tjob> = async.queue(processJobAsync, 3);
//= tress(processJob, 3);
queue.drain(function () {
    console.log('db close');
    setTimeout(function () { storage.close().then(() => console.log('All finished')) }, 500);
        //storage.close().then(()=>console.log('All finished'));
    });
/*
queue.drain = async function () {
    console.log('db close');
    await storage.close();
    console.log('All finished');
};
*/
//Запуск приложения
queue.push({ type: jobType.connect });
