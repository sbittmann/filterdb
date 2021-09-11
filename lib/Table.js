import { nanoid } from "nanoid/async";
import Query from "./Query.js";

export default class Table {
    #db;
    #meta;
    #metaChange;
    constructor(meta, metaChange, db) {
        this.#meta = meta;
        this.#metaChange = async () => {
            await metaChange(this.#meta);
        };
        this.#db = db;
    }

    get meta() {
        return this.#meta;
    }

    #databaseKey(id) {
        return [`table.${this.#meta.name}.data`, id]
    }

    #indexKey(indexName, value, id, meta) {
        return [`table.${this.#meta.name}.index.${indexName}`, value, id]
    }

    async get(id) {
        let val = await this.#db.get(this.#databaseKey(id));
        if(val) {
            return val;
        }
        return null;
    }

    async ensureIndex(name, rebuild = false) {
        let index = this.#meta.indexes[name];
        if (!index || index.build !== true) {
            this.#meta.indexes[name] = { name, build: false };
            await this.#metaChange();
            //await this.#dataDb.ensureIndex(name, true);

            this.#meta.indexes[name] = { name, build: true };
            await this.#metaChange();
            return;
        }
        //await this.#dataDb.ensureIndex(name, rebuild);
    }

    async removeIndex(name) {
        let index = this.#meta.indexes[name];
        if (!index || index.build !== true) {
            this.#meta.indexes[name] = { name, build: false };
            await this.#metaChange();
            //await this.#dataDb.ensureIndex(name, true);

            this.#meta.indexes[name] = { name, build: true };
            await this.#metaChange();
            return;
        }
        //await this.#dataDb.ensureIndex(name, rebuild);
    }

    async find(func, context = {}) {
        let q = new Query(this.#db, this.#meta, func, context, this.#databaseKey.bind(this), this.#indexKey.bind(this));
        let stream = q.execute();
        let result = null;
        for await (let row of stream) {
            stream.destroy();
            result = row;
            break;
        }
        return result;
    }

    filter(func, context = {}) {
        let q = new Query(this.#db, this.#meta, func, context, this.#databaseKey.bind(this), this.#indexKey.bind(this));
        let result = q.execute();

        result.then = async (cb) => {
            let recordSet = [];
            for await (let row of result) {
                recordSet.push(row);
            }
            cb(recordSet);
        };
        return result;
    }

    async push(data) {
        let id = data._id;
        if (!id) {
            id = await nanoid();
            data._id = id;
        }

        return await this.#db.transactionAsync(() => {
            let hadOld = false;
            let old;
            
            if(data._id) {
                hadOld = true;
                old = this.#db.get(this.#databaseKey(data._id));
            }

            for(let prop in this.meta.indexes) {
                if(hadOld && old) {
                    let val = old[prop];
                    if(val !== undefined && val !== null) {
                        this.#db.remove(this.#indexKey(prop, val, id))
                    }
                }

                let val = data[prop];
                if(val !== undefined && val !== null) {
                    this.#db.put(this.#indexKey(prop, val, id), null)
                }
            }

            this.#db.put(this.#databaseKey(id), data)
            return id;
        })
    }

    async remove(id) {
        return await this.#db.transactionAsync(() => {
            let old = this.#db.get(this.#databaseKey(id));
            if(old) {
                for(let prop in this.meta.indexes) {
                    let val = old[prop];
                    if(val !== undefined && val !== null) {
                        this.#db.remove(this.#indexKey(prop, val, id))
                    }
                }
            }
            this.#db.remove(this.#databaseKey(id));
        })
    }
}
