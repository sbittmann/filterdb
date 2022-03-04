import { expose } from "threads/worker";
import { Observable } from "observable-fns";

import { open } from "lmdb";
import path from "path";
import { Readable } from "stream";
import CodeInterpreter from "./CodeInterpreter.js";
import * as utils from "./utils.js";
import Filter from "./Query/Filter.js";
import Sort from "./Query/Sort.js";
import aMap from "./Query/Map.js";
import Reduce from "./Query/Reduce.js";
import VirtualDatabase from "./Virtual/VirtualDatabase.js";

let db;

expose({
    query({ query, context, meta, path, dbname, cache, token, actions = [] }) {
        startDb(path, dbname, cache);
        return new Observable((observer) => {
            try {
                let virtualDB = new VirtualDatabase(db, token);

                let cp = new CodeInterpreter(query, context, db, meta, virtualDB, token);
                let cpInt = cp.interprete();
                let result = Readable.from(cpInt);
                result.query = cpInt.query;

                for (let i = 0; i < actions.length; i++) {
                    switch (actions[i].type) {
                        case utils.actionTypes.FILTER:
                            result = result.pipe(new Filter(actions[i].data.query, actions[i].data.context, virtualDB));
                            break;
                        case utils.actionTypes.SORT:
                            result = result.pipe(new Sort(actions[i].data.query, actions[i].data.context, virtualDB));
                            break;
                        case utils.actionTypes.MAP:
                            result = result.pipe(new aMap(actions[i].data.query, actions[i].data.context, virtualDB));
                            break;
                        case utils.actionTypes.REDUCE:
                            result = result.pipe(new Reduce(actions[i].data.query, actions[i].data.context, actions[i].data.initVal, virtualDB));
                            break;
                    }
                }
                result.on("error", (e) => {
                    observer.next({ error: { message: e.message } });
                });
                result.on("data", (data) => {
                    if (data === Object(data)) {
                        observer.next({ data: { ...data }, query: result.query });
                        return;
                    }
                    observer.next({ data: data, query: result.query });
                });
                result.on("end", () => {
                    if (cpInt.error) {
                        observer.next({ error: { message: cpInt.error.message } });
                    }
                    observer.complete();
                });

                return () => {
                    result.close();
                };
            } catch (e) {
                observer.next({ error: { message: e.message } });
            }
        });
    },
    async createIndex(name, meta, path, dbname, cache) {
        startDb(path, dbname, cache);
        let table = db.getRange({
            start: utils.tableKey(meta.name, utils.dbValues.LO),
            end: utils.tableKey(meta.name, utils.dbValues.HI),
        });

        for (let row of table) {
            let val = row.value[name];
            let id = row.key[1];
            if (val !== undefined && val !== null) {
                await db.put(utils.indexKey(meta.name, name, val, id), null);
            }
        }

        return true;
    },
    async removeIndex(name, meta, path, dbname, cache) {
        startDb(path, dbname, cache);
        let table = db.getRange({
            start: utils.indexKey(meta.name, name, utils.dbValues.LO, utils.dbValues.LO),
            end: utils.indexKey(meta.name, name, utils.dbValues.HI, utils.dbValues.HI),
        });
        for (let { key } of table) {
            await db.remove(key);
        }

        return true;
    },
});

function startDb(dbpath, name, cache) {
    if (!db) {
        db = open({
            path: path.join(dbpath, name),
            sharedStructuresKey: Symbol.for("structures"),
            cache: cache,
        });
    }
}
