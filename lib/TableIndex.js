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
        dataDb.createIndexStream = createIndexStream.bind(null, indexDb);
    }

    if (!dataDb.indexes) {
        dataDb.indexes = {};
    }
}

function createIndexStream(indexDb, idxName, options) {
    let calcOptions = options || {};
    calcOptions.gte = calcOptions.gte || Encoding.LO;
    calcOptions.lte = calcOptions.lte || Encoding.HI;
    calcOptions.gte = [idxName, calcOptions.gte, Encoding.LO];
    calcOptions.lte = [idxName, calcOptions.lte, Encoding.HI];

    return indexDb.createReadStream(options);
}

function getProp(obj, prop) {
    let pf = new Perf("TableIndex", "getProp");
    if (!obj) {
        return;
    }
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
        if (!change.newVal) {
            return await removeFromIndex(change);
        }
        await addToIndex(change);

        pf.finish();
    });

    async function addToIndex(change) {
        let pf = new Perf("TableIndex", "ensureIndex.addToIndex");
        let newIdxVal = getProp(change.newVal, idxName);
        if (change.oldVal) {
            let oldIdxVal = getProp(change.oldVal, idxName);
            if (oldIdxVal === newIdxVal) {
                return;
            }
            await removeFromIndex(change, oldIdxVal);
        }

        await indexDb.put([idxName, newIdxVal, change.key], "");

        pf.finish();
    }

    async function removeFromIndex(change, value) {
        let pf = new Perf("TableIndex", "ensureIndex.removeFromIndex");
        if (value) {
            await db.indexDb.del([idxName, value, change.key]);
            return;
        }
        let valueToRemove = getProp(change.oldVal, idxName);
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
