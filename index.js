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

await db.table(tableName).ensureIndex("test");
await db.table(tableName).ensureIndex("name");

let id = await db.table(tableName).save({ name: "Max Mustermann" });
let id2 = await db.table(tableName).save({ test: false });

let r = await db.table(tableName).filter((row) => {
    return row.nested.nested.not.there;
});

console.log(r);
console.dir(r.getQuery(), { depth: null });
