#!/usr/bin/env bash
set -euo pipefail

# Application + Node project root (this directory)
APP_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Repository root: API_tests/, unit_tests/, src/, Dockerfile
REPO_ROOT="$(cd "$APP_SRC/.." && pwd)"
cd "$APP_SRC"

echo "==================================="
echo "Meridian Test Runner"
echo "Script: $APP_SRC/run_tests.sh (v3-docker)"
echo "Repo root: $REPO_ROOT"
echo "==================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0
RUN_UNIT_TESTS="${RUN_UNIT_TESTS:-true}"
RUN_API_TESTS="${RUN_API_TESTS:-true}"
TEST_DB_CONTAINER="meridian-test-db-$$"
TEST_DB_PORT="${TEST_DB_PORT:-}"
TEST_DB_USER="${TEST_DB_USER:-meridian}"
TEST_DB_PASSWORD="${TEST_DB_PASSWORD:-meridian_test_password}"
TEST_DB_NAME="${TEST_DB_NAME:-meridian_test}"
TEST_POW_DIFFICULTY="${TEST_POW_DIFFICULTY:-8}"
TEST_ENCRYPTION_KEY="${TEST_ENCRYPTION_KEY:-0000000000000000000000000000000000000000000000000000000000000000}"
TEST_DOWNLOAD_TOKEN_SECRET="${TEST_DOWNLOAD_TOKEN_SECRET:-0000000000000000000000000000000000000000000000000000000000000000}"
NODE_TEST_IMAGE="${NODE_TEST_IMAGE:-node:20-bookworm-slim}"
TEST_NODE_MODULES_VOLUME="meridian-test-node-modules-$$"

cleanup_test_db() {
  docker rm -f "$TEST_DB_CONTAINER" >/dev/null 2>&1 || true
}

cleanup_node_modules_volume() {
  docker volume rm "$TEST_NODE_MODULES_VOLUME" >/dev/null 2>&1 || true
}

# Run Jest inside a pinned Node Docker image so the host Node version is irrelevant.
run_unit_jest_in_docker() {
  docker run --rm \
    -v "$REPO_ROOT:/repo" \
    -v "$TEST_NODE_MODULES_VOLUME:/repo/src/node_modules" \
    -w /repo/src \
    -e CI=true \
    -e NPM_CONFIG_UPDATE_NOTIFIER=false \
    -e NODE_ENV=test \
    "$NODE_TEST_IMAGE" \
    bash -lc "set -euo pipefail; npm ci --ignore-scripts; (cd /repo && ln -sfn src/node_modules node_modules); exec npx jest --config jest.unit.config.js --no-cache"
}

if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}Docker is required to run tests (pinned Node in container).${NC}"
  exit 1
fi

trap cleanup_node_modules_volume EXIT
cleanup_node_modules_volume

# --- Unit Tests ---
if [ "$RUN_UNIT_TESTS" = "true" ]; then
  echo ""
  echo -e "${YELLOW}Running unit tests in Docker (${NODE_TEST_IMAGE})...${NC}"
  if run_unit_jest_in_docker; then
    echo -e "${GREEN}Unit tests passed.${NC}"
  else
    echo -e "${RED}Unit tests failed.${NC}"
    FAILED=1
  fi
else
  echo ""
  echo -e "${YELLOW}Skipping unit tests (RUN_UNIT_TESTS=false).${NC}"
fi

# --- API Tests ---
if [ "$RUN_API_TESTS" = "true" ]; then
  echo ""
  echo -e "${YELLOW}Running API tests in Docker (${NODE_TEST_IMAGE}) + PostgreSQL container...${NC}"

  trap "cleanup_test_db; cleanup_node_modules_volume" EXIT
  cleanup_test_db

  if ! docker run -d \
    --name "$TEST_DB_CONTAINER" \
    -e POSTGRES_USER="$TEST_DB_USER" \
    -e POSTGRES_PASSWORD="$TEST_DB_PASSWORD" \
    -e POSTGRES_DB="$TEST_DB_NAME" \
    -p "127.0.0.1:${TEST_DB_PORT}:5432" \
    postgres:15-alpine >/dev/null; then
    echo -e "${RED}Failed to start test database container.${NC}"
    FAILED=1
  else
    DB_READY=0
    for _ in {1..30}; do
      if docker exec "$TEST_DB_CONTAINER" pg_isready -U "$TEST_DB_USER" -d "$TEST_DB_NAME" -q; then
        DB_READY=1
        break
      fi
      sleep 1
    done

    if [ "$DB_READY" -ne 1 ]; then
      echo -e "${RED}Test database did not become ready in time.${NC}"
      FAILED=1
    else
      DB_MAPPED_PORT="$(docker port "$TEST_DB_CONTAINER" 5432/tcp | awk -F: '{print $2}')"
      if [ -z "$DB_MAPPED_PORT" ]; then
        echo -e "${RED}Could not resolve mapped DB port for test container.${NC}"
        FAILED=1
      else
        if docker run --rm \
          --add-host=host.docker.internal:host-gateway \
          -v "$REPO_ROOT:/repo" \
          -v "$TEST_NODE_MODULES_VOLUME:/repo/src/node_modules" \
          -w /repo/src \
          -e CI=true \
          -e NPM_CONFIG_UPDATE_NOTIFIER=false \
          -e NODE_ENV=test \
          -e DB_HOST=host.docker.internal \
          -e DB_PORT="$DB_MAPPED_PORT" \
          -e DB_USERNAME="$TEST_DB_USER" \
          -e DB_PASSWORD="$TEST_DB_PASSWORD" \
          -e DB_NAME="$TEST_DB_NAME" \
          -e ENCRYPTION_KEY="$TEST_ENCRYPTION_KEY" \
          -e DOWNLOAD_TOKEN_SECRET="$TEST_DOWNLOAD_TOKEN_SECRET" \
          -e POW_DIFFICULTY="$TEST_POW_DIFFICULTY" \
          -e DB_SYNC=true \
          "$NODE_TEST_IMAGE" \
          bash -lc "set -euo pipefail; npm ci --ignore-scripts; (cd /repo && ln -sfn src/node_modules node_modules); exec npx jest --config jest.api.config.js --no-cache --runInBand"; then
          echo -e "${GREEN}API tests passed.${NC}"
        else
          echo -e "${RED}API tests failed.${NC}"
          FAILED=1
        fi
      fi
    fi
  fi
else
  echo ""
  echo -e "${YELLOW}Skipping API tests (RUN_API_TESTS=false).${NC}"
fi

echo ""
echo "==================================="
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}All tests passed.${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. See output above.${NC}"
  exit 1
fi
