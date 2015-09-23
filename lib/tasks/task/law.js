'use strict';

const createHash = require('../../utils/createhash');
const fetch = require('../../utils/fetch');
const normalizeText = require('../../utils/normalizetext');

const config = {
  resourceURL: 'http://www.law.kyushu-u.ac.jp/kyukou/keiji.cgi'
};

module.exports = () => {
  return fetch(config.resourceURL).then($ => {
    return $('.article-main [style="height: 600px; overflow: auto;"] table tr:not(:first-child)').map((i, el) => {
      const $item = $(el);
      const data = {};
      const raw = $item.text();
      try {
        // format data
        data.raw = raw;
        data.about = $item.find(':nth-child(6)').text().replace(/\s*/g, '');
        if (data.about === '公務' || data.about === 'その他') {
          if (/\(補講\)$/.test($item.find(':nth-child(3)').text())) {
            data.about = '補講';
          }
        }
        data.link = config.resourceURL;
        data.eventDate = normalizeText($item.find(':nth-child(2)').text())
          .replace(/\s/g, '').match(/(\d*)年(\d*)月(\d*)日/);
        data.eventDate = new Date(parseInt(data.eventDate[1], 10), parseInt(data.eventDate[2], 10) - 1, parseInt(data.eventDate[3], 10), 0, 0);
        data.pubDate = normalizeText($item.find(':nth-child(5)').text())
          .replace(/年|月/g, '-').replace(/日\s*|分.*/g, ' ').replace(/時/g, ':');
        data.pubDate = new Date(data.pubDate);
        data.period = normalizeText($item.find(':nth-child(2)').text())
          .replace(/・/g, '').replace(/.*曜|限.*/g, '');
        data.department = '法学部';
        data.subject = normalizeText($item.find(':nth-child(3)').text()).replace(/\(補講\)$/, '').replace(/U/g, 'II');
        data.teacher = $item.find(':nth-child(4)').text().replace(/\s*/g, '');
        data.note = $item.find(':nth-child(7)').text().replace(/\s*/g, '');
        data.hash = createHash(raw);
        return data;
      } catch (err) {
        err.message += ' on ' + raw.replace(/[\f\n\r]/g, '');
        return err;
      }
    }).toArray();
  });
};
