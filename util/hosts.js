'use strict';

const c = require('./logs');

class Hosts {

  /**
   * Checks if the given host exists in the user's hosts file
   * @param {String} host
   * @returns {boolean}
   */
  check(host) {
    const hostile = require('hostile');
    let lines = hostile.get(false);
    if (lines.length) {
      return lines.some(l => l.indexOf(host) > -1);
    } else {
      c.error('Could not find a hosts file on the system');
    }
    return false;
  }

  async update(ip, host) {
    return new Promise(r => {
      let success = false;
      const os = require('os');
      if (os.type() === 'Darwin') {
        const {execSync} = require('child_process');
        execSync(`sudo npx hostile set ${ip} ${host}`, {
          stdio: 'inherit'
        });
        if (!this.check(host)) {
          c.error(`Oh no! We couldn't add ${host} to your hosts file! :(`);
          c.emphasis(`Please open your hosts file with admin permissions and add the ${host} yourself`);
        } else {
          //Add the IPv6 address handling for faster DNS lookup/page load
          execSync(`sudo npx hostile set ::1 ${host}`, {
            stdio: 'inherit'
          });
          success = true;
        }
        r(success);
      } else {
        const sudo = require('sudo-prompt');
        const path = require('path');
        const scriptPath = path.resolve(__dirname, 'hosts.sh');
        sudo.exec(`sh ${scriptPath} ${ip} ${host}`, {
          name: 'GC Build Scripts'
        }, err => {
          success = this.check(host);
          if (err) {
            console.error(err);
            c.error(`Oh no! We couldn't add ${host} to your hosts file! :(`);
            c.emphasis(`Please open your hosts file with admin permissions and add the ${host} yourself`);
          }
          r(success);
        });
      }
    });
  }

  /**
   * Checks to see if the given hosts exists in the user's hosts file,
   * then adds it to hosts file if it does not
   * @param {String} host
   * @returns {boolean}
   */
  async validate(host) {
    if (!this.check(host)) {
      c.log(`The ${host} hostname doesn't exist in your system's hosts file. Updating now`);
      c.emphasis('Please provide admin access for this operation');
      await c.timeout(2000);
      if (await this.update('127.0.0.1', host)) {
        c.success('Hosts file has been updated');
      } else {
        return false;
      }
    }
    return true;
  }

}

module.exports = new Hosts();
