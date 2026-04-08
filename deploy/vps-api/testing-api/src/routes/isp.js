/**
 * ISP Lookup Routes
 */

const express = require('express');
const router = express.Router();

const ispLookup = require('../services/ispLookup');

/**
 * GET /api/isp/:ip
 * Lookup ISP info for an IP address
 */
router.get('/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    
    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IP address format'
      });
    }
    
    console.log(`🔍 Looking up ISP for IP: ${ip}`);
    
    const result = await ispLookup.lookup(ip);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error in ISP lookup:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/isp/batch
 * Batch ISP lookup for multiple IPs
 */
router.post('/batch', async (req, res) => {
  try {
    const { ips, concurrency = 10 } = req.body;
    
    if (!ips || !Array.isArray(ips)) {
      return res.status(400).json({
        success: false,
        error: 'ips array is required'
      });
    }
    
    console.log(`🔍 Batch ISP lookup for ${ips.length} IPs`);
    
    const results = await ispLookup.lookupBatch(ips, concurrency);
    
    res.json({
      success: true,
      data: {
        total: results.length,
        lookups: results
      }
    });
    
  } catch (error) {
    console.error('❌ Error in batch ISP lookup:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
