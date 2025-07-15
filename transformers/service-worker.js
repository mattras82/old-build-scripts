'use strict';

module.exports = (content, platform) => {
  const helpers = require('../util/helpers');
  const path = require('path');
  const Terser = require('terser');

  let config = helpers.getJson(path.resolve(process.cwd(), platform.configPath));
  content = content.toString();

  // Replace Short Name
  content = content.replace(/\[short_name]/g, `${config.theme.short_name}-${config.build}`);

  //Add URLs
  let urls = platform.getSWUrls(config);
  let string = `const urlsToCache = [\n\tlocation.origin,${urls.reduce((acc,url) => acc += `\n\tlocation.origin + '${url}',`, '')}\n]`;
  content = content.replace(/\[urlsToCache]/, string);

  const minified = Terser.minify(content);

  if (minified.error) {
    const c = require('../util/logs');
    c.warn('Could not minify the service worker file');
    console.log(minified);
  } else if (typeof minified.code === 'string') {
    content = minified.code;
  }

  return content;
};
