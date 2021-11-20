import Database from "../lib/Database.js";
import fs from "fs/promises";
import { expect } from "chai";
import { shouldThrow } from "./utils.js"

let dbname = "vmTest";

describe("VirtualDatabase (class)", () => {
    let db;
    before(async () => {
        try {
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
        } catch {}

        db = await new Database(dbname);
        await db.table("test").ensureIndex("test");
        await db.table("test").save({test: true});
    });
    after(async () => {
        await db.delete();
    });

    describe(".meta", () => {
        it("should return same as non virtual Database", async () => {
            let meta = await db.table("test").filter((row) => { return row.test === true }).map(`(row) => { return db.meta }`);
            expect(meta[0]).to.be.eql(db.meta);
        });
    })

    describe(".table(name)", () => {
        it("should not exit virtual space", async () => {
            let table = await db.table("test").filter((row) => { return row.test === true }).map(`(row) => { return db.table("test") }`);
            expect(table[0]).to.be.eql({});
        });
        it("should not allow empty name", async () => {
            await shouldThrow(async () => {
                await db.table("test").filter((row) => { return row.test === true }).map(`(row) => { return db.table() }`);
            })
        });
    })
});