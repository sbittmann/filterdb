import Database from "../lib/Database.js";
import fs from "fs/promises";
import { expect } from "chai";

let dbname = "vmTableTest";

describe("VirtualTable (class)", () => {
    let db;
    let entry = {_id: "testId", test: true}
    before(async () => {
        try {
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
        } catch {}

        db = await new Database(dbname);
        await db.table("test").ensureIndex("test");
        await db.table("test").save(entry);
    });
    after(async () => {
        await db.delete();
    });

    describe(".meta", () => {
        it("should return same as no virtual Table", async () => {
            let meta = await db.table("test").filter((row) => { return row.test === true }).map(`(row) => { return db.table("test").meta }`);
            expect(meta[0]).to.be.eql(db.table("test").meta);
        });
    })

    describe(".get(id)", () => {
        it("should return entry by id", async () => {
            let get = await db.table("test").filter((row) => { return row.test === true }).map(`(row) => { return db.table("test").get(id) }`, {id: entry._id});
            expect(get[0]).to.be.eql(entry);
        });
        it("should return undefined if id not avaiable", async () => {
            let get = await db.table("test").filter((row) => { return row.test === true }).map(`(row) => { return db.table("test").get(id) }`, {id: 50});
            expect(get[0]).to.be.equal(undefined)
        });
    })

    describe(".find(query, context)", () => {
        it("should return entry by query", async () => {
            let get = await db.table("test").filter((row) => { return row.test === true }).map(`(row) => { return db.table("test").find((row) => row.test === true) }`);
            expect(get[0]).to.be.eql(entry);
        });
        it("should return undefined if id not avaiable", async () => {
            let get = await db.table("test").filter((row) => { return row.test === true }).map(`(row) => { return db.table("test").find((row) => row.test === test, {test}) }`, {test: 50});
            expect(get[0]).to.be.equal(undefined)
        });
    })

    describe(".filter(query, context)", () => {
        it("should return array from query", async () => {
            let get = await db.table("test").filter((row) => { return row.test === true }).map(`(row) => { return db.table("test").filter((row) => row.test === true) }`);
            expect(get[0][0]).to.be.eql(entry);
        });
    })
});