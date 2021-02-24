import Table from "./Table.js";
import level from "level";
import SubLevel from "./SubLevel.js";
import Backup from "./Backup.js";
import Encoding from "./Encoding.js";
import fs from "fs/promises";

export default class Database {
    #meta;
    #db;
    #deleted = false;
    constructor(name) {
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

            this.#db = level("storage/" + name, {
                keyEncoding: Encoding.encoding,
                valueEncoding: "json",
            });
            /*let s = this.#db.createReadStream();
            s.on("data", (d) => {
                console.log(d);
            })*/

            if (this.#meta.version !== pack.version) {
                let upgrade = await import("./upgrade.js");
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
                new SubLevel(this.#db, "table." + name),
            );
        }

        return this.#loadedTables[name];
    }

    async delete() {
        this.#deleted = true;
        this.#loadedTables = {};
        await this.#db.close();
        await fs.rm("storage/" + this.#meta.name, {
            recursive: true,
        });
        await fs.rm(`storage/${this.#meta.name}.meta.json`, {
            recursive: true,
        });
    }

    get backup() {
        return new Backup(this.#db);
    }
}

async function saveMeta(name, data) {
    await fs.writeFile(
        "storage/" + name + ".meta.json",
        JSON.stringify(data, null, 4),
    );
}

async function loadMeta(name) {
    let meta = await fs.readFile("storage/" + name + ".meta.json", "utf8");
    return JSON.parse(meta);
}
