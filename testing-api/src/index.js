/**
 * Singdash Testing API
 * Professional Production-Ready API
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Import routes
const proxyRoutes = require('./routes/proxy');
const ispRoutes = require('./routes/isp');
const configRoutes = require('./routes/config');
const healthRoutes = require('./routes/health');

// Import utilities
const { generateRequestId } = require('./utils/apiResponse');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;
const API_VERSION = 'v1';

// ============================================
// Security & Performance Middleware
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://singdash.vercel.app', 'https://singdash-dashboard.vercel.app']
    : '*',
  credentials: true,
  exposedHeaders: ['X-Request-ID', 'X-Response-Time', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
}));

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Request Tracking Middleware
// ============================================

app.use((req, res, next) => {
  // Generate request ID
  const requestId = generateRequestId();
  req.requestId = requestId;
  
  // Start time for response time calculation
  req.startTime = Date.now();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ID: ${requestId}`);
  
  next();
});

// Note: Response time headers are set by individual route handlers
// using the apiResponse utility functions

// ============================================
// Rate Limiting (Simple In-Memory)
// ============================================

const rateLimitStore = new Map();
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT) || 100; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
  } else {
    const record = rateLimitStore.get(ip);
    
    if (now > record.resetTime) {
      // Reset window
      record.count = 1;
      record.resetTime = now + RATE_WINDOW;
    } else {
      record.count++;
    }
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT - record.count));
    res.setHeader('X-RateLimit-Reset', record.resetTime);
    
    if (record.count > RATE_LIMIT) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests',
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          type: 'ClientError',
          details: {
            retry_after: Math.ceil((record.resetTime - now) / 1000)
          }
        },
        meta: {
          request_id: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  next();
});

// Clean up old rate limit entries every 5 minutes
const rateLimitCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// Prevent this timer from keeping Node.js process alive in test environments
if (typeof rateLimitCleanupInterval.unref === 'function') {
  rateLimitCleanupInterval.unref();
}

// ============================================
// API Versioning
// ============================================

app.use(`/api/${API_VERSION}/proxies`, proxyRoutes);
app.use(`/api/${API_VERSION}/isp`, ispRoutes);
app.use(`/api/${API_VERSION}/config`, configRoutes);
app.use(`/api/${API_VERSION}/health`, healthRoutes);

// Also mount at /api for backward compatibility
app.use('/api/proxies', proxyRoutes);
app.use('/api/isp', ispRoutes);
app.use('/api/config', configRoutes);
app.use('/api/health', healthRoutes);

// ============================================
// Root Endpoint
// ============================================

app.get('/', (req, res) => {
  res.json({
    name: 'Singdash Testing API',
    version: '1.0.0',
    api_version: API_VERSION,
    description: 'Professional proxy testing and VPN configuration generation',
    status: 'operational',
    endpoints: {
      v1: {
        proxies: `/api/${API_VERSION}/proxies`,
        isp: `/api/${API_VERSION}/isp`,
        config: `/api/${API_VERSION}/config`,
        health: `/api/${API_VERSION}/health`
      }
    },
    documentation: '/api/docs',
    features: [
      'ISP Lookup with MaxMind GeoIP',
      'Multi-protocol Proxy Testing (HTTP/HTTPS/SOCKS5)',
      'VPN Config Generation (SingBox, Clash, V2Ray)',
      'Real-time Response Time Tracking',
      'Rate Limiting & Request Tracking'
    ]
  });
});

// ============================================
// API Documentation Endpoint
// ============================================

app.get('/api/docs', (req, res) => {
  res.json({
    api: 'Singdash Testing API',
    version: API_VERSION,
    base_url: process.env.BASE_URL || `http://localhost:${PORT}`,
    authentication: 'None (Public API)',
    rate_limit: `${RATE_LIMIT} requests/minute`,
    endpoints: {
      health: {
        method: 'GET',
        path: '/api/health',
        description: 'Health check endpoint',
        example: `curl ${process.env.BASE_URL || 'http://localhost:3001'}/api/health`
      },
      isp_lookup: {
        method: 'GET',
        path: '/api/isp/:ip',
        description: 'Lookup ISP information for an IP address',
        example: `curl ${process.env.BASE_URL || 'http://localhost:3001'}/api/isp/8.8.8.8`
      },
      generate_config: {
        method: 'POST',
        path: '/api/config/generate',
        description: 'Generate VPN configuration',
        body: {
          ip: 'string (required)',
          port: 'number',
          protocol: 'trojan|vmess|shadowsocks|vless',
          format: 'singbox|clash|v2ray',
          worker_domain: 'string (required)',
          fake_sni: 'string'
        },
        example: `curl -X POST ${process.env.BASE_URL || 'http://localhost:3001'}/api/config/generate -H "Content-Type: application/json" -d '{...}'`
      },
      test_proxy: {
        method: 'POST',
        path: '/api/proxies/test-single',
        description: 'Test a single proxy',
        body: {
          ip: 'string (required)',
          port: 'number (required)',
          protocol: 'quick|all|ping'
        },
        example: `curl -X POST ${process.env.BASE_URL || 'http://localhost:3001'}/api/proxies/test-single -H "Content-Type: application/json" -d '{...}'`
      }
    },
    response_format: {
      success: {
        success: true,
        message: 'Success',
        data: {},
        meta: {
          request_id: 'req_xxx',
          timestamp: 'ISO8601'
        }
      },
      error: {
        success: false,
        message: 'Error message',
        error: {
          code: 'ERROR_CODE',
          type: 'ClientError|ServerError',
          details: {}
        },
        meta: {
          request_id: 'req_xxx',
          timestamp: 'ISO8601'
        }
      }
    }
  });
});

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    error: {
      code: 'NOT_FOUND',
      type: 'ClientError',
      details: {
        path: req.path,
        method: req.method
      }
    },
    meta: {
      request_id: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.requestId}:`, err);
  
  const statusCode = err.status || err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      type: 'ServerError',
      details: process.env.NODE_ENV !== 'production' ? {
        stack: err.stack,
        name: err.name
      } : undefined
    },
    meta: {
      request_id: req.requestId,
      timestamp: new Date().toISOString()
    }
  });
});

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// ============================================
// Start Server
// ============================================

async function startServer() {
  try {
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('============================================');
      console.log('🚀 Singdash Testing API');
      console.log(`   Version: 1.0.0 (API ${API_VERSION})`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   URL: http://localhost:${PORT}`);
      console.log(`   Docs: http://localhost:${PORT}/api/docs`);
      console.log('============================================');
      console.log('');
      console.log('✅ Features:');
      console.log('   • Request ID tracking');
      console.log('   • Response time monitoring');
      console.log('   • Rate limiting');
      console.log('   • Security headers (Helmet)');
      console.log('   • Compression');
      console.log('   • CORS enabled');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server only when run directly (not during tests)
if (require.main === module) {
  startServer();
}

module.exports = app;
