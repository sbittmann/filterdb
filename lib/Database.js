import Table from "./Table.js";
import Backup from "./Backup.js";
import Cluster from "./Cluster.js";
import Server from "./Server.js";
import { open } from 'lmdb-store'
import fs from "fs/promises";
import Path from "path"

export default class Database {
    #meta;
    #name;
    #path;
    #serverSettings;
    #clusterSettings;

    _db;
    #deleted = false;
    #server
    #cluster
    constructor(name, {path = "storage/", server = {}, cluster = {}} = {}) {
        return (async () => {
            this.#name = name;
            this.#path = path;
            this.#serverSettings = server
            this.#clusterSettings = cluster
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
            throw new Error("No able to work without tableName");
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
                saveMeta(this.meta.name, this.meta);
            }
            this.#loadedTables[name] = new Table(
                tableMeta,
                async (data) => {
                    this.#meta.tables[name] = data;

                    await saveMeta(this.meta.name, this.meta);
                },
                this._db,
                this.#cluster,
                this.#server
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
        this._db.close();
        if(this.#cluster) {
            this.#cluster.close();
        }
        if(this.#server) {
            this.#server.close();
        }
    }

    async start() {
        let pack = JSON.parse(await fs.readFile("package.json", "utf8"));
        try {
            this.#meta = await loadMeta(this.#name);
        } catch {
            this.#meta = {
                name: this.#name,
                version: pack.version,
                tables: {},
            };
            await saveMeta(this.meta.name, this.meta);
        }

        this._db = open({
            path: Path.join(this.#path, this.#name),
        });

        if (this.#meta.version !== pack.version) {
            let upgrade = await import("./Upgrade.js");
            await upgrade.default(this.#meta.version, pack.version);
            this.#meta.version = pack.version;
            await saveMeta(this.meta.name, this.meta);
        }

        if(this.#clusterSettings.port) {
            if(!this.#cluster) {
                this.#cluster = await new Cluster({
                    id: this.#clusterSettings.id,
                    peers: this.#clusterSettings.peers,
                    port: this.#clusterSettings.port,
                    address: `localhost:${this.#clusterSettings.port}`,
                })
            } else {
                await this.#cluster.start()
            }
            
        }
        if(this.#serverSettings.port) {
            this.#server = await new Server(this, {
                port: this.#serverSettings.port
            })
        }

        this.#loadedTables = {};
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