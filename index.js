'use strict';

const getPlatform = name => {
  return require(`./platforms/${name}`);
};

module.exports = {
  getPlatform
};