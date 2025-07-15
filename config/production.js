//@ts-check
'use strict';

module.exports = platform => {

  const path = require('path');
  const fs = require('fs');

  const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
  const CopyWebpackPlugin = require('copy-webpack-plugin');

  const ManifestTransform = require('../transformers/manifest');
  const SWTransform = require('../transformers/service-worker');
  const OfflineTransform = require('../transformers/offline');

  let siteRoot = platform.getSiteRootPath();

  let copyFiles = [
    {from: 'manifest.json', transform(content) { return ManifestTransform(content, platform) } },
    {from: 'sw.js', to: siteRoot, transform(content) { return SWTransform(content, platform) } },
    {from: 'offline.html', to: siteRoot, transform(content) { return OfflineTransform(content, platform) } }
  ];

  copyFiles = copyFiles.map(item => {
    try {
      let projectPath = path.resolve(process.cwd(), 'build', item.from);
      fs.readFileSync(projectPath);
      item.from = projectPath;
    } catch(e) {
      item.from = path.resolve(__dirname, '../pwa/', item.from);
    }
    return item;
  });

  return {
    mode: 'production',
    plugins: [
      new OptimizeCssAssetsPlugin({
        cssProcessorOptions: {
          discardComments: {
            removeAll: true
          }
        }
      }),
      new CopyWebpackPlugin({
        patterns: copyFiles
      })
    ]
  };
};
