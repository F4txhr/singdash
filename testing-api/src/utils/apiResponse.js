/**
 * API Response Utilities
 * Professional response formatting and error handling
 */

const crypto = require('crypto');

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Format success response
 */
function success(res, data, message = 'Success', metadata = {}) {
  const requestId = metadata.requestId || generateRequestId();
  const timestamp = new Date().toISOString();
  
  return res.json({
    success: true,
    message,
    data,
    meta: {
      request_id: requestId,
      timestamp,
      ...metadata
    }
  });
}

/**
 * Format error response
 */
function error(res, statusCode, message, details = {}, metadata = {}) {
  const requestId = metadata.requestId || generateRequestId();
  const timestamp = new Date().toISOString();
  
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: getErrorCode(statusCode),
      type: getErrorType(statusCode),
      details
    },
    meta: {
      request_id: requestId,
      timestamp,
      ...metadata
    }
  });
}

/**
 * Get error code from status
 */
function getErrorCode(statusCode) {
  const codes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE'
  };
  
  return codes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Get error type from status
 */
function getErrorType(statusCode) {
  if (statusCode >= 400 && statusCode < 500) {
    return 'ClientError';
  } else if (statusCode >= 500) {
    return 'ServerError';
  }
  return 'UnknownError';
}

/**
 * Validate required fields
 */
function validateRequired(body, fields) {
  const missing = [];
  
  for (const field of fields) {
    if (!body[field] && body[field] !== 0 && body[field] !== false) {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    error: missing.length > 0 
      ? `Missing required fields: ${missing.join(', ')}`
      : null
  };
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000);  // Limit length
}

/**
 * Validate IP address format
 */
function isValidIP(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.');
    return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
  }
  
  return ipv6Regex.test(ip);
}

/**
 * Validate port number
 */
function isValidPort(port) {
  const portNum = parseInt(port);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

/**
 * Calculate response time
 */
function calculateResponseTime(startTime) {
  return Date.now() - startTime;
}

module.exports = {
  success,
  error,
  generateRequestId,
  validateRequired,
  sanitizeString,
  isValidIP,
  isValidPort,
  calculateResponseTime,
  getErrorCode,
  getErrorType
};
