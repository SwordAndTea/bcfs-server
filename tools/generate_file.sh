#!/bin/bash
mkdir $HOME/.UserInfos
chmod 755 $HOME/.UserInfos
touch $HOME/.UserInfos/.transaction
touch $HOME/.UserInfos/.transaction_result
touch $HOME/.UserInfos/.balance
touch $HOME/.UserInfos/.balance_result
touch $HOME/.UserInfos/.account
touch $HOME/.UserInfos/.account_result
touch $HOME/.UserInfos/.receive
touch $HOME/.UserInfos/.private_keys
chmod 664 $HOME/.UserInfos/.transaction
chmod 664 $HOME/.UserInfos/.transaction_result
chmod 664 $HOME/.UserInfos/.balance
chmod 664 $HOME/.UserInfos/.balance_result
chmod 664 $HOME/.UserInfos/.account
chmod 664 $HOME/.UserInfos/.account_result
chmod 664 $HOME/.UserInfos/.receive
chmod 664 $HOME/.UserInfos/.private_keys