/**
 * Proxy Tester Service
 * Tests HTTP, HTTPS, and SOCKS5 proxies
 */

const http = require('http');
const https = require('https');
const { SocksClient } = require('socks');
const net = require('net');

class ProxyTester {
  /**
   * Test HTTP proxy
   * @param {string} ip - Proxy IP
   * @param {number} port - Proxy port
   * @param {number} timeout - Timeout in ms
   */
  async testHttpProxy(ip, port, timeout = 5000) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const agent = new http.Agent({
        host: ip,
        port: port
      });
      
      const options = {
        hostname: 'www.google.com',
        port: 80,
        path: '/',
        method: 'HEAD',
        timeout: timeout,
        agent: agent
      };
      
      const req = http.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        resolve({
          success: res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302,
          responseTime,
          protocol: 'http',
          statusCode: res.statusCode
        });
      });
      
      req.on('error', () => {
        resolve({ success: false, responseTime: null, protocol: 'http', statusCode: null });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, responseTime: null, protocol: 'http', statusCode: null });
      });
      
      req.end();
    });
  }
  
  /**
   * Test HTTPS proxy
   */
  async testHttpsProxy(ip, port, timeout = 5000) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const agent = new https.Agent({
        host: ip,
        port: port,
        rejectUnauthorized: false
      });
      
      const options = {
        hostname: 'www.google.com',
        port: 443,
        path: '/',
        method: 'HEAD',
        timeout: timeout,
        agent: agent
      };
      
      const req = https.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        resolve({
          success: res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302,
          responseTime,
          protocol: 'https',
          statusCode: res.statusCode
        });
      });
      
      req.on('error', () => {
        resolve({ success: false, responseTime: null, protocol: 'https', statusCode: null });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, responseTime: null, protocol: 'https', statusCode: null });
      });
      
      req.end();
    });
  }
  
  /**
   * Test SOCKS5 proxy
   */
  async testSocks5Proxy(ip, port, timeout = 5000) {
    const startTime = Date.now();
    
    try {
      const result = await SocksClient.createConnection({
        proxy: {
          host: ip,
          port: port,
          type: 5
        },
        command: 'connect',
        destination: {
          host: 'www.google.com',
          port: 80
        },
        timeout: timeout
      });
      
      const responseTime = Date.now() - startTime;
      result.socket.destroy();
      
      return {
        success: true,
        responseTime,
        protocol: 'socks5'
      };
    } catch (error) {
      return {
        success: false,
        responseTime: null,
        protocol: 'socks5'
      };
    }
  }
  
  /**
   * Simple ping test (TCP connection only)
   */
  async testPing(ip, port, timeout = 3000) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const socket = net.createConnection({ 
        host: ip, 
        port: port,
        timeout: timeout 
      });
      
      socket.on('connect', () => {
        const responseTime = Date.now() - startTime;
        socket.destroy();
        resolve({ success: true, responseTime, type: 'ping' });
      });
      
      socket.on('error', () => {
        resolve({ success: false, responseTime: null, type: 'ping' });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, responseTime: null, type: 'ping' });
      });
    });
  }
  
  /**
   * Comprehensive test (all methods)
   */
  async testAll(ip, port, timeout = 5000) {
    try {
      const [ping, http, https, socks5] = await Promise.all([
        this.testPing(ip, port, timeout),
        this.testHttpProxy(ip, port, timeout),
        this.testHttpsProxy(ip, port, timeout),
        this.testSocks5Proxy(ip, port, timeout)
      ]);
      
      const protocols = [];
      if (http.success) protocols.push('http');
      if (https.success) protocols.push('https');
      if (socks5.success) protocols.push('socks5');
      
      let status = 'dead';
      let responseTime = null;
      
      if (protocols.length > 0) {
        status = 'alive';
        responseTime = Math.min(
          http.responseTime || Infinity,
          https.responseTime || Infinity,
          socks5.responseTime || Infinity
        );
        
        if (responseTime > 1000) status = 'slow';
      } else if (ping.success) {
        status = 'slow'; // At least port is open
        responseTime = ping.responseTime;
      }
      
      return {
        ip,
        port,
        status,
        response_time: responseTime,
        protocols_supported: protocols,
        ping_success: ping.success,
        details: {
          http: http.success,
          https: https.success,
          socks5: socks5.success
        }
      };
    } catch (error) {
      return {
        ip,
        port,
        status: 'dead',
        response_time: null,
        protocols_supported: [],
        error: error.message
      };
    }
  }
  
  /**
   * Quick test (Ping + HTTP only) - FAST
   */
  async testQuick(ip, port, timeout = 3000) {
    const [ping, http] = await Promise.all([
      this.testPing(ip, port, timeout),
      this.testHttpProxy(ip, port, timeout)
    ]);
    
    const protocols = [];
    if (http.success) protocols.push('http');
    
    let status = 'dead';
    let responseTime = null;
    
    if (protocols.length > 0) {
      status = 'alive';
      responseTime = http.responseTime;
      if (responseTime > 1000) status = 'slow';
    } else if (ping.success) {
      // Port is open but HTTP not working
      status = 'slow';
      responseTime = ping.responseTime;
      protocols.push('tcp_open');
    }
    
    return {
      ip,
      port,
      status,
      response_time: responseTime,
      protocols_supported: protocols,
      details: {
        ping_success: ping.success,
        http_success: http.success,
        tcp_response_time: ping.responseTime,
        http_response_time: http.responseTime
      }
    };
  }
  
  /**
   * Ping only test (TCP connection to specific port)
   */
  async testPingOnly(ip, port, timeout = 3000) {
    return await this.testPing(ip, port, timeout);
  }
}

module.exports = new ProxyTester();
