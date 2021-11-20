import VirtualTable from "./VirtualTable.js"

export default class VirtualDatabase {
    _db

    constructor(db) {
        this._db = db;
    }

    get meta() {
        return this._db.get("meta");
    }

    #loadedTables = {};
    table(name) {
        if(!name) {
            throw new Error("no tableName provided");
        }

        if (this.#loadedTables[name] === undefined) {
            let tableMeta = this.meta.tables[name];
            this.#loadedTables[name] = new VirtualTable(
                tableMeta,
                this._db,
                this
            );
        }
        return this.#loadedTables[name];
    }
}