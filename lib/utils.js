export function tableKey(table, id) {
    return [`table.${table}.data`, id]
}

export function indexKey(table, indexName, value, id) {
    return [`table.${table}.index.${indexName}`, value, id]
}

export let dbValues = {
    LO: Buffer.from([0]),
    HI: Buffer.from([0xff])
}

export let actionTypes = {
    FILTER: 0,
    SORT: 1,
    MAP: 2,
    REDUCE: 3,
}