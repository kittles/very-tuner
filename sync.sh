echo "syncing build"
rsync -r ./dist/ pat@104.131.93.234:/var/www/coolsite.com/html/ --exclude '.DS_Store'
echo "syncing public"
rsync -r ./public/ pat@104.131.93.234:/var/www/coolsite.com/html/public --exclude '.DS_Store'
