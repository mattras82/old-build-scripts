//@ts-check
'use strict';

const c = require('../util/logs');
const helpers = require('../util/helpers');
const path = require('path');

let base = {
  webpack: {},
  webpackArgs: [],
  config: null,
  configPath: './config.json',
  outputPath: './assets',
  starterName: 'GCStarter',
  productionMessage: '',
  pkg: null,
  name: 'base'
};

/**
 * Verifies that the theme directory is not the "starter" directory and that it matches the config's short_name
 * @param {Object} [config] Theme's main config object
 * @return {boolean}
 */
base.verifyThemeDirectory = (config = null, starterName = base.starterName) => {
  let themeName = path.basename(process.cwd());
  if (config && themeName !== starterName && config.theme.short_name !== themeName) {
    config.theme.short_name = themeName;
    base.writeConfigFile(config);
  }
  return themeName !== starterName && (config === null ? true : themeName === config.theme.short_name);
};

/**
 * Writes the given config object to the theme's config.json file
 * @param {Object} config Theme's main config object
 * @returns {boolean}
 */
base.writeConfigFile = config => {
  return helpers.writeJson(`${process.cwd()}/config.json`, config);
};

/**
 * Prompts the user to enter a new theme directory name
 * @return {Promise<string>}
 */
base.getThemeName = async () => {
  let name = await c.getResponse('Please enter the new theme directory name (type "exit" to exit this helper and rename it manually)');
  name = name.trim().replace(' ', '-');
  if (name === 'exit') {
    process.exit(0);
  }
  return name;
};

module.exports = base;

// All command functions are async so we can handle user input or other Promise-based functionality
base.run = async (cmd, argv) => {
  base.argv = Object.assign({command: cmd}, argv);
  base.addWebPackArgs({
    mode: process.env.production ? 'production' : 'development',
    watch: !!argv.watch,
    resolve: {
      modules: [
        'node_modules',
        path.resolve(__dirname, '../node_modules'),
      ]
    },
    resolveLoader: {
      modules: [
        path.resolve(process.cwd(), 'node_modules'),
        path.resolve(__dirname, '../node_modules'),
      ]
    }
  });
  if (Object.prototype.hasOwnProperty.call(base, cmd)) {
    await base[cmd]();
  }
  await base.setWebPack();
  if (base.webpack && base.webpack.plugins) {
    c.log('Running WebPack');
    const webpack = require('webpack');
    let firstRun = true;
    webpack(base.webpack, (err, stats) => {
      if (err) {
        c.error('Oh no! Error in WebPack:');
        console.error(err.stack || err);
        if (err.details) {
          console.error(err.details);
        }
        return;
      }

      console.log(stats.toString({
        colors: true,
        chunks: false,
        children: false
      }));

      if (!base.webpack.watch) {
        if (stats.hasErrors()) {
          c.warn(`GC ${cmd} process has completed, but there were errors in the WebPack build`);
        } else if (stats.hasWarnings()) {
          c.warn(`GC ${cmd} process has completed, but there were warnings in the WebPack build`);
        } else {
          c.success(`GC ${cmd} process has completed successfully.`);
        }
        if (process.env.production && base.productionMessage) {
          c.emphasis(base.productionMessage);
        }
        if (base.afterWebpack) {
          base.afterWebpack();
        }
      } else if (firstRun) {
        c.log('Webpack is watching the files');
        firstRun = false;
        if (process.env.production && base.productionMessage) {
          c.emphasis(base.productionMessage);
        }
      }
    });
  } else {
    c.success(`GC ${cmd} process has completed successfully.`);
    process.exit(0);
  }
};

base.setup = async () => {
  if (base.beforeSetup) {
    await base.beforeSetup();
  }
  await base.static();
  if (base.afterSetup) {
    await base.afterSetup();
  }
};

base.start = async () => {
  if (base.beforeStart) {
    await base.beforeStart();
  }
  if (process.env.production) {
    c.warn('Please note that the config.json file will not be continuously updated and the other production mode processes will not run in watch mode.');
    await c.timeout(1500);
    c.warn('You will have to run "gc p" for a proper production build');
    await c.timeout(1000);
    c.warn('In the meantime, make sure you use a hard refresh in your browser to see your file changes.');
    c.warn('Happy Coding! :)')
    await c.timeout(3000);
  }
  await base.build();
  base.addWebPackArgs({
    watch: true
  });
  if (base.afterStart) {
    await base.afterStart();
  }
};

base.build = async () => {
  if (base.beforeBuild) {
    await base.beforeBuild();
  }
  process.env.build = 'theme';
  let themeArgs = require('../config/theme');
  base.addWebPackArgs(themeArgs(base));
  if (base.afterBuild) {
    await base.afterBuild();
  }
};

base.static = async () => {
  if (base.beforeStatic) {
    await base.beforeStatic();
  }
  let staticArgs = require('../config/static');
  base.addWebPackArgs(staticArgs(base));
  if (base.afterStatic) {
    await base.afterStatic();
  }
};

base.images = async () => {
  if (base.beforeImages) {
    await base.beforeImages();
  }
  let imagesArgs = require('../config/images');
  base.addWebPackArgs(imagesArgs());
  if (base.afterImages) {
    await base.afterImages();
  }
};

base.copy = async () => {
  let options = helpers.getBuildOptions({
    src: {
      styles: './_src/styles'
    }
  });
  base.copyFiles = {
    toolkit: {
      from: path.resolve(process.cwd(), 'node_modules/@goldencomm/toolkit/util/_toolkit.scss'),
      to: path.resolve(process.cwd(), options.src.styles, 'settings'),
      desc: 'Frontend Toolkit SCSS settings'
    },
    sw: {
      from: path.resolve(__dirname, '../pwa/sw.js'),
      to: path.resolve(process.cwd(), 'build'),
      desc: 'PWA Service Worker'
    },
    offline: {
      from: path.resolve(__dirname, '../pwa/offline.html'),
      to: path.resolve(process.cwd(), 'build'),
      desc: 'PWA Offline HTML'
    },
    manifest: {
      from: path.resolve(__dirname, '../pwa/manifest.json'),
      to: path.resolve(process.cwd(), 'build'),
      desc: 'Site Manifest'
    },
    build: {
      from: path.resolve(__dirname, '../config/options.json'),
      to: path.resolve(process.cwd(), 'build'),
      desc: 'Build-Tools build options'
    },
    babel: {
      from: path.resolve(__dirname, '../babel.config.js'),
      to: process.cwd(),
      desc: 'Babel config'
    },
    postcss: {
      from: path.resolve(__dirname, '../postcss.config.js'),
      to: process.cwd(),
      desc: 'PostCSS config'
    }
  };
  if (base.beforeCopy) {
    await base.beforeCopy();
  }
  let copyArgs = require('../config/copy');
  base.addWebPackArgs(await copyArgs(base));
  if (base.afterCopy) {
    await base.afterCopy();
  }
};

base.admin = async () => {
  if (base.beforeAdmin) {
    await base.beforeAdmin();
  }
  process.env.build = 'admin';
  let themeArgs = require('../config/theme')(base);
  let options = helpers.getBuildOptions({
    src: {
      styles: './_src/styles',
      scripts: './_src/scripts'
    }
  });
  themeArgs.entry = {
    'admin': [
      `${options.src.scripts}/admin.js`
    ]
  };
  base.addWebPackArgs(themeArgs);
  if (base.afterAdmin) {
    await base.afterAdmin();
  }
};

base.dev = async () => {
  if (!base.supportsDev) {
    c.warn(`This package has not yet added dev server support for the ${base.platformName} platform.`);
    process.exit(0);
  }
  if (base.beforeDev) {
    await base.beforeDev();
  }
  const devArgs = await require('../config/dev')(base);
  base.addWebPackArgs(devArgs);
  await base.start();
  if (base.afterDev) {
    await base.afterDev();
  }
};

base.production = async () => {
  if (base.beforeProduction) {
    await base.beforeProduction();
  }
  await base.build();
  let prodArgs = require('../config/production');
  base.addWebPackArgs(prodArgs(base));
  if (base.afterProduction) {
    await base.afterProduction();
  }
};

base.addWebPackArgs = args => {
  base.webpackArgs.push(args);
};

base.checkLocalWebPack = async () => {
  const { merge } = require('webpack-merge');
  const fs = require('fs');
  let opts = helpers.getBuildOptions({
    localWebpack: 'default'
  });
  if (opts.localWebpack && fs.existsSync(`${process.cwd()}/webpack.config.js`)) {
    let themeConfig = require(`${process.cwd()}/webpack.config.js`);
    if (typeof themeConfig === 'function') {
      themeConfig = themeConfig(process.env, Object.assign({mode: process.env.production ? 'production' : 'development'}, base.argv));
    }
    let response = 'y';
    if (opts.localWebpack === 'default') {
      c.log('Local project\'s WebPack config found.');
      response = await c.getResponse('Would you like to attempt to merge the local WebPack config with the build-scripts config?\nType "y" to merge\nType "n" to use the build-scripts config\nLeave blank to use the local WebPack config only');
      opts.localWebpack = response === 'y' ? 'merge' : response !== 'n';
      if ('y' === await c.getResponse(`Would you like to save your response for later builds?\nType "y" to confirm`)) {
        helpers.setBuildOptions(opts);
      }
    }
    if (opts.localWebpack === 'merge') {
      base.webpack = merge(...base.webpackArgs, themeConfig);
    } else if (opts.localWebpack === false) {
      base.webpack = merge(...base.webpackArgs);
    } else {
      base.webpack = themeConfig;
    }
    return true;
  }
  return false;
};

base.setWebPack = async () => {
  const { merge } = require('webpack-merge');
  if (await base.checkLocalWebPack()) return;
  base.webpack = merge(...base.webpackArgs);
};
