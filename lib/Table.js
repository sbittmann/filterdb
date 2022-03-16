import { nanoid } from "nanoid/async";
import { tableKey, indexKey } from "./utils.js";
import Query from "./Query.js";

export default class Table {
    #db;
    #meta;
    #metaChange;
    #threadPool;
    #token;

    constructor(meta, metaChange, db, threadPool, token, getUserFn, system) {
        this.#meta = meta;
        this.#metaChange = async () => {
            await metaChange(this.#meta);
        };
        this.#db = db;
        this.#threadPool = threadPool;
        this.#token = token;

        this.getUser = getUserFn;

        for (let index in meta.indexes) {
            this.ensureIndex(index, system);
        }
    }

    meta(token = this.#token) {
        let user = this.getUser(token);
        let ret = {
            name: this.#meta.name,
            indexes: this.#meta.indexes,
        };
        if (user.isTableManager(this.#meta.namae)) {
            ret = this.#meta;
        }

        return ret;
    }

    #tableKey(id) {
        return tableKey(this.#meta.name, id);
    }

    #indexKey(indexName, value, id) {
        return indexKey(this.#meta.name, indexName, value, id);
    }

    async get(id, token = this.#token) {
        let user = this.getUser(token);
        let data = await this.#db.getData(this.#tableKey(id));
        return data;
    }

    async ensureIndex(name, token = this.#token) {
        let index = this.#meta.indexes[name];
        if (!index || index.build !== true) {
            this.#meta.indexes[name] = { name, build: false };
            await this.#metaChange();

            await this.#threadPool.createIndex({
                name: name,
                meta: this.#meta,
            });

            this.#meta.indexes[name] = { name, build: true };
            await this.#metaChange();
        }
    }

    async removeIndex(name, token = this.#token) {
        let index = this.#meta.indexes[name];
        if (index) {
            this.#meta.indexes[name] = { name, build: false, delete: true };
            await this.#metaChange();

            await this.#threadPool.removeIndex({
                name: name,
                meta: this.#meta,
            });

            delete this.#meta.indexes[name];
            await this.#metaChange();
            return;
        }
    }

    async find(func, context = {}, token = this.#token) {
        let query = new Query(this.#threadPool, {
            query: func,
            context,
            meta: this.#meta,
            token: token,
        });

        let result = null;
        for await (let row of query) {
            query.destroy();
            result = row;
            if (result !== undefined) {
                result.getQuery = () => query.getQuery();
            }
            break;
        }
        return result;
    }

    filter(func, context = {}, token = this.#token) {
        return new Query(this.#threadPool, {
            query: func,
            context,
            meta: this.#meta,
            token: token,
        });
    }

    async save(data, token = this.#token) {
        let id = data._id;
        if (!id) {
            id = await nanoid();
            data._id = id;
        }

        let _id = await this.#db.transaction(() => {
            let hadOld = false;
            let old;

            if (data._id) {
                hadOld = true;
                old = this.#db.getData(this.#tableKey(data._id));
            }

            for (let prop in this.#meta.indexes) {
                if (hadOld && old) {
                    let val = old[prop];
                    if (val === data[prop]) {
                        continue;
                    }
                    this.#db.removeIdx(this.#indexKey(prop, val), id);
                }

                let val = data[prop];
                this.#db.putIdx(this.#indexKey(prop, val), id);
            }

            this.#db.putData(this.#tableKey(id), data);
            return id;
        });
        return id;
    }

    async remove(id, token = this.#token) {
        let old;
        await this.#db.transaction(() => {
            old = this.#db.getData(this.#tableKey(id));
            if (old) {
                for (let prop in this.#meta.indexes) {
                    let val = old[prop];
                    this.#db.removeIdx(this.#indexKey(prop, val), id);
                }
            }
            this.#db.removeData(this.#tableKey(id));
        });
    }
}
