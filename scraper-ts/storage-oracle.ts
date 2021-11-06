import * as Oracle from 'oracledb';
import * as async from 'async';
import { CollectionItem, BookItem, CommentItem } from './types';
import { stringToRegExp } from './utils';
import {LogItem} from './types';

const settings = require('./settings.json');

class OracleExt {
    db: Oracle.Connection;
    oracle:any;

    async initDb() {
        if (!process.env.PATH.match(stringToRegExp(settings.ORACLE_HOME))) {
            process.env.PATH = settings.ORACLE_HOME+';' + process.env.PATH;
        }
        if (!process.env.TNS_ADMIN) {
            process.env.TNS_ADMIN = settings.TNS_ADMIN;
        }
        const oracle = require('oracledb');
        this.oracle = oracle;
        oracle.autoCommit = false;
        this.db = await oracle.getConnection(settings.connection_params);
    }

    async dbExecList(statement:string, params: Array<Object | Array<any>>):Promise<Oracle.Result<any>> {
        let p = this.db.executeMany(statement, <Oracle.BindParameters[]><unknown>params);
        p.catch<Oracle.Result<any>>
            (function(err):Oracle.Result<any> {
                console.log(err);
                console.log(statement);
                //console.log(item);
                return null;
            });
        return p;
        /*
        await this.db.executeMany(statement, <Oracle.BindParameters[]><unknown>params).catch<Oracle.Result<any>>
            (function(err):Oracle.Result<any> {
                console.log(err);
                console.log(statement);
                //console.log(item);
                return null;
            });
        /*
        await asyncForEach(params, function(item) {
            return <Promise<Oracle.Result<any>>>db.execute(statement, <Oracle.BindParameters><unknown>item).catch<Oracle.Result<any>>
            (function(err):Oracle.Result<any> {
                console.log(err);
                console.log(statement);
                console.log(item);
                return null;
            });
        });
        */
    }

    async close() {
        return this.db.close();
    }
}

class Storage extends OracleExt {

    async collectListToDb(collect:CollectionItem[],bookId?:number) {
        await this.dbExecList(
            'merge into authors a using dual on (idauthor = :idauthor) ' +
            'when not matched then insert (idauthor, name) values (:idauthor,:name) ' +
            'when matched then update set name = :name ',
            collect.map(item => ({idauthor: item.authorId, name:item.authorName})));

        await this.dbExecList(
            'merge into collections a using dual on (idcollection  = :idcollection ) ' +
            'when not matched then insert (idcollection , name, idauthor, cnt) values (:idcollection ,:name, :idauthor, :cnt) ' +
            'when matched then update set name = :name , idauthor = :idauthor, cnt=:cnt',
            collect.map(item => ({ idcollection: item.id, name: item.name, idauthor: item.authorId, cnt:item.cnt }))
        );
        if (bookId) {
            await this.db.execute('delete from books_collections where idbook=:id', { id: bookId });
            await this.dbExecList(                
                'insert into books_collections (idcollection,idbook) values (:idcollection,:idbook) ',
                collect.map(item => ({ idcollection: item.id, idbook:bookId }))
            );
        }
        await this.db.commit();
    }

    async clearCollectionData(collectId:number) {
        await this.db.execute('DELETE FROM books_collections where idcollection = :id', [collectId]);
        await this.db.commit();
    }

    async collectDataToDbPage(collect: BookItem[], collectId?:number) {
        await this.dbExecList(
            'merge into authors a using dual on (idauthor = :idauthor) ' +
            'when not matched then insert (idauthor, name) values (:idauthor,:name) ' +
            'when matched then update set name = :name ',
            collect.map(item => ({ idauthor: item.authorId, name: item.authorName }))
        );

        await this.dbExecList(
            `begin

merge into books a using dual on (idbook = :idbook) 
when not matched then insert (idbook,name,idauthor,rating,pages,chapters) values (:idbook,:name,:idauthor,:rating,:pages,:chapters) 
when matched then update set name = :name, idauthor=:idauthor,rating=:rating,pages=:pages,chapters=:chapters;

update books set card=:card
where idbook = :idbook;

end;`,
            collect.map(item => ({
                idbook: item.id,
                name: item.name,
                idauthor: item.authorId,
                card: item.card,
                rating: item.rating,
                pages:item.pages,
                chapters:item.chapters
    }))
        );
        
        if (collectId) {
            await this.dbExecList(
                'merge into books_collections a using dual on (idcollection = :idcollection and idbook=:idbook) ' +
                'when not matched then insert (idcollection,idbook) values (:idcollection,:idbook) ',
                collect.map(item => ({ idcollection: collectId, idbook:item.id }))
            );
        }
        await this.db.commit();
    }

    async getCollectionCount(idCollection: number): Promise<number> {
        const row: Oracle.Result<any> = await this.db.execute('select count(bc.idbook) as cnt from books_collections bc where bc.idcollection = :id',
            { id:idCollection });
        return row.rows[0][0];
    }

    async getAuthorCommentsCount(idAuthor: number): Promise<number> {
        const row: Oracle.Result<any> = await this.db.execute('select count(c.comment_id) as cnt from comments c where c.author_id = :id',
            { id: idAuthor });
        return row.rows[0][0];
    }

    async getBookCommentsCount(idBook: number):Promise<number> {
        const row: Oracle.Result<any> = await this.db.execute('select count(c.comment_id) as cnt from comments c where c.book_id = :id',
            { id: idBook });
        return row.rows[0][0];
    }

    async commentItemsToDb(comments: CommentItem[]) {
        await this.dbExecList(
            'begin if :idauthor is not null then '+
            'merge into authors a using dual on (idauthor = :idauthor) ' +
            'when not matched then insert (idauthor, name, avatar) values (:idauthor,:name, :avatar) ' +
            'when matched then update set name = :name, avatar = :avatar; ' +
            'end if; end;',
            comments.map(item => ({ idauthor: item.authorId, name: item.authorName, avatar:item.authorAvatar }))
        );

        await this.dbExecList(
            `begin

merge into books a using dual on (idbook = :idbook) 
when not matched then insert (idbook,name) values (:idbook,:name) 
when matched then update set name = :name;
end;`,
            comments.filter(item => item.bookId).map(item => ({
                idbook: item.bookId,
                name: item.bookName
            }))
        );
        await this.dbExecList(
            `begin

merge into comments using dual on (COMMENT_ID = :comment_Id) 
when not matched then insert (comment_id, comment_date, author_id, chapter_link, thumbup_count, book_id, request_id) values (:comment_id, :comment_date, :author_id, :chapter_link, :thumbup_count, :book_id, :request_id) 
when matched then update set comment_date=:comment_date, author_id=:author_id, chapter_link=:chapter_link, thumbup_count=:thumbup_count, book_id=:book_id, request_id=:request_id;

update comments set text=:text
where COMMENT_ID = :comment_Id;

end;`,
            comments.map(item => ({
                comment_id: item.commentId,
                comment_date: item.commentDate,
                author_id: item.authorId,
                chapter_link: item.chapterLink,
                text: item.text,
                thumbup_count: item.thumbUpCount,
                book_id: item.bookId,
                request_id:item.requestId
            }))
        );

        await this.db.commit();
    }

    async getAllAuthorsCommentedBook(bookId: number): Promise<number[]> {
        const exRes: Oracle.Result<any> = await this.db.execute('select distinct c.author_id from COMMENTS c where c.book_id=:id',
            { id: bookId }, { resultSet: true });
        //console.log(rs);
        var rs: Oracle.ResultSet<any> = exRes.resultSet;
        var row = await rs.getRow();
        var result:number[] = [];
        while (row) {
            result.push(row[0]);
            row = await rs.getRow();
        }
        rs.close(); //fire and forget
        return result;
    }

    async deleteBook(bookId: number): Promise<void> {
        await this.db.execute('delete from books_collections where idbook=:id', { id: bookId });
        await this.db.commit();
    }

    async appendLog(logRec: LogItem): Promise<void> {
        await this.db.execute('insert into LOG (ROOT_BOOK_ID, URL, START_TIME, DOWNLOAD_TIME, PARSE_TIME, UPDATE_TIME)'+
        'values (:rootBookId,:url,:startTime,:downloadTime,:parseTime,:updateTime)', <Oracle.BindParameters><unknown>logRec);
        await this.db.commit();
    }

    async getLastCollectionsLoad(bookId: number):Promise<Date> {
        const row:Oracle.Result<any> = await this.db.execute('select LAST_COL_LIST_LOAD from books b where b.idbook = :id', { id: bookId });
        return row.rows[0][0];
    }

    async setLastCollectionsLoad(bookId: number,lastCollectionsLoad: Date):Promise<void> {
        await this.db.execute('update books set LAST_COL_LIST_LOAD =:d where idbook = :id', { id: bookId, d:lastCollectionsLoad });
        await this.db.commit();
    }

}

export {Storage}