import Database from "../lib/Database.js";
import fs from "fs/promises";
import { expect } from "chai";

let dbname = "querysTest";

describe("Querys", () => {
    let db;
    let maxMustermann;

    before(async () => {
        try {
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
            
        } catch {}
        

        db = await new Database(dbname);
        await db.table("persons").ensureIndex("name");
        await db.table("persons").ensureIndex("activeSince");


        await db.table("persons").save({_id: 1, name: "Maxi Mustermann", birthdate: "1976-02-01T00:00:00.000Z", activeSince: 2001});
        await db.table("persons").save({_id: 2, name: "Maxi Mustermann", birthdate: "1976-02-01T00:00:00.000Z", activeSince: 2002});
        await db.table("persons").save({_id: 3, name: "Maxi Mustermann", birthdate: "1976-02-01T00:00:00.000Z", activeSince: 2003});

        await db.table("persons").save({_id: 4,name: "Max Mustermann", birthdate: "1976-02-01T00:00:00.000Z", activeSince: 2004});
        maxMustermann = 4
        
    });

    after(async () => {
        await db.delete();
    });
    
    describe("(row) => { return row.name === name }", async () => {
        let name = "Max Mustermann"
        let result

        before(async () => {
            result = await db.table("persons").filter((row) => { 
                return row.name === name
            }, { name })
        });
        
        it("should find one entry", async () => {
            expect(result.length).to.be.equal(1);
        });

        it("should find entry with correct data", async () => {
            expect(result[0].name).to.be.equal(name);
            expect(result[0]._id).to.be.equal(maxMustermann);
        });

        it("should use index without interpreter", async () => {
            let q = result.getQuery();
            expect(q.indexes.name).to.be.gte(1);
            expect(q.interpreterNeeded).to.be.equal(false)
        });
    });

    describe("(row) => row.name === name", async () => {
        let name = "Max Mustermann"
        let result

        before(async () => {
            result = await db.table("persons").filter(
            row => row.name === name
            , { name })
        });
        
        it("should find one entry", async () => {
            expect(result.length).to.be.equal(1);
        });

        it("should find entry with correct data", async () => {
            expect(result[0].name).to.be.equal(name);
            expect(result[0]._id).to.be.equal(maxMustermann);
        });

        it("should use index without interpreter", async () => {
            let q = result.getQuery();
            expect(q.indexes.name).to.be.gte(1);
            expect(q.interpreterNeeded).to.be.equal(false)
        });
    });

    describe("(row) => { return row.name === name && row.birthdate === birthdate }", async () => {
        let name = "Maxi Mustermann"
        let birthdate = "1976-02-01T00:00:00.000Z"
        let result;

        before(async () => {
            result = await db.table("persons").filter((row) => { 
                return row.name === name && row.birthdate === birthdate
            }, { name, birthdate })
        });
        
        it("should find 3 entries only", async () => {
            expect(result.length).to.be.equal(3);
        });

        it("should find entry with correct data", async () => {
            for(let row of result) {
                expect(row.name).to.be.equal(name);
                expect(row.birthdate).to.be.equal(birthdate);
            }
        });

        it("should use the avaiable index and interpreter", async () => {
            let q = result.getQuery();
            expect(q.indexes.name).to.be.gte(1);
            expect(q.interpreterNeeded).to.be.equal(true)
        });
    });

    describe("(row) => { return row.name !== name }", async () => {
        let name = "Maxi Mustermann"
        let result

        before(async () => {
            result = await db.table("persons").filter((row) => { 
                return row.name !== name
            }, { name })
        });
        
        it("should find one entry", async () => {
            expect(result.length).to.be.equal(1);
        });

        it("should find entry with correct data", async () => {
            expect(result[0].name).to.be.not.equal(name);
            expect(result[0]._id).to.be.equal(maxMustermann);
        });

        it("should use index without interpreter", async () => {
            let q = result.getQuery();
            expect(q.indexes.name).to.be.gte(1);
            expect(q.interpreterNeeded).to.be.equal(false)
        });
    });

    describe("(row) => { return row.activeSince > activeSince }", async () => {
        let result
        let activeSince = 2002

        before(async () => {
            result = await db.table("persons").filter((row) => { 
                return row.activeSince > activeSince 
            }, { activeSince })
        });
        
        it("should find one entry", async () => {
            expect(result.length).to.be.equal(2);
        });

        it("should find entry with correct data", async () => {
            for(let row of result) {
                expect(row.activeSince).to.be.greaterThan(activeSince);
            }
        });

        it("should use index without interpreter", async () => {
            let q = result.getQuery();
            expect(q.indexes.activeSince).to.be.gte(1);
            expect(q.interpreterNeeded).to.be.equal(false)
        });
    });
})