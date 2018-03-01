#!/usr/bin/env node

const debug = require('debug')('drone:secret:client');
const Wreck = require('wreck');

class DroneSecretClient {
    constructor(config, repo) {

        this._wreck = Wreck.defaults({
            baseUrl: config.url,
            headers: {
                Authorization: `Bearer ${config.token}`
            }
        });

        this._request = (method, url, options) => {

            return new Promise((resolve, reject) => {

                const path = `api/repos/${repo}/${url}`;

                debug(`${method} ${config.url}/${path}`);

                this._wreck
                    .request(method, path, options)
                    .then(res => {
                        debug(`Status code: ${res.statusCode}`);

                        if (res.statusCode < 200 ||
                            res.statusCode >= 300) {

                            const e = new Error(`Invalid response code: ${res.statusCode}`);

                            e.statusCode = res.statusCode;
                            e.headers = res.headers;

                            return reject(e);
                        }

                        this._wreck
                            .read(res, { json: true })
                            .then(payload => {
                                return resolve(payload);
                            })
                            .catch(err => {
                                reject(err);
                            });
                    })
                    .catch(err => {
                        reject(err);
                    });
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
