/*
 * GET home page.
 */
import * as express from 'express';
const router = express.Router();

import { Storage } from '../../scraper-ts/storage-postgres';
const storage = new Storage();

async function getSimilarBooksCards(bookId: number): Promise<any> {
    await storage.initDb();
    var cards: string[] = await storage.getSimilarBooks(bookId);
    return cards;
    //console.log(cards.length);
    //var result = '<section class="fanfic-thumb-block" >' + cards.join('</section><section class="fanfic-thumb-block">') +'</section>';
    //return result;
}

router.get('/', (req: express.Request, res: express.Response) => {
    console.log(req.query);
    var books = getSimilarBooksCards(req.query.bookId);
    books.then((books) => {
        //console.log('test2');
        //console.log(books.length);
        res.render('ficbook-recommend', { books: books });
    });
});

export default router;