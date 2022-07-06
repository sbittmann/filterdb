import { open } from "lmdb";

export default class Storage {
    #db;
    #data;
    #idx;
    constructor(path) {
        this.#db = open({
            path: path,
            sharedStructuresKey: Symbol.for("structures"),
            noMemInit: true,
        });
        this.#data = this.#db.openDB("tableData");
        this.#idx = this.#db.openDB("idx", {
            dupSort: true,
        });
    }

    getRange(options) {
        return this.#db.getRange(options);
    }

    getRangeData(options) {
        return this.#data.getRange(options);
    }

    getRangeIdx(options) {
        return this.#idx.getRange(options);
    }

    getValuesIdx(key, options) {
        return this.#idx.getValues(key, options);
    }

    getKeys(options) {
        return this.#db.getKeys(options);
    }

    getKeysIdx(options) {
        return this.#idx.getKeys(options);
    }

    putSync(key, value) {
        return this.#db.putSync(key, value);
    }

    put(key, value) {
        return this.#db.put(key, value);
    }

    putData(key, value) {
        return this.#data.put(key, value);
    }

    putIdx(key, value) {
        return this.#idx.put(key, value);
    }

    remove(key) {
        return this.#db.remove(key);
    }

    removeData(key) {
        return this.#data.remove(key);
    }

    removeIdx(key, value) {
        return this.#idx.remove(key, value);
    }

    get(key) {
        return this.#db.get(key);
    }

    getData(key) {
        return this.#data.get(key);
    }

    getIdx(key) {
        return this.#idx.get(key);
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
