# Synopsis

**ZugZug** is an unfancy task queue built on [Redis](http://redis.io).

[![stability 1 - experimental](http://b.repl.ca/v1/stability-1_--_experimental-orange.png)](http://nodejs.org/api/documentation.html#documentation_stability_index) [![license - MIT](http://b.repl.ca/v1/license-MIT-blue.png)](http://pluma.mit-license.org) [![Flattr this](https://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=pluma&url=https://github.com/pluma/zugzug)

[![Build Status](https://travis-ci.org/pluma/zugzug.png?branch=master)](https://travis-ci.org/pluma/zugzug) [![Coverage Status](https://coveralls.io/repos/pluma/zugzug/badge.png?branch=master)](https://coveralls.io/r/pluma/zugzug?branch=master)

[![NPM status](https://nodei.co/npm/zugzug.png?compact=true)](https://npmjs.org/package/zugzug)

[![Dependencies](https://david-dm.org/pluma/zugzug.png?theme=shields.io)](https://david-dm.org/pluma/zugzug)

# Why?

Because [Kue](https://github.com/LearnBoost/kue) does too much and bare [redis](https://github.com/mranney/node_redis) is too painful.

# ZugZug?

[Zug-zug](http://www.urbandictionary.com/define.php?term=zug-zug).

# Install

## Node.js

### With NPM

```sh
npm install zugzug
```

### From source

```sh
git clone https://github.com/pluma/zugzug.git
cd zugzug
npm install
make
```

# Usage example

## Producer

```javascript
var zz = require('zugzug')(); // use local Redis with default settings
var queue = zz.queue('example');

setInterval(function() {
    // create a new job
    var job = queue.createJob();
    // throw some data in there
    job.data = 'There is always more work to be done.';
    // save it to the database
    job.save().catch(function(err) {
        console.log('Something is wrong with your database.');
        console.error(err);
    });
}, 2000); // repeat every 2 seconds
```

## Consumer (Worker)

```javascript
var zz = require('zugzug')();
var queue = zz.queue('example');

doForever(performJob);

function doForever(work) {
    return queue.next() // take a job from the queue
        .then(work) // process the job
        .then(function() {
            return doForever(work); // rinse, repeat
        });
}

function performJob(job) {
    try {
        doSomeWork(job); // do something with the job
    } catch(err) {
        // job failed. oh no!
        console.log('job', job.id, 'failed!');
        console.error(err);
        return job.fail(err.message);
        // but the job can still be re-enqueued later
    }
    // job is done! yay!
    console.log('job', job.id, 'completed!');
    return job.complete();
}

function doSomeWork(job) {
    if (Math.random() > 0.5) {
        // randomly throw an error here because why not
        throw new Error("That's a nice program you have there...");
    }
    // otherwise does stuff with the job's data
    console.log(job.data);
}
```

# API

All asynchronous methods in ZugZug return [bluebird](https://github.com/petkaantonov/bluebird) promises and accept node-style callbacks.

## ZugZug

### `new ZugZug([options:Object]):ZugZug`

Creates a new `ZugZug` instance that connects to a Redis server with the given options.

Use of the `new` keyword is optional.

In addition to the options accepted by [redis](https://github.com/mranney/node_redis#rediscreateclientport-host-options), ZugZug recognizes `port` and `server` and passes them on correctly.

### `zugzug.useDatabase(db:Number, [callback:Function]):Promise(self)`

Tells the underlying Redis connection to [use the database with the given number](http://redis.io/commands/SELECT). Resolves to the `ZugZug` instance itself on success or is rejected with the error returned by `redis` for the underlying `SELECT` command.

### `zugzug.queue([name:String]):Queue`

Returns a `Queue` instance representing the queue with the given `name`. Multiple invocations with the same `name` will return the same instance.

If `name` is not provided it is set to `"default"`.

### `zugzug.getJob(id:String, [callback:Function]):Promise(Job)`

Retrieves the job with the given `id` from the database. Resolves to a new `Job` instance representing the job on success or is rejected with the error returned by `redis` for the underlying `HGETALL` command.

If the job does not exist, resolves to `null` instead.

### `zugzug.getJobLog(id:String, [callback:Function]):Promise(Object[])`

Retrieves the log entries associated with the job with the given `id` from the database. Resolves to an array of log entry objects on success or is rejected with the error returned by `redis` for the underlying `LRANGE` command.

If the job does not exist, resolves to an empty array instead.

### `zugzug.moveJob(id:String, toQueue:String, [callback:Function]):Promise(Boolean)`

Moves the job with the given `id` to the queue `toQueue`. Resolves to `true` on success or is rejected with the error returned by `redis` for the underlying commands.

If the job does not exist, resolves to `false` instead.

### `zugzug.resetJob(id:String, [callback:Function]):Promise(Boolean)`

Re-enqueues the job with the given `id`. Resolves to `true` on success or is rejected with the error returned by `redis` for the underlying commands.

The job will change its state to `pending` regardless of its previous state.

If the job does not exist, resolves to `false` instead.

If you want to put a failed job back in the queue, this will let you do that.

If you want the failed job to be retried immediately, use [zugzug.startJob](#zugzugstartjobidstring-callbackfunctionpromisejob) instead.

### `zugzug.startJob(id:String, [callback:Function]):Promise(Job)`

Retrieves the job with the given `id` from the database. Resolves to a new `Job` instance representing the job on success or is rejected with the error returned by `redis` for the underlying commands.

The returned job will change its state to `progress` regardless of its previous state.

If the job does not exist, resolves to `null` instead.

If you want to restart a failed job in a worker script, this will let you do that.

If you only want the failed job to be re-enqueued, use [zugzug.resetJob](#zugzugresetjobidstring-callbackfunctionpromiseboolean) instead.

## Queues

### `queue.createJob([data:*, [maxFailures:Number]]):Job`

Returns a new `Job` instance bound to this queue.

See [job.data](#jobdata).

See [job.maxFailures](#jobmaxfailuresnumber).

### `queue.next([timeout:Number], [callback:Function]):Promise(Job)`

Retrieves the oldest `pending` job from the queue. Resolves to a new `Job` instance representing the job on success or is rejected with the error returned by `redis` for the underlying commands.

The returned job will change its state from `pending` to `progress`.

If the queue is currently empty, it will wait until a new job is added to the queue.

If a `timeout` is provided, it will resolve to `null` if no job is found in the queue before the given number of seconds has elapsed.

If you want to use ZugZug in a worker script, this will likely be how you want to fetch new jobs from the queue.

### `queue.delete([callback:Function]):Promise(self)`

Deletes the queue and all associated jobs from the database. Resolves to the `Queue` instance itself on success or is rejected with the error returned by `redis` for the underlying commands.

This will also remove the queue from the associated `ZugZug` instance's queue cache, so calling `zugzug.queue(queue.name)` will return a new `Queue` object.

## Jobs

### `job.id:String` (read-only)

The unique ID of the job which can be used to re-load the job with [zugzug.getJob](#zugzuggetjobidstring-callbackfunctionpromisejob). This property is only defined if the job has been saved to the database.

### `job.data:*`

The job's user-defined data. Will be serialized to JSON for storage in Redis, so you may want to avoid relying on non-serializable objects. Defaults to an empty object.

### `job.queue:String` (read-only)

The name of the queue this job is bound to. If you want to move a job to a different queue, use [zugzug.moveJob(id, name)](#zugzugmovejobidstring-toqueuestring-callbackfunctionpromiseboolean).

### `job.state:String` (read-only)

The current state of the job. This property is only defined if the job has been saved to the database.

#### `pending`

The job has been added to the queue and is waiting to be picked up by a worker.

#### `progress`

The job has been picked up by a worker and is currently being worked on.

#### `error`

The job has failed too many times.

See [job.fail](#jobfaildetails-callbackfunctionpromiseself).

#### `done`

The job has been completed successfully.

### `job.progress:Number` (read-only)

The progress of this job at the time of the most recent update. This value will be set to `0` whenever the job is (re-)started.

### `job.failures:Number` (read-only)

The number of times that this job has failed.

See [job.fail](#jobfaildetails-callbackfunctionpromiseself).

### `job.maxFailures:Number`

The maximum number of times the job is allowed to fail before it will no longer be tried again. Defaults to `1`.

See [job.fail](#jobfaildetails-callbackfunctionpromiseself).

### `job.created:Date` (read-only)

The `Date` at which the job was first saved to the database. Will be set automatically on the first call to `save` or when the job is loaded from the database.

### `job.updated:Date` (read-only)

The `Date` at which the job was last saved to the database. Will be updated automatically for every operation that modifies the job in the database (including `job.log`).

### `job.save([callback:Function]):Promise(self)`

Saves the job to the database. Resolves to the `Job` instance itself on success or is rejected with the error returned by `redis` for the underlying commands.

If the job did not exist in the database before, it will be assigned [a unique ID](#jobidstring-read-only) and its [state](#jobstatestring-read-only) will be set to [pending](#pending).

### `job.update(progress:Number, [message:String], [callback:Function]):Promise(self)`

Updates the [job's progress](#jobprogressnumber-read-only) to the given `progress`. Resolves to the `Job` instance itself on success or is rejected with the error returned by `redis` for the underlying commands.

The `progress` should be a value between `0.0` and `1.0`.

If `message` is provided, a matching log entry will be created.

### `job.log(message:String, [details:*], [callback:Function]):Promise(self)`

Logs the given `message` to the job's log with the current timestamp. Resolves to the `Job` instance itself on success or is rejected with the error returned by `redis` for the underlying commands.

If `details` is provided, it will be serialized to JSON and stored on the log message.

### `job.start([callback:Function]):Promise(self)`

Sets the job's state to `progress` and creates a log entry. Resolves to the `Job` instance itself on success or is rejected with the error returned by `redis` for the underlying commands.

### `job.complete([callback:Function]):Promise(self)`

Sets the job's state to `done` and creates a log entry indicating success. Resolves to the `Job` instance itself on success or is rejected with the error returned by `redis` for the underlying commands.

### `job.fail([details:*], [callback:Function]):Promise(self)`

Increments the [job's number of failures](#jobfailuresnumber-read-only) and creates a log entry indicating failure. Resolves to the `Job` instance itself on success or is rejected with the error returned by `redis` for the underlying commands.

If `failures` is lower than the job's `maxFailures` or `maxFailures` is set to `0`, the job's state will be reset to `pending` and it will be re-enqueued automatically.

If `failures` is greater than or equal to the job's `maxFailures`, the job's state will be set to `error` and it will not be re-enqueued.

If `details` is provided, it will be serialized to JSON and stored on the log message.

### `job.delete([callback:Function]):Promise(self)`

Deletes the job from the database. Resolves to the `Job` instance itself on success or is rejected with the error returned by `redis` for the underlying commands.

# License

The MIT/Expat license. For more information, see http://pluma.mit-license.org/ or the accompanying [LICENSE](https://github.com/pluma/zugzug/blob/master/LICENSE) file.
