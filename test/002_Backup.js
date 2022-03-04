import Database from "../lib/Database.js";
import Backup from "../lib/Backup.js";
import fs from "fs/promises";
import { expect } from "chai";

let dbname = "backupTest";

describe("Backup (class)", () => {
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

        db = await new Database(dbname, {
            user: "admin",
            password: "admin",
        });
        id = await db.table("test").save({ backUpTest: true });
    });
    after(async () => {
        await db.delete();
    });
    describe(".create(filepath)", () => {
        let backup;
        before(async () => {
            await db.backup.create("storage/backup/");
            console.log(await fs.readdir(`./storage/backup`));
            backup = await new Database("backup");
        });
        after(async () => {
            await backup.delete();
        });

        it("should create BackUp with data", async () => {
            let data = await backup.table("test").get(id);
            console.log(id, data);
            expect(data).to.be.a("object");
            expect(data.backUpTest).to.be.equal(true);
        });
    });
});
