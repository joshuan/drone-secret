#!/usr/bin/env node

const debug = require('debug')('drone:secret:client');
const got = require('got');
const { URL } = require('url');
const { name, version } = require('./package.json');

class DroneSecretClient {
    constructor(config, repo) {
        const baseUrl = new URL(config.url);

        this._request = (method, url, data) => {
            baseUrl.pathname = `api/repos/${repo}/${url}`;

            debug('Request: %o %o', method, baseUrl.toString());

            if (data) {
                debug('Data: %o', data);
            }

            return got(baseUrl.toString(), {
                method: method || 'GET',
                body: data,
                json: true,
                headers: {
                    Authorization: `Bearer ${config.token}`,
                    'User-Agent': `${name}/${version}`
                }
            }).then(res => {
                debug('Status code: %o', res.statusCode);

                return res.body;
            });
        };
    }

    getSecretList() {
        return this._request('GET', 'secrets');
    }

    getSecret(id) {
        return this._request('GET', `secrets/${id}`);
    }

    createSecret(data) {
        return this._request('POST', 'secrets', data);
    }

    updateSecret(id, data) {
        return this._request('PATCH', `secrets/${id}`, data);
    }

    deleteSecret(id) {
        return this._request('DELETE', `secrets/${id}`);
    }
}

module.exports = DroneSecretClient;
