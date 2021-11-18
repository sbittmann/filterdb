import { expose } from "threads/worker"
import { Observable } from "observable-fns"
import CodeInterpreter from "./CodeInterpreter.js"
import { open } from 'lmdb-store'
import path from "path"
import * as utils from "./utils.js"
import Filter from "./Query/Filter.js"
import Sort from "./Query/Sort.js"
import aMap from "./Query/Map.js"
import Reduce from "./Query/Reduce.js"

let db;

expose({
    query({query, context, meta, path, dbname, cache, actions = []}) {
        startDb(path, dbname, cache);
        return new Observable((observer) => {
            let cp = new CodeInterpreter(query, context, db, meta, (indexName, value, id) => {
                return utils.indexKey(meta.name, indexName, value, id)
            });

            let result = cp.interprete();
            for(let i = 0; i < actions.length; i++) {
                switch (actions[i].type) {
                    case utils.actionTypes.FILTER:
                        result = result.pipe(new Filter(actions[i].data.query, actions[i].data.context))
                        break;
                    case utils.actionTypes.SORT:
                        result = result.pipe(new Sort(actions[i].data.query, actions[i].data.context))
                        break;
                    case utils.actionTypes.MAP:
                        result = result.pipe(new aMap(actions[i].data.query, actions[i].data.context))
                        break;
                    case utils.actionTypes.REDUCE:
                        result = result.pipe(new Reduce(actions[i].data.query, actions[i].data.context, actions[i].data.initVal))
                        break;
                }
            }

            result.on("data", (data) => {
                if(data === Object(data)) {
                    observer.next({data: {... data}, query: result.query});
                    return;
                }
                observer.next({data: data, query: result.query});
                
            });
            result.on("end", () => {
                observer.complete();
            })

            return () => { 
                result.close();
            }
        })
    },
    async createIndex(name, meta, path, dbname, cache) {
        startDb(path, dbname, cache);
        let table = db.getRange({  
            start: utils.tableKey(meta.name, utils.dbValues.LO)
            ,end: utils.tableKey(meta.name, utils.dbValues.HI)
        })
        
        for(let row of table) {
            
            let val = row.value[name];
            let id = row.key[1];
            if(val !== undefined && val !== null) {
                await db.put(utils.indexKey(meta.name, name, val, id), null)
            }
        }
    
        return true;
    },
    async removeIndex(name, meta, path, dbname, cache) {
        startDb(path, dbname, cache);
        let table = db.getRange({  
            start: utils.indexKey(meta.name, name, utils.dbValues.LO, utils.dbValues.LO)
            ,end: utils.indexKey(meta.name, name, utils.dbValues.HI, utils.dbValues.HI)
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