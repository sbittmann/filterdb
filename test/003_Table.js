import Database from "../lib/Database.js";
import fs from "fs/promises";
import { expect } from "chai";

let dbname = "tableTest";
let tableName = "test"

describe("Table (class)", () => {
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
            expect(() => { db.table() }).to.throw()
            expect(() => { db.table(null) }).to.throw()
            expect(() => { db.table("") }).to.throw()         
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
            await db.table(tableName).ensureIndex("test");
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
            expect(result.name).to.be.equal(name);
            expect(result._id).to.be.equal(id);
        });

        it("should use simple index", async () => {
            let name = "Max Mustermann";
            let name2 = "Maxi Mustermann";
            await db.table(tableName).push({name: name});
            await db.table(tableName).push({name: name2});

            let result = await db.table(tableName).find((l) => { 
                return l.name === name; 
            }, { 
                name
            });

            expect(result.name).to.be.equal(name);
            expect(result.getQuery().indexes.name).to.be.a("number");

        })

        it("should use index with AND syntax", async () => {
            let name = "Maxi Mustermann";
            await db.table(tableName).push({name: name, test: true});

            let result = await db.table(tableName).find((l) => { 
                return l.name === name && l.test === true; 
            }, { 
                name
            });

            let q = result.getQuery();

            expect(result.name).to.be.equal(name);
            expect(q.indexes.name).to.be.a("number");
            expect(q.indexes.test).to.be.a("number");
        })

        
        it("should use index with OR syntax", async () => {
            let name = "Maxi Mustermann";
            await db.table(tableName).push({name: name, test: true});

            let result = await db.table(tableName).find((l) => { 
                return l.name === name || l.test === true; 
            }, { 
                name
            });

            let q = result.getQuery();

            expect(result.name).to.be.equal(name);
            expect(q.indexes.name).to.be.a("number");
            expect(q.indexes.test).to.be.a("number");
        })

        it("should work without index", async () => { 
            let notIndexed = "123";
            let id = await db.table(tableName).push({notIndexed, test: true});

            let result = await db.table(tableName).find((l) => { 
                return l.notIndexed === notIndexed;
            }, { 
                notIndexed
            });

            expect(result).to.be.a("object");
            expect(result.notIndexed).to.be.equal(notIndexed);
            expect(result._id).to.be.equal(id);
        })
    });
});
