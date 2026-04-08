/**
 * VPN Config Generator Routes
 * Pure on-demand generation - NO DATABASE
 */

const express = require('express');
const router = express.Router();

const configGenerator = require('../services/configGenerator');
const { success, error, validateRequired } = require('../utils/apiResponse');

/**
 * POST /api/config/generate
 * Generate VPN configuration on-demand
 */
router.post('/generate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      ip,
      port,
      isp,
      country_code,
      country_name,
      protocol = 'trojan',
      format = 'singbox',
      worker_domain,
      fake_sni,
      uuid = null
    } = req.body;
    
    // Validate required fields
    const validation = validateRequired(req.body, ['ip', 'worker_domain']);
    if (!validation.valid) {
      return error(res, 400, 'Missing required fields', validation.missing, { requestId: req.requestId });
    }
    
    console.log(`⚙️ Generating ${protocol} config (${format}) for ${ip}`);
    
    // Create proxy object
    const proxy = {
      ip,
      port: port || 80,
      isp: isp || 'Unknown ISP',
      country_code: country_code || 'XX',
      country_name: country_name || 'Unknown'
    };
    
    // Generate config
    const result = configGenerator.generate(proxy, {
      protocol,
      format,
      worker_domain,
      fake_sni,
      uuid
    });
    
    return success(res, result, 'VPN configuration generated successfully', {
      requestId: req.requestId,
      response_time: Date.now() - startTime,
      protocol,
      format
    });
    
  } catch (err) {
    console.error('❌ Error generating config:', err.message);
    return error(res, 500, 'Failed to generate VPN configuration', {
      ip: req.body.ip,
      protocol: req.body.protocol,
      format: req.body.format,
      original_error: err.message
    }, { requestId: req.requestId });
  }
});

/**
 * GET /api/config/singbox
 * One-liner config generation for direct download
 */
router.get('/singbox', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      ip,
      port = 80,
      protocol = 'trojan',
      worker_domain,
      fake_sni,
      isp,
      country_code
    } = req.query;
    
    // Validate required fields
    const validation = validateRequired(req.query, ['ip', 'worker_domain']);
    if (!validation.valid) {
      return error(res, 400, 'Missing required query parameters', validation.missing, { requestId: req.requestId });
    }
    
    const proxy = {
      ip,
      port: parseInt(port),
      isp: isp || 'Unknown ISP',
      country_code: country_code || 'XX'
    };
    
    const result = configGenerator.generate(proxy, {
      protocol,
      format: 'singbox',
      worker_domain,
      fake_sni
    });
    
    // Return as downloadable JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="singbox-${ip}.json"`);
    res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
    
    return success(res, result.config, 'SingBox configuration generated', {
      requestId: req.requestId,
      response_time: Date.now() - startTime,
      download: true
    });
    
  } catch (err) {
    console.error('❌ Error generating SingBox config:', err.message);
    return error(res, 500, 'Failed to generate SingBox configuration', {
      ip: req.query.ip,
      original_error: err.message
    }, { requestId: req.requestId });
  }
});

/**
 * GET /api/config/clash
 * One-liner config generation for Clash
 */
router.get('/clash', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      ip,
      port = 80,
      protocol = 'trojan',
      worker_domain,
      fake_sni,
      isp,
      country_code
    } = req.query;
    
    // Validate required fields
    const validation = validateRequired(req.query, ['ip', 'worker_domain']);
    if (!validation.valid) {
      return error(res, 400, 'Missing required query parameters', validation.missing, { requestId: req.requestId });
    }
    
    const proxy = {
      ip,
      port: parseInt(port),
      isp: isp || 'Unknown ISP',
      country_code: country_code || 'XX'
    };
    
    const result = configGenerator.generate(proxy, {
      protocol,
      format: 'clash',
      worker_domain,
      fake_sni
    });
    
    // Return as YAML (Clash format)
    const yaml = require('js-yaml');
    const yamlStr = yaml.dump(result.config);
    
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="clash-${ip}.yaml"`);
    res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
    
    return success(res, { yaml: yamlStr }, 'Clash configuration generated', {
      requestId: req.requestId,
      response_time: Date.now() - startTime,
      download: true,
      format: 'yaml'
    });
    
  } catch (err) {
    console.error('❌ Error generating Clash config:', err.message);
    return error(res, 500, 'Failed to generate Clash configuration', {
      ip: req.query.ip,
      original_error: err.message
    }, { requestId: req.requestId });
  }
});

module.exports = router;
