const ava = require('ava');
const lib = require('../lib');

ava('test', t => {
    const config = {
        '_global': {
            'skip-verify': true,
            event: ['push']
        },
        'foo/bar': {
            'S1': 'v1',
            'S2': 'v2'
        },
        'registry.examepl.com/foo/bar': {
            'S3': 'v3'
        }
    };

    const yml = `pipeline:
    test1:
        image: foo/bar:v1
        when:
            event: tag
    test2:
        image: foo/bar:v2
        when:
            events: [ pull_request, push ]
    test3:
        image: registry.examepl.com/foo/bar
`;

    const needResult = [
        {
            name: 'S1',
            value: 'v1',
            'skip-verify': true,
            image: [
                'foo/bar:*'
            ],
            event: ['push', 'tag', 'pull_request']
        },
        {
            name: 'S2',
            value: 'v2',
            'skip-verify': true,
            image: [
                'foo/bar:*'
            ],
            event: ['push', 'tag', 'pull_request']
        },
        {
            name: 'S3',
            value: 'v3',
            'skip-verify': true,
            image: [
                'registry.examepl.com/foo/bar'
            ],
            event: ['push', 'pull_request', 'tag', 'deployment']
        }
    ];

    const realResult = lib(yml, config);

    t.deepEqual(realResult, needResult);
});
