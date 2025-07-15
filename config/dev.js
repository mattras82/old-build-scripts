//@ts-check
'use strict';

module.exports = async platform => {

  const helpers = require('../util/helpers');
  const c = require('../util/logs');

  let defaultOptions = platform.getDefaultDevOptions();

  let options = helpers.getBuildOptions(defaultOptions);

  if (platform.argv.sync !== false && options.localDev.sync) {
    const BrowserSyncPlugin = require('browser-sync-webpack-plugin');

    let pluginOptions = {
      host: options.localDev.host,
      port: options.localDev.port
    };

    if (pluginOptions.host !== 'localhost') {
      pluginOptions.open = 'external';
      if (platform.devLocalHostValidated !== true) {
        const hosts = require('../util/hosts');
        await hosts.validate(pluginOptions.host);
      }
    }

    if (options.localDev.proxy) {
      pluginOptions.proxy = options.localDev.proxy;
    }
    if (options.localDev.files) {
      pluginOptions.files = options.localDev.files;
    }
    if (options.localDev.snippetOptions) {
      pluginOptions.snippetOptions = options.localDev.snippetOptions;
    }

    return {
      plugins: [
        new BrowserSyncPlugin(pluginOptions, {
          callback: () => {
            c.success(`Your local site is ready at http://${pluginOptions.host}${pluginOptions.port !== '80' ? ':' + pluginOptions.port : ''}`);
            c.emphasis('Happy coding! :)');
          },
          injectCss: true
        })
      ]
    }
  }

  return {};
};
