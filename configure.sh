#!/bin/bash
npm install web3 ethereumjs-tx --save
npm install async --save
npm install express --svae
mkdir /usr/local/bcfs_server
mv ./node_modules /usr/local/bcfs_server/node_modules
mv ./tools/ether.js /usr/local/bcfs_server/ether.js
mv ./tools/generate_file.sh /usr/local/bcfs_server/generate_file.sh
chmod 755 /usr/local/bcfs_server/generate_file.sh
mv ./package-lock.json /usr/local/bcfs_server/package-lock.json
chmod 777 ./tools/generate_file.sh
./tools/generate_file.sh
mv bcfs_server.sh /usr/local/bin/bcfs_server
chmod 755 /usr/local/bin/bcfs_server
