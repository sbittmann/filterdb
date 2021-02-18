import Database from "./lib/Database.js"

let db = new Database();

(async () => {
    let id = await db.table("cases").push({test: "test"});
    console.log("ID: ", id);

    let values = await db.table("cases").get(id);
    console.log("GOT:", values);

    let r = await db.table("cases").find((row) => {
        return row.test === 'test'
    });

    db.table("cases").remove(r._id);
    console.log(r);

    let r2 = await db.table("cases").filter((row) => {
        return row.test === 'test' && row.test2 === 2
    });

    console.log(r2);

})()
