/**
 * Proxy Testing Routes
 * Pure on-demand testing - NO DATABASE
 */

const express = require('express');
const router = express.Router();

const proxyTester = require('../services/proxyTester');
const githubFetcher = require('../services/githubFetcher');
const ispLookup = require('../services/ispLookup');
const { success, error, validateRequired, isValidIP, isValidPort } = require('../utils/apiResponse');

/**
 * POST /api/proxies/test
 * Bulk test proxies from GitHub source
 * Returns results directly - NO SAVE
 */
router.post('/test', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      source_url = process.env.PROXY_SOURCE_URL,
      countries = null,
      concurrent = 50 
    } = req.body;
    
    // Validate required field
    const validation = validateRequired(req.body, ['source_url']);
    if (!validation.valid) {
      return error(res, 400, 'Missing required fields', validation.missing, { requestId: req.requestId });
    }
    
    console.log(`📥 Fetching proxies from: ${source_url}`);
    
    // Fetch proxy list
    const rawProxies = await githubFetcher.fetchAndParse(source_url);
    console.log(`📊 Fetched ${rawProxies.length} proxies`);
    
    // Filter by countries if specified
    let filteredProxies = rawProxies;
    if (countries && Array.isArray(countries)) {
      filteredProxies = rawProxies.filter(p => 
        countries.includes(p.country_code)
      );
      console.log(`🔍 Filtered to ${filteredProxies.length} proxies`);
    }
    
    // Test proxies
    const results = [];
    
    console.log(`⚡ Testing with concurrency: ${concurrent}`);
    
    for (let i = 0; i < filteredProxies.length; i += concurrent) {
      const batch = filteredProxies.slice(i, i + concurrent);
      
      console.log(`⚡ Testing batch ${Math.floor(i/concurrent) + 1}/${Math.ceil(filteredProxies.length/concurrent)}`);
      
      const batchResults = await Promise.all(
        batch.map(async (proxy) => {
          const testResult = await proxyTester.testAll(proxy.ip, proxy.port);
          const ispInfo = await ispLookup.lookup(proxy.ip);
          
          return {
            ...proxy,
            ...testResult,
            country_name: ispInfo.country_name,
            isp: ispInfo.isp
          };
        })
      );
      
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + concurrent < filteredProxies.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Aggregate stats
    const stats = {
      total_fetched: rawProxies.length,
      total_tested: results.length,
      total_alive: results.filter(r => r.status === 'alive').length,
      total_slow: results.filter(r => r.status === 'slow').length,
      total_dead: results.filter(r => r.status === 'dead').length,
      duration_ms: duration,
      by_country: {}
    };
    
    // Group by country
    for (const result of results) {
      if (!stats.by_country[result.country_code]) {
        stats.by_country[result.country_code] = {
          total: 0,
          alive: 0,
          slow: 0,
          dead: 0
        };
      }
      
      stats.by_country[result.country_code].total++;
      stats.by_country[result.country_code][result.status]++;
    }
    
    console.log(`✅ Test completed in ${duration}ms`);
    console.log(`   Alive: ${stats.total_alive}, Slow: ${stats.total_slow}, Dead: ${stats.total_dead}`);
    
    // Return ALL data - Dashboard can cache/save as needed
    return success(res, {
      ...stats,
      proxies: results,
      tested_at: new Date().toISOString()
    }, 'Bulk proxy test completed', {
      requestId: req.requestId,
      response_time: duration
    });
    
  } catch (err) {
    console.error('❌ Error in proxy test:', err.message);
    return error(res, 500, 'Failed to test proxies', {
      original_error: err.message
    }, { requestId: req.requestId });
  }
});

/**
 * GET /api/proxies/:country
 * Get proxies by country - DIRECT TEST ON DEMAND
 * No database, always fresh
 */
router.get('/:country', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { country } = req.params;
    const { limit = 20 } = req.query;
    
    console.log(`🔍 Getting proxies for country: ${country}`);
    
    // Fetch from GitHub
    const sourceUrl = process.env.PROXY_SOURCE_URL;
    const rawProxies = await githubFetcher.fetchAndParse(sourceUrl);
    
    // Filter by country
    const countryProxies = rawProxies.filter(p => 
      p.country_code === country.toUpperCase()
    ).slice(0, parseInt(limit));
    
    if (countryProxies.length === 0) {
      return success(res, {
        country_code: country.toUpperCase(),
        total: 0,
        proxies: [],
        message: 'No proxies found for this country'
      }, 'No proxies available', {
        requestId: req.requestId,
        response_time: Date.now() - startTime
      });
    }
    
    // Test on-demand
    console.log(`⚡ Testing ${countryProxies.length} proxies...`);
    
    const results = await Promise.all(
      countryProxies.map(async (proxy) => {
        const testResult = await proxyTester.testQuick(proxy.ip, proxy.port);
        const ispInfo = await ispLookup.lookup(proxy.ip);
        
        return {
          ...proxy,
          ...testResult,
          country_name: ispInfo.country_name,
          isp: ispInfo.isp
        };
      })
    );
    
    const alive = results.filter(r => r.status === 'alive');
    
    console.log(`✅ Found ${alive.length} alive proxies`);
    
    return success(res, {
      country_code: country.toUpperCase(),
      total: results.length,
      alive: alive.length,
      proxies: results,
      tested_at: new Date().toISOString()
    }, `Found ${alive.length} alive proxies in ${country.toUpperCase()}`, {
      requestId: req.requestId,
      response_time: Date.now() - startTime
    });
    
  } catch (err) {
    console.error('❌ Error fetching proxies:', err.message);
    return error(res, 500, 'Failed to fetch proxies', {
      country: req.params.country,
      original_error: err.message
    }, { requestId: req.requestId });
  }
});

/**
 * POST /api/proxies/test-single
 * Test single proxy on-demand
 */
router.post('/test-single', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { ip, port, protocol = 'quick' } = req.body;
    
    // Validate required fields
    const validation = validateRequired(req.body, ['ip', 'port']);
    if (!validation.valid) {
      return error(res, 400, 'Missing required fields', validation.missing, { requestId: req.requestId });
    }
    
    // Validate IP format
    if (!isValidIP(ip)) {
      return error(res, 400, 'Invalid IP address format', {
        provided: ip,
        format: 'IPv4 or IPv6'
      }, { requestId: req.requestId });
    }
    
    // Validate port
    if (!isValidPort(port)) {
      return error(res, 400, 'Invalid port number', {
        provided: port,
        valid_range: '1-65535'
      }, { requestId: req.requestId });
    }
    
    console.log(`🔍 Testing: ${ip}:${port}`);
    
    let result;
    if (protocol === 'all') {
      result = await proxyTester.testAll(ip, port);
    } else {
      result = await proxyTester.testQuick(ip, port);
    }
    
    // Add ISP info
    const ispInfo = await ispLookup.lookup(ip);
    
    const fullResult = {
      ...result,
      country_code: ispInfo.country_code,
      country_name: ispInfo.country_name,
      isp: ispInfo.isp
    };
    
    return success(res, fullResult, 'Proxy test completed', {
      requestId: req.requestId,
      response_time: Date.now() - startTime
    });
    
  } catch (err) {
    console.error('❌ Error testing proxy:', err.message);
    return error(res, 500, 'Failed to test proxy', {
      ip: req.body.ip,
      port: req.body.port,
      original_error: err.message
    }, { requestId: req.requestId });
  }
});

module.exports = router;
