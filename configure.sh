#!/bin/bash
npm install web3 ethereumjs-tx --save
npm install async --save
npm install express --svae
mkdir /usr/local/bcfs_server
cp -r ./node_modules /usr/local/bcfs_server/node_modules
cp ./tools/ether.js /usr/local/bcfs_server/ether.js
cp ./tools/generate_file.sh /usr/local/bcfs_server/generate_file.sh
chmod 755 /usr/local/bcfs_server/generate_file.sh
cp ./package-lock.json /usr/local/bcfs_server/package-lock.json
chmod 755 ./tools/generate_file.sh
./tools/generate_file.sh
cp ./tools/bcfs_server.sh /usr/local/bin/bcfs-server
chmod 755 /usr/local/bin/bcfs-server
