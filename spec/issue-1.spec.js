var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');
var Job = require('../lib/job');

describe('ISSUE #1', function() {
  describe('queue.next()', function() {
    var zz, q;
    beforeEach(function(done) {
      zz = new ZugZug();
      q = zz.queue();
      zz.useDatabase(5).done(function() {done();});
    });
    afterEach(function(done) {
      Promise.promisify(zz._client.flushall, zz._client)()
      .then(zz.quit.bind(zz))
      .done(function() {done();});
    });
    it('must respect zugzug.useDatabase()', function(done) {
      this.timeout(5000);
      /*global process: false */
      process.nextTick(function() {
        q.createJob().save().done();
      });
      q.next()
      .then(function(res) {
        expect(res).to.be.a(Job);
      })
      .done(done);
    });
  });
});