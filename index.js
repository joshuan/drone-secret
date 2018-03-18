#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const debug = require('debug')('drone:secret');
const git = require('git-url-promise');
const Lookuper = require('config-lookuper');
const serial = require('promise-serial');
const lib = require('./lib');
const Drone = require('./drone');

const getRepo = async () => {
    const data = await git();
    const repo = `${data.owner}/${data.name}`;

    debug('Repo: %o', repo);

    return repo;
};

const getDroneFile = () => {
    const route = path.resolve(path.join(process.cwd(), '.drone.yml'));

    debug('Drone file: %o', route);

    return fs.readFileSync(route, 'utf-8');
};

const getSecretConfig = () => {
    const lookuper = new Lookuper('.drone-secret.json', false, 'json');
    const config = lookuper.lookup(process.cwd());

    debug('Secret confug: %o', Object.keys(config.resultConfig)
        .map(x => `${x}: ${Object.keys(config.resultConfig[x]).join(', ')}`));

    return config.resultConfig;
};

const start = async () => {
    const yamlConfig = getDroneFile();
    const secretConfig = getSecretConfig();

    const calculatedConfig = await lib(yamlConfig, secretConfig);

    debug('Result config: %o', calculatedConfig
        .map(x => `${x.name} ${x.image.join(', ')} ${x.event.join('/')}`));

    const repo = await getRepo();
    const drone = new Drone({
        url: process.env.DRONE_SERVER,
        token: process.env.DRONE_TOKEN
    }, repo);

    const currentConfig = await drone.getSecretList();

    return {
        drone,
        currentConfig,
        calculatedConfig
    };
};

const toRemove = (current, calculated) => {
    const list = calculated
        .filter(x => current.find(y => y.name === x.name))
        .map(x => x.name);

    debug('Secrets to remove: %o', list);

    return list;
};

const errorHandler = e => {
    debug('ERROR!');
    console.log('Error:', e);
    process.exit(1);
};

try {
    start()
        .then(({ drone, calculatedConfig, currentConfig }) => {
            return {
                drone,
                remove: toRemove(currentConfig, calculatedConfig),
                config: calculatedConfig
            };
        })
        .then(({ drone, remove, config }) => {

            const actions = remove
                .map(id => () => drone.deleteSecret(id))
                .concat(config
                    .map(secret => () => drone.createSecret(secret))
                );

            return serial(actions);
        })
        .then(() => {
            console.log('Finish');
        })
        .catch(errorHandler);
} catch (e) {
    errorHandler(e);
}
