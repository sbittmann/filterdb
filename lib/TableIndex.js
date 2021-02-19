/*
    Copied and rewritten from:
    https://github.com/eugeneware/subindex
*/

import bytewise from 'bytewise'
import subLevel from 'subleveldown'
import through2 from 'through2'
import deleteRange from 'level-delete-range'
import defaults from 'lodash.defaults'

export default levelIndex;

function encode(key) {
  return Buffer.prototype.toString.call(bytewise.encode(key), 'hex');
}

function decode(key) {
  return bytewise.decode(Buffer.from(key, 'hex'));
}

function levelIndex(db) {
  if (!db.ensureIndex) {
    db.ensureIndex = ensureIndex.bind(null, db);
  }

  if (!db.dropIndex) {
    db.dropIndex = dropIndex.bind(null, db);
  }

  if (!db.getBy) {
    db.getBy = getBy.bind(null, db);
  }

  if (!db.createIndexStream) {
    db.createIndexStream = createIndexStream.bind(null, db);
  }

  if (!db.indexes && !db.indexDb) {
    db.indexDb = subLevel(db, 'indexes');
    db.indexes = {};
  }

  return db;
}

function createIndexStream(db, idxName, options) {
  options = options || {};
  options.start = options.start || [ null ];
  options.end = options.end || [ undefined ];
  options.start = encode([idxName, options.start]);
  options.end = encode([idxName, options.end]);

  return db.indexDb.createReadStream(options)
  .pipe(through2.obj(function (data, enc, callback) {
    callback(null, { key: decode(data.key), value: data.value });
  }));
}

function getProp(obj, prop) {
  let path = prop.split('.')
  while (path.length > 0) {
    let actProp = path.shift();
    if (obj[actProp] !== undefined) {
      obj = obj[actProp];
    } else {
      return;
    }
  }
  return obj;
}

async function ensureIndex(db, idxName, rebuild = false) {
  let options = {
    name: idxName,
    createIndexStream: createIndexStream.bind(null, db, idxName)
  };
  
  db.indexes[idxName] = options;
  db.dataDB.hooks.pre(async (change) => {
    if (change.type === 'put') {
      await addToIndex(change);
    } else if (change.type === 'del') {
      let value = await db.dataDB.get(change.key);
      await removeFromIndex(change, value);
    }
  });

  async function addToIndex(dataToIndex) {
    let valueToIndex = getProp(dataToIndex.value, idxName);
    let idxKey = encode([idxName, valueToIndex, dataToIndex.key]);
    await db.indexDb.put(idxKey, dataToIndex.key);
  }

  async function removeFromIndex(change, dataToRemove) {
    let valueToIndex = getProp(dataToIndex.value, idxName);
    let idxKey = encode([idxName, valueToIndex, change.key])
    await db.indexDb.del(idxKey);
  }


  if(rebuild === true) {
    await new Promise((resolve) => {
      db.dataDB.createReadStream()
      .on('data', (dataToIndex) => {
        addToIndex(dataToIndex);
      })
      .on('end', () => {
        resolve()
      });
    });
  }
}

function dropIndex(db, idxName, cb) {
  cb = cb || function () {};
  deleteRange(db.indexDb, {
    start: encode([idxName, null]),
    end: encode([idxName, undefined])
  }, cb);
}

function getBy(db, index, key, options, cb) {
  if ('function' == typeof options) {
    cb = options;
    options = {};
  }

  if (!Array.isArray(key)) {
    key = [key];
  }
  var hits = 0;
  var all = [];
  var streamOpts = defaults(options, { start: key.concat(null), end: key.concat(undefined), limit: 1 });
  db.createIndexStream(index, streamOpts)
  .pipe(through2.obj(function (data, enc, callback) {
    db.get(data.value, function (err, value) {
      callback(null, { key: data.value, value: value });
    });
  }))
  .on('data', function (data) {
      hits++;
      all.push(data);
    })
    .on('error', function (err) {
      cb(err);
    })
    .on('end', function () {
      if (hits === 0) {
        return cb({name: 'NotFoundError', message: 'Could not find value based on key: ' + key.toString()});
      }
      return cb(null, all.length > 1 ? all : all[0]);
    });
}