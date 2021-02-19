import {v4 as uuidv4} from "uuid"
import QueryEngine from './QueryEngine.js'
import QueryEngineJS from "./QueryEngineJS.js"
import Hooks from "./TableHooks.js"
import Index from "./TableIndex.js"


export default class Table {
    #db
    #meta
    #metaChange
    constructor(meta, metaChange, db) {
        this.#meta = meta
        this.#metaChange = async () => { await metaChange(this.#meta) }
        this.#db = QueryEngine(db);
        Hooks(this.#db.dataDB);
        Index(this.#db);
        for(let i = 0; i < this.#meta.indexes.length; i++) {
            let index = this.#meta.indexes[i]
            this.ensureIndex(index.name, !index.build);
        }
        this.#db.query.use(QueryEngineJS());
    }

    get meta() {
        return this.#meta;
    }

    async get(id) {
        return await this.#db.dataDB.get(id);
    }


    async ensureIndex(name, rebuild = false) {
        let index = this.#meta.indexes[name]
        if(!index || index.build !== true) {
                
            this.#meta.indexes[name] = {name, build: false};
            await this.#metaChange();
            await this.#db.ensureIndex(name, true);    
            
            this.#meta.indexes[name] = {name, build: true};
            await this.#metaChange();
            return;
        }
        
        await this.#db.ensureIndex(name, rebuild);
    }
    
    async find(func) {
        return await new Promise((resolve, reject) => {
            let stream = this.#db.query(func);
            stream.on("data", (data) => {
                stream.destroy();
                resolve(data);
            });
            stream.on("error", (err) => {
                console.log(err)
            })
            stream.on("end", () => {
                resolve(null);
            });
        });
    }

    async filter(func) {
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
                resolve(result);
            });
        });
    }

    async push(data) {
        let id = data._id
        if(!id) {
            id = uuidv4();
            data._id = id;
        }
        await this.#db.dataDB.put(id, data);
        
        return id;
    }

    async remove(id) {
        await this.#db.dataDB.del(id);
    }
}
