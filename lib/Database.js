import Table from "./Table.js";
import Backup from "./Backup.js";
import { open } from "lmdb";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import ThreadPool from "./ThreadPool.js";
import { authenticate, createPasswordHash, verifyToken, createToken } from "./Authorization.js";
import { nanoid } from "nanoid/async";

let __dirname = path.dirname(fileURLToPath(import.meta.url));

export default class Database {
    #name;
    #path;
    #threadPool;
    #plugins;
    #token;
    #closed = true;
    #systemToken;
    #meta() {
        return this._db.get("meta");
    }

    #secret() {
        if (this.#deleted === true) {
            throw new Error("Database is deleted");
        }
        return this._db.get("secret");
    }

    getUser(token) {
        let meta = this.#meta();
        let user = {
            user: "",
            groups: [""],
            isManager() {
                if (this.user === "system") {
                    return true;
                }
                let ret = this.groups.find((group) => meta.manageGroups[group] === true);
                if (ret) {
                    return true;
                }
                return false;
            },
            isTableManager(table) {
                if (this.user === "system") {
                    return true;
                }
                let ret = this.groups.find((group) => meta.tables[table]?.manageGroups[group] === true);
                if (ret) {
                    return true;
                }
                return false;
            },
            isTableReader(table) {
                if (this.user === "system") {
                    return true;
                }
                let ret = this.groups.find((group) => meta.tables[table]?.readGroups[group] === true);
                if (ret) {
                    return true;
                }
                return false;
            },
            isTableWriter(table) {
                if (this.user === "system") {
                    return true;
                }
                let ret = this.groups.find((group) => meta.tables[table]?.writeGroups[group] === true);
                if (ret) {
                    return true;
                }
                return false;
            },
            isTableDeleter(table) {
                if (this.user === "system") {
                    return true;
                }
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

    _db;
    #deleted = false;

    constructor(name, { path = "storage/", plugins = [], cache = true, user, password } = {}) {
        return (async () => {
            this.#name = name;
            this.#path = path;
            this.#plugins = plugins;
            this.#threadPool = new ThreadPool({
                path,
                name,
                cache,
            });
            await this.start();
            if (user && password) {
                this.#token = await authenticate(user, password, this, this.#secret());
            }
            return this;
        })();
    }
    /*
    get path() {
        return this.#path;
    }

    get cache() {
        return this.#cache;
    }*/

    meta(token = this.#token) {
        if (this.#deleted === true) {
            throw new Error("Database is deleted");
        }

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

    #loadedTables = {};
    table(name) {
        if (!name) {
            throw new Error("no tableName provided");
        }
        if (this.#deleted === true) {
            throw new Error("Database is deleted");
        }

        if (this.#loadedTables[name] === undefined) {
            let meta = this.#meta();
            let tableMeta = meta.tables[name];
            if (tableMeta === undefined) {
                tableMeta = {
                    name,
                    indexes: {},
                    readGroups: {
                        admin: true,
                    },
                    writeGroups: {
                        admin: true,
                    },
                    deleteGroups: {
                        admin: true,
                    },
                    manageGroups: {
                        admin: true,
                    },
                };
                meta.tables[name] = tableMeta;
                this._db.putSync("meta", meta);
            }
            this.#loadedTables[name] = new Table(
                tableMeta,
                (data) => {
                    let meta = this.#meta();
                    meta.tables[name] = data;
                    this._db.putSync("meta", meta);
                },
                this._db,
                this.#threadPool,
                this.#token,
                (token) => {
                    return this.getUser(token);
                },
                this.#systemToken,
            );
        }

        return this.#loadedTables[name];
    }

    async auth(user, password) {
        return await authenticate(user, password, this, this.#secret());
    }

    async delete(token = this.#token) {
        let name = this.#meta().name;
        await this.close();
        this.#deleted = true;
        this.#loadedTables = {};
        await fs.rm(path.join(this.#path, name), {
            recursive: true,
        });
    }

    async close() {
        await this.#threadPool.stop();
        if (!this.#closed) {
            this.#closed = true;
            await this._db.close();
        }

        for (let i = 0; i < this.#plugins.length; i++) {
            await this.#plugins[i].stop();
        }
    }

    async start() {
        let pack = JSON.parse(await fs.readFile(path.join(__dirname, "..", "package.json"), "utf8"));

        this._db = open({
            path: path.join(this.#path, this.#name),
            sharedStructuresKey: Symbol.for("structures"),
        });
        this.#closed = false;

        if (!this.#meta()) {
            await this._db.put("meta", {
                name: this.#name,
                version: pack.version,
                manageGroups: {
                    admin: true,
                },
                tables: {},
            });
        }

        if (!this.#secret()) {
            await this._db.put("secret", `${await nanoid()}${await nanoid()}${await nanoid()}`);
        }

        if (this.#meta().name !== this.#name) {
            let meta = this.#meta();
            meta.name = this.#name;
            await this._db.put("meta", meta);
        }

        if (this.#meta().version !== pack.version) {
            let upgrade = await import("./Upgrade.js");
            await upgrade.default(this.#meta().version, pack.version);
            let meta = this.#meta();
            meta.version = pack.version;
            await this._db.put("meta", meta);
        }
        await this.#threadPool.start();

        this.#systemToken = createToken("system", [], this.#secret());

        let adminUser = await this.users.get("admin", this.#systemToken);
        let adminGroup = await this.groups.get("admin", this.#systemToken);

        if (!adminUser) {
            await this.users.save(
                {
                    _id: "admin",
                    password: await createPasswordHash("admin"),
                    groups: ["admin"],
                },
                this.#systemToken,
            );
        }

        if (!adminGroup) {
            await this.groups.save({ _id: "admin" }, this.#systemToken);
        }

        for (let i = 0; i < this.#plugins.length; i++) {
            await this.#plugins[i].start(this);
        }
    }

    get backup() {
        return new Backup(this._db);
    }

    get users() {
        let users = this.table("_users");
        users.create = async function (user, password) {
            await users.save({
                _id: user,
                password: await createPasswordHash(password),
            });
        };
        return users;
    }

    get groups() {
        return this.table("_groups");
    }

    async extend(plugin) {
        this.#plugins.push(plugin);
        await plugin.start(this);
    }
}
