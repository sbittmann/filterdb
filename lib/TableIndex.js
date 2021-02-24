/*
    Copied and rewritten from:
    https://github.com/eugeneware/subindex
*/
import through2 from "through2";
import Encoding from "./Encoding.js";
import Perf from "./PerformanceCounter.js";

export default TableIndex;

function TableIndex(dataDb, indexDb) {
    if (!dataDb.ensureIndex) {
        dataDb.ensureIndex = ensureIndex.bind(null, dataDb, indexDb);
    }

    if (!dataDb.dropIndex) {
        dataDb.dropIndex = dropIndex.bind(null, dataDb, indexDb);
    }

    if (!dataDb.createIndexStream) {
        dataDb.createIndexStream = createIndexStream.bind(
            null,
            dataDb,
            indexDb,
        );
    }

    if (!dataDb.indexes) {
        dataDb.indexes = {};
    }
}

function createIndexStream(db, indexDb, idxName, options) {
    options = options || {};
    options.gte = options.start || Encoding.LO;
    options.lte = options.end || Encoding.HI;
    options.start = [idxName, options.start];
    options.end = [idxName, options.end];

    return indexDb.createReadStream(options).pipe(
        through2.obj(function (data, enc, callback) {
            callback(null, { key: data.key, value: data.value });
        }),
    );
}

function getProp(obj, prop) {
    let pf = new Perf("TableIndex", "getProp");
    let path = prop.split(".");
    while (path.length > 0) {
        let actProp = path.shift();
        if (obj[actProp] !== undefined) {
            obj = obj[actProp];
        } else {
            pf.finish();
            return;
        }
    }
    pf.finish();
    return obj;
}

function ensureIndex(db, indexDb, idxName, rebuild = false) {
    let options = {
        name: idxName,
        createIndexStream: createIndexStream.bind(null, db, idxName),
    };

    db.indexes[idxName] = options;
    db.hooks.pre(async (change) => {
        let pf = new Perf("TableIndex", "ensureIndex.tableHook");
        if (change.type === "put") {
            await addToIndex(change);
        } else if (change.type === "del") {
            let value = await db.get(change.key);
            await removeFromIndex(change, value);
        }
        pf.finish();
    });

    async function addToIndex(dataToIndex) {
        let pf = new Perf("TableIndex", "ensureIndex.addToIndex");
        let valueToIndex = getProp(dataToIndex.value, idxName);
        //TODO: delete old Index!!!!
        await indexDb.put([idxName, valueToIndex, dataToIndex.key], "");
        pf.finish();
    }

    async function removeFromIndex(change, dataToRemove) {
        let pf = new Perf("TableIndex", "ensureIndex.removeFromIndex");
        let valueToRemove = getProp(dataToRemove.value, idxName);
        await db.indexDb.del([idxName, valueToRemove, change.key]);
        pf.finish();
    }

    if (rebuild === true) {
        return new Promise(async (resolve) => {
            let pf = new Perf("TableIndex", "ensureIndex.rebuild");
            for await (let dataToIndex of db.createReadStream()) {
                console.log(dataToIndex);
                await addToIndex(dataToIndex);
            }
            pf.finish();
            resolve();
        });
    }
    return new Promise((resolve) => {
        resolve();
    });
}

async function dropIndex(db, indexDb, idxName) {
    return await new Promise((resolve) => {
        deleteRange(
            indexDb,
            {
                start: [idxName, Encoding.LO],
                end: [idxName, Encoding.HI],
            },
            resolve,
        );
    });
}
