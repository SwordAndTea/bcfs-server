#!/bin/bash
if [ "$1" == "start" ]
then
    node /usr/local/bcfs_server/ether.js
elif [ "$1" == "shutdown" ]
then
    pkill -f ether.js
elif [ "$1" == "uninstall" ]
then
    rm -r /usr/local/bcfs_server
    rm /usr/local/bin/bcfs-server
else
then
    echo "wrong parameter, use $0 <start | shutdown | uninstall>"
fi