#!/bin/bash
# Fix Next.js standalone output - install production dependencies
# Next.js output file tracing sometimes omits nested dependencies
set -e

STANDALONE_DIR=".next/standalone"

if [ -d "$STANDALONE_DIR" ]; then
  echo "Installing production dependencies in standalone..."
  cd "$STANDALONE_DIR"
  
  # Copy package-lock.json if it exists for reproducible install
  if [ -f "../../package-lock.json" ]; then
    cp ../../package-lock.json .
  fi
  
  npm install --production --no-audit --no-fund 2>&1 | tail -5
  cd - > /dev/null
  echo "Standalone fix complete."
else
  echo "No standalone directory found, skipping."
fi
