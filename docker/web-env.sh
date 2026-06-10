#!/bin/sh
set -eu

cat > /usr/share/nginx/html/env.js <<EOF
window.__MAZING_BOLAO_ENV__ = {
  VITE_SERVER_URL: "${VITE_SERVER_URL:-}"
};
EOF
