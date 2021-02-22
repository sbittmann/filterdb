/*
    Copied and rewritten from:
    https://github.com/eugeneware/level-queryengine
*/


import Stream from 'stream'
import through from 'through'
import unique from 'unique-stream'

export default queryengine;

function queryengine(db) {
    if (!db.query) {
        db.query = query.bind(null, db);
        db.query.use = use.bind(null, db);
    }
    return db;
}

function query(db) {
    
    let q = [].slice.call(arguments, 1);
    let candidates;
    let stats = { indexHits: 0, dataHits: 0, matchHits: 0 };
    let indexStream = db.query.engine.query.apply(db, q);

    if (indexStream !== null && indexStream instanceof Stream) {
        indexStream.on('data', function (data) {
            stats.indexHits++;
        });
        candidates = indexStream.pipe(unique(keyfn)).pipe(createValueStream.call(null, db)).on('data', function (data) {
            stats.dataHits++;
        });
    } else {
        // table scan
        candidates = db.createReadStream().pipe(through(function (data) {
            stats.dataHits++;
            if (data.value !== undefined) {
                this.queue(data.value);
            }
        }));
    }

    var values = candidates.pipe(through(
        function write(data) {
            if (db.query.engine.match.apply(db, [data].concat(q)) === true) {
                stats.matchHits++;
                this.queue(data);
            }
        },
        function end() {
            values.emit('stats', stats);
            this.queue(null);
    }));
    return values;
}

function use(db, queryEngine) {
    db.query.engine = queryEngine;
}

function keyfn(index) {
    return index.key[index.key.length - 1];
}

function createValueStream(db) {
    var s = new Stream();
    s.readable = true;
    s.writable = true;

    var work = 0;
    var ended = false;

    s.write = function (data) {
    work++;
        db.get(keyfn(data), function (err, value) {
            if (!err) {
                s.emit('data', value);
            }
            if (--work === 0 && ended) {
                s.end();
            }
        });
    };

    s.end = function (data) {
        ended = true;
        if (arguments.length) {
            s.write(data);
        }

        if (work === 0 && s.writable) {
            s.writable = false;
            s.emit('end');
        }
    };

    s.destroy = function () {
        s.writable = false;
    };

    return s;
}