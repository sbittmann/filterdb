import Database from "../lib/Database.js";
import Backup from "../lib/Backup.js";
import fs from "fs/promises";
import { expect } from "chai";

let dbname = "backupTest";

describe("Backup", () => {
    let db;
    let id;

    before(async () => {
        try {
            await fs.rm(`./storage/${dbname}`, {
                recursive: true,
            });
            
        } catch {}
        try {
            await fs.rm(`./storage/backup/`, {
                recursive: true,
            });
        } catch {}
        

        db = await new Database(dbname);
        id = await db.table("test").push({backUpTest: true});
    });
    after(async () => {
        await db.delete();
    });
    describe(".create(filepath)", () => {
        it("should create BackUp with data", async () => {
            await db.backup.create("storage/backup/");
            let db2 = await new Database("backup");
            let data = await db2.table("test").get(id);
            expect(data).to.be.a("object");
            expect(data.backUpTest).to.be.equal(true);
        });
    });
})