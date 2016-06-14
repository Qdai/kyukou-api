'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const mongoose = require('mongoose');

chai.use(chaiAsPromised);
mongoose.Promise = Promise;

const expect = chai.expect;

const Event = require('../lib/models/event');
const Hash = require('../lib/utils/hash');
const Log = require('../lib/models/log');
const db = require('../lib/utils/db');
const asString = require('../lib/utils/eventasstring');
const runTask = require('../lib/utils/runtask');

const config = require('./fixtures/config');
const testDb = require('./fixtures/db');

describe('Utils', () => {
  describe('/db', () => {
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
  });

  describe('/eventasstring', () => {
    it('expected to return event as string', () => {
      const event = {
        about: 'about',
        eventDate: new Date('2015-01-01'),
        period: 'period',
        department: 'department',
        subject: 'subject',
        teacher: 'teacher',
        campus: 'campus',
        room: 'room',
        note: 'note'
      };
      const eventAsString = asString.bind(event);
      expect(eventAsString('title')).to.deep.equal('【about】period時限「subject（campus）」（teacher教員）');
      expect(eventAsString('summary')).to.deep.equal('【about】1月1日（木）period時限department「subject（campus）」（teacher教員）');
      expect(eventAsString('note')).to.deep.equal('教室：room\n備考：note');
      expect(eventAsString()).to.deep.equal('【about】1月1日（木）\ndepartmentperiod時限「subject（campus）」（teacher教員）\n教室：room\n備考：note');
    });

    it('expected to return event as string', () => {
      const event = {
        about: 'about',
        eventDate: new Date('2015-01-01'),
        period: 'period',
        department: 'department',
        subject: 'subject'
      };
      const eventAsString = asString.bind(event);
      expect(eventAsString('title')).to.deep.equal('【about】period時限「subject」');
      expect(eventAsString('summary')).to.deep.equal('【about】1月1日（木）period時限department「subject」');
      expect(eventAsString('note')).to.deep.equal('');
      expect(eventAsString()).to.deep.equal('【about】1月1日（木）\ndepartmentperiod時限「subject」');
    });

    it('expected to return event as string', () => {
      const event = {
        about: 'about',
        eventDate: new Date('2015-01-01'),
        period: 'period',
        department: 'department',
        subject: 'subject',
        teacher: 'teacher',
        campus: 'campus',
        room: 'room',
        note: 'note'
      };
      const eventAsString = asString.bind(event);
      expect(eventAsString('title')).to.deep.equal('【about】period時限「subject（campus）」（teacher教員）');
      expect(eventAsString('summary')).to.deep.equal('【about】1月1日（木）period時限department「subject（campus）」（teacher教員）');
      expect(eventAsString('note', '<br />')).to.deep.equal('教室：room<br />備考：note');
      expect(eventAsString(null, '<br />')).to.deep.equal('【about】1月1日（木）<br />departmentperiod時限「subject（campus）」（teacher教員）<br />教室：room<br />備考：note');
    });
  });

  describe('/findorcreate', () => {
    before(() => testDb.open());

    afterEach(() => testDb.clearEvent());

    after(() => testDb.clear().then(() => testDb.close()));

    it('expected to create new one when the event not found', () => {
      const data = require('./fixtures/events/index');
      const promise = Event.findOrCreate({
        hash: data.hash
      }, data).then(result => {
        expect(result[1]).to.be.true;
        return Event.find({
          hash: data.hash
        }, '-_id -__v').lean().exec();
      });
      return expect(promise).to.become([data]);
    });

    it('expected to return a event when the event already exist', () => {
      const data = require('./fixtures/events/index');
      const promise = testDb.insertEvent(data).then(() => {
        return Event.findOrCreate({
          hash: data.hash
        }, data);
      }).then(result => {
        expect(result[1]).to.be.false;
        return Event.find({
          hash: data.hash
        }, '-_id -__v').lean().exec();
      });
      return expect(promise).to.become([data]);
    });
  });

  describe('/hash', () => {
    describe('.create', () => {
      const data = [
        ['a', 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb'],
        ['b', '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d'],
        ['string with space', 'caf7d0a818dbf6ade655de82886db446de7bba23d5e221ae8115e6d71bf5b572'],
        ['stringwithspace', 'caf7d0a818dbf6ade655de82886db446de7bba23d5e221ae8115e6d71bf5b572'],
        [' string with leading space', '1dbd5a9fcbdbba0d31bd3fb81a00cdabf02eef133b5c25785112c48eed0df878'],
        ['stringwithleadingspace', '1dbd5a9fcbdbba0d31bd3fb81a00cdabf02eef133b5c25785112c48eed0df878'],
        ['string with trailing space ', '346ad6828f4189545d62dbc037c97c2e2089d44225a8491f6fa0856e385a38e4'],
        ['stringwithtrailingspace', '346ad6828f4189545d62dbc037c97c2e2089d44225a8491f6fa0856e385a38e4']
      ];

      it('expected to create hash from string', () => {
        data.forEach(d => {
          expect(Hash.create(d[0])).to.deep.equal(d[1]);
        });
      });
    });

    describe('.isValid', () => {
      it('expected to return false when hash length is not 64', () => {
        expect(Hash.isValid('a'.repeat(63))).to.be.false;
        expect(Hash.isValid('a'.repeat(64))).to.be.true;
        expect(Hash.isValid('a'.repeat(65))).to.be.false;
      });

      it('expected to return false when hash includes invalid char', () => {
        const base = '0123456789abcdef'.repeat(4).slice(0, -1);
        expect(Hash.isValid(`${base}f`)).to.be.true;
        expect(Hash.isValid(`${base}g`)).to.be.false;
        expect(Hash.isValid(`${base}h`)).to.be.false;
        expect(Hash.isValid(`${base}A`)).to.be.false;
        expect(Hash.isValid(`${base}B`)).to.be.false;
      });
    });
  });

  describe('/runtask', () => {
    it('expected to become a valid log', () => {
      return expect(runTask(() => Promise.resolve('msg: test')).then(log => {
        return new Log(log).validate();
      })).to.become.undefined;
    });

    it('expected to be fulfilled when fn is rejected', () => {
      return expect(runTask(() => Promise.reject('err: test')).then(log => {
        return new Log(log).validate();
      })).to.become.undefined;
    });
  });
});
