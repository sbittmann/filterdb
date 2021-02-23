import Encoding from "./Encoding.js"

export default class SubLevel {
    #db
    #name
    constructor (db, name) {
        this.#db = db
        this.#name = name
    }
    
    #getKey(key) {
        if(Array.isArray(key)) {
            return [this.#name, ...key]
        }
        return [this.#name, key]
    }

    async put(key, value) {
        await this.#db.put(this.#getKey(key), value)
    }

    async del (key) {
        return await this.#db.del(this.#getKey(key))
    }

    iterator({ gte = Encoding.LO, lte = Encoding.HI, keys = true, values = true } = {}) {
        let o = options || {}
        return this.#db.iterator({
            gte: this.#getKey(gte),
            lte: this.#getKey(lte),
            keys: keys,
            values: values
        })
    } 

    createReadStream({ gte = Encoding.LO, lte = Encoding.HI, keys = true, values = true } = {}) {
        return this.#db.createReadStream({
            gte: this.#getKey(gte),
            lte: this.#getKey(lte),
            keys: keys,
            values: values
        })
    }
}

