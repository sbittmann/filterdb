import Database from "./lib/Database.js";
import Server from "./plugins/Server.js";

let db = await new Database("documentGenerator", {
    plugins: [
        new Server({
            port: 8080,
        }),
    ],
});
//await db.table("documents").save({ test: true });
