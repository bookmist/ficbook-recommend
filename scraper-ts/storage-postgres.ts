import * as pg from 'pg';
//import * as async from 'async';
import { CollectionItem, BookItem, CommentItem } from './types';
import { asyncForEach, stringToRegExp } from './utils';
import { LogItem } from './types';
//import { promises } from 'fs';

const settings = require('./settings.json');

class OracleExt {
    db: pg.Client;

    async initDb() {
        this.db = new pg.Client(settings.connection_params);
        await this.db.connect();;
        await this.db.query("SELECT pg_catalog.set_config('search_path', 'public', false);");       
    }

    async dbExecList(statement: string, params: Array<Array<any>>): Promise<void> {
        var db = this.db;
        await asyncForEach(params, function (item) {
            //console.log(item);
            return db.query(statement, item).catch
                (function (err) {
                    console.log(err);
                    console.log(statement);
                    console.log(item);
                    process.exit();
                    return null;
                });
        });
    }

    async close() {
        return this.db.end();
    }
}

class Storage extends OracleExt {
    async cleanCollectionsByBook(bookId: number) {
        await this.db.query('delete from books_collections where idbook=$1', [bookId]);
    }

    async collectListToDb(collect: CollectionItem[], bookId?: number) {
        await this.db.query('begin');
        await this.dbExecList(
            'insert into public.authors (idauthor, name) values ($1,$2) ' +
            'on	conflict (idauthor) do update set name = EXCLUDED.name ',
            collect.map(item => ([item.authorId, item.authorName]))
        );

        await this.dbExecList(
            'insert into collections (idcollection , name, idauthor, cnt) values ($1 ,$2, $3, $4) ' +
            'on	conflict (idcollection) do update set name = EXCLUDED.name , idauthor = EXCLUDED.idauthor, cnt=EXCLUDED.cnt',
            collect.map(item => ([item.id, item.name, item.authorId, item.cnt]))
        );
        if (bookId) {
            await this.dbExecList(
                'insert into books_collections (idcollection,idbook) values ($1,$2) on conflict do nothing',
                collect.map(item => ([item.id, bookId]))
            );
        }
        await this.db.query('commit');
    }

    async clearCollectionData(collectId: number) {
        await this.db.query('begin');
        await this.db.query('DELETE FROM books_collections where idcollection = $1', [collectId]);
        await this.db.query('commit');
    }

    async collectDataToDbPage(collect: BookItem[], collectId?: number) {
        await this.db.query('begin');

        await this.dbExecList(
            'insert into authors (idauthor, name) values ($1,$2) ' +
            'on	conflict (idauthor) do update set name = EXCLUDED.name ',
            collect.map(item => ([item.authorId, item.authorName]))
        );

        await this.dbExecList(
            `insert	into public.books (idbook, "name", idauthor, card, rating, inserted, modified)
	values( $1,$2,$3,$4,$5,current_timestamp,current_timestamp) 
     on	conflict (idbook) do update
	set name = EXCLUDED."name",
		idauthor = EXCLUDED.idauthor,
		card = EXCLUDED.card,
		rating = EXCLUDED.rating,
		modified = EXCLUDED.modified`,
            collect.map(item => ([
                item.id,
                item.name,
                item.authorId,
                item.card,
                item.rating
            ]))
        );

        if (collectId) {
            await this.dbExecList(
                'insert into books_collections (idcollection,idbook) values ($1,$2) on conflict do nothing',
                collect.map(item => ([collectId, item.id]))
            );
        }
        await this.db.query('commit');
    }

    async getCollectionCount(idCollection: number): Promise<number> {
        const row: pg.QueryResult = await this.db.query('select count(bc.idbook) as cnt from books_collections bc where bc.idcollection = $1',
            [idCollection]);
        return row.rows[0].cnt;
    }

    async getAuthorCommentsCount(idAuthor: number): Promise<number> {
        const row: pg.QueryResult = await this.db.query('select count(c.comment_id) as cnt from comments c where c.author_id = $1',
            [idAuthor]);
        return row.rows[0].cnt;
    }

    async getBookCommentsCount(idBook: number): Promise<number> {
        const row: pg.QueryResult = await this.db.query('select count(c.comment_id) as cnt from comments c where c.book_id = $1',
            [idBook]);
        return row.rows[0].cnt;
    }

    async commentItemsToDb(comments: CommentItem[]) {
        await this.db.query('begin');
        await this.dbExecList(
            'insert into authors (idauthor, name, avatar) values ($1,$2, $3) ' +
            'on	conflict (idauthor) do update set name = EXCLUDED.name, avatar = EXCLUDED.avatar; '
            , comments.filter(item => item.authorId).map(item => ([item.authorId, item.authorName, item.authorAvatar]))
        );

        await this.dbExecList(
            'insert into books (idbook,name) values (:idbook,:name) ' +
            'on	conflict (idbook) do update set name = EXCLUDED.name;'
            ,
            comments.filter(item => item.bookId).map(item => ([
                item.bookId,
                item.bookName
            ]))
        );
        await this.dbExecList(
            'insert into comments (comment_id, comment_date, author_id, chapter_link, text, thumbup_count, book_id, request_id) values ($1, $2, $3, $4, $5, $6, $7) ' +
            'on	conflict (comment_id) do update set comment_date=EXCLUDED.comment_date, author_id=EXCLUDED.author_id, chapter_link=EXCLUDED.chapter_link, text = EXCLUDED.text, thumbup_count=EXCLUDED.thumbup_count, book_id=EXCLUDED.book_id, request_id=EXCLUDED.request_id;'
            ,
            comments.map(item => ([
                item.commentId,
                item.commentDate,
                item.authorId,
                item.chapterLink,
                item.text,
                item.thumbUpCount,
                item.bookId,
                item.requestId
            ]))
        );

        await this.db.query('commit');
    }

    async getAllAuthorsCommentedBook(bookId: number): Promise<number[]> {
        const exRes: pg.QueryResult = await this.db.query('select distinct c.author_id from COMMENTS c where c.book_id=$1',
            [bookId]);
        return exRes.rows.map(item => item.author_id);
    }

    async deleteBook(bookId: number): Promise<void> {
        await this.db.query('delete from books_collections where idbook=$1', [bookId]);
        await this.db.query('commit');
    }

    async appendLog(logRec: LogItem): Promise<void> {
        await this.db.query('insert into LOG (ROOT_BOOK_ID, URL, START_TIME, DOWNLOAD_TIME, PARSE_TIME, UPDATE_TIME)' +
            'values ($1,$2,$3,$4,$5,$6)', [logRec.rootBookId, logRec.url, logRec.startTime, logRec.downloadTime, logRec.parseTime, logRec.updateTime]);
        await this.db.query('commit');
    }

    async getLastCollectionsLoad(bookId: number): Promise<Date> {
        const row: pg.QueryResult = await this.db.query('select LAST_COL_LIST_LOAD d from books b where b.idbook = $1', [bookId]);
        return row.rows[0].d;
    }

    async setLastCollectionsLoad(bookId: number, lastCollectionsLoad: Date): Promise<void> {
        await this.db.query('update books set LAST_COL_LIST_LOAD =$2 where idbook = $1', [bookId, lastCollectionsLoad]);
        await this.db.query('commit');
    }
    async getSimilarBooks(bookId: number): Promise<string[]> {
        const exRes: pg.QueryResult = await this.db.query(
            `select b.card
  from books b
      ,suggest_Collections($1
                          ,$3) s
 where b.idbook = s.book_id
 order by s.c2 desc 
 limit $2`,
            [bookId, 20, 500]);
        return exRes.rows.map(item => item.card);
    }
    async getSimilarBooks2(bookId: number): Promise<number[]> {
        const exRes: pg.QueryResult = await this.db.query(
            `select * from (
select
	 row_number()over(order by c2 desc) rn,
    case when (b.last_col_list_load+interval '1 day')>LOCALTIMESTAMP then null else b.idbook end id
  from books b
      ,suggest_Collections($1,$3) s
 where b.idbook = s.book_id
 order by c2 desc
limit $2
	) t where id is not null`,
            [bookId, 50, 1000]);
        return exRes.rows.map(item => item.id);
    }

    /*
select * from (
select
	 row_number()over(order by c2 desc) rn,
    case when (b.last_col_list_load+interval '1 day')>LOCALTIMESTAMP then null else 'scraper.bat '||b.idbook|| ' -c' end cmd
  from books b
      ,suggest_Collections(8876640,1000) s
 where b.idbook = s.book_id
 order by c2 desc
limit 50
	) t where cmd is not null
     */

}

export { Storage }