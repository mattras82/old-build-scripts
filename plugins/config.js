'use strict';

const helpers = require('../util/helpers');
const path = require('path');

class ConfigBuild {

  constructor(opts) {
    if (opts && opts.src) {
      this.src = opts.src;
    }
    if (opts && opts.platform) {
      this.platform = opts.platform;
    }
  }

  processDate(date) {
    let year = date.getFullYear().toString();
    let month = date.getMonth().toString();
    let day = date.getDay().toString();
    let hour = date.getHours().toString();
    let minutes = date.getMinutes().toString();
    let seconds = date.getSeconds().toString();
    let timestamp = Number(year + month + day + hour + minutes + seconds);
    return timestamp.toString(36);
  }

  run(env) {
    const config = helpers.getJson(path.join(process.cwd(), this.src));
    if (env === 'production' || (env === 'development' && config.env.production)) {
      let compiled = Object.assign({}, config, {
        env: {
          development: env !== 'production',
          production: env === 'production'
        }
      });

      if (env === 'production') {
        let timestamp = this.processDate(new Date());

        if (timestamp) {
          compiled.build = timestamp;
        }
      }

      helpers.writeJson(path.join(process.cwd(), this.src), compiled);
    }
  }

  apply(compiler) {
    compiler.hooks.afterEnvironment.tap('ConfigBuild', () => {
      this.run(compiler.options.mode);
    });
  }
}

module.exports  = ConfigBuild;
