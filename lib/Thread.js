import { workerData, parentPort } from "worker_threads";
import Storage from "./Storage.js";
import path from "path";
import { Readable } from "stream";
import CodeInterpreter from "./CodeInterpreter.js";
import { actionTypes, indexKey, tableKey, dbValues } from "./utils.js";
import Filter from "./Query/Filter.js";
import Sort from "./Query/Sort.js";
import aMap from "./Query/Map.js";
import Reduce from "./Query/Reduce.js";
import VirtualDatabase from "./Virtual/VirtualDatabase.js";

let db = new Storage(path.resolve(path.join(workerData.path, workerData.name)));

parentPort.on("message", (data) => {
    if (data.task) {
        fns[data.task](data.options);
    }
});

const fns = {
    executeQuery({ query, context, meta, token, actions = [] }) {
        try {
            let virtualDB = new VirtualDatabase(db, token);

            let cp = new CodeInterpreter(query, context, db, meta, virtualDB, token);
            let cpInt = cp.interprete();
            let result = Readable.from(cpInt);
            result.query = cpInt.query;

            function close(data) {
                if (data.cmd == "close") {
                    result.close();
                    parentPort.off("message", close);
                    parentPort.postMessage({
                        type: "end",
                    });
                }
            }
            parentPort.on("message", close);
            for (let i = 0; i < actions.length; i++) {
                switch (actions[i].type) {
                    case actionTypes.FILTER:
                        result = result.pipe(new Filter(actions[i].data.query, actions[i].data.context, virtualDB));
                        break;
                    case actionTypes.SORT:
                        result = result.pipe(new Sort(actions[i].data.query, actions[i].data.context, virtualDB));
                        break;
                    case actionTypes.MAP:
                        result = result.pipe(new aMap(actions[i].data.query, actions[i].data.context, virtualDB));
                        break;
                    case actionTypes.REDUCE:
                        result = result.pipe(new Reduce(actions[i].data.query, actions[i].data.context, actions[i].data.initVal, virtualDB));
                        break;
                }
            }
            result.on("error", (e) => {
                parentPort.postMessage({
                    type: "error",
                    data: {
                        error: { message: e.message },
                    },
                });
                parentPort.off("message", close);
            });
            result.on("data", (data) => {
                if (data === Object(data)) {
                    parentPort.postMessage({
                        type: "data",
                        data: {
                            data: { ...data },
                            query: result.query,
                        },
                    });
                    return;
                }
                parentPort.postMessage({
                    type: "data",
                    data: {
                        data: data,
                        query: result.query,
                    },
                });
            });
            result.on("end", () => {
                if (cpInt.error) {
                    parentPort.postMessage({
                        type: "error",
                        data: {
                            error: { message: cpInt.error.message },
                        },
                    });
                    parentPort.off("message", close);
                    return;
                }
                parentPort.postMessage({
                    type: "end",
                });
                parentPort.off("message", close);
            });
        } catch (e) {
            parentPort.postMessage({
                type: "error",
                data: {
                    error: { message: e.message },
                },
            });
            parentPort.off("message", close);
        }
    },
    async createIndex({ name, meta }) {
        await db.transaction(() => {
            let table = db.getRangeData({
                start: tableKey(meta.name, dbValues.LO),
                end: tableKey(meta.name, dbValues.HI),
            });

            for (let row of table) {
                let val = row.value[name];
                let id = row.key.pop();
                db.putIdx(indexKey(meta.name, name, val), id);
            }
        });

        parentPort.postMessage({
            type: "end",
        });
    },
    async removeIndex({ name, meta }) {
        await db.transaction(() => {
            let table = db.getKeysIdx({
                start: indexKey(meta.name, name, dbValues.LO),
                end: indexKey(meta.name, name, dbValues.HI),
            });
            for (let key of table) {
                db.removeIdx(key);
            }
        });

        parentPort.postMessage({
            type: "end",
        });
    },
};
