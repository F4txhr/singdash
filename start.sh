#!/bin/bash

# Start dashboard on localhost
echo "🚀 Starting Singdash Dashboard..."
echo ""
echo "📍 Dashboard: http://localhost:8080"
echo ""
echo "⚙️  First time setup:"
echo "   1. Open http://localhost:8080"
echo "   2. Click Settings (⚙️)"
echo "   3. Enter Supabase URL & Key"
echo "   4. Enter API URL (http://localhost:3001)"
echo "   5. Save"
echo ""
echo "Press Ctrl+C to stop"
echo "================================"
echo ""

cd "$(dirname "$0")"
python3 -m http.server 8080
