import Database from "./lib/Database.js";
import faker from "faker";

(async () => {
    let db = await new Database("test", {
        cluster: {
            id: "1",
            port: 8080,
        },
        server: {
            port: 8000
        }
    });
    console.log("open1")
    let db2 = await new Database("test", {
        cluster: {
            id: "2",
            port: 8081,
            peers: ["localhost:8080"]
        },
        
    });
    console.log("open2")
    let db3 = await new Database("test", {
        cluster: {
            id: "3",
            port: 8082,
            peers: ["localhost:8081"]
        },
    });
    console.log("open3")
    let db4 = await new Database("test", {
        cluster: {
            id: "4",
            port: 8083,
            peers: ["localhost:8081"]
        },
        
    });
    console.log("open4")
    

    setTimeout(() => {
        console.log("CLOSING")
        db.close();
        db2.close();

        setTimeout(async () => {
            await db.start();
            console.log("DB STARTED AGAIN")
        }, 2000)
    }, 5000)

    let persons = [];

    await db.table("persons").ensureIndex("name");
    await db.table("persons").ensureIndex("username");
    await db.table("persons").ensureIndex("email");

    for (let i = 0; i < 1; i++) {
        persons.push(faker.helpers.userCard());
    }
    

    for (let i = 0; i < persons.length; i++) {
        let r = await db.table("persons").push(persons[i]);
    }

    await db.table("persons").push({name: "Stefan Bittmann"});

    let val = "Stefan Bittmann";
    let r = await db.table("persons").filter((row) => {
        return row.name === val;
    },{
        val,
    });
})();
