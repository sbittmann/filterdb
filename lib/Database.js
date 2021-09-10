import Table from "./Table.js";
import Backup from "./Backup.js";
import { open } from 'lmdb-store'
import fs from "fs/promises";
import Path from "path"

export default class Database {
    #meta;
    _db;
    #deleted = false;
    constructor(name, path = "storage/") {
        return (async () => {
            let pack = JSON.parse(await fs.readFile("package.json", "utf8"));
            try {
                this.#meta = await loadMeta(name);
            } catch {
                this.#meta = {
                    name: name,
                    version: pack.version,
                    tables: {},
                };
                await saveMeta(this.meta.name, this.meta);
            }

            this._db = open({
                path: Path.join(path, name),
            });

            if (this.#meta.version !== pack.version) {
                let upgrade = await import("./Upgrade.js");
                await upgrade.default(this.#meta.version, pack.version);
                this.#meta.version = pack.version;
                await saveMeta(this.meta.name, this.meta);
            }
            this.#loadedTables = {};
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
                saveMeta(this.meta.name, this.meta);
            }
            this.#loadedTables[name] = new Table(
                tableMeta,
                async (data) => {
                    this.#meta.tables[name] = data;

                    await saveMeta(this.meta.name, this.meta);
                },
                this._db
            );
        }

        return this.#loadedTables[name];
    }

    async delete() {
        this.#deleted = true;
        this.#loadedTables = {};
        await this._db.close();
        await fs.rm("storage/" + this.#meta.name, {
            recursive: true,
        });
        await fs.rm(`storage/${this.#meta.name}.meta.json`, {
            recursive: true,
        });
    }

    close() {
        this._db.close()
    }

    get backup() {
        return new Backup(this._db);
    }
}

async function saveMeta(name, data) {
    await fs.mkdir("storage/", { recursive: true });
    await fs.writeFile(
        "storage/" + name + ".meta.json",
        JSON.stringify(data, null, 4),
    );
}

async function loadMeta(name) {
    let meta = await fs.readFile("storage/" + name + ".meta.json", "utf8");
    return JSON.parse(meta);
}
