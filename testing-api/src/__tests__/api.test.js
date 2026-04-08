const request = require('supertest');
const app = require('../index');

describe('Singdash Testing API', () => {
  describe('GET /api/health', () => {
    it('returns healthy status response', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.mode).toBe('pure_on_demand');
      expect(response.body.meta).toHaveProperty('request_id');
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('POST /api/config/generate', () => {
    it('returns 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/config/generate')
        .send({ ip: '1.1.1.1' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Missing required fields/i);
      expect(response.body.error.details).toContain('worker_domain');
    });

    it('generates singbox config with valid payload', async () => {
      const response = await request(app)
        .post('/api/config/generate')
        .send({
          ip: '1.1.1.1',
          port: 443,
          isp: 'Cloudflare',
          country_code: 'US',
          worker_domain: 'example.workers.dev',
          protocol: 'trojan',
          format: 'singbox'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('config');
      expect(response.body.data.metadata.proxy_ip).toBe('1.1.1.1');
      expect(response.body.data.metadata.worker_domain).toBe('example.workers.dev');
      expect(response.body.data.metadata.format).toBe('singbox');
    });
  });

  describe('GET /api/config/singbox', () => {
    it('returns downloadable singbox config', async () => {
      const response = await request(app)
        .get('/api/config/singbox')
        .query({
          ip: '1.1.1.1',
          port: 443,
          worker_domain: 'example.workers.dev',
          protocol: 'trojan'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('type');
      expect(response.headers['content-disposition']).toContain('singbox-1.1.1.1.json');
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('GET /api/config/clash', () => {
    it('returns clash YAML response payload', async () => {
      const response = await request(app)
        .get('/api/config/clash')
        .query({
          ip: '1.1.1.1',
          port: 443,
          worker_domain: 'example.workers.dev',
          protocol: 'trojan'
        });

      const payload = response.body && Object.keys(response.body).length > 0
        ? response.body
        : JSON.parse(response.text);

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data).toHaveProperty('yaml');
      expect(payload.data.yaml).toContain('type: trojan');
      expect(response.headers['content-disposition']).toContain('clash-1.1.1.1.yaml');
      expect(response.headers['content-type']).toContain('text/yaml');
    });
  });
});
