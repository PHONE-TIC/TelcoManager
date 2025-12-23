#!/bin/bash

# Stop on error
set -e


DOCKER_USER="phonetic76"
PROJECT_NAME="telcomanager"

echo "=== 🐳 Connecting to Docker Hub ==="
# docker login

echo "=== 🏗️  Building images ==="
docker compose build

echo "=== 🚀 Pushing images to Docker Hub ==="
docker compose push

echo "=== ✅ Done! Images published successfully. ==="
