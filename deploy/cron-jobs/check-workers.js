/**
 * Worker Health Check Cron Job
 * Runs every 5 minutes
 * 
 * Setup:
 * crontab -e
 * */5 * * * * cd /opt/singdash/cron-jobs && node check-workers.js >> /var/log/singdash-workers.log 2>&1
 */

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log(`[${new Date().toISOString()}] 🔍 Starting worker health check...`);

async function checkWorkers() {
  try {
    // Step 1: Get all active workers from database
    console.log('\n📋 Fetching workers from database...');
    const { data: workers, error: fetchError } = await supabase
      .from('workers')
      .select('*')
      .eq('active', true);
    
    if (fetchError) {
      throw new Error(`Failed to fetch workers: ${fetchError.message}`);
    }
    
    if (!workers || workers.length === 0) {
      console.log('⚠️  No active workers found in database');
      return;
    }
    
    console.log(`   Found ${workers.length} active workers\n`);
    
    // Step 2: Check each worker
    for (const worker of workers) {
      console.log(`\n🔍 Checking ${worker.domain}...`);
      
      let status = 'down';
      let responseTime = null;
      let uptimeData = null;
      let statsData = null;
      let errorMessage = null;
      
      try {
        // Check /uptime endpoint
        const uptimeRes = await axios.get(
          `https://${worker.domain}/uptime`,
          { timeout: 5000 }
        );
        
        if (uptimeRes.status === 200) {
          status = 'active';
          responseTime = parseInt(uptimeRes.headers['x-response-time']) || null;
          uptimeData = uptimeRes.data;
          
          console.log(`   ✅ Status: active`);
          console.log(`   ⏱️  Response time: ${responseTime}ms`);
          console.log(`   📊 Uptime: ${uptimeData.uptime?.formatted || 'N/A'}`);
        }
        
      } catch (error) {
        status = 'down';
        errorMessage = error.message;
        console.log(`   ❌ Status: down`);
        console.log(`   💥 Error: ${error.message}`);
      }
      
      // Try to get stats if worker is active
      if (status === 'active') {
        try {
          const statsRes = await axios.get(
            `https://${worker.domain}/stats`,
            { timeout: 5000 }
          );
          
          if (statsRes.status === 200) {
            statsData = statsRes.data;
            console.log(`   📈 Requests today: ${statsData.requests?.today || 0}`);
          }
        } catch (err) {
          console.log(`   ⚠️  Could not fetch stats: ${err.message}`);
        }
      }
      
      // Step 3: Update worker status in database
      await supabase
        .from('workers')
        .update({
          status,
          uptime_seconds: uptimeData?.uptime?.total_seconds || 0,
          total_requests: statsData?.requests?.total || 0,
          bandwidth_bytes: statsData?.bandwidth?.total_bytes || 0,
          last_checked_at: new Date().toISOString(),
          error_message: errorMessage
        })
        .eq('id', worker.id);
      
      // Step 4: Save to history
      await supabase
        .from('worker_uptime_history')
        .insert({
          worker_id: worker.id,
          status,
          response_time_ms: responseTime,
          uptime_seconds: uptimeData?.uptime?.total_seconds || 0,
          requests_count: statsData?.requests?.today || 0,
          bandwidth_bytes: statsData?.bandwidth?.today_bytes || 0
        });
      
      console.log(`   💾 Saved to database\n`);
    }
    
    // Step 5: Summary
    const { data: summary } = await supabase
      .from('worker_summary')
      .select('*')
      .single();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ WORKER HEALTH CHECK COMPLETED');
    console.log('='.repeat(60));
    console.log(`Total workers: ${summary?.total_workers || 0}`);
    console.log(`Active: ${summary?.active_workers || 0}`);
    console.log(`Down: ${summary?.down_workers || 0}`);
    console.log(`Total requests (all): ${summary?.total_requests_all || 0}`);
    console.log(`Total bandwidth (all): ${formatBytes(summary?.total_bandwidth_all || 0)}`);
    console.log('='.repeat(60));
    console.log(`\nNext check in 5 minutes\n`);
    
  } catch (error) {
    console.error('\n❌ WORKER CHECK FAILED:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Helper: Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Run check
checkWorkers();
