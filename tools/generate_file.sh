#!/bin/bash
# if [ $# != 1 ]; then
#     echo "parameter error, give root dir"
#     return
# fi

for line in `cat ./config.txt`
do
    #echo $HOME$line
    if [ "$line" == "/.UserInfos" ]; then
        mkdir $HOME$line
        chmod 755 $HOME$line
    else
        touch $HOME$line
        chmod 644 $HOME$line
    fi
done