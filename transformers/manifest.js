'use strict';

module.exports = function (source, platform) {
  const fs = require('fs');
  const sharp = require('sharp');
  const path = require('path');
  const helpers = require('../util/helpers');
  const config = helpers.getJson(path.resolve(process.cwd(), platform.configPath));
  let merged = Object.assign({}, {
    'version': config.version,
    'theme_color': config.styles.sass.theme_color,
    'background_color': config.styles.sass.theme_color,
    'short_name': config.theme.app_name || config.theme.short_name,
    'name': config.theme.name
  }, JSON.parse(source.toString()));
  let iconPath = config.styles.icon.path,
    name = config.styles.icon.name,
    dest = platform.getAssetsLocation(config) + 'images/';
  if (!iconPath) return source;
  try {
    fs.readFileSync(iconPath + name + '-270.png');
  } catch (e) {
    if (config.styles.icon) {
      sharp(`${iconPath}${name}.png`)
        .metadata()
        .then(data => {
          const c = require('../util/logs');
          if (data.width !== 512 || data.height !== 512) {
            c.error(`The ${name}.png icon must be 512x512 pixels\nPlease resize and run the production build again`);
            throw new Error('Theme icon is not the correct dimension');
          }
        });
      const c = require('../util/logs');
      sharp(`${iconPath}${name}.png`)
        .resize(270)
        .toFile(iconPath + name + '-270.png', (err) => {
          if (err) console.log(`Error in generating the ${iconPath + name}-270.png file`, err);
        });
      sharp(`${iconPath}${name}.png`)
        .resize(192)
        .toFile(iconPath + name + '-192.png', (err) => {
          if (err) console.log(`Error in generating the ${iconPath + name}-192.png file`, err);
        });
      sharp(`${iconPath}${name}.png`)
        .resize(32)
        .toFile(iconPath + name + '-32.png', (err) => {
          if (err) console.log(`Error in generating the ${iconPath + name}-32.png file`, err);
        });
      c.success('Generating icon image files...');
      c.emphasis('Don\'t forget to run the "gc images" command to optimize & copy them into the images folder & then upload them.');
    }
  }
  merged = Object.assign({}, merged, {
    "icons": [
      {
        "src": dest + name + "-32.png",
        "type": "image/png",
        "sizes": "32x32"
      },
      {
        "src": dest + name + "-192.png",
        "type": "image/png",
        "sizes": "192x192"
      },
      {
        "src": dest + name + ".png",
        "type": "image/png",
        "sizes": "512x512"
      }
    ]
  });
  return JSON.stringify(merged, null, 2);
};
