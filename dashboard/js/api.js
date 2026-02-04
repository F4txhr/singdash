import { Settings } from './utils.js';

class SingBoxAPI {
    constructor() {
        const { baseUrl, secret } = Settings.get();
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.secret = secret;
        this.wsBaseUrl = this.baseUrl.replace(/^http/, 'ws');
    }

    async fetch(endpoint, options = {}) {
        const headers = {
            ...options.headers,
        };
        if (this.secret) {
            headers['Authorization'] = `Bearer ${this.secret}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        return response.json();
    }

    getTraffic(onMessage) {
        const url = `${this.wsBaseUrl}/traffic${this.secret ? '?token=' + encodeURIComponent(this.secret) : ''}`;
        const ws = new WebSocket(url);
        ws.onmessage = (event) => onMessage(JSON.parse(event.data));
        return ws;
    }

    getLogs(onMessage) {
        const url = `${this.wsBaseUrl}/logs${this.secret ? '?token=' + encodeURIComponent(this.secret) : ''}`;
        const ws = new WebSocket(url);
        ws.onmessage = (event) => onMessage(JSON.parse(event.data));
        return ws;
    }

    async getProxies() {
        return this.fetch('/proxies');
    }

    async selectProxy(group, name) {
        return this.fetch(`/proxies/${encodeURIComponent(group)}`, {
            method: 'PUT',
            body: JSON.stringify({ name }),
            headers: { 'Content-Type': 'application/json' }
        });
    }

    async getConnections() {
        return this.fetch('/connections');
    }

    async closeConnection(id) {
        return this.fetch(`/connections/${id}`, { method: 'DELETE' });
    }

    async closeAllConnections() {
        return this.fetch('/connections', { method: 'DELETE' });
    }
}

export default new SingBoxAPI();
