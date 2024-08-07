module.exports = {
    apps: [
        {
            name: 'fastify-server',
            script: 'npm',
            args: 'run start:local',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
        },
        {
            name: 'angular-app',
            cwd: './frontend',
            script: 'npm',
            args: 'run start:local',
        },
    ],
};