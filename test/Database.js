import Database from "../lib/Database.js"
import Table from "../lib/Table.js"
import fs from "fs/promises"
import { expect } from 'chai'

let dbname = "databaseTest"



describe("Database", () => {
    let db
    before(async () => {
        await fs.rmdir(`./storage/${dbname}`, {
            recursive: true
        });
        db = await new Database(dbname);
    });
    after(async () => {
        await fs.rmdir(`./storage/${dbname}`, {
            recursive: true
        });
    });

    describe("#constructor()", () => {
        
        it("should create database files", async () => {
            let dbDir = await fs.readdir(`./storage/${dbname}`);
            expect(dbDir).to.have.lengthOf.greaterThan(0);
        });

        it("should create database.meta.json", async () => {
            let data = await fs.readFile(`./storage/${dbname}.meta.json`, "utf8");
            expect(data).to.not.be.undefined;
        })
    });
    describe("#table", () => {
        it("should return Table class", async () => {
            let table = db.table("test");
            expect(table).to.be.instanceOf(Table)
        });
        it("should return Table class from cache", async () => {
            let table = db.table("test");
            expect(table).to.be.instanceOf(Table)
        });
    })
})