/**
 * VPN Config Generator Service
 * Generates configurations for SingBox, Clash, and V2Ray
 */

const crypto = require('crypto');

class ConfigGenerator {
  /**
   * Generate UUID
   */
  generateUUID() {
    return crypto.randomUUID();
  }
  
  /**
   * Generate random password for Shadowsocks
   */
  generatePassword(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Convert country code to flag emoji
   */
  getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) {
      return '🌍'; // Default globe
    }
    
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }
  
  /**
   * Format ISP name for display
   */
  formatISPName(isp) {
    // Remove common suffixes and clean up
    return isp
      .replace(/\s+(Ltd\.?|Co\.?|Inc\.?|Corp\.?|LLC|PLTC|TBK)/gi, '')
      .replace(/\s+Indonesia/gi, '')
      .trim();
  }
  
  /**
   * Generate SingBox Trojan config
   */
  generateTrojanSingBox(proxy, workerDomain, fakeSni, uuid) {
    return {
      type: "trojan",
      tag: `1 ${this.getFlagEmoji(proxy.country_code)} ${proxy.isp} WS TLS [proxy]`,
      server: fakeSni || "support.zoom.us",
      server_port: 443,
      password: uuid || this.generateUUID(),
      tls: {
        enabled: true,
        server_name: workerDomain,
        insecure: true
      },
      transport: {
        type: "ws",
        path: `/${proxy.ip}-${proxy.port}`,
        headers: {
          Host: workerDomain
        }
      }
    };
  }
  
  /**
   * Generate SingBox VMess config
   */
  generateVmessSingBox(proxy, workerDomain, fakeSni, uuid) {
    return {
      type: "vmess",
      tag: `1 ${this.getFlagEmoji(proxy.country_code)} ${proxy.isp} WS TLS [proxy]`,
      server: fakeSni || "support.zoom.us",
      server_port: 443,
      uuid: uuid || this.generateUUID(),
      security: "auto",
      alter_id: 0,
      tls: {
        enabled: true,
        server_name: workerDomain,
        insecure: true
      },
      transport: {
        type: "ws",
        path: `/${proxy.ip}-${proxy.port}`,
        headers: {
          Host: workerDomain
        }
      }
    };
  }
  
  /**
   * Generate SingBox Shadowsocks config
   */
  generateSSSingBox(proxy, workerDomain, fakeSni, password) {
    return {
      type: "shadowsocks",
      tag: `1 ${this.getFlagEmoji(proxy.country_code)} ${proxy.isp} WS TLS [proxy]`,
      server: fakeSni || "support.zoom.us",
      server_port: 80,
      method: "none",
      password: password || this.generatePassword(),
      plugin: "v2ray-plugin",
      plugin_opts: `ntls;mux=0;mode=websocket;path=/${proxy.ip}-${proxy.port};host=${workerDomain}`
    };
  }
  
  /**
   * Generate SingBox VLESS config
   */
  generateVlessSingBox(proxy, workerDomain, fakeSni, uuid) {
    return {
      type: "vless",
      tag: `1 ${this.getFlagEmoji(proxy.country_code)} ${proxy.isp} WS TLS [proxy]`,
      server: fakeSni || "support.zoom.us",
      server_port: 443,
      uuid: uuid || this.generateUUID(),
      tls: {
        enabled: true,
        server_name: workerDomain,
        insecure: true
      },
      transport: {
        type: "ws",
        path: `/${proxy.ip}-${proxy.port}`,
        headers: {
          Host: workerDomain
        }
      }
    };
  }
  
  /**
   * Generate Clash Meta config
   */
  generateClashConfig(proxy, workerDomain, fakeSni, protocol, uuid) {
    const baseConfig = {
      name: `${this.getFlagEmoji(proxy.country_code)} ${this.formatISPName(proxy.isp)}`,
      type: protocol,
      server: fakeSni || "support.zoom.us",
      port: protocol === 'shadowsocks' ? 80 : 443,
      udp: true,
      network: "ws"
    };
    
    if (protocol === 'trojan') {
      baseConfig.password = uuid || this.generateUUID();
      baseConfig.sni = workerDomain;
      baseConfig["ws-opts"] = {
        path: `/${proxy.ip}-${proxy.port}`,
        headers: {
          host: workerDomain
        }
      };
    } else if (protocol === 'vmess') {
      baseConfig.uuid = uuid || this.generateUUID();
      baseConfig.alterId = 0;
      baseConfig.cipher = 'auto';
      baseConfig.sni = workerDomain;
      baseConfig["ws-opts"] = {
        path: `/${proxy.ip}-${proxy.port}`,
        headers: {
          host: workerDomain
        }
      };
    } else if (protocol === 'shadowsocks') {
      baseConfig.password = this.generatePassword();
      baseConfig.cipher = 'none';
      baseConfig["plugin"] = "v2ray-plugin";
      baseConfig["plugin-opts"] = {
        mode: "websocket",
        host: workerDomain,
        path: `/${proxy.ip}-${proxy.port}`,
        tls: true
      };
    }
    
    return baseConfig;
  }
  
  /**
   * Generate V2RayN config (for V2Ray client)
   */
  generateV2RayNConfig(proxy, workerDomain, fakeSni, protocol, uuid) {
    const base64 = require('buffer').Buffer;
    
    let config;
    
    if (protocol === 'vmess') {
      config = {
        v: '2',
        ps: `${this.getFlagEmoji(proxy.country_code)} ${proxy.isp}`,
        add: fakeSni || "support.zoom.us",
        port: '443',
        id: uuid || this.generateUUID(),
        aid: '0',
        net: 'ws',
        type: 'none',
        host: workerDomain,
        path: `/${proxy.ip}-${proxy.port}`,
        tls: 'tls',
        sni: workerDomain
      };
      
      return base64.from(JSON.stringify(config), 'utf-8').toString('base64');
    }
    
    return null;
  }
  
  /**
   * Main generate function
   */
  generate(proxy, options = {}) {
    const {
      protocol = 'trojan',
      format = 'singbox',
      worker_domain,
      fake_sni,
      uuid = null
    } = options;
    
    if (!worker_domain) {
      throw new Error('worker_domain is required');
    }
    
    let config;
    
    // Generate based on format and protocol
    if (format === 'singbox') {
      if (protocol === 'trojan') {
        config = this.generateTrojanSingBox(proxy, worker_domain, fake_sni, uuid);
      } else if (protocol === 'vmess') {
        config = this.generateVmessSingBox(proxy, worker_domain, fake_sni, uuid);
      } else if (protocol === 'shadowsocks') {
        config = this.generateSSSingBox(proxy, worker_domain, fake_sni, uuid);
      } else if (protocol === 'vless') {
        config = this.generateVlessSingBox(proxy, worker_domain, fake_sni, uuid);
      }
    } else if (format === 'clash') {
      config = this.generateClashConfig(proxy, worker_domain, fake_sni, protocol, uuid);
    } else if (format === 'v2rayn') {
      config = this.generateV2RayNConfig(proxy, worker_domain, fake_sni, protocol, uuid);
    }
    
    if (!config) {
      throw new Error(`Unsupported combination: ${protocol} + ${format}`);
    }
    
    return {
      config,
      metadata: {
        username: proxy.isp,
        flag_emoji: this.getFlagEmoji(proxy.country_code),
        proxy_ip: proxy.ip,
        proxy_port: proxy.port,
        worker_domain: worker_domain,
        protocol: protocol,
        format: format,
        generated_at: new Date().toISOString()
      }
    };
  }
}

module.exports = new ConfigGenerator();
