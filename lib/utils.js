export function tableKey(table, id) {
    return [table, id];
}

const nullVal = Symbol.for("NULL");
const idxVal = Symbol.for("IDX");

export function indexKey(table, indexName, value, ext) {
    if (value === null || value === undefined) {
        return [table, indexName, idxTypes.VAL_IDX, nullVal, ext ? ext : idxVal];
    }
    return [table, indexName, idxTypes.VAL_IDX, value, ext ? ext : idxVal];
}

const idxTypes = {
    VAL_IDX: 1,
    TEXT_IDX: 2,
};

export const dbValues = {
    LO: Buffer.from([0]),
    HI: Buffer.from([255]),
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
