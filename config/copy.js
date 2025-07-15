//@ts-check
'use strict';

const printNames = platform => {
  const c = require('../util/logs');
  let s = 'Available names are\n';
  for (let [key, val] of Object.entries(platform.copyFiles)) {
    s += (`\n - ${key}:${key.length > 3 ? '\t' : '\t\t'}${val.desc}`);
  }
  c.log(s);
};

module.exports = async platform => {
  const c = require('../util/logs');

  let copyKeys = platform.argv._.slice(1);
  let copyFiles = [];
  if (!copyKeys.length) {
    //User didn't pass an arg here, so print all options
    c.warn(`To copy a file to your theme, type "gc copy <name(s)>"`);
    printNames(platform);
    process.exit(0);
  } else {
    //Match user arg with available options
    let badEntries = [];
    copyKeys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(platform.copyFiles, key)) {
        copyFiles.push({
          from: platform.copyFiles[key].from,
          to: platform.copyFiles[key].to
        });
      } else {
        badEntries.push(key);
      }
    });
    if (badEntries.length) {
      badEntries.map(k => {
        c.error(`The file key "${k}" is not supported`);
      });
      printNames(platform);
      if (!copyFiles.length) process.exit(1);
    }
  }
  const fs = require('fs');
  const path = require('path');

  for (let x = 0; x < copyFiles.length; x++) {
    let file = copyFiles[x],
      fileName = path.basename(file.from),
      newPath = path.resolve(file.to, fileName);
    if (fs.existsSync(newPath)) {
      c.warn(`${fileName} already exists in your project. Are you sure you want to replace it?`);
      if ('y' !== await c.getResponse(`Type "y" to confirm`)) {
        copyFiles[x] = null;
      }
    }
  }

  copyFiles = copyFiles.filter(v => v !== null);

  if (!copyFiles.length) {
    c.warn('No files have been copied');
    process.exit(0);
  }

  const LastCallPlugin = require(`last-call-webpack-plugin`);
  const CopyPlugin = require('copy-webpack-plugin');

  return {
    output: {
      path: process.cwd(),
      filename: '[name].js'
    },
    entry: {
      'dummy': path.resolve(__dirname, '../util/dummy.js')
    },
    plugins: [
      new CopyPlugin({
        patterns: copyFiles
      }),
      new LastCallPlugin({
        assetProcessors: [{
          regExp: /dummy/,
          processor: (assetName, asset, assets) => {
            assets.setAsset('dummy.js', null);
            return Promise.resolve();
          }
        }]
      })
    ],
  };
};
