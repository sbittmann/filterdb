//import {v4 as uuidv4} from "uuid"
import { nanoid } from "nanoid/async"
import QueryEngine from './QueryEngine.js'
import QueryEngineJS from "./QueryEngineJS.js"
import Perf from "./PerformanceCounter.js"
import SubLevel from "./SubLevel.js"
import Hooks from "./TableHooks.js"
import Index from "./TableIndex.js"


export default class Table {
    #db
    #dataDb
    #indexDb
    #meta
    #metaChange
    constructor(meta, metaChange, db) {
        this.#meta = meta
        this.#metaChange = async () => { await metaChange(this.#meta) }
        this.#dataDb =  new SubLevel(db, "data");
        this.#indexDb =  new SubLevel(db, "index");
        Hooks(this.#dataDb);
        Index(this.#dataDb, this.#indexDb);
        for(let i = 0; i < this.#meta.indexes.length; i++) {
            let index = this.#meta.indexes[i]
            this.ensureIndex(index.name, !index.build);
        }
        //this.#db.query.use(QueryEngineJS());
    }

    get meta() {
        return this.#meta;
    }

    async get(id) {
        return await this.#dataDb.get(id);
    }


    async ensureIndex(name, rebuild = false) {
        let pf = new Perf("Table", "ensureIndex");
        let index = this.#meta.indexes[name]
        if(!index || index.build !== true) {
                
            this.#meta.indexes[name] = {name, build: false};
            await this.#metaChange();
            await this.#dataDb.ensureIndex(name, true);    
            
            this.#meta.indexes[name] = {name, build: true};
            await this.#metaChange();
            return;
        }
        
        await this.#dataDb.ensureIndex(name, rebuild);
        pf.finish();
    }
    
    async find(func) {
        let pf = new Perf("Table", "find")
        return await new Promise((resolve, reject) => {
            resolve()
            /*let stream = this.#db.query(func);
            stream.on("data", (data) => {
                stream.destroy();
                resolve(data);
            });
            stream.on("error", (err) => {
                console.log(err)
            })
            stream.on("end", () => {
                pf.finish();
                resolve(null);
            });*/
        });
    }

    async filter(func) {
        let pf = new Perf("Table", "filter");
        return await new Promise((resolve, reject) => {
            let result = [];
            let stream = this.#db.query(func);
            stream.on("data", (data) => {
                result.push(data);
            });
            stream.on("error", (err) => {
                reject(err);
            })
            stream.on("end", () => {
                pf.finish();
                resolve(result);
            });
        });
    }

    async push(data) {
        
        let id = data._id
        if(!id) {
            let pf = new Perf("Table", "push.createId")
            id = await nanoid();
            pf.finish();
            data._id = id;
        }
        let pf = new Perf("Table", "push")
        await this.#dataDb.put(id, data);
        pf.finish()
        return id;
    }

    async remove(id) {
        let pf = new Perf("Table", "remove")
        await this.#dataDb.del(id);
        pf.finish()
    }
}
