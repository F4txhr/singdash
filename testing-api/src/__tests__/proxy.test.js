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
});
