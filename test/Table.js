import Database from "../lib/Database.js"
import Table from "../lib/Table.js"
import fs from "fs/promises"
import { expect } from 'chai'

let dbname = "tableTest"

describe("Table", () => {
    let db;

    before(async () => {
        await fs.rmdir(`./storage/${dbname}`, {
            recursive: true
        });
        db = await new Database(dbname);
    });
    after(async () => {
        await db.delete();
    });

    describe("#constructor(name)", () => {
        it("should not allow empty name", async () => {

        });
    })
});