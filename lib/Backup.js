import fs from "fs/promises"

export default class Backup {
    #db
    constructor(db) {
        this.#db = db
    }
    async create(filepath) {
        let s = this.#db.createReadStream();
        for await(let d of s) {
            console.log(d);
        }
    }

    import(filepath) {

    }
}