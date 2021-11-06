import * as Oracle from 'oracledb';

import { asyncForEach, stringToRegExp } from "./utils";

const settings = require('./settings.json');

class OracleExt {
    db: Oracle.IConnection;
    oracle: any;

    async initDb() {
        if (!process.env.PATH.match(stringToRegExp(settings.ORACLE_HOME))) {
            process.env.PATH = settings.ORACLE_HOME + ";" + process.env.PATH;
        }
        if (!process.env.TNS_ADMIN) {
            process.env.TNS_ADMIN = settings.TNS_ADMIN;
        }
        const oracle = require("oracledb");
        this.oracle = oracle;
        oracle.autoCommit = false;
        this.db = await oracle.getConnection(settings.connection_params);
    }

    async dbExecList(statement:string, params: Array<Object | Array<any>>) {
        var db = this.db;
        await asyncForEach(params, function(item) {
            return <Promise<Oracle.IExecuteReturn>>db.execute(statement, item).catch<Oracle.IExecuteReturn>
            (function(err):Oracle.IExecuteReturn {
                console.log(err);
                console.log(statement);
                console.log(item);
                return null;
            });
        });
    }

    async close() {
        return this.db.close();
    }
}

class Storage extends OracleExt {

    async getSimilarBooks(bookId: number): Promise<string[]> {
        this.oracle.fetchAsString = [this.oracle.CLOB];
        const exRes: Oracle.IExecuteReturn = await this.db.execute(
            `select card from (select /*+ first_rows*/ 
      b.card
  from books b
      ,table(suggest.maxCollections(:id
                                   ,500)) s
      ,authors a
 where b.idbook = s.book_id
       and a.idauthor = b.idauthor
 order by s.c3 desc
) where 
 rownum <= 20`,
            { id: bookId }, { resultSet: true });
        //console.log(rs);
        var rs: Oracle.IResultSet = exRes.resultSet;
        var row = await rs.getRow();
        var result:string[] = [];
        while (row) {
            result.push(row[0]);
            row = await rs.getRow();
        }
        rs.close(); //fire and forget
        return result;
    }
}

export {Storage}