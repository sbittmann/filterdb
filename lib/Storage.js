import { open } from "lmdb";

export default class Storage {
    #db;
    constructor(path) {
        this.#db = open({
            path: path,
            sharedStructuresKey: Symbol.for("structures"),
        });
    }

    putSync(key, value) {
        return this.#db.putSync(key, value);
    }

    put(key, value) {
        return this.#db.put(key, value);
    }

    remove(key) {
        return this.#db.remove(key);
    }

    get(key) {
        return this.#db.get(key);
    }

    getRange(options) {
        return this.#db.getRange(options);
    }

    getKeys(options) {
        return this.#db.getKeys(options);
    }

    close() {
        return this.#db.close();
    }

    transaction(cb) {
        return this.#db.transaction(cb);
    }

    drop() {
        return this.#db.drop();
    }

    backup(filepath) {
        return this.#db.backup(filepath);
    }
}
