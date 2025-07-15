'use strict';

let content = '';
let config = {};

function getConfigVal(name) {
  let path = name.split('.');
  let val = config;
  path.forEach(p => {
    if (Object.prototype.hasOwnProperty.call(val,p)) val = val[p];
  });
  if (typeof val === 'string')
    return val;
  return '';
}

function insertConfigVal(start = 0) {
  if (content.indexOf('[', start) > -1 && start < content.length) {
    start = content.indexOf('[', start);
    let end = content.indexOf(']', start);
    let path = content.substring(start+1, end);
    let val = getConfigVal(path);
    let regEx = new RegExp(`\\[${path}\\]`, 'g');
    content = content.replace(regEx, val);
    start++;
    insertConfigVal(start);
  }
  return true;
}

module.exports = (c, platform) => {
  const helpers = require('../util/helpers');
  const path = require('path');

  config = helpers.getJson(path.resolve(process.cwd(), platform.configPath));
  content = c.toString();
  insertConfigVal();
  return content;
};
