#!/bin/bash
if [ "$1" == "start" ]
then
    node /usr/local/bcfs_server/ether.js
elif [ "$1" == "shutdown" ]
then
    pkill -f /usr/local/bcfs_server/ether.js
elif [ "$1" == "uninstall" ]
then
    rm -r /usr/local/bcfs_server
    rm /usr/local/bin/bcfs-server
    mv $HOME/.UserInfos $HOME/Bcfs-Server-Record
elif [ "$1" == "restart" ]
then
    pkill -f /usr/local/bcfs_server/ether.js
    node /usr/local/bcfs_server/ether.js
else
    echo "wrong parameter, use $0 <start | shutdown | uninstall>"
fi