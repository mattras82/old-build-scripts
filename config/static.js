//@ts-check
'use strict';

module.exports = platform => {
  const helpers = require('../util/helpers');
  const path = require('path');
  const fs = require('fs');

  let options = helpers.getBuildOptions({
    copy: [
      { from: `./_src/images`, to: 'images', globOptions: { ignore: ['*.json'] } },
      { from: `./_src/fonts`, to: 'fonts' },
      { from: `./node_modules/jquery/dist/jquery.min.js` },
      { from: `./node_modules/@fortawesome/fontawesome-free/webfonts`, to: 'fonts' }
    ],
    src: {
      main: './_src',
      images: './_src/images'
    },
    output: platform.outputPath
  });

  options.copy = options.copy.filter(p => fs.existsSync(path.resolve(process.cwd(), p.from)));

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
        patterns: options.copy
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
