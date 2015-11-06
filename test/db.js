/* global describe, it, before, beforeEach, after, afterEach */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const mongoose = require('mongoose');
const moment = require('moment');

chai.use(chaiAsPromised);
mongoose.Promise = Promise;

const expect = chai.expect;

const db = require('../lib/db');

const config = require('./fixtures/config');
const testDb = require('./fixtures/db');

describe('db', () => {
  it('expected to have schema for model "Event" and "Tasklog"', () => {
    expect(mongoose.model('Event')).to.not.throw();
    expect(mongoose.model('Tasklog')).to.not.throw();
  });

  describe('.open', () => {
    afterEach(() => db.close());

    it('expected to open database connection', () => {
      const promise = db.open(config.mongoURI).then(() => {
        return mongoose.connection.readyState;
      });
      return expect(promise).to.become(1);
    });
  });

  describe('.close', () => {
    beforeEach(() => db.open(config.mongoURI));

    it('expected to close database connection', () => {
      const promise = db.close().then(() => {
        return mongoose.connection.readyState;
      });
      return expect(promise).to.become(0);
    });
  });

  describe('/event eventDate validator', () => {
    const eventDateValidator = mongoose.model('Event').schema.paths.eventDate.validators[1].validator;
    it('expected to return false when the event expired', () => {
      expect(eventDateValidator(moment().subtract(1, 'day').toDate())).to.be.false;
      expect(eventDateValidator(moment().subtract(18.1, 'hours').toDate())).to.be.false;
      expect(eventDateValidator(moment().subtract(17.9, 'hours').toDate())).to.be.true;
      expect(eventDateValidator(moment().toDate())).to.be.true;
    });
  });

  describe('/findorcreate', () => {
    before(() => testDb.open());

    afterEach(() => testDb.clearEvent());

    after(() => testDb.clear().then(() => testDb.close()));

    it('expected to create new one when the event not found', () => {
      const data = require('./fixtures/events/index');
      const promise = mongoose.model('Event').findOrCreate({
        hash: data.hash
      }, data).then(result => {
        expect(result[1]).to.be.true;
        return mongoose.model('Event').find({
          hash: data.hash
        }, '-_id -__v').lean().exec();
      });
      return expect(promise).to.become([data]);
    });

    it('expected to return a event when the event already exist', () => {
      const data = require('./fixtures/events/index');
      const promise = testDb.insertEvent(data).then(() => {
        return mongoose.model('Event').findOrCreate({
          hash: data.hash
        }, data);
      }).then(result => {
        expect(result[1]).to.be.false;
        return mongoose.model('Event').find({
          hash: data.hash
        }, '-_id -__v').lean().exec();
      });
      return expect(promise).to.become([data]);
    });
  });
});
