import Database from "../lib/Database.js";
import Table from "../lib/Table.js";
import Backup from "../lib/Backup.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Server from "../plugins/Server.js";
import { shouldThrow } from "./utils.js";
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

        db = await new Database(dbname, {
            user: "admin",
            password: "admin",
        });
    });
    after(async () => {
        try {
            /*await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });*/
        } catch {}
    });

    describe("#constructor(databaseName)", () => {
        it("should create database files", async () => {
            let dbDir = await fs.readdir(`./storage/${dbname}`);
            expect(dbDir).to.have.lengthOf.greaterThan(0);
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
        let __dirname = path.dirname(fileURLToPath(import.meta.url));
        let pack;
        before(async () => {
            pack = JSON.parse(await fs.readFile(path.join(__dirname, "..", "package.json"), "utf8"));
        });

        it("should return correct name", async () => {
            expect(db.meta().name).to.be.equal(dbname);
        });
        it("should return correct version", async () => {
            expect(db.meta().version).to.be.equal(pack.version);
        });
        it("should have table object", async () => {
            expect(db.meta().tables).to.be.a("object");
        });
    });

    describe(".extend(plugin)", () => {
        it("should extend with plugin", async () => {
            await db.extend(new Server());
        });
    });

    describe(".close()", () => {
        before(async () => {
            await db.close();
        });
        after(async () => {
            db = await new Database(dbname);
        });
    });
    describe(".delete()", () => {
        before(async () => {
            await db.delete();
        });

        it("should throw on get meta data", async () => {
            await shouldThrow(() => {
                let meta = db.meta();
            });
        });
        it("should throw on table", async () => {
            await shouldThrow(() => {
                let table = db.table("test");
            });
        });
        it("should delete database files", async () => {
            /*await shouldThrow(async () => {
                await fs.readdir(`./storage/${dbname}`);
            });*/
        });
    });
});
