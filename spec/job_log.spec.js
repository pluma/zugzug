var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('job.log(message, [details]):Promise(self)', function() {
  var zz, job;
  beforeEach(function() {
    zz = new ZugZug();
    job = new Job(zz, 'default');
  });
  afterEach(function(done) {
    Promise.promisify(zz._client.flushall, zz._client)()
    .then(zz.quit.bind(zz))
    .done(function() {done();});
  });
  it('returns a promise', function(done) {
    job.save()
    .then(function() {
      var p = job.log('hello');
      expect(p).to.be.a(Promise);
      return p.thenReturn();
    })
    .done(done);
  });
  it('resolves to the instance', function(done) {
    job.save()
    .then(function() {
      return job.log('hello');
    })
    .then(function(res) {
      expect(res).to.equal(job);
    })
    .done(done);
  });
  it('updates the job', function(done) {
    var updated;
    job.save()
    .then(function() {
      updated = job.updated;
      return new Promise(function(resolve, reject) {
        /*global setTimeout:false */
        setTimeout(function() {
          job.log('hello').then(resolve, reject);
        }, 1);
      });
    })
    .then(function() {
      expect(Number(job.updated)).to.be.greaterThan(Number(updated));
    })
    .done(done);
  });
  it('updates the job\'s log with the given message', function(done) {
    var oldlen = 0;
    var message = 'foo';
    job.save()
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(len) {
      oldlen = len;
      return job.log(message);
    })
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log')
      .lindex('zugzug:job:' + job.id + ':log', 0);
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(newlen, entry) {
      entry = JSON.parse(entry);
      expect(newlen).to.equal(oldlen + 1);
      expect(entry).to.have.property('message', message);
    })
    .done(done);
  });
  it('updates the job\'s log with the given message and details', function(done) {
    var oldlen = 0;
    var message = 'foo';
    var details = {qux: 'bar'};
    job.save()
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log');
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(len) {
      oldlen = len;
      return job.log(message, details);
    })
    .then(function() {
      var m = zz._client.multi()
      .llen('zugzug:job:' + job.id + ':log')
      .lindex('zugzug:job:' + job.id + ':log', 0);
      return Promise.promisify(m.exec, m)();
    })
    .spread(function(newlen, entry) {
      entry = JSON.parse(entry);
      expect(newlen).to.equal(oldlen + 1);
      expect(entry).to.have.property('message', message);
      expect(entry).to.have.property('details');
      expect(entry.details).to.eql(details);
    })
    .done(done);
  });
});