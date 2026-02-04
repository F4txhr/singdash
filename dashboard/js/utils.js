const Settings = {
    get: () => {
        const defaults = {
            baseUrl: 'http://127.0.0.1:9090',
            secret: '',
            refreshInterval: 1000
        };
        const saved = localStorage.getItem('singbox-settings');
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    },
    save: (settings) => {
        localStorage.setItem('singbox-settings', JSON.stringify(settings));
    }
};

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export { Settings, formatBytes };
