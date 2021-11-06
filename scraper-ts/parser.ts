import {CollectionItem, BookItem, CommentItem } from './types';
import * as cheerio from "cheerio";

import * as request from 'request-promise-native';
import * as moment from 'moment';
moment.locale("ru");

async function loadPage(url: string): Promise<CheerioStatic> {
    const body = await request(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0' } });
    return cheerio.load(body);  
}

async function getCollectList(url): Promise<{ collections: CollectionItem[], pages: number }> {
    const $ = await loadPage(url);
    const paging_description = $("div.paging-description");
    const pagesTxt = paging_description.children("b").eq(1).text();
    const pages = parseFloat(pagesTxt);
    const list = $("div.collection-thumb"); //collection-thumb js-item-wrapper
    const results: CollectionItem[] = [];
    if (list.length <= 0) {
        console.log("Ошибка загрузки списка коллекций")
    }
    for (var i = 1; i <= list.length; i++) {
        var item = list.eq(i);
        var result: CollectionItem = new CollectionItem();
        var info = item.children("div.collection-thumb-info");
        result.name = info.children("a").text();
        if (!result.name) {
            console.log("Ошибка загрузки названия коллекции "+i+". Коллекция пропущена");
            console.log(info.text());
            continue;
        }
        result.url = info.children("a").attr("href");
        result.id = parseFloat(result.url.match(/(\d+)/)[1]);
        if (!result.id) {
            console.log("Ошибка загрузки id коллекции. Коллекция пропущена")
        }
        const p = item.children("div.collection-thumb-info").contents();
        p.each(function(i, tag) {
            if (typeof tag.nodeValue === "string") {
                const re = tag.nodeValue.match(/\((\d+)\)/);
                if (Array.isArray(re)) {
                    result.cnt = parseFloat(re[1]);
                    return false;
                }
            }
        });
        result.authorName = item.children("div.collection-thumb-author").children("a").text();
        result.authorUrl = item.children("div.collection-thumb-author").children("a").attr("href");
        result.authorId = parseFloat(result.authorUrl.match(/(\d+)/)[1]);
        if (!(result.authorId > 0)) {
            console.error(`Не распознан ид автора из урла ${result.authorUrl}`);
        }
        results.push(result);
    }
    return { collections: results, pages: pages };
}

async function getCollectDataPage(url): Promise<BookItem[]> {

    const body = await request(url,{headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0' }});
    const $ = cheerio.load(body, { decodeEntities: false });
    const results: BookItem[] = [];
    const list = $("div.js-item-wrapper");
    for (let tag = list.first(); tag.length > 0; tag = tag.next()) {
        const item = tag.find("div.description");
        const result: BookItem = new BookItem;
        result.name = item.children("h3").children("a").text();
        result.url = item.children("h3").children("a").attr("href");
        if (!result.url) {
            continue;
        }
        result.id = parseFloat(result.url.match(/(\d+)/)[1]);
        if (Number.isNaN(result.id)) {
            console.log(result);
            continue;
        }
        const authorA = item.children("div.authors-list").children("span.author").children("a").first();
        result.authorName = authorA.text().trim().replace(/\n/g, "");
        result.authorUrl = authorA.attr("href");
        result.authorId = parseFloat(result.authorUrl.match(/(\d+)/)[1]);
        result.card = tag.html();
        var x = tag.find("dl.info").children();
        for (let item = x.first(); item.length > 0; item = item.next()) {
            if (item.text().trim() === "Рейтинг:") {
                result.rating = item.next().text().trim();
            }
            if (item.text().trim() === "Размер:") {
                var v = item.next().text().match(/\s(\d+) страниц\w*\s*,\s*(\d+) част/m);
                if (v != undefined && v.length>=2) {
                    result.pages = Number.parseInt(v[1]);
                    result.chapters = Number.parseInt(v[2]);
                }
            }
        }
        results.push(result);
    }
    return results;
}

async function getCommentList(url: string) {
    const body = await request(url, {headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:69.0) Gecko/20100101 Firefox/69.0' }});
    const $ = cheerio.load(body, { decodeEntities: false });
    //Получаем кол-во страниц комментариев
    var s1 = $("li.text > b:nth-child(2)").text();
    var commentPagesCount = Number.parseFloat(s1);


    const list = $("article.post"); //collection-thumb js-item-wrapper
    const results: CommentItem[] = [];

    for (let tag = list.first(); tag.length > 0; tag = tag.next()) {
        const item = tag;
        //console.log(item.html());
        const result: CommentItem = new CommentItem;
        result.authorName = item.find("a.comment_author").text();
        if (!result.authorName) {
            continue;
        }
        result.authorAvatar = item.find("div.avatar-decoration-holder").children("div").children("a").children("img").attr("src");
        result.authorUrl = item.find("div.avatar-decoration-holder").children("div").children("a").attr("href");

        result.authorId = parseFloat(result.authorUrl.match(/(\d+)/)[1]);
        result.commentDate = moment(item.find("time").text().trim(), 'D MMMM YYYY, HH:mm').toDate();
        if (isNaN(result.commentDate.getTime())) {
            console.log(result);
            result.commentDate = undefined;
        }
        result.chapterLink = item.find("div.comment_link_to_fic").children("a").attr("href");
        result.bookName = item.find("div.comment_link_to_fic").children("a").text();
        var m: RegExpMatchArray = result.chapterLink.match("/(\\d+)/(\\d+)/?\\?show_comments=1#com(\\d+)");
        if (m) {
            result.bookId = parseFloat(m[1]);
            result.chapterId = parseFloat(m[2]);
            result.commentId = parseFloat(m[3]);
        } else {
            m = result.chapterLink.match("/(\\d+)/?\\?show_comments=1#com(\\d+)");
            if (m) {
                result.bookId = parseFloat(m[1]);
                result.commentId = parseFloat(m[2]);
            } else {
                // /requests/185747#com34602298
                m = result.chapterLink.match("/requests/(\\d+)#com(\\d+)");
                if (m) {
                    result.requestId = parseFloat(m[1]);
                    result.commentId = parseFloat(m[2]);
                }
            }
        }
        if (!result.bookId && !result.requestId) {
            console.log(result);
            continue;
        }
        if (Number.isNaN(result.authorId)) {
            console.log(result);
            continue;
        }

        result.text = tag.html();
        result.thumbUpCount = item.find("div.quote_link").children("span").text();

        results.push(result);
    }
    return {
        commentPagesCount: commentPagesCount,
        comments: results
    };
}

export { getCollectList, getCollectDataPage, getCommentList}
