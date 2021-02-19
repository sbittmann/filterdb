import Table from "./Table.js"
import level from "level"
import subLevel from 'subleveldown'
import fs from "fs/promises"


export default class Database {
    #meta
    constructor(name) {
        return (async () => {
            let pack = JSON.parse(await fs.readFile("package.json", 'utf8'));
            try {
                let meta = await fs.readFile('storage/' + name + '.meta.json', 'utf8');
                this.#meta = JSON.parse(meta);
            } catch {
                this.#meta = {
                    name: name,
                    version: pack.version,
                    tables: {

                    }
                }
                await fs.writeFile('storage/' + this.#meta.name + '.meta.json', JSON.stringify(this.#meta));
            }
            
            this.db = level('storage/' + name, {
                valueEncoding: 'json'
            });

            if(this.#meta.version !== pack.version) {
                let upgrade = await import("./upgrade.js");
                await upgrade.default(this.#meta.version, pack.version);
                this.#meta.version = pack.version;
                await fs.writeFile('storage/' + this.#meta.name + '.meta.json', JSON.stringify(this.#meta));
            }
            this.#loadedTables = {}
            return this;
        })();
        
    }

    get meta() {
        return this.#meta;
    }

    #loadedTables

    table(name) {
        if(this.#loadedTables[name] === undefined) {
            let tableMeta = this.#meta.tables[name];
            if(tableMeta === undefined) {
                tableMeta = {
                    name,
                    indexes: {}
                }
                this.#meta.tables[name] = tableMeta
                fs.writeFile('storage/' + this.#meta.name + '.meta.json', JSON.stringify(this.#meta));
            }
            this.#loadedTables[name] = new Table(tableMeta, async (data) => {
                this.#meta.tables[name] = data;

                await fs.writeFile('storage/' + this.#meta.name + '.meta.json', JSON.stringify(this.meta, null, 4));
                
            }, subLevel(this.db, name));  
        }
        
        return this.#loadedTables[name];
    }
    startPerf() {

    }
    getPerf() {

    }
    stopPerf() {
        
    }
}