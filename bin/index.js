#!/usr/bin/env node
import minimist from "minimist"
import Database from "../lib/Database.js"

let argv = minimist(process.argv.slice(2));


let db = await new Database(argv.name || "database", {
    path: argv.path || "./database/",
    server: {
        port: argv.port || 8080,
        auth: true,
    }
});

await db.users.save({_id: "root", password: "root"})
await db.groups.save({_id: "admin", rights: ["readall", "configure"]})



/*
db.table("_users").before("query", async (data) => {

});

db.table("_users").after("query", async (data) => {

});

db.table("_users").after("save", async (change) => {

});*/