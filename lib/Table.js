import { nanoid } from "nanoid/async";
import Query from "./Query.js";
import Perf from "./PerformanceCounter.js";
import SubLevel from "./SubLevel.js";
import Hooks from "./TableHooks.js";
import Index from "./TableIndex.js";

export default class Table {
    #dataDb;
    #indexDb;
    #meta;
    #metaChange;
    constructor(meta, metaChange, db) {
        this.#meta = meta;
        this.#metaChange = async () => {
            await metaChange(this.#meta);
        };
        this.#dataDb = new SubLevel(db, "data");
        this.#indexDb = new SubLevel(db, "index");
        Hooks(this.#dataDb);
        Index(this.#dataDb, this.#indexDb);
        for (let i = 0; i < this.#meta.indexes.length; i++) {
            let index = this.#meta.indexes[i];
            this.ensureIndex(index.name, !index.build);
        }
    }

    get meta() {
        return this.#meta;
    }

    async get(id) {
        return await this.#dataDb.get(id);
    }

    async ensureIndex(name, rebuild = false) {
        let pf = new Perf("Table", "ensureIndex");
        let index = this.#meta.indexes[name];
        if (!index || index.build !== true) {
            this.#meta.indexes[name] = { name, build: false };
            await this.#metaChange();
            await this.#dataDb.ensureIndex(name, true);

            this.#meta.indexes[name] = { name, build: true };
            await this.#metaChange();
            return;
        }

        await this.#dataDb.ensureIndex(name, rebuild);
        pf.finish();
    }

    async find(func, context = {}) {
        let pf = new Perf("Table", "find");
        let q = new Query(this.#dataDb, this.#meta, func, context);
        let stream = q.execute();
        let result = null;
        for await (let row of stream) {
            stream.destroy();
            result = row;
            break;
        }
        pf.finish();
        return result;
    }

    filter(func, context = {}) {
        let pf = new Perf("Table", "filter");
        let q = new Query(this.#dataDb, this.#meta, func, context);
        let result = q.execute();

        result.on("finish", () => {
            pf.finish();
        });

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
            let pf = new Perf("Table", "push.createId");
            id = await nanoid();
            pf.finish();
            data._id = id;
        }
        let pf = new Perf("Table", "push");
        await this.#dataDb.put(id, data);
        pf.finish();
        return id;
    }

    async remove(id) {
        let pf = new Perf("Table", "remove");
        await this.#dataDb.del(id);
        pf.finish();
    }
}
