/**
 * Stats and Health Check Routes
 * Pure on-demand - NO DATABASE
 */

const express = require('express');
const router = express.Router();

const { success, error } = require('../utils/apiResponse');

const startTime = Date.now();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  
  return success(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime_seconds: uptimeSeconds,
    database: 'not_applicable',
    mode: 'pure_on_demand',
    version: '1.0.0'
  }, 'API is healthy', {
    requestId: req.requestId,
    response_time: Date.now() - req.startTime
  });
});

/**
 * GET /api/stats/countries
 * Country statistics - ON DEMAND TEST
 */
router.get('/countries', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('📊 Fetching country statistics (on-demand test)');
    
    // This will do a quick test of available countries
    const githubFetcher = require('../services/githubFetcher');
    const proxyTester = require('../services/proxyTester');
    const ispLookup = require('../services/ispLookup');
    
    const sourceUrl = process.env.PROXY_SOURCE_URL;
    const rawProxies = await githubFetcher.fetchAndParse(sourceUrl);
    
    // Group by country
    const countries = {};
    for (const proxy of rawProxies) {
      if (!countries[proxy.country_code]) {
        countries[proxy.country_code] = {
          code: proxy.country_code,
          name: 'Unknown',
          total: 0,
          alive: 0,
          slow: 0,
          dead: 0
        };
      }
      countries[proxy.country_code].total++;
    }
    
    // Quick test sample from each country (max 5 per country)
    const testedCountries = [];
    for (const [code, data] of Object.entries(countries)) {
      const countryProxies = rawProxies
        .filter(p => p.country_code === code)
        .slice(0, 3); // Test max 3 per country
      
      const results = await Promise.all(
        countryProxies.map(async (proxy) => {
          const result = await proxyTester.testQuick(proxy.ip, proxy.port);
          return result;
        })
      );
      
      data.alive = results.filter(r => r.status === 'alive').length;
      data.slow = results.filter(r => r.status === 'slow').length;
      data.dead = results.filter(r => r.status === 'dead').length;
      
      // Get country name from first IP
      if (countryProxies.length > 0) {
        const ispInfo = await ispLookup.lookup(countryProxies[0].ip);
        data.name = ispInfo.country_name || 'Unknown';
        data.flag = getFlagEmoji(ispInfo.country_code);
      } else {
        data.flag = '🌍';
      }
      
      testedCountries.push(data);
    }
    
    const responseTime = Date.now() - startTime;
    
    return success(res, {
      total_countries: testedCountries.length,
      total_proxies: rawProxies.length,
      countries: testedCountries.sort((a, b) => b.alive - a.alive),
      tested_at: new Date().toISOString()
    }, 'Country statistics fetched successfully', {
      requestId: req.requestId,
      response_time: responseTime
    });
    
  } catch (err) {
    console.error('❌ Error fetching stats:', err.message);
    return error(res, 500, 'Failed to fetch country statistics', {
      original_error: err.message
    }, { requestId: req.requestId });
  }
});

/**
 * GET /api/stats/summary
 * Quick summary
 */
router.get('/summary', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const githubFetcher = require('../services/githubFetcher');
    const sourceUrl = process.env.PROXY_SOURCE_URL;
    const rawProxies = await githubFetcher.fetchAndParse(sourceUrl);
    
    // Count by country
    const countryCount = {};
    for (const proxy of rawProxies) {
      countryCount[proxy.country_code] = (countryCount[proxy.country_code] || 0) + 1;
    }
    
    return success(res, {
      total_countries: Object.keys(countryCount).length,
      total_proxies: rawProxies.length,
      countries: Object.entries(countryCount).map(([code, count]) => ({
        code,
        count
      })),
      tested_at: new Date().toISOString()
    }, 'Proxy summary fetched successfully', {
      requestId: req.requestId,
      response_time: Date.now() - startTime,
      note: 'Use /api/stats/countries for detailed stats with testing'
    });
    
  } catch (err) {
    console.error('❌ Error fetching summary:', err.message);
    return error(res, 500, 'Failed to fetch proxy summary', {
      original_error: err.message
    }, { requestId: req.requestId });
  }
});

/**
 * Helper function to get flag emoji
 */
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) {
    return '🌍';
  }
  
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

module.exports = router;
