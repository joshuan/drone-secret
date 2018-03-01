const yaml = require('js-yaml');
const uniq = require('lodash.uniq');
const get = require('lodash.get');
const merge = require('merge-options');

const DEFAULT_EVENTS = ['push', 'pull_request', 'tag', 'deployment'];

function getEvents(obj) {
    const events = get(obj, 'when.events', get(obj, 'when.event', DEFAULT_EVENTS));

    return Array.isArray(events) ? events : [events];
}

module.exports = (yamlContent, config) => {
    const doc = yaml.safeLoad(yamlContent);
    const secrets = {};
    const defaults = config._global || {};
    const images = Object.keys(doc.pipeline)
        .map(key => {
            const obj = doc.pipeline[key];
            const [url, tag] = obj.image.split(':');

            return {
                url,
                tag,
                event: getEvents(obj)
            };
        });

    images.forEach(image => {
        if (config[image.url]) {
            Object.keys(config[image.url]).forEach(key => {
                const imagePath = image.url + (image.tag ? ':*' : '');

                if (!secrets[key]) {
                    secrets[key] = merge({
                        name: key,
                        value: config[image.url][key],
                        image: [],
                        event: []
                    }, defaults);
                }

                secrets[key].image.push(imagePath);
                secrets[key].event = secrets[key].event.concat(image.event);
            });
        }
    });

    return Object.values(secrets).map(x => {
        x.image = uniq(x.image);
        x.event = uniq(x.event);

        return x;
    });
};
