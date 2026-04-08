/**
 * GitHub Fetcher Service
 * Fetches proxy list from GitHub repositories
 */

const axios = require('axios');

class GithubFetcher {
  /**
   * Fetch proxy list from GitHub URL
   * @param {string} url - Raw GitHub URL
   */
  async fetchProxyList(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Singdash-Testing-API/1.0'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching from GitHub:', error.message);
      throw new Error(`Failed to fetch proxy list: ${error.message}`);
    }
  }
  
  /**
   * Parse proxy list from various formats
   * Supports: JSON object, plain text (IP:PORT per line), CSV (IP,Port,CountryCode,Provider)
   */
  parseProxyList(data, format = 'auto') {
    if (!data) {
      throw new Error('No data to parse');
    }
    
    // Auto-detect format
    if (format === 'auto') {
      if (typeof data === 'object') {
        format = 'json';
      } else if (typeof data === 'string') {
        // Check if CSV format (IP,Port,CountryCode,Provider)
        const firstLine = data.split('\n')[0].trim();
        if (firstLine.split(',').length >= 3) {
          format = 'csv';
        } else {
          format = 'text';
        }
      }
    }
    
    const proxies = [];
    
    if (format === 'json') {
      // Expected format: { "ID": ["ip1", "ip2"], "SG": ["ip3"] }
      for (const [countryCode, ips] of Object.entries(data)) {
        if (Array.isArray(ips)) {
          for (const ip of ips) {
            // Extract port if present in IP string
            const [ipPart, portPart] = ip.split(':');
            proxies.push({
              ip: ipPart,
              port: portPart ? parseInt(portPart) : 80, // Default port 80
              country_code: countryCode.toUpperCase()
            });
          }
        }
      }
    } else if (format === 'csv') {
      // FoolVPN format: IP,Port,CountryCode,Provider
      const lines = data.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split(',');
          if (parts.length >= 3) {
            const ip = parts[0].trim();
            const port = parseInt(parts[1].trim());
            const countryCode = parts[2].trim().toUpperCase();
            const provider = parts[3] ? parts[3].trim() : 'Unknown';
            
            // Validate IP and port
            if (ip && !isNaN(port) && port > 0 && port <= 65535) {
              proxies.push({
                ip,
                port,
                country_code: countryCode || 'XX',
                provider
              });
            }
          }
        }
      }
    } else if (format === 'text') {
      // Expected format: IP:PORT per line
      const lines = data.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split(':');
          if (parts.length >= 2) {
            const ip = parts[0];
            const port = parseInt(parts[1]);
            
            // Try to extract country code from comment if present
            let countryCode = 'XX';
            const commentIndex = trimmed.indexOf('#');
            if (commentIndex > 0) {
              const comment = trimmed.substring(commentIndex);
              const countryMatch = comment.match(/\b([A-Z]{2})\b/);
              if (countryMatch) {
                countryCode = countryMatch[1];
              }
            }
            
            proxies.push({
              ip,
              port: isNaN(port) ? 80 : port,
              country_code: countryCode
            });
          }
        }
      }
    }
    
    return proxies;
  }
  
  /**
   * Fetch and parse in one step
   */
  async fetchAndParse(url) {
    const rawData = await this.fetchProxyList(url);
    return this.parseProxyList(rawData);
  }
  
  /**
   * Fetch from multiple sources and merge
   */
  async fetchFromMultiple(sources) {
    const allProxies = [];
    
    for (const source of sources) {
      try {
        const proxies = await this.fetchAndParse(source.url);
        
        // Apply filter if provided
        const filtered = source.filter 
          ? proxies.filter(source.filter)
          : proxies;
        
        allProxies.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch from ${source.url}:`, error.message);
        // Continue with next source
      }
    }
    
    // Remove duplicates
    const unique = allProxies.filter((proxy, index, self) =>
      index === self.findIndex(p => p.ip === proxy.ip && p.port === proxy.port)
    );
    
    return unique;
  }
}

module.exports = new GithubFetcher();
