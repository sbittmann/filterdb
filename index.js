import Database from "./lib/Database.js";
import { performance } from 'perf_hooks';
import Server from "./plugins/Server.js";
import axios from "axios";
import faker from "faker";

(async () => {
    let db = await new Database("test");
    await db.table("persons").ensureIndex("name");

    await db.table("persons").save({_id: 1, name: "Max Mustermann"})
    await db.table("persons").save({_id: 2, name: "Max Mustermann"})
    await db.table("persons").save({_id: 3, name: "Max Mustermann"})
    await db.table("persons").save({_id: 4, name: "Maxi Mustermann", friends: [1, 2]})
    try {
        await db.table("persons").filter((row) => { return row.name === "Maxi Mustermann" }).map(`(row) => { return db.table() }`);
        /*let data1 = await db.table("persons").filter((row) => { return row.name === name }, {names: "Maxi Mustermann"})
        console.dir(data1, {depth: null})*/
    } catch (e) {
        console.log(e)
    }
    
    /*.map((row) => { 
        let friends = row.friends.map((friend) => {
            db.table("persons").find((row) => { 
                return row._id === friend 
            }, {   
                friendl
            })
        })
        return { ...row, friends} 
    })*/
    
    //console.log(data1.getQuery())

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
