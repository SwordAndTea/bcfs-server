#!/bin/bash
if [ "$1" -eq "start" ]
then
    node /usr/local/bcfs_server/ether.js
else if [ "$1" -eq "shutdown"]
then
    pkill -f ether.js
else 
    echo "wrong parameter, use $0 <start | shutdown>"
fi