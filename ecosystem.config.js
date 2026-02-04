module.exports = {
    apps: [
        {
            name: 'telegram-frontend',
            script: 'npm',
            args: 'start',
            cwd: '/var/www/telegramshare',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                TELEGRAM_SERVICE_URL: 'http://localhost:8000'
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G'
        },
        {
            name: 'telegram-backend',
            script: 'python3',
            args: 'main.py',
            cwd: '/var/www/telegramshare/telegram-service',
            env: {
                SESSIONS_DIR: './sessions'
            },
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M'
        }
    ]
};
