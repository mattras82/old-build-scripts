'use strict';

let kentico = require('./base');
const c = require('../util/logs');

kentico.name = 'kentico';

kentico.beforeSetup = async () => {
  if (!kentico.verifyThemeDirectory()) {
    c.warn('WARNING: It looks like you haven\'t renamed the theme folder!\n');
    c.warn('It is best practice rename the theme folder to the site\'s branding.\n');
    let name = await kentico.getThemeName().catch();
    if (await c.getResponse(`Are you sure you'd like to rename to theme folder to "${name}"? Confirm with "y"`) === 'y') {
      try {
        c.log(`Moving theme folder to: ${name}`);
        const fs = require('fs-extra');
        const path = require('path');
        let newDir = path.join(process.cwd(), '..', name);
        fs.copySync(process.cwd(), newDir);
        c.success(`All files copied to ${newDir}`);
        process.chdir(newDir);
        try {
          const helpers = require('../util/helpers');
          let config = helpers.getJson(`${process.cwd()}/config.json`);
          config.theme.short_name = name;
          kentico.writeConfigFile(config);
        } catch (e) {
          c.warn('Could not update the config file.');
          console.log(e);
        }
        c.warn(`Please delete the ${kentico.starterName} directory when this process has finished.`);
      } catch (e) {
        c.error('Could not rename the theme folder');
        c.warn(`Please rename "${kentico.starterName}" folder to ${name} ASAP and reflect the new name in config.json's "short_name" field`);
        console.log(e);
      }
    }
  }
};

/**
 * Gets the public path to the outputted assets
 * @param {Object} config
 * @return {string}
 */
kentico.getAssetsLocation = config => {
  if (!kentico.verifyThemeDirectory(config)) {
    c.error(`The theme directory does not match the config.theme.short_name value! (${config.theme.short_name})`);
    c.error('This will cause issues with the sw.js & manifest.js files. Please fix immediately');
  }
  return config.env.production ? `/App_Themes/${config.theme.short_name}/assets/` : '/';
};

/**
 * Gets the relative path from the project's output folder to the site root
 * @return {string}
 */
kentico.getSiteRootPath = () => {
  return '../../../';
};

/**
 * Gets the array of URLs to cache when the service worker is installed
 * @param {Object} config
 * @return {Array}
 */
kentico.getSWUrls = config => {
  const helpers = require('../util/helpers');
  let opts = helpers.getBuildOptions({
    urlsToCache: [
      '/offline.html',
      `/App_Themes/${config.theme.short_name}/assets/images/logo.png`,
      `/App_Themes/${config.theme.short_name}/assets/jquery.min.js`,
      `/App_Themes/${config.theme.short_name}/assets/theme.css?ver=${config.build}`,
      `/App_Themes/${config.theme.short_name}/assets/theme.js?ver=${config.build}`,
    ]
  });
  if (opts.urlsToCache && opts.urlsToCache.length) {
    return opts.urlsToCache.map(url => {
      url = url.replace(/\[build]/, config.build);
      url = url.replace(/\[theme_name]/, config.theme.short_name);
      return url;
    });
  }
  return [];
};

/**
 * Friendly name of this platform
 * @type {string}
 */
kentico.platformName = 'Kentico';

/** The message that prints when a production build is finished
* @type {string}
*/
kentico.productionMessage = 'Don\'t forget to upload the config.json file and clear the cache in the admin!';

module.exports = kentico;
