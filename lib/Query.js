import CodeInterpreter from "./CodeInterpreter.js";

export default class Query {
    #query;
    #context;
    #db;
    #meta;

    constructor(db, meta, query, context) {
        this.#query = query;
        this.#db = db;
        this.#meta = meta;
        this.#context = context;
    }

    execute() {
        let cp = new CodeInterpreter(this.#query, this.#context);
        return cp.interprete(this.#db, this.#meta);
    }
}
