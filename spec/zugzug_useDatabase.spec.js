var expect = require('expect.js');
var Promise = require('bluebird');
var ZugZug = require('../lib/zugzug');

describe('zugzug.useDatabase(db):Promise(self)', function() {
  var zz;
  beforeEach(function() {
    zz = new ZugZug();
  });
  afterEach(function(done) {
    Promise.promisify(zz._client.flushall, zz._client)()
    .then(zz.quit.bind(zz))
    .done(function() {done();});
  });
  it('returns a promise', function(done) {
    var p = zz.useDatabase(5);
    expect(p).to.be.a(Promise);
    p.thenReturn().done(done);
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