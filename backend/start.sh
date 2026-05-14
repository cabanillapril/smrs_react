#!/bin/bash
# Run from the /backend directory
cd "$(dirname "$0")"
echo "Starting CTech SMRS backend..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
