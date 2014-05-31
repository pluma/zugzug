var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('ISSUE #2', function() {
  var zz, q;
  beforeEach(function() {
    zz = new ZugZug();
    q = zz.queue();
  });
  afterEach(function(done) {
    Promise.promisify(zz._client.flushall, zz._client)()
    .then(zz.quit.bind(zz))
    .done(function() {done();});
  });
  describe('job.fail(details)', function() {
    it('should flatten circular details', function(done) {
      var circular = {};
      circular.circular = circular;
      var job = q.createJob();
      job.fail(circular)
      .then(function() {
        var m = zz._client.multi()
        .lrange('zugzug:job:' + job.id + ':log', 0, 0);
        return Promise.promisify(m.exec, m)();
      })
      .spread(function(entry) {
        var obj = JSON.parse(entry);
        expect(obj.details.circular).to.equal('[Circular ~]');
      })
      .done(done);
    });
  });
  describe('job.log(message, details)', function() {
    it('should flatten circular details', function(done) {
      var circular = {};
      circular.circular = circular;
      var job = q.createJob();
      job.log('hello', circular)
      .then(function() {
        var m = zz._client.multi()
        .lrange('zugzug:job:' + job.id + ':log', 0, 0);
        return Promise.promisify(m.exec, m)();
      })
      .spread(function(entry) {
        var obj = JSON.parse(entry);
        expect(obj.details.circular).to.equal('[Circular ~]');
      })
      .done(done);
    });
  });
});