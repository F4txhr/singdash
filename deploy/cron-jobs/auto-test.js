/**
 * Auto-Test Proxies Cron Job
 * Runs 4x daily (every 6 hours)
 * 
 * Setup:
 * crontab -e
 * 0 */6 * * * cd /opt/singdash/cron-jobs && node auto-test.js >> /var/log/singdash-autotest.log 2>&1
 */

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const PROXY_SOURCE_URL = process.env.PROXY_SOURCE_URL || 
  'https://raw.githubusercontent.com/FoolVPN-ID/Nautica/main/proxyList.txt';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log(`[${new Date().toISOString()}] 🚀 Starting auto-test...`);
console.log(`   Source: ${PROXY_SOURCE_URL}`);
console.log(`   API: ${API_URL}`);

async function autoTest() {
  const startTime = Date.now();
  
  try {
    // Step 1: Create test history record
    console.log('\n📝 Creating test history record...');
    const { data: testRecord, error: testError } = await supabase
      .from('test_history')
      .insert({
        source_url: PROXY_SOURCE_URL,
        status: 'running'
      })
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Failed to create test record:', testError.message);
    }
    
    // Step 2: Call Testing API
    console.log('\n🔄 Calling Testing API...');
    const response = await axios.post(`${API_URL}/api/proxies/test`, {
      source_url: PROXY_SOURCE_URL,
      concurrent: 50
    }, {
      timeout: 120000 // 2 minutes timeout
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API test failed');
    }
    
    const testData = response.data.data;
    console.log(`✅ API test completed:`);
    console.log(`   Total fetched: ${testData.total_fetched}`);
    console.log(`   Total tested: ${testData.total_tested}`);
    console.log(`   Alive: ${testData.total_alive}`);
    console.log(`   Slow: ${testData.total_slow}`);
    console.log(`   Dead: ${testData.total_dead}`);
    console.log(`   Duration: ${testData.duration_ms}ms`);
    
    // Step 3: Save results to Supabase
    console.log('\n💾 Saving results to Supabase...');
    const proxies = testData.proxies || [];
    
    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < proxies.length; i += batchSize) {
      const batch = proxies.slice(i, i + batchSize);
      
      const records = batch.map(proxy => ({
        ip: proxy.ip,
        port: proxy.port,
        country_code: proxy.country_code,
        country_name: proxy.country_name,
        isp: proxy.isp,
        status: proxy.status,
        ping_ms: proxy.ping_ms,
        protocols: proxy.protocols,
        tested_at: new Date().toISOString()
      }));
      
      const { error: upsertError } = await supabase
        .from('proxy_cache')
        .upsert(records, {
          onConflict: 'ip,port'
        });
      
      if (upsertError) {
        console.error(`❌ Batch ${i/batchSize} failed:`, upsertError.message);
      } else {
        console.log(`   ✅ Saved batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(proxies.length/batchSize)} (${batch.length} proxies)`);
      }
    }
    
    // Step 4: Update test history
    console.log('\n📊 Updating test history...');
    const duration = Date.now() - startTime;
    
    await supabase
      .from('test_history')
      .update({
        completed_at: new Date().toISOString(),
        total_fetched: testData.total_fetched,
        total_tested: testData.total_tested,
        total_alive: testData.total_alive,
        total_slow: testData.total_slow,
        total_dead: testData.total_dead,
        duration_ms: duration,
        status: 'completed'
      })
      .eq('id', testRecord.id);
    
    // Step 5: Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ AUTO-TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`Duration: ${(duration/1000).toFixed(2)}s`);
    console.log(`Proxies saved: ${proxies.length}`);
    console.log(`Alive: ${testData.total_alive} (${((testData.total_alive/testData.total_tested)*100).toFixed(1)}%)`);
    console.log(`Slow: ${testData.total_slow} (${((testData.total_slow/testData.total_tested)*100).toFixed(1)}%)`);
    console.log(`Dead: ${testData.total_dead} (${((testData.total_dead/testData.total_tested)*100).toFixed(1)}%)`);
    console.log('='.repeat(60));
    console.log(`\nNext test in 6 hours\n`);
    
  } catch (error) {
    console.error('\n❌ AUTO-TEST FAILED:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    
    // Update test history with error
    if (testRecord) {
      await supabase
        .from('test_history')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', testRecord.id);
    }
    
    process.exit(1);
  }
}

// Run auto-test
autoTest();
