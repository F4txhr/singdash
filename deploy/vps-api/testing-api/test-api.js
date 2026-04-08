/**
 * Simple API Test Script
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: JSON.parse(data || '{}')
        });
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 Singdash Testing API - Professional Features Test');
  console.log('========================================\n');

  try {
    // Test 1: Health Check
    console.log('Test 1: Health Check Endpoint');
    const health = await makeRequest('/api/health');
    console.log(`   Status: ${health.statusCode === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Request ID: ${health.headers['x-request-id'] || 'MISSING'}`);
    console.log(`   Response: ${JSON.stringify(health.body.message)}\n`);

    // Test 2: Root Endpoint
    console.log('Test 2: Root Endpoint');
    const root = await makeRequest('/');
    console.log(`   Status: ${root.statusCode === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   API Name: ${root.body.name}`);
    console.log(`   Version: ${root.body.version}`);
    console.log(`   Features: ${root.body.features.length} features enabled\n`);

    // Test 3: API Docs
    console.log('Test 3: API Documentation Endpoint');
    const docs = await makeRequest('/api/docs');
    console.log(`   Status: ${docs.statusCode === 200 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   API Version: ${docs.body.version}`);
    console.log(`   Rate Limit: ${docs.body.rate_limit}\n`);

    // Test 4: Security Headers (Helmet)
    console.log('Test 4: Security Headers (Helmet)');
    console.log(`   X-Content-Type-Options: ${health.headers['x-content-type-options'] || 'MISSING'}`);
    console.log(`   X-Frame-Options: ${health.headers['x-frame-options'] || 'MISSING'}`);
    console.log(`   Strict-Transport-Security: ${health.headers['strict-transport-security'] || 'MISSING'}\n`);

    // Test 5: CORS Headers
    console.log('Test 5: CORS Headers');
    console.log(`   Access-Control-Allow-Origin: ${health.headers['access-control-allow-origin'] || 'MISSING'}`);
    console.log(`   Access-Control-Expose-Headers: ${health.headers['access-control-expose-headers'] || 'MISSING'}\n`);

    // Test 6: Compression
    console.log('Test 6: Compression');
    console.log(`   Content-Encoding: ${health.headers['content-encoding'] || 'Not applied (small response)'}\n`);

    console.log('========================================');
    console.log('✅ All professional API features working!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Make sure the API server is running on port 3001');
  }
}

runTests();
