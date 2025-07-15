//@ts-check
'use strict';

module.exports = () => {
  const helpers = require('../util/helpers');
  const path = require('path');

  let options = helpers.getBuildOptions({
    src: {
      main: './_src',
      images: './_src/images'
    },
    output: './assets'
  });

  const LastCallPlugin = require(`last-call-webpack-plugin`);
  const CopyPlugin = require('copy-webpack-plugin');
  const OptimizillaPlugin = require('optimizilla-webpack-plugin');

  return {
    output: {
      path: path.join(process.cwd(), options.output),
      filename: '[name].js'
    },
    entry: {
      'dummy': path.resolve(__dirname, '../util/dummy.js')
    },
    plugins: [
      new OptimizillaPlugin({
        src: path.join(process.cwd(), options.src.images)
      }),
      new CopyPlugin({
        patterns: [
          { from: options.src.images, to: 'images', globOptions: { ignore: ['*.json'] }}
        ]
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
