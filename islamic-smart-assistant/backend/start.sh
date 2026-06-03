#!/bin/bash

# Start Redis in the background (run as user, custom data dir)
redis-server --daemonize yes --dir /data/redis --bind 127.0.0.1 --port 6379

echo "Redis started on port 6379"

# Wait for Redis to be ready
for i in {1..10}; do
  redis-cli ping > /dev/null 2>&1 && break
  sleep 0.5
done

echo "Starting NestJS backend on port $PORT"

# Start the NestJS application
node dist/main.js
