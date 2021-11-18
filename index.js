import Database from "./lib/Database.js";
import { performance } from 'perf_hooks';
import Server from "./plugins/Server.js";
import axios from "axios";
import faker from "faker";

(async () => {
    let db = await new Database("test");
    for(let i = 0; i < 1; i++) {
        await db.table("persons").save({id: i, name: "Max Mustermann"})
    }
    
    let data1 = await db.table("persons").filter((row) => { return row.name == "Max Mustermann" }).map(row => { return {id: row.id} })
    let data2 = await db.table("persons").filter((row) => { return row.name == "Max Mustermann" }).map(row => { return row.id })
    console.log(data1)
    console.log(data2)
    //.sort((a, b) => { return a.id > b.id? -1 : a.id < b.id? 1 : 0})
    //.reduce((t, row) => t + row, 0)

    await db.delete();
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

    await db.table("persons").save({name: "Max Mustermann"});
    await db.table("persons").save({name: "Max Mustermann"});

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
    
    await db.table("persons").save({name: "Stefan Bittmann", birthdate: "19940713"});
    



    let val = "Stefan Bittmann";
    let r = await db.table("persons").filter((row) => {
        return row.birthdate === "19940713" && row.name === val || row.test === 1
    },{
        val,
    });
})();
