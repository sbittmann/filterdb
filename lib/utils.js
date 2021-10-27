export function tablekey(table, id) {
    return [`table.${table}.data`, id]
}

export function indexkey(table, indexName, value, id) {
    return [`table.${table}.index.${indexName}`, value, id]
}

export let dbValues = {
    LO: Buffer.from([0]),
    HI: Buffer.from([0xff])
}

export let resultTypes = {
    DATA: 1,
    QUERY: 2,
}