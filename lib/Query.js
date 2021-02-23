import CodeInterpreter from "./CodeInterpreter.js";

export default class Query {
    #query
    #context
    #db
    #indexDb

    constructor(db, indexDb, query, context) {
        this.#query = query;
        this.#db = db;
        this.#indexDb = indexDb;
        this.#context = context
    }

    execute() {
        let cp = new CodeInterpreter(this.#query, this.#context);
        return cp.interprete(this.#db);
    }
}