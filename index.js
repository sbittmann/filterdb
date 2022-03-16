import Database from "./lib/Database.js";
import Server from "./plugins/Server.js";

let db = await new Database("testIndex", {
    plugins: [
        new Server({
            port: 8080,
        }),
    ],
});

let tableName = "documents";

await db.table(tableName).ensureIndex("name");
await db.table(tableName).ensureIndex("test");

let id = await db.table(tableName).save({ title: "Mr." });
let id2 = await db.table(tableName).save({ title: "" });

await db.table(tableName).ensureIndex("title");

let r = await db.table(tableName).find((row) => row.title == "Mr.");

console.log(r);
