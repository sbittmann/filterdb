import { nanoid } from "nanoid/async";
import * as utils from "./utils.js"
import Events from "./Events.js"

export default class Table extends Events {
    #db;
    #path;
    #meta;
    #dbname
    #metaChange;
    #threadPool
    constructor(meta, metaChange, db, path, dbname, threadPool) {
        super();
        this.#meta = meta;
        this.#metaChange = async () => {
            await metaChange(this.#meta);
        };
        this.#db = db;
        this.#path = path;
        this.#dbname = dbname;
        this.#threadPool = threadPool;
    }

    get meta() {
        return this.#meta;
    }

    #databaseKey(id) {
        return utils.tablekey(this.#meta.name, id)
    }

    #indexKey(indexName, value, id) {
        return utils.indexkey(this.#meta.name, indexName, value, id)
    }

    async get(id) {
        let before = await this.emitBefore("get", {id})
        let data = await this.#db.get(this.#databaseKey(id));
        let after = await this.emitAfter("get", {id, data})
        return data || null;
    }

    async ensureIndex(name) {
        let index = this.#meta.indexes[name];
        if (!index || index.build !== true) {
            this.#meta.indexes[name] = { name, build: false };
            await this.#metaChange();
            
            await this.#threadPool.createIndex(name, this.#meta, this.#path, this.#dbname)
            
            this.#meta.indexes[name] = { name, build: true };
            await this.#metaChange();
        }
    }

    async removeIndex(name) {
        let index = this.#meta.indexes[name];
        if (index) {
            this.#meta.indexes[name] = { name, build: false, delete: true };
            await this.#metaChange();
            
            await this.#threadPool.removeIndex(name, this.#meta, this.#path, this.#dbname)

            delete this.#meta.indexes[name];
            await this.#metaChange();
            return;
        }
    }

    async find(func, context = {}) {
        let before = await this.emitBefore("query", {func, context})
        let stream = this.#threadPool.executeQuery(func, context, this.#meta, this.#path, this.#dbname)
        let result = null;
        for await (let row of stream) {
            stream.destroy();
            result = row;
            result.getQuery = () => {
                return stream.query;
            }
            break;
        }
        let after = await this.emitAfter("query", {func, context, data: result})
        return result;
    }

    filter(func, context = {}) {
        //let before = await this.emitBefore("query", {func, context})
        let result = this.#threadPool.executeQuery(func, context, this.#meta, this.#path, this.#dbname)
        result.then = async (cb) => {
            let recordSet = [];
            recordSet.getQuery = () => {
                return result.query;
            }
            for await (let row of result) {
                recordSet.push(row);
            }
            cb(recordSet);
        };
        //let after = await this.emitAfter("query", {func, context, data: result})
        return result;
    }

    async save(data) {
        
        let id = data._id;
        if (!id) {
            id = await nanoid();
            data._id = id;
        }
        let before = await this.emitBefore("save", {id, data})

        let _id = await this.#db.transactionAsync(() => {
            let hadOld = false;
            let old;
            
            if(data._id) {
                hadOld = true;
                old = this.#db.get(this.#databaseKey(data._id));
            }

            for(let prop in this.meta.indexes) {

                if(hadOld && old) {

                    let val = old[prop];
                    if(val === data[prop]) {
                        continue;
                    }
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
        let after = await this.emitAfter("save", {id, data: {_id, ...data}})
        return id 
    }

    async remove(id) {
        let before = await this.emitBefore("remove", {id})
        let old;
        await this.#db.transactionAsync(() => {
            old = this.#db.get(this.#databaseKey(id));
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
        let after = await this.emitAfter("remove", { id, data: old })
    }
}
