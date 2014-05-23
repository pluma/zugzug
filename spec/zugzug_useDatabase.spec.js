var expect = require('expect.js');
var Promise = require('bluebird');
var redis = require('redis');
var ZugZug = require('../lib/zugzug');

describe('zugzug.useDatabase(db):Promise(self)', function() {
  var zz;
  beforeEach(function() {
    zz = new ZugZug();
  });
  afterEach(function(done) {
    redis.createClient().flushall(done);
  });
  it('returns a promise', function() {
    var res = zz.useDatabase(1);
    expect(res).to.be.a(Promise);
  });
  it('selects the given database', function(done) {
    var selectedDb = null;
    var select = zz._client.select;
    zz._client.select = function(db) {
      selectedDb = db;
      return select.apply(this, arguments);
    };
    var requestedDatabase = 1;
    zz.useDatabase(requestedDatabase)
    .then(function() {
      expect(selectedDb).to.equal(requestedDatabase);
    })
    .done(done);
  });
  it('resolves to the instance', function(done) {
    zz.useDatabase(1)
    .then(function(res) {
      expect(res).to.equal(zz);
    })
    .done(done);
  });
});