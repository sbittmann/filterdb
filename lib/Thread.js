import { expose } from "threads/worker"
import { Observable } from "observable-fns"
import CodeInterpreter from "./CodeInterpreter.js"
import { open } from 'lmdb-store'
import path from "path"
import * as utils from "./utils.js"

let db;

expose({
    query(query, context, meta, path, dbname, cache) {
        startDb(path, dbname, cache);
        return new Observable((observer) => {
            let cp = new CodeInterpreter(query, context, db, meta, (id) => {
                return utils.tablekey(meta.name, id)
            }, (indexName, value, id) => {
                return utils.indexkey(meta.name, indexName, value, id)
            });

            let result = cp.interprete();
            result.on("data", (data) => {
                observer.next({data: data, query: result.query})
            });
            result.on("end", () => {
                observer.complete();
            })

            return () => { result.close() }
        })
    },
    async createIndex(name, meta, path, dbname, cache) {
        startDb(path, dbname, cache);
        let table = db.getRange({  
            start: utils.tablekey(meta.name, utils.dbValues.LO)
            ,end: utils.tablekey(meta.name, utils.dbValues.HI)
        })
        
        for(let row of table) {
            
            let val = row.value[name];
            let id = row.key[1];
            if(val !== undefined && val !== null) {
                await db.put(utils.indexkey(meta.name, name, val, id), null)
            }
        }
    
        return true;
    },
    async removeIndex(name, meta, path, dbname, cache) {
        startDb(path, dbname, cache);
        let table = db.getRange({  
            start: utils.indexkey(meta.name, name, utils.dbValues.LO, utils.dbValues.LO)
            ,end: utils.indexkey(meta.name, name, utils.dbValues.HI, utils.dbValues.HI)
        })
        for(let { key } of table) {
            await db.remove(key)
        }

        return true;
    }
})

function startDb(dbpath, name, cache) {
    if(!db) {
        db = open({
            path: path.join(dbpath, name),
            cache: cache
        });
    }
}