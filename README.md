# filterdb

[![Travis](https://img.shields.io/travis/com/sbittmann/filterdb.svg?style=flat-square)](https://travis-ci.org/sbittmann/filterdb)
[![codecov](https://img.shields.io/codecov/c/github/sbittmann/filterdb.svg?style=flat-square)](https://codecov.io/gh/sbittmann/filterdb)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![Blazing Fast](https://img.shields.io/badge/speed-blazing%20%F0%9F%94%A5-brightgreen.svg?style=flat-square)](https://twitter.com/acdlite/status/974390255393505280)

This is a no-SQL database completly written in node.js. Data could be accessed with JS-Syntax no need to learn a new QueryLanguage

## Installation
```bash
npm install filterdb
```

### DatabaseServer Download

If you just need a Database-Server and don't wan't to build the access Level around it, stay updated. Soon we will build a ready server-build.

```bash
https://cdn.jsdelivr.net/gh/jshttp/mime-db@master/db.json
```

## Usage
```js
import Database from "filterdb"
import faker from "faker";

(async () => {

//creates or opens Database
let db = await new Database("myDB");

for (let i = 0; i < 1000; i++) {
    //Push data in the "persons" table.
    await db.table("persons").push(faker.helpers.userCard());
}

//Yeap, simple Array.filter Syntax
let resultArray = await db.table("persons").filter((row) => row.name === val)
console.log(resultArray)

//Aync Iteratoion  possible
let r2 = db.table("persons").filter((row) => {
    return row.website === 'filterdb.io';
});
    
for await(let row of r2) {
    console.log(row)
}

})()

```

## API

### `Database`
An filterdb Database instance is created with by using `default` export from the main module:
```js
import Database from "filterdb"

(async () => {
    let db = await new Database("myDB");
})()
```

#### `db.meta`
This will return some meta-data about your database.

#### `db.table(tableName)`
returns a Table-Class

#### `await db.delete()`
deletes the dataBase   

### `Table`
An filterdb Table instance is created with by using the `table` function from the dataBase Instance:
```js
import Database from "filterdb"

(async () => {
    let db = await new Database("myDB");
    let table = db.table("tableName");
})()
```

#### `table.meta`
This will return some meta-data about your table.

#### `await table.get(key)`
returns the stored object in the table with key in arguments

#### `await table.ensureIndex(name, rebuild?)`
creates a index on the object field `name` and rebuilds the index if rebuild is set to `true`

#### `await table.find(searchFunction, functionContext)`
returns the first row in table for which `searchFunction` returns true

#### `await table.filter(searchFunction, functionContext)`
returns all rows in table for which `searchFunction` returns true

#### `await table.push(obj)`
inserts `obj` into the table

#### `await table.remove(key)`
removes obj with Key `key` from the table

## Contributing

## License
This library is licensed under the terms of the MIT license.
