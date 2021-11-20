import Table from "./Table.js";
import Backup from "./Backup.js";
import Events from "./Events.js"
import { open } from 'lmdb'
import fs from "fs/promises";
import { fileURLToPath } from 'url';
import path from "path"
import ThreadPool from "./ThreadPool.js"

let __dirname = path.dirname(fileURLToPath(import.meta.url))

export default class Database extends Events {
    #name;
    #path;
    #threadPool
    #plugins;
    #cache;
    #closed = true;

    _db;
    #deleted = false;

    constructor(name, {path = "storage/", plugins = [], cache = true} = {}) {
        super();
        return (async () => {
            this.#name = name;
            this.#cache = cache
            this.#path = path;
            this.#plugins = plugins;
            this.#threadPool = new ThreadPool();
            await this.start();
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

    get meta() {
        if (this.#deleted === true) {
            throw new Error("Database is deleted");
        }
        return this._db.get("meta");
    }

    #loadedTables = {};
    table(name) {
        if(!name) {
            throw new Error("no tableName provided");
        }
        if (this.#deleted === true) {
            throw new Error("Database is deleted");
        }
        if (this.#loadedTables[name] === undefined) {
            let meta = this.meta;
            let tableMeta = this.meta.tables[name];
            if (tableMeta === undefined) {
                tableMeta = {
                    name,
                    indexes: {},
                };
                meta.tables[name] = tableMeta;
                this._db.put("meta", meta);
            }
            this.#loadedTables[name] = new Table(
                tableMeta,
                async (data) => {
                    let meta = this.meta
                    meta.tables[name] = data;
                    await this._db.put("meta", meta);
                },
                this._db,
                this.#path,
                this.#name,
                this.#cache,
                this.#threadPool
            );

            this.#loadedTables[name].before("save", (data) => { 
                this.emitBefore("save", { table: name, data })
            })
            this.#loadedTables[name].before("get", (data) => { 
                this.emitBefore("get", { table: name, data })
            })
            this.#loadedTables[name].before("query", (data) => { 
                this.emitBefore("query", { table: name, data })
            })
            this.#loadedTables[name].before("remove", (data) => { 
                this.emitBefore("remove", { table: name, data })
            })

            this.#loadedTables[name].after("save", (data) => { 
                this.emitBefore("query", { table: name, data })
            })
            this.#loadedTables[name].before("get", (data) => { 
                this.emitBefore("query", { table: name, data })
            })
            this.#loadedTables[name].after("query", (data) => { 
                this.emitBefore("query", { table: name, data })
            })
            this.#loadedTables[name].after("remove", (data) => { 
                this.emitBefore("query", { table: name, data })
            })
        }

        return this.#loadedTables[name];
    }

    async delete() {
        let name = this.meta.name
        await this.close();
        this.#deleted = true;
        this.#loadedTables = {};
        await fs.rm(path.join(this.#path, name), {
            recursive: true,
        });
    }

    async close() {
        if(!this.#closed) {
            this._db.close();
            this.#closed = true;
        }
        
        await this.#threadPool.stop();
        for(let i = 0; i < this.#plugins.length; i++) {
            await this.#plugins[i].stop();
        }
    }

    async start() {
        let pack = JSON.parse(await fs.readFile(path.join(__dirname, "..", "package.json"), "utf8"));

        this._db = open({
            path: path.join(this.#path, this.#name),
        });
        this.#closed = false;

        if(!this.meta) {
            await this._db.put("meta", {
                name: this.#name,
                version: pack.version,
                tables: {},
            });
        }
        if(this.meta.name !== this.#name) {
            let meta = this.meta;
            meta.name = this.#name;
            await this._db.put("meta", meta)
        }

        if (this.meta.version !== pack.version) {
            let upgrade = await import("./Upgrade.js");
            await upgrade.default(this.meta.version, pack.version);
            let meta = this.meta
            meta.version = pack.version;
            await this._db.put("meta", meta);
        }
        await this.#threadPool.start();
        for(let i = 0; i < this.#plugins.length; i++) {
            await this.#plugins[i].start(this);
        }
    }

    get backup() {
        return new Backup(this._db);
    }

    /*get users() {
        return this.table("_users");
    }

    get groups() {
        return this.table("_groups");
    }*/

    async extend(plugin) {
        this.#plugins.push(plugin);
        await plugin.start(this);
    }
}