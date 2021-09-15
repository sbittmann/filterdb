import CodeInterpreter from "./CodeInterpreter.js";

export default class Query {
    #query;
    #context;
    #db;
    #meta;
    #databaseKey
    #indexKey

    constructor(db, meta, query, context, databaseKey, indexKey) {
        this.#query = query;
        this.#db = db;
        this.#meta = meta;
        this.#context = context;
        this.#databaseKey = databaseKey;
        this.#indexKey = indexKey;

    }

    execute() {
        let cp = new CodeInterpreter(this.#query, this.#context, this.#db, this.#meta, this.#databaseKey, this.#indexKey);
        return cp.interprete();
    }
}