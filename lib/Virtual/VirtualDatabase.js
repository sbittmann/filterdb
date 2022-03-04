import VirtualTable from "./VirtualTable.js";

export default class VirtualDatabase {
    _db;
    #token;

    #meta() {
        return this._db.get("meta");
    }

    #secret() {
        return this._db.get("secret");
    }

    constructor(db, token) {
        this._db = db;
        this.#token = token;
    }

    meta(token = this.#token) {
        let user = this.getUser(token);
        let meta = this.#meta();
        let ret = {
            name: meta.name,
            version: meta.version,
            tables: {},
        };

        if (user.isManager()) {
            ret.manageGroups = meta.manageGroups;
        }

        for (let table in meta.tables) {
            if (user.isTableManager(table)) {
                ret.tables[table] = meta.tables[table];
            } else if (user.isTableReader(table) || user.isTableWriter(table)) {
                ret.tables[table] = {
                    name: table,
                    indexes: meta.tables[table].indexes,
                };
            }
        }

        return ret;
    }

    getUser(token) {
        let meta = this.#meta();
        let user = {
            user: "",
            groups: [""],
            isManager() {
                let ret = this.groups.find((group) => meta.manageGroups[group] === true);
                if (ret) {
                    return true;
                }
                return false;
            },
            isTableManager(table) {
                let ret = this.groups.find((group) => meta.tables[table]?.manageGroups[group] === true);
                if (ret) {
                    return true;
                }
                return false;
            },
            isTableReader(table) {
                let ret = this.groups.find((group) => meta.tables[table]?.readGroups[group] === true);
                if (ret) {
                    return true;
                }
                return false;
            },
            isTableWriter(table) {
                let ret = this.groups.find((group) => meta.tables[table]?.writeGroups[group] === true);
                if (ret) {
                    return true;
                }
                return false;
            },
            isTableDeleter(table) {
                let ret = this.groups.find((group) => meta.tables[table]?.deleteGroups[group] === true);
                if (ret) {
                    return true;
                }
                return false;
            },
        };
        if (token) {
            let decoded = verifyToken(token, this.#secret());
            user.user = decoded.user;
            user.groups = decoded.groups;
        }
        return user;
    }

    table(name) {
        if (!name) {
            throw new Error("no tableName provided");
        }

        let tableMeta = this.#meta().tables[name];
        let table = new VirtualTable(tableMeta, this._db, this, this.#token, (token) => {
            return this.getUser(token);
        });
        return table;
    }
}
