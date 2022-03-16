export function tableKey(table, id) {
    return [table, storageTypes.DATA, id];
}

const nullVal = Symbol.for("NULL");

export function indexKey(table, indexName, value, id) {
    if (value === null || value === undefined) {
        return [table, storageTypes.FULL_IDX, indexName, nullVal, id];
    }
    return [table, storageTypes.FULL_IDX, indexName, value, id];
}

const storageTypes = {
    DATA: 1,
    FULL_IDX: 2,
    TEXT_IDX: 3,
};

export const dbValues = {
    LO: Buffer.from([0]),
    HI: Buffer.from([0xff]),
};

export const actionTypes = {
    FILTER: 0,
    SORT: 1,
    MAP: 2,
    REDUCE: 3,
};

export function getProp(obj, prop) {
    if (!obj) {
        return;
    }
    let path = prop.split(".");
    while (path.length > 0) {
        let actProp = path.shift();
        if (obj[actProp] !== undefined) {
            obj = obj[actProp];
        } else {
            return;
        }
    }
    return obj;
}
