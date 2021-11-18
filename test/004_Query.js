import Database from "../lib/Database.js";
import Query from "../lib/Query.js";
import fs from "fs/promises";
import { expect } from "chai";

let dbname = "queryTest";

describe("Query (class)", () => {
    let db;
    let tableLength = 100
    before(async () => {
        try {
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
        } catch {}

        db = await new Database(dbname);
        let p = []
        for(let i = 0; i < tableLength; i++) {
            p.push(db.table("test").save({index: i, test: true}));
        }
        await Promise.all(p);
    });
    after(async () => {
        await db.delete();
    });

    describe("table(name).filter(filterFunc)", () => {
        it("should return Query class", async () => {
            let query = db.table("test").filter((row) => row.test === true);
            expect(query).to.be.instanceOf(Query);
        });
    })
    
    describe(".sort(sortFunction)", () => {
        let sort = (a, b) => { return a.index < b.index? -1 : a.index > b.index? 1 : 0 }
        let filter = (row) => { return row.test === true }

        let arraySort
        let dbSort
        
        before(async () => {
            arraySort = (
                await db.table("test").filter(filter)
            ).sort(sort);
            dbSort = await db.table("test").filter(filter).sort(sort);
        })

        it("should return Query", async () => {
            let sorted = db.table("test").filter(filter).sort(sort)
            expect(sorted).to.be.instanceOf(Query);
        });
        it("should sort", async () => {
            for(let i = 0; i < tableLength; i++) {
                expect(dbSort[i]).to.be.eql(arraySort[i]);
            }
        });
        it("should have same length", async () => {
            expect(dbSort.length).to.be.equal(arraySort.length);
        });
    });

    describe(".map(mapFunction)", () => {
        let map = (row) => { return { i: row.index, test: !row.test } }
        let filter = (row) => { return row.test === true }

        let arrayMap
        let dbMap
        before(async () => {
            arrayMap = (
                await db.table("test").filter(filter)
            ).map(map);
            dbMap = await db.table("test").filter(filter).map(map);
        });
        it("should return Query", async () => {
            let maped = db.table("test").filter(filter).map(map)
            expect(maped).to.be.instanceOf(Query);
        });
        it("should map", async () => {
            for(let i = 0; i < tableLength; i++) {
                expect(dbMap[i]).to.be.eql(arrayMap[i]);
            }
        });
        it("should have same length", async () => {
            expect(dbMap.length).to.be.equal(arrayMap.length);
        });
    });
    
    describe(".reduce(reduceFunction)", () => {
        let reduce = (total, row) => { return total + row.index }
        let filter = (row) => { return row.test === true }

        let arrayReduce
        let dbReduce
        before(async () => {
            arrayReduce = (
                await db.table("test").filter(filter)
            ).reduce(reduce, 0);
            dbReduce = await db.table("test").filter(filter).reduce(reduce, 0);
        });
        it("should return Query", async () => {
            let reduced = db.table("test").filter(filter).reduce(reduce, 0)
            expect(reduced).to.be.instanceOf(Query);
        });
        it("should reduce", async () => {
            expect(arrayReduce).to.be.equal(dbReduce);
        });
    });

    describe(".filter(filterFunction)", () => {
        let filter2 = (row) => { return row.index <= 50 }
        let filter = (row) => { return row.test === true }

        let arrayFilter
        let dbFilter
        before(async () => {
            arrayFilter = (
                await db.table("test").filter(filter)
            ).filter(filter2);
            dbFilter = await db.table("test").filter(filter).filter(filter2);
        });
        it("should return Query", async () => {
            let reduced = db.table("test").filter(filter).filter(filter2)
            expect(reduced).to.be.instanceOf(Query);
        });
        it("should reduce", async () => {
            for(let i = 0; i < tableLength; i++) {
                expect(dbFilter[i]).to.be.eql(arrayFilter[i]);
            }
        });
    });
});
