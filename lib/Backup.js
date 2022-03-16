import fs from "fs/promises";

export default class Backup {
    #db;
    constructor(db) {
        this.#db = db;
    }

    async create(filepath) {
        await fs.mkdir(filepath, { recursive: true });
        return await this.#db.backup(filepath);
    }
}
