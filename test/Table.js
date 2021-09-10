import Database from "../lib/Database.js";
import fs from "fs/promises";
import { expect } from "chai";

let dbname = "tableTest";
let tableName = "test"

describe("Table", () => {
    let db;

    before(async () => {
        try {
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
        } catch {}
        db = await new Database(dbname);
    });
    after(async () => {
        await db.delete();
    });

    describe("#constructor(name)", () => {
        it("should not allow empty name", async () => {
            expect(db.table.bind(null)).to.throw
            expect(db.table.bind(null, null)).to.throw
            expect(db.table.bind(null, "")).to.throw         
        });
        
    });
    describe(".meta", () => {
        it("should return correct meta info", async () => {
            let meta = db.table(tableName).meta
            expect(meta.name).to.be.equal(tableName);
        });
    });
    describe(".ensureIndex(name)", () => {
        it("should create an Index", async () => {
            await db.table(tableName).ensureIndex("name");
        });
    });
    describe(".push(value)", () => {
        let id;

        it("should insert value and return id", async () => {
            id = await db.table(tableName).push({test: true});
            expect(id).to.be.a('string')
        });
        it("should update object", async () => {
            let updateId = await db.table(tableName).push({_id: id, test: false});
            expect(updateId).to.be.equal(id);
        });
    });
    describe(".get(value)", () => {
        it("should return object by key", async () => {
            let id = "testId123456789"
            await db.table(tableName).push({_id: id, test: true})
            let val = await db.table(tableName).get(id);
            expect(val).to.be.a("object");
            expect(val.test).to.be.equal(true);
        });
    });
    describe(".remove(key)", () => {
        it("should delete object", async () => {
            let id = await db.table(tableName).push({test: true});
            await db.table(tableName).remove(id);
            let val = await db.table(tableName).get(id);
            expect(val).to.be.equal(null);
        });
    });
    describe(".find(key)", () => {
        it("should find inserted object", async () => {
            let name = "Max Mustermann";
            let id = await db.table(tableName).push({name: name});
            let result = await db.table(tableName).find((l) => { 
                return l.name === name; 
            }, { 
                name 
            });
            expect(result).to.be.a("object");
            expect(result.value.name).to.be.equal(name);
            expect(result.value._id).to.be.equal(id);

        });
    });
});
