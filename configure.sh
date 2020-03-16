#!/bin/bash
npm install web3 ethereumjs-tx --save
npm install async
mkdir /usr/share/bcfs_server
mv -r ./node_modules /usr/share/bcfs_server/node_modules
mv -r ./tools /usr/share/bcfs_server/tools
mv ./package-lock.json /usr/share/bcfs_server/package-lock.json
 

