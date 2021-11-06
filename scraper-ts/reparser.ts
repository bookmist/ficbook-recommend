import * as Oracle from 'oracledb';
import { asyncForEach, asyncMap } from './utils';
import * as cheerio from 'cheerio';

import * as request from 'request-promise-native';

class Reparser {
    db: any;
    oracle: any;

    async initDb() {
        if (!process.env.PATH.match('c:\\\\app\\\\instantclient_12_2\\\\')) {
            process.env.PATH = 'c:\\app\\instantclient_12_2\\;' + process.env.PATH;
            console.log(process.env.PATH);
        }
        const oracle = require('oracledb');
        this.oracle = oracle;
        oracle.autoCommit = false;
        oracle.fetchAsString = [oracle.CLOB];
        this.db = await oracle.getConnection({
            user: 'ficbook',
            password: 'ficbook',
            connectString: 'roshka_local'
        });
    }

    async getNextBookDescr(): Promise<any> {
        const row: Oracle.Result<any> = await this.db.execute('select idbook, card from BOOKS where rating is null and card is not null');
        if (row.rows.length > 0) {
            return { bookId: row.rows[0][0], card: row.rows[0][1] };
        } 
    }

    async updateBookDescr(bookId: number, rating: string): Promise<void> {
        await this.db.execute('update books set rating=:r where idbook=:i', [rating, bookId]);
        await this.db.commit();

}

    parseDescr(descr: string): any {
        const $ = cheerio.load(descr, { decodeEntities: false });
        var x = $('dl.info').children();
        var rating='';
        for (let item = x.first(); item.length > 0; item = item.next()) {
            //console.log(item.html());
            if (item.text() === 'Рейтинг:') {
                rating = item.next().text();
                break;
            }
        }
        return rating.trim();
    }

    async doWork() {
        await this.initDb();
        console.log('connected');
        var bookDescr: any;
        bookDescr = await this.getNextBookDescr();
        while (bookDescr) {
            console.log(bookDescr.bookId);
            if (bookDescr.card) {
                var rating = this.parseDescr(bookDescr.card);
            }
            if (!rating) {
                return;
            }
            console.log(rating);
            await this.updateBookDescr(bookDescr.bookId, rating);
            bookDescr = await this.getNextBookDescr();
        }
    }
}

var reparser = new Reparser;
reparser.doWork();
