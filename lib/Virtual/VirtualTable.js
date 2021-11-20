import { tableKey } from "../utils.js"
import CodeInterpreter from "../CodeInterpreter.js"

export default class VirtualTable {
    #db
    #meta
    #virtualDB
    constructor(meta, db, virtualDB) {
        
        this.#meta = meta
        this.#db = db;
        this.#virtualDB = virtualDB;
    }

    get meta() {
        return this.#meta;
    }

    get(id) {
        return this.#db.get(this.#tableKey(id));
    }

    #tableKey(id) {
        return tableKey(this.#meta.name, id)
    }

    find(query, context = {}) {
        let cp = new CodeInterpreter(query, context, this.#db, this.#meta, this.#virtualDB);
        for(let row of cp.interprete()) {
            return row;
        }
        return null;
    }

    filter(query, context = {}) {
        let cp = new CodeInterpreter(query, context, this.#db, this.#meta, this.#virtualDB);
        return Array.from(cp.interprete());
    }
}