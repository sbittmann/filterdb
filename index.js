import Database from "./lib/Database.js";
import Server from "./plugins/Server.js";
import axios from "axios";
import faker from "faker";

(async () => {
    let db = await new Database("test");
    await db.table("persons").ensureIndex("name");
    await db.table("persons").save({name: "Max Mustermann"})
    let resul = await db.table("persons").find(row => row.name === "Max Mustermann");
    console.log(resul.getQuery())
    await new Promise((res) => { setTimeout(res, 5000)})
    await db.close();
    return;
    /*
    let db2 = await new Database("test", {
        cluster: {
            id: "2",
            port: 8081,
            peers: ["localhost:8080"]
        },
        
    });
    let db3 = await new Database("test", {
        cluster: {
            id: "3",
            port: 8082,
            peers: ["localhost:8081"]
        },
    });
    let db4 = await new Database("test", {
        cluster: {
            id: "4",
            port: 8083,
            peers: ["localhost:8081"]
        },
    });
    

    setTimeout(() => {
        console.log("CLOSING")
        db.close();
        db2.close();

        setTimeout(async () => {
            await db.start();
            console.log("DB STARTED AGAIN")
        }, 5000)
    }, 3000)
    */

    let persons = [];

    await db.table("persons").ensureIndex("name");
    await db.table("persons").ensureIndex("birthdate");
    await db.table("persons").ensureIndex("email");

    await db.table("persons").push({name: "Max Mustermann"});
    await db.table("persons").push({name: "Max Mustermann"});

    let name = "Max Mustermann"
    let result = await db.table("persons").find((l) => { 
        return l.name === name; 
    }, { 
        name 
    });
    let result2 = await db.table("persons").find((l) => { 
        return l.name == newname; 
    }, { 
        newname: name 
    });
    return;

    /*for (let i = 0; i < 1; i++) {
        persons.push(faker.helpers.userCard());
    }*/
    

    /*for (let i = 0; i < persons.length; i++) {
        let r = await db.table("persons").push(persons[i]);
    }*/
    
    await db.table("persons").push({name: "Stefan Bittmann", birthdate: "19940713"});
    



    let val = "Stefan Bittmann";
    let r = await db.table("persons").filter((row) => {
        return row.birthdate === "19940713" && row.name === val || row.test === 1
    },{
        val,
    });
})();
