-- ============================================
-- SINGDASH DATABASE SCHEMA
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Table: Proxy Cache (hasil test proxy)
CREATE TABLE IF NOT EXISTS proxy_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  port INTEGER NOT NULL,
  country_code VARCHAR(2),
  country_name VARCHAR(100),
  isp VARCHAR(255),
  status VARCHAR(10) CHECK (status IN ('alive', 'slow', 'dead')),
  ping_ms INTEGER,
  protocols JSONB,
  tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ip, port)
);

-- Table: Workers (Cloudflare Workers monitoring)
CREATE TABLE IF NOT EXISTS workers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100),
  active BOOLEAN DEFAULT true,
  status VARCHAR(10) DEFAULT 'unknown' CHECK (status IN ('active', 'down', 'unknown')),
  uptime_seconds INTEGER DEFAULT 0,
  total_requests BIGINT DEFAULT 0,
  bandwidth_bytes BIGINT DEFAULT 0,
  check_interval INTEGER DEFAULT 300,
  alert_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Table: Worker Uptime History
CREATE TABLE IF NOT EXISTS worker_uptime_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(10),
  response_time_ms INTEGER,
  uptime_seconds INTEGER,
  requests_count BIGINT,
  bandwidth_bytes BIGINT
);

-- Table: Test History (riwayat testing)
CREATE TABLE IF NOT EXISTS test_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  source_url TEXT,
  total_fetched INTEGER,
  total_tested INTEGER,
  total_alive INTEGER,
  total_slow INTEGER,
  total_dead INTEGER,
  duration_ms INTEGER,
  status VARCHAR(10) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT
);

-- ============================================
-- INDEXES (untuk performance)
-- ============================================

-- Proxy cache indexes
CREATE INDEX IF NOT EXISTS idx_proxy_cache_status ON proxy_cache(status);
CREATE INDEX IF NOT EXISTS idx_proxy_cache_country ON proxy_cache(country_code);
CREATE INDEX IF NOT EXISTS idx_proxy_cache_tested ON proxy_cache(tested_at DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_cache_ip_port ON proxy_cache(ip, port);

-- Workers indexes
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_active ON workers(active) WHERE active = true;

-- Worker history indexes
CREATE INDEX IF NOT EXISTS idx_uptime_history_worker ON worker_uptime_history(worker_id, checked_at DESC);

-- Test history indexes
CREATE INDEX IF NOT EXISTS idx_test_history_started ON test_history(started_at DESC);

-- ============================================
-- VIEWS (untuk quick stats)
-- ============================================

-- View: Country Statistics
CREATE OR REPLACE VIEW country_stats AS
SELECT 
  country_code,
  country_name,
  COUNT(*) as total_proxies,
  SUM(CASE WHEN status = 'alive' THEN 1 ELSE 0 END) as alive_count,
  SUM(CASE WHEN status = 'slow' THEN 1 ELSE 0 END) as slow_count,
  SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END) as dead_count,
  AVG(ping_ms) as avg_ping,
  MAX(tested_at) as last_tested
FROM proxy_cache
GROUP BY country_code, country_name
ORDER BY alive_count DESC;

-- View: Worker Summary
CREATE OR REPLACE VIEW worker_summary AS
SELECT 
  COUNT(*) as total_workers,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_workers,
  SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) as down_workers,
  SUM(total_requests) as total_requests_all,
  SUM(bandwidth_bytes) as total_bandwidth_all
FROM workers
WHERE active = true;

-- View: Recent Tests
CREATE OR REPLACE VIEW recent_tests AS
SELECT 
  id,
  started_at,
  completed_at,
  EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 as duration_ms,
  total_fetched,
  total_alive,
  status
FROM test_history
ORDER BY started_at DESC
LIMIT 50;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update workers.updated_at
CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Cleanup old history (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_history()
RETURNS void AS $$
BEGIN
  -- Delete worker history older than 30 days
  DELETE FROM worker_uptime_history 
  WHERE checked_at < NOW() - INTERVAL '30 days';
  
  -- Delete test history older than 90 days
  DELETE FROM test_history 
  WHERE started_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Cleanup completed successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE proxy_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_uptime_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_history ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
-- For now, allow public access (since dashboard is public)
CREATE POLICY "Allow public read access" ON proxy_cache FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON workers FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON worker_uptime_history FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON test_history FOR SELECT USING (true);

-- If you want to restrict writes, add auth later
-- CREATE POLICY "Allow authenticated insert" ON proxy_cache FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- COMMENTS (documentation)
-- ============================================

COMMENT ON TABLE proxy_cache IS 'Cache hasil testing proxy untuk reduce API calls';
COMMENT ON TABLE workers IS 'Daftar Cloudflare Workers yang dimonitor';
COMMENT ON TABLE worker_uptime_history IS 'Histori uptime workers untuk analytics';
COMMENT ON TABLE test_history IS 'Riwayat testing proxy untuk tracking';
COMMENT ON VIEW country_stats IS 'Statistik proxy per negara';
COMMENT ON VIEW worker_summary IS 'Summary semua workers';
COMMENT ON VIEW recent_tests IS '50 test terakhir';

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment jika mau sample data
/*
INSERT INTO workers (domain, name, status) VALUES
  ('worker-1.workers.dev', 'Worker Indonesia', 'active'),
  ('worker-2.workers.dev', 'Worker Singapore', 'active');

INSERT INTO proxy_cache (ip, port, country_code, country_name, isp, status, ping_ms) VALUES
  ('103.152.112.162', 80, 'ID', 'Indonesia', 'PT Cloud Hosting', 'alive', 45),
  ('45.76.123.45', 443, 'SG', 'Singapore', 'DigitalOcean', 'alive', 120);
*/

-- ============================================
-- DONE!
-- ============================================

-- Verify tables created
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('proxy_cache', 'workers', 'worker_uptime_history', 'test_history')
ORDER BY table_name;
