import { expose } from "threads/worker"
import { Observable } from "observable-fns"
import CodeInterpreter from "./CodeInterpreter.js"
import { open } from 'lmdb-store'
import path from "path"
import * as utils from "./utils.js"

let db;

expose({
    query(query, context, meta, path, name) {
        startDb(path, name);
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
    }
})

function startDb(dbpath, name) {
    if(!db) {
        db = open({
            path: path.join(dbpath, name),
        });
    }
}