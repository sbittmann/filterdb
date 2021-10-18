import Table from "./Table.js";
import Backup from "./Backup.js";
import Events from "./Events.js"
import { open } from 'lmdb-store'
import fs from "fs/promises";
import { fileURLToPath } from 'url';
import Path from "path"

let __dirname = Path.dirname(fileURLToPath(import.meta.url))

export default class Database extends Events {
    #meta;
    #name;
    #path;
    #plugins = [];

    _db;
    #deleted = false;

    constructor(name, {path = "storage/"} = {}) {
        super();
        return (async () => {
            this.#name = name;
            this.#path = path;
            await this.start()
            return this;
        })();
    }

    get meta() {
        if (this.#deleted === true) {
            throw new Error("Database is deleted");
        }
        return this.#meta;
    }

    #loadedTables;
    table(name) {
        if(!name) {
            throw new Error("no tableName provided");
        }
        if (this.#deleted === true) {
            throw new Error("Database is deleted");
        }
        if (this.#loadedTables[name] === undefined) {
            let tableMeta = this.#meta.tables[name];
            if (tableMeta === undefined) {
                tableMeta = {
                    name,
                    indexes: {},
                };
                this.#meta.tables[name] = tableMeta;
                saveMeta(this.meta.name, this.#path, this.meta);
            }
            this.#loadedTables[name] = new Table(
                tableMeta,
                async (data) => {
                    this.#meta.tables[name] = data;

                    await saveMeta(this.meta.name, this.#path, this.meta);
                },
                this._db
            );

            this.#loadedTables[name].before("save", () => {})
            this.#loadedTables[name].before("query", () => {})
            this.#loadedTables[name].before("remove", () => {})

            this.#loadedTables[name].after("save", () => {})
            this.#loadedTables[name].after("query", () => {})
            this.#loadedTables[name].after("remove", () => {})
        }

        return this.#loadedTables[name];
    }

    async delete() {
        this.#deleted = true;
        this.#loadedTables = {};
        await this._db.close();
        await fs.rm(Path.join(this.#path, this.#meta.name), {
            recursive: true,
        });
        await fs.rm(Path.join(this.#path, `${this.#meta.name}.meta.json`) , {
            recursive: true,
        });
    }

    close() {
        this._db.close();
        for(let i = 0; i < this.#plugins.length; i++) {
            this.#plugins[i].stop();
        }
    }

    async start() {
        let pack = JSON.parse(await fs.readFile(Path.join(__dirname, "..", "package.json"), "utf8"));
        
        try {
            this.#meta = await loadMeta(this.#name, this.#path);
        } catch {
            this.#meta = {
                name: this.#name,
                version: pack.version,
                tables: {},
            };
            await saveMeta(this.meta.name, this.#path, this.meta);
        }

        this._db = open({
            path: Path.join(this.#path, this.#name),
        });

        if (this.#meta.version !== pack.version) {
            let upgrade = await import("./Upgrade.js");
            await upgrade.default(this.#meta.version, pack.version);
            this.#meta.version = pack.version;
            await saveMeta(this.meta.name, this.#path, this.meta);
        }
        
        for(let i = 0; i < this.#plugins.length; i++) {
            await this.#plugins[i].start(this);
        }

        this.#loadedTables = {};
    }

    get backup() {
        return new Backup(this._db);
    }

    get users() {
        return this.table("_users");
    }

    get groups() {
        return this.table("_groups");
    }

    async extend(plugin) {
        this.#plugins.push(plugin);
        await plugin.start(this);
    }
}

async function saveMeta(name, path, data) {
    await fs.mkdir(path, { recursive: true });
    await fs.writeFile(
        Path.join(path, name + ".meta.json"),
        JSON.stringify(data, null, 4),
    );
}

async function loadMeta(name, path) {
    let meta = await fs.readFile(Path.join(path, name + ".meta.json"), "utf8");
    return JSON.parse(meta);
}