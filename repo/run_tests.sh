#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==================================="
echo "Meridian Test Runner"
echo "Script: $SCRIPT_DIR/run_tests.sh (v2)"
echo "==================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0
RUN_UNIT_TESTS="${RUN_UNIT_TESTS:-true}"
RUN_API_TESTS="${RUN_API_TESTS:-false}"
TEST_DB_CONTAINER="meridian-test-db-$$"
TEST_DB_PORT="${TEST_DB_PORT:-}"
TEST_DB_USER="${TEST_DB_USER:-meridian}"
TEST_DB_PASSWORD="${TEST_DB_PASSWORD:-meridian_test_password}"
TEST_DB_NAME="${TEST_DB_NAME:-meridian_test}"
TEST_POW_DIFFICULTY="${TEST_POW_DIFFICULTY:-8}"
TEST_ENCRYPTION_KEY="${TEST_ENCRYPTION_KEY:-0000000000000000000000000000000000000000000000000000000000000000}"
TEST_DOWNLOAD_TOKEN_SECRET="${TEST_DOWNLOAD_TOKEN_SECRET:-0000000000000000000000000000000000000000000000000000000000000000}"

cleanup_test_db() {
  docker rm -f "$TEST_DB_CONTAINER" >/dev/null 2>&1 || true
}

ensure_test_dependencies() {
  if [ ! -x "node_modules/.bin/jest" ] || [ ! -d "node_modules/ts-jest" ]; then
    echo -e "${YELLOW}Installing test dependencies (npm ci --ignore-scripts)...${NC}"
    npm ci --ignore-scripts
  fi
}

# --- Unit Tests ---
if [ "$RUN_UNIT_TESTS" = "true" ]; then
  ensure_test_dependencies
  echo ""
  echo -e "${YELLOW}Running unit tests (23 suites, 249 tests)...${NC}"
  if npx jest --config jest.unit.config.js --no-cache 2>&1; then
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
  echo -e "${YELLOW}Running API tests (using isolated PostgreSQL container)...${NC}"

  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker not available. Skipping API tests.${NC}"
    echo -e "${YELLOW}Install Docker to run API tests.${NC}"
  else
    trap cleanup_test_db EXIT
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
        elif DB_HOST=127.0.0.1 \
          DB_PORT="$DB_MAPPED_PORT" \
          DB_USERNAME="$TEST_DB_USER" \
          DB_PASSWORD="$TEST_DB_PASSWORD" \
          DB_NAME="$TEST_DB_NAME" \
        ENCRYPTION_KEY="$TEST_ENCRYPTION_KEY" \
        DOWNLOAD_TOKEN_SECRET="$TEST_DOWNLOAD_TOKEN_SECRET" \
        POW_DIFFICULTY="$TEST_POW_DIFFICULTY" \
          DB_SYNC=true \
          NODE_ENV=test \
          npx jest --config jest.api.config.js --no-cache --runInBand 2>&1; then
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

# --- Summary ---
echo ""
echo "==================================="
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}All tests passed.${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. See output above.${NC}"
  exit 1
fi
