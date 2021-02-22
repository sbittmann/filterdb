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
        console.log(value);
        await this.#db.put(this.#getKey(key), value)
    }

    async del (key) {
        return await this.#db.del(this.#getKey(key))
    }

    iterator(options) {
        options = options || {}
        return this.#db.iterator({
            gte: this.#getKey(options.gte || Encoding.LO),
            lte: this.#getKey(options.lte || Encoding.HI)
        })
    } 

    createReadStream(options) {
        options = options || {}
        return this.#db.createReadStream({
            gte: this.#getKey(options.gte || Encoding.LO),
            lte: this.#getKey(options.lte || Encoding.HI)
        })
    }
}

