#!/bin/bash
# One-command web deploy: export, fix Vercel's node_modules exclusion, ship.
set -e
rm -rf dist
npx expo export --platform web
# Vercel ignores node_modules folders by default - but Expo puts bundled
# fonts under assets/node_modules, so explicitly un-ignore them:
printf '!**/node_modules\n' > dist/.vercelignore
npx vercel deploy dist --prod
