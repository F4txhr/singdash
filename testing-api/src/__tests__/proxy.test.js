jest.mock('../services/githubFetcher', () => ({
  fetchAndParse: jest.fn()
}));

jest.mock('../services/proxyTester', () => ({
  testAll: jest.fn(),
  testQuick: jest.fn()
}));

jest.mock('../services/ispLookup', () => ({
  lookup: jest.fn()
}));

const request = require('supertest');
const app = require('../index');
const githubFetcher = require('../services/githubFetcher');
const proxyTester = require('../services/proxyTester');
const ispLookup = require('../services/ispLookup');

describe('Proxy routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/proxies/test-single', () => {
    it('returns 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/proxies/test-single')
        .send({ ip: '1.1.1.1' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.details).toContain('port');
    });

    it('returns 400 when IP format is invalid', async () => {
      const response = await request(app)
        .post('/api/proxies/test-single')
        .send({ ip: '999.999.999.999', port: 443 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/Invalid IP address format/i);
    });

    it('returns proxy test result for valid payload', async () => {
      proxyTester.testQuick.mockResolvedValue({
        status: 'alive',
        latency: 120
      });
      ispLookup.lookup.mockResolvedValue({
        country_code: 'US',
        country_name: 'United States',
        isp: 'Cloudflare'
      });

      const response = await request(app)
        .post('/api/proxies/test-single')
        .send({ ip: '1.1.1.1', port: 443, protocol: 'quick' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('alive');
      expect(response.body.data.country_code).toBe('US');
      expect(proxyTester.testQuick).toHaveBeenCalledWith('1.1.1.1', 443);
    });
  });

  describe('POST /api/proxies/test', () => {
    it('uses PROXY_SOURCE_URL default when source_url is omitted', async () => {
      process.env.PROXY_SOURCE_URL = 'https://example.com/proxies.json';

      githubFetcher.fetchAndParse.mockResolvedValue([
        { ip: '1.1.1.1', port: 443, country_code: 'US' }
      ]);
      proxyTester.testAll.mockResolvedValue({ status: 'alive', latency: 100 });
      ispLookup.lookup.mockResolvedValue({
        country_name: 'United States',
        isp: 'Cloudflare'
      });

      const response = await request(app)
        .post('/api/proxies/test')
        .send({ concurrent: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.total_fetched).toBe(1);
      expect(githubFetcher.fetchAndParse).toHaveBeenCalledWith('https://example.com/proxies.json');
    });
  });

  describe('GET /api/proxies/:country', () => {
    it('returns empty result when country has no proxies', async () => {
      githubFetcher.fetchAndParse.mockResolvedValue([
        { ip: '1.1.1.1', port: 443, country_code: 'US' }
      ]);

      const response = await request(app).get('/api/proxies/id');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.country_code).toBe('ID');
      expect(response.body.data.total).toBe(0);
      expect(response.body.data.proxies).toEqual([]);
    });

    it('tests and returns proxies for selected country', async () => {
      githubFetcher.fetchAndParse.mockResolvedValue([
        { ip: '1.1.1.1', port: 443, country_code: 'US' },
        { ip: '2.2.2.2', port: 80, country_code: 'US' },
        { ip: '8.8.8.8', port: 443, country_code: 'SG' }
      ]);
      proxyTester.testQuick
        .mockResolvedValueOnce({ status: 'alive', latency: 50 })
        .mockResolvedValueOnce({ status: 'dead', latency: 9999 });
      ispLookup.lookup
        .mockResolvedValueOnce({ country_name: 'United States', isp: 'Cloudflare' })
        .mockResolvedValueOnce({ country_name: 'United States', isp: 'Example ISP' });

      const response = await request(app)
        .get('/api/proxies/us')
        .query({ limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.country_code).toBe('US');
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.alive).toBe(1);
      expect(response.body.data.proxies).toHaveLength(2);
      expect(proxyTester.testQuick).toHaveBeenCalledTimes(2);
    });
  });
});
