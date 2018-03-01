#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const debug = require('debug')('drone:secret');
const git = require('git-url-promise');
const Lookuper = require('config-lookuper');
const lib = require('./lib');
const Drone = require('./drone');

const getRepo = async () => {
    const data = await git();
    const repo = `${data.owner}/${data.name}`;

    debug(`Repo: ${repo}`);

    return repo;
}

const getDroneFile = () => {
    const route = path.resolve(path.join(process.cwd(), '.drone.yml'));

    debug(`Drone file: ${route}`);

    return fs.readFileSync(route, 'utf-8');
}

const getSecretConfig = () => {
    const lookuper = new Lookuper('.drone-secret.json', false, 'json');
    const config = lookuper.lookup(process.cwd());

    debug(Object.keys(config.resultConfig).map(x => `${x}: ${Object.keys(config.resultConfig[x]).join(', ')}`));

    return config.resultConfig;
}

const start = async () => {
    const yamlConfig = getDroneFile();
    const secretConfig = getSecretConfig();

    const calculatedConfig = await lib(yamlConfig, secretConfig);

    debug(calculatedConfig.map(x => `${x.name} ${x.image.join(', ')} ${x.event.join('/')}`));

    const repo = await getRepo();
    const drone = new Drone({
        url: process.env.DRONE_SERVER,
        token: process.env.DRONE_TOKEN
    }, repo);

    const currentConfig = await drone.getSecretList();

    return calculatedConfig;
}

const error = e => {
    debug('ERROR!');
    console.log('Error:', e);
    process.exit(1);
}

try {
    start()
        .then(() => {
            process.exit(0);
        })
        .catch(error);
} catch (e) {
    error(e);
}
