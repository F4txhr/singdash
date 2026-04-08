/**
 * ISP Lookup Service
 * Uses MaxMind GeoIP2 database for ISP and location lookup
 */

const fs = require('fs');
const path = require('path');
const mmdb = require('maxmind');
const axios = require('axios');

class ISPLookup {
  constructor() {
    this.cityDb = null;
    this.ispDb = null;
    this.initialized = false;
    this.dataDir = path.join(__dirname, '../../data');
  }
  
  /**
   * Initialize MaxMind databases
   */
  async initialize() {
    if (this.initialized) return true;
    
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      
      // Check if databases exist
      const cityDbPath = path.join(this.dataDir, 'GeoLite2-City.mmdb');
      const ispDbPath = path.join(this.dataDir, 'GeoLite2-ISP.mmdb');
      
      // Download if not exists
      if (!fs.existsSync(cityDbPath) || !fs.existsSync(ispDbPath)) {
        console.log('📥 Downloading MaxMind databases...');
        await this.downloadDatabases();
      }
      
      // Open databases
      console.log('📂 Opening MaxMind databases...');
      this.cityDb = await mmdb.open(cityDbPath);
      this.ispDb = await mmdb.open(ispDbPath);
      
      this.initialized = true;
      console.log('✅ MaxMind databases loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load MaxMind databases:', error.message);
      console.log('⚠️  ISP lookup will use fallback method');
      return false;
    }
  }
  
  /**
   * Download MaxMind databases
   * Note: Requires MaxMind account (free Geolite2)
   */
  async downloadDatabases() {
    const userId = process.env.MAXMIND_USER_ID;
    const licenseKey = process.env.MAXMIND_LICENSE_KEY;
    
    if (!userId || !licenseKey) {
      console.warn('⚠️  MaxMind credentials not set. Using fallback ISP lookup.');
      return;
    }
    
    const baseUrl = 'https://download.maxmind.com/app/geoip_download';
    
    try {
      // Download City database
      const cityResponse = await axios.get(baseUrl, {
        params: {
          edition_id: 'GeoLite2-City',
          license_key: licenseKey,
          suffix: 'mmdb'
        },
        responseType: 'stream'
      });
      
      const cityPath = path.join(this.dataDir, 'GeoLite2-City.mmdb');
      const cityWriter = fs.createWriteStream(cityPath);
      cityResponse.data.pipe(cityWriter);
      
      await new Promise((resolve, reject) => {
        cityWriter.on('finish', resolve);
        cityWriter.on('error', reject);
      });
      
      console.log('✅ City database downloaded');
      
      // Download ISP database
      const ispResponse = await axios.get(baseUrl, {
        params: {
          edition_id: 'GeoLite2-ISP',
          license_key: licenseKey,
          suffix: 'mmdb'
        },
        responseType: 'stream'
      });
      
      const ispPath = path.join(this.dataDir, 'GeoLite2-ISP.mmdb');
      const ispWriter = fs.createWriteStream(ispPath);
      ispResponse.data.pipe(ispWriter);
      
      await new Promise((resolve, reject) => {
        ispWriter.on('finish', resolve);
        ispWriter.on('error', reject);
      });
      
      console.log('✅ ISP database downloaded');
      
    } catch (error) {
      console.error('❌ Failed to download MaxMind databases:', error.message);
    }
  }
  
  /**
   * Lookup ISP and location info for an IP
   */
  async lookup(ip) {
    // Initialize if needed
    if (!this.initialized) {
      const success = await this.initialize();
      if (!success) {
        return this.fallbackLookup(ip);
      }
    }
    
    try {
      const [city, isp] = await Promise.all([
        this.cityDb.get(ip),
        this.ispDb.get(ip)
      ]);
      
      return {
        ip: ip,
        country_code: city?.country?.iso_code || 'XX',
        country_name: city?.country?.names?.en || 'Unknown',
        region: city?.subdivisions?.[0]?.iso_code || '',
        city: city?.city?.names?.en || 'Unknown',
        isp: isp?.isp || isp?.organization || 'Unknown ISP',
        as: isp?.autonomous_system_organization || '',
        timezone: city?.location?.time_zone || 'UTC',
        latitude: city?.location?.latitude,
        longitude: city?.location?.longitude
      };
    } catch (error) {
      console.error(`Error looking up IP ${ip}:`, error.message);
      return this.fallbackLookup(ip);
    }
  }
  
  /**
   * Fallback lookup using free API (when MaxMind not available)
   */
  async fallbackLookup(ip) {
    try {
      const response = await axios.get(`http://ip-api.com/json/${ip}`, {
        timeout: 5000
      });
      
      const data = response.data;
      
      if (data.status === 'fail') {
        throw new Error('API lookup failed');
      }
      
      return {
        ip: ip,
        country_code: data.countryCode || 'XX',
        country_name: data.country || 'Unknown',
        region: data.regionName || '',
        city: data.city || 'Unknown',
        isp: data.isp || data.org || 'Unknown ISP',
        as: data.as || '',
        timezone: data.timezone || 'UTC',
        latitude: data.lat,
        longitude: data.lon
      };
    } catch (error) {
      console.error(`Fallback lookup failed for ${ip}:`, error.message);
      
      // Return minimal info
      return {
        ip: ip,
        country_code: 'XX',
        country_name: 'Unknown',
        region: '',
        city: 'Unknown',
        isp: 'Unknown ISP',
        as: '',
        timezone: 'UTC'
      };
    }
  }
  
  /**
   * Batch lookup with concurrency control
   */
  async lookupBatch(ips, concurrency = 10) {
    const results = [];
    
    for (let i = 0; i < ips.length; i += concurrency) {
      const batch = ips.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(ip => this.lookup(ip)));
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + concurrency < ips.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results.filter(r => r !== null);
  }
}

module.exports = new ISPLookup();
