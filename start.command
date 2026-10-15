#!/bin/bash
# 🎓 Educative Course Hub — start the server and open the browser
cd "$(dirname "$0")"

PORT="${PORT:-3000}"
URL="http://localhost:${PORT}"

echo "📖 Starting Educative Course Hub..."
echo "   Press Ctrl+C to stop it when you're done."

# Start server in background, capture its PID
node server.js &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT

# The first run indexes the big courses before listening, which can take a while.
# Wait until the server answers (up to ~3 minutes) instead of guessing with a sleep.
for _ in $(seq 1 180); do
  if curl -s -o /dev/null "$URL"; then
    open "$URL"
    break
  fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "Server exited before it started listening." >&2
    exit 1
  fi
  sleep 1
done

# Wait for the server to finish
wait $SERVER_PID
