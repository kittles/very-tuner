echo "syncing build"
rsync -r ./dist/ pat@104.131.93.234:/var/www/verytuner.com/html/ --exclude '.DS_Store'
echo "syncing public"
rsync -r ./public/ pat@104.131.93.234:/var/www/verytuner.com/html/public --exclude '.DS_Store'
echo "syncing fav icon"
rsync -r ./fav-icons/ pat@104.131.93.234:/var/www/verytuner.com/html/fav-icons/ --exclude '.DS_Store'
