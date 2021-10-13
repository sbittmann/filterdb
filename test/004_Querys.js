import Database from "../lib/Database.js";
import Backup from "../lib/Backup.js";
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


        await db.table("persons").push({name: "Maxi Mustermann", birthdate: "1976-02-01T00:00:00.000Z"});
        await db.table("persons").push({name: "Maxi Mustermann", birthdate: "1976-02-01T00:00:00.000Z"});
        await db.table("persons").push({name: "Maxi Mustermann", birthdate: "1976-02-01T00:00:00.000Z"});
        maxMustermann = await db.table("persons").push({name: "Max Mustermann", birthdate: "1976-02-01T00:00:00.000Z"});
        
    });
    
    describe("return row.name === name", async () => {
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

        it("should use index", async () => {
            let q = result.getQuery();
            expect(q.indexes.name).to.be.gte(0);
            expect(q.interpreterNeeded).to.be.equal(false)
        });
    });

    describe("return row.name === name && row.birthdate === birthdate", async () => {
        let name = "Maxi Mustermann"
        let birthdate = "1976-02-01T00:00:00.000Z"
        let result

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

        /*it("should use the avaiable index and interpreter", async () => {
            let q = result.getQuery();
            console.log(q);
            expect(q.indexes.name).to.be.gte(0);
            expect(q.interpreterNeeded).to.be.equal(true)
        });*/
    });

    after(async () => {
        await db.delete();
    });
})