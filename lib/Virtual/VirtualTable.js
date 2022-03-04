import { tableKey } from "../utils.js";
import CodeInterpreter from "../CodeInterpreter.js";

export default class VirtualTable {
    #db;
    #meta;
    #virtualDB;
    #token;

    constructor(meta, db, virtualDB, token, getUserFn) {
        this.#meta = meta;
        this.#db = db;
        this.#virtualDB = virtualDB;
        this.#token = token;

        this.getUser = getUserFn;
    }

    meta(token = this.#token) {
        let user = this.getUser(token);
        let ret = {
            name: this.#meta.name,
            indexes: this.#meta.indexes,
        };
        if (user.isTableManager(this.#meta.namae)) {
            ret = this.#meta;
        }

        return ret;
    }

    get(id) {
        return this.#db.get(this.#tableKey(id));
    }

    #tableKey(id) {
        return tableKey(this.#meta.name, id);
    }

    find(query, context = {}) {
        let cp = new CodeInterpreter(query, context, this.#db, this.#meta, this.#virtualDB);
        for (let row of cp.interprete()) {
            return row;
        }
        return null;
    }

    filter(query, context = {}) {
        let cp = new CodeInterpreter(query, context, this.#db, this.#meta, this.#virtualDB);
        return Array.from(cp.interprete());
    }
}
