#!/bin/bash
# 🎓 Educative Course Hub — start the server and open the browser
cd "$(dirname "$0")"

echo "📖 Starting Educative Course Hub..."
echo "   Press Ctrl+C to stop it when you're done."

# Start server in background, capture its PID
node server.js &
SERVER_PID=$!

# Give it a moment, then open the browser
sleep 1
open "http://localhost:3000"

# Wait for the server to finish
wait $SERVER_PID