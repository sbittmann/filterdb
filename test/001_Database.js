import Database from "../lib/Database.js";
import Table from "../lib/Table.js";
import Backup from "../lib/Backup.js";
import fs from "fs/promises";
import { expect } from "chai";

let dbname = "databaseTest";

describe("Database (class)", () => {
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
        try {
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
        } catch {}
    });

    describe("#constructor(databaseName)", () => {
        it("should create database files", async () => {
            let dbDir = await fs.readdir(`./storage/${dbname}`);
            expect(dbDir).to.have.lengthOf.greaterThan(0);
        });
        it("should create 'databaseName'.meta.json", async () => {
            let data = await fs.readFile(
                `./storage/${dbname}.meta.json`,
                "utf8",
            );
            expect(data).to.not.be.undefined;
        });
        it("should upgrade db without errors", async () => {
            db.close();
            let data = JSON.parse(await fs.readFile(
                `./storage/${dbname}.meta.json`,
                "utf8",
            ));
            data.version = "0.0.1";
            await fs.writeFile(
                `./storage/${dbname}.meta.json`,
                JSON.stringify(data, null, 4), {
                    encoding: "utf8"
                })
            db = await new Database(dbname);
        });
    });
    describe(".table(name)", () => {
        it("should return Table class", async () => {
            let table = db.table("test");
            expect(table).to.be.instanceOf(Table);
        });
        it("should return Table class from cache", async () => {
            let table = db.table("test");
            expect(table).to.be.instanceOf(Table);
        });
    });
    describe(".backup", () => {
        it("should return Backup class", async () => {
            let backup = db.backup;
            expect(backup).to.be.instanceOf(Backup);
        });
    });
    describe(".meta", () => {
        it("should return correct meta info", async () => {
            let meta = db.meta
            expect(meta.name).to.be.equal(dbname);
        });
    });
    describe(".close()", () => {
        before(async () => {
            await db.close();
        });
        after(async () => {
            db = await new Database(dbname);
        })
    });
    describe(".delete()", () => {
        before(async () => {
            await db.delete();
        });

        it("should delete database files", (next) => {
            fs.readdir(`./storage/${dbname}`).then(() => { 
                throw Error('should error');
            }).catch(() => {
                next();
            })
        });
        it("should delete 'database'.meta.json", (next) => {
            fs.readFile(`./storage/${dbname}.meta.json`).then(() => { 
                throw Error('should error');
            }).catch(() => {
                next();
            })
        });
    });
});
