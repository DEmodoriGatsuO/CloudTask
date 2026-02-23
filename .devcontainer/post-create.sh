set -e

echo "==> Installing Wrangler CLI..."
npm install -g wrangler

echo "==> Installing project dependencies..."
npm run install:all

echo "==> Dev Container ready!"
echo "  API server: npm run dev:api  (port 8787)"
echo "  Web server: npm run dev:web  (port 5173)"
echo "  Init local DB: npm run db:init && npm run db:seed"