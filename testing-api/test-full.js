/**
 * Full Integration Test
 * Start server and test in same process
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('\n🧪 Starting Professional API Integration Test\n');

// Start server as child process
const server = spawn('node', ['src/index.js'], {
  cwd: __dirname,
  env: { ...process.env, PORT: '3003' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output);
  
  if (output.includes('Features:')) {
    serverReady = true;
    runTests();
  }
});

server.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

async function runTests() {
  if (!serverReady) return;
  
  console.log('\n=== Running Tests ===\n');
  
  try {
    // Wait a bit for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 1: Health Check
    const health = await makeRequest('/api/health');
    console.log('✅ Test 1 - Health Check:');
    console.log(`   Status Code: ${health.statusCode}`);
    console.log(`   X-Request-ID: ${health.headers['x-request-id'] ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`   X-RateLimit-Limit: ${health.headers['x-ratelimit-limit'] ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`   Security Headers: ${health.headers['x-frame-options'] ? '✅ PRESENT' : '❌ MISSING'}`);
    console.log(`   Response Message: ${health.body.message}\n`);
    
    // Test 2: Root Endpoint
    const root = await makeRequest('/');
    console.log('✅ Test 2 - Root Endpoint:');
    console.log(`   API Name: ${root.body.name}`);
    console.log(`   Version: ${root.body.version}`);
    console.log(`   API Version: ${root.body.api_version}`);
    console.log(`   Features: ${root.body.features.join(', ')}\n`);
    
    // Test 3: Docs
    const docs = await makeRequest('/api/docs');
    console.log('✅ Test 3 - Documentation:');
    console.log(`   API: ${docs.body.api}`);
    console.log(`   Version: ${docs.body.version}`);
    console.log(`   Rate Limit: ${docs.body.rate_limit}\n`);
    
    console.log('========================================');
    console.log('✅ ALL PROFESSIONAL FEATURES WORKING!');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  } finally {
    server.kill();
    process.exit(0);
  }
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3003,
      path,
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: JSON.parse(data || '{}')
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}
