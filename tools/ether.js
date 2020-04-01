const Web3 = require('web3');
const fs = require('fs');
const Tx = require('ethereumjs-tx').Transaction;
const async = require('async');
const sd = require('silly-datetime');

let base_dir = process.env.HOME + "/.UserInfos";

let _transactionFile = base_dir + "/.transaction";

let _transactionResultFile = base_dir + "/.transaction_result";

let _balanceFile = base_dir + "/.balance";

let _balanceResultFile = base_dir + "/.balance_result";

let _accountFile = base_dir + "/.account";//file to record account name

let _accountResultFile = base_dir + "/.account_result";

let _receiveFile = base_dir + "/.receive";

let _addCoinFile = base_dir + "/.add_coins";

let _addCoinResultFile = base_dir + "/.add_coin_result"

let _coinsFile = base_dir + "/.coins";

let _privateKeysFile = base_dir + "/.private_keys";//file to record address and private_key

var _privateKeys = new Array();//address : [name, private key]

var _coins = ["0x3C1670cb9c9D27CeDf2119110165663efc77a22f"];

const _decimal = 18;

function refreshProvider(web3Obj, providerUrl) {
	let retries = 0
  
	function retry(event) {
	  if (event) {
		console.log('Web3 provider disconnected or errored.');
		retries += 1
  
		if (retries > 5) {
		  console.log(`Max retries of 5 exceeding: ${retries} times tried`);
		  return setTimeout(refreshProvider, 5000);
		}
	  } else {
		console.log(`Reconnecting web3 provider websocket provider`);
		refreshProvider(web3Obj, providerUrl);
	  }
  
	  return null
	}
  
	const provider = new Web3.providers.WebsocketProvider(providerUrl)
	
	provider.on('end', () => retry())
	provider.on('error', () => retry())
  
	web3Obj.setProvider(provider)
  
	console.log('New Web3 provider initiated');
  
	return provider
}


if (typeof web3 !== "undefined") {
	web3 = new Web3(web3.currentProvider);
} else {
	//https://ropsten.infura.io/v3/912555e49dd7489b9689e8e0e4b79f55
	//wss://ropsten.infura.io/ws/v3/912555e49dd7489b9689e8e0e4b79f55
	//WebsocketProvider
	web3 = new Web3();
	web3 = new Web3(refreshProvider(web3, "wss://ropsten.infura.io/ws/v3/912555e49dd7489b9689e8e0e4b79f55"));
}



//填充地址为64位
function fill64(hexAddress) {
	filledAddress = "";
	if (hexAddress.length < 64) {
		filledAddress = new Array(64 - hexAddress.length + 1).join("0") + hexAddress;
	}
	return filledAddress;
}

/**
 * get balance
 * @param {string} address the account address to look up for
 * @param {string} contractAddress the coin type
 * @param {function(balance: double)} successCallBack if success, do something with the balance
 * @param {function(error: string)}  failCallBack if fail, do something with the error message
 */
function getBalance(address, contractAddress, successCallBack, failCallBack) {
	var operate = "0x70a08231" + fill64(address.slice(2));
	web3.eth.call({
		to: contractAddress,
		data: operate
	},function(error, result) {
		if (error) {
			failCallBack(error);
		} else {
			successCallBack(parseInt(result) / Math.pow(10, _decimal));
		}
	});
}


/**
 * get all balance for current exist account
 * @param {function(data: string)} successCallBack 
 * @param {function(error: string)} failCallBack 
 */
function getAllBalance(successCallBack, failCallBack) {
	var length = 0;
	for (var key in _privateKeys) {
		length += 1;
		break;
	}
	if (length == 0) {
		failCallBack("error no account current, add account first")
		return;
	}
	var data = "";
	var count = 0;
	var errorCount = 0;
	async.series([
		function(callback) {
			for (var key in _privateKeys) {
				let currentKey = key;
				count += 2;
				web3.eth.getBalance(key, function(error, result) {
					if (error) {
						console.log(error);
						errorCount += 1;
					} else {
						data += currentKey + ":" + "ETH:" + result / Math.pow(10, _decimal) + "\n";
						count -= 1;
						console.log(count);
						if (count === 0) {
							callback(null, "A");
						}
					}
					
				});
				getBalance(key, _coins[0], function(balance) {
					data += currentKey + ":" + "WC:" + balance + "\n";
					count -= 1;
					console.log(count);
					if (count === 0) {
						callback(null, "A");
					}
				}, function(error) {
					errorCount += 1;
					console.log(error);
				})
			}
		},
		function(callback) {
			if (errorCount != 0) {
				failCallBack("error happend in get balances");
			} else {
				successCallBack(data);
			}
			callback(null, "B");
		}
	], function(err, result) {
		
	});
}

function getAllBalanceInOneAddress(address, successCallBack, failCallBack) {
	var data = "";
	var count = 0;
	var errorCount = 0;
	async.series([
		function(callback) {
			count += 2;
			web3.eth.getBalance(address, function(error, result) {
				if (error) {
					console.log(error);
					errorCount += 1;
				} else {
					data += address + ":" + "ETH:" + result / Math.pow(10, _decimal) + "\n";
					count -= 1;
					console.log(count);
					if (count === 0) {
						callback(null, "A");
					}
				}
				
			});
			getBalance(address, _coins[0], function(balance) {
				data += address + ":" + "WC:" + balance + "\n";
				count -= 1;
				console.log(count);
				if (count === 0) {
					callback(null, "A");
				}
			}, function(error) {
				errorCount += 1;
				console.log(error);
			})
		},
		function(callback) {
			if (errorCount != 0) {
				failCallBack("error happend in get balances");
			} else {
				successCallBack(data);
			}
			callback(null, "B");
		}
	], function(err, result) {

	});
}

/**
 * send a transaction
 * @param {string} from the address triggered the transaction action
 * @param {string} to the address to receive the transaction
 * @param {string} contractAddress the coin type you send
 * @param {double} number the count you send
 * @param {function(transactionHash: string)} successCallBack if success, do something with the transaction hash
 * @param {function(error: string)} failCallBack if fail, do something with the error message
 */
function sendTransaction(from, to, contractAddress, number, successCallBack, failCallBack) {
	if (typeof _privateKeys[from] === "undefined") {
		failCallBack("no such address in local, add account first");
	}
	//nonce随机数，这里取该账号的交易数量
	var hex_number = (number * Math.pow(10, _decimal)).toString(16);
	var operate = "0xa9059cbb" + fill64(to.slice(2)) + fill64(hex_number);
	web3.eth.getTransactionCount(from).then(function(number) {
		var rawTx = {
			nonce: '0x'+number.toString(16),
			gasPrice: '0x4a817c800',
			gasLimit: '0x33450',
			to: contractAddress,//合约地址
			data: operate
		}

		//使用私钥对原始的交易信息进行签名，得到签名后的交易数据
		var tx = new Tx(rawTx,{"chain":"ropsten"});
		tx.sign(Buffer.from(_privateKeys[from][1].slice(2), "hex"));
		var serializedTx = tx.serialize();
		web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
		.on("receipt", function(receipt){
			console.log(receipt);
			successCallBack(receipt.gasUsed, receipt.transactionHash);
		}).on("error", function(err) {
			failCallBack(err);
		});
	});
}

/** 
 * 发送Ether币交易
 */
function sendETHTransaction(from, to, value, successCallBack, failCallBack) {
	if (typeof _privateKeys[from] === "undefined") {
		failCallBack("error no such account, add the account first");
		return;
	}
	web3.eth.getTransactionCount(from).then(function(number) {
		var price = 2 * Math.pow(10,8);
		var limit = 10 * 10000;
		var weiValue = value * Math.pow(10, _decimal);

		var rawTx = {
			nonce: '0x'+number.toString(16),
			gasPrice: web3.utils.toHex(price),
			gasLimit: web3.utils.toHex(limit),
			to: to,
			value: web3.utils.toHex(weiValue)
		}
	
		//使用私钥对原始的交易信息进行签名，得到签名后的交易数据
		var tx = new Tx(rawTx,{"chain":"ropsten"});
		tx.sign(Buffer.from(_privateKeys[from][1].slice(2), "hex"));
		var serializedTx = tx.serialize();
		web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
		.on("receipt", function(receipt){
			console.log(receipt);
			successCallBack(receipt.gasUsed, receipt.transactionHash);
		}).on("error", function(err) {
			console.log(err);
			failCallBack(err);
		});
	});
}

/**
 * create a new account
 * @param {string} name the alias of your new account
 * @param {function(address: string, privateKey: string)} successCallBack if sussess, do something with the address and private key
 * @param {function(error: string)} failCallBack if fail, do something with the error message
 */
function createAccount(name, successCallBack, failCallBack) {
	var account = web3.eth.accounts.create();
	if (typeof account !== "undefined") {
		successCallBack(account.address, account.privateKey);
	} else {
		failCallBack("error");
	}
}

/**
 * add an exist account by private_key
 * @param {boolean} private_key the private key you give
 * @param {function(address: string)} successCallBack if success, do something with the address
 * @param {function(error: string)} failCallBack if fail, do something with the error message
 */
function addAccount(private_key, successCallBack, failCallBack) {
	var data = web3.eth.accounts.privateKeyToAccount(private_key);
	if (typeof data !== "undefined") {
		if (typeof _privateKeys[data.address] === "undefined") {
			successCallBack(data.address);
		} else {
			failCallBack("error the account already exist")
		}
	} else {
		failCallBack("error can not add this count");
	}
}


/** 
 * monitor a file
 * @param {string} filePath  the file to monitor
 * @param {boolean} increament : bool should monitor the increament in the file or the total file
 * @param {function(data: string)} callback : the function to deal with the data in the file
 */
function startMonitorFile(filePath, increament, callback) {
	fs.access(filePath, function(err) {
		if (err) {
			console.log("monitor file doesn't exist");
			return;
		}
		if (increament == true) {
			fs.stat(filePath, function(error, initState) {
				var pre_size = initState.size;
				fs.watch(filePath, function (event, filename) {
					//if (event === "change") {
						fs.stat(filePath, function(error, state) {
							if (pre_size < state.size) {
								fs.open(filePath, "r", function(error, fd) {
									buffer = Buffer.alloc(state.size - pre_size, 0);
									fs.read(fd, buffer, 0, state.size - pre_size, pre_size, function(error, byteRead, buffer) {
										var data = buffer.toString();
										pre_size = state.size;
										console.log("new received data is : " + data);
										callback(data);
									});
								});
							} else {
								pre_size = state.size;
							}
						});
					//}
				});
			});
		} else {
			fs.watch(filePath, function (event, filename) {
				if (event === "change") {
					fs.stat(filePath, function(error, state) {
						fs.open(filePath, "r", function(error, fd) {
							buffer = Buffer.alloc(state.size, 0);
							fs.read(fd, buffer, 0, state.size, 0, function(error, byteRead, buffer) {
								var data = buffer.toString();
								pre_size = state.size;
								console.log("new received data is : " + data);
								callback(data);
							});
						});
					});
				}
			});
		}
		
	});
}

/**
 * monitor the transaction action in a coin
 * @param {Array(address)} coinAddress the coin type want to monitor
 * @param {function(from: address, to: address, value: double)} callback 
 * @param {function()} connectedAction
 */
function startMonitorTransaction(callback, connectedAction) {
	var topics = ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"];
	// for (var key in _privateKeys) {
	// 	var filledKey = "0x" + fill64(key.slice(2));
	// 	topics.push(filledKey);
	// }
	var subscription = web3.eth.subscribe("logs", {
		address: _coins,
		topics: topics
	}, function(error, result){
		if (!error) {
			console.log(result);
			var time=sd.format(new Date(), "YYYY-MM-DD hh:mm:ss");
			callback(web3.utils.toChecksumAddress(toStandardAddress(result.topics[1])),
					web3.utils.toChecksumAddress(toStandardAddress(result.topics[2])), _coins[0], "WC", 
					parseInt(result.data, 16) / Math.pow(10, _decimal), result.transactionHash, time);
		} else {
			console.log(error);
		}
	}).on("connected", function(subscriptionId) {
		console.log("subscription id is " + subscriptionId);
		connectedAction();
	});
	return subscription;
}

//not used now
function addCoin(coinAddress) {
	web3.eth.getCode(coinAddress, function(error, result) {
		if(error) {
			console.log(error);
			return false;
		} else {
			//console.log(result);
			if (result === "0x") {
				return false;
			} else {
				return true;
			}
		}
	})
}

var subscription;

function toStandardAddress(address) {
	return "0x" + address.slice(address.length - 40);
}


console.log("starting...");

async.series(
    [
		//load private keys
        function (callback) {
            fs.open(_privateKeysFile, "r", function(err, fd) {
				fs.stat(_privateKeysFile, function(err, state){
					buffer = Buffer.alloc(state.size, 0);
					fs.read(fd, buffer, 0, state.size, 0, function(err, byteRead, buffer){
						var data = buffer.toString();
						var dataArray = data.split("\n");
						for (var i = 0; i < dataArray.length; ++i) {
							var aData = dataArray[i];
							if (aData !== "") {
								var subDataArray = aData.split(":");
								//subDataArray[1] is address, subDataArray[0] is name, subDataArray[2] is private_key
								_privateKeys[subDataArray[1]] = [subDataArray[0], subDataArray[2]];
							}
						}
						callback(null, "A");
					});
				});
			});
		},

		//others
        function (callback) {
			//balance
            startMonitorFile(_balanceFile, true, function(newData) {
				newData = newData.substr(0, newData.length-1);
				if (newData === "ALL") {//get balance in all account
					getAllBalance(function(allBalance) {//success
						console.log(allBalance);
						fs.open(_balanceResultFile, "w", function(err, fd) {
							fs.write(fd, allBalance, function(err) {
								fs.close(fd);
							});
						})
					}, function(error) {//fail
						console.log(error);
						fs.open(_balanceResultFile, "w", function(err, fd) {
							fs.write(fd, "error" + error, function(err) {
								fs.close(fd);
							});
						})
					});
				} else {
					var dataArray = newData.split(":");
					if (dataArray[0] === "ALL") {//get all balance in single account
						getAllBalanceInOneAddress(dataArray[1], function(allBalance) {
							console.log(allBalance);
							fs.open(_balanceResultFile, "w", function(err, fd) {
								fs.write(fd, allBalance, function(err) {
									fs.close(fd);
								});
							})
						}, function(error){
							console.log(error);
							fs.open(_balanceResultFile, "w", function(err, fd) {
								fs.write(fd, "error" + error, function(err) {
									fs.close(fd);
								});
							})
						});
					} else {//get single balance in single account
						getBalance(dataArray[0], dataArray[1], function(balance){//success
							console.log("balance is " + balance);
							fs.open(_balanceResultFile, "w", function(err, fd) {
								fs.write(fd, balance, function(err) {
									fs.close(fd);
								});
								
							})
						}, function(error) {//fail
							console.log(error);
							fs.open(_balanceResultFile, "w", function(err, fd) {
								fs.write(fd, "error " + error.message, function(err) {
									fs.close(fd);
								});
								
							})
						});
					}
				}
			});
			//transaction
			startMonitorFile(_transactionFile, true, function(newData) {
				var dataArray = newData.substr(0, newData.length - 1).split(":");
				//dataArray[0] is from, dataArray[1] is to, dataArray[2] is coinAddress, dataArray[4] is count
				if (dataArray[2] === "ETH") {
					sendETHTransaction(dataArray[0], dataArray[1], dataArray[3], 
						function(gasUsed,  transactionHash){
							fs.open(_transactionResultFile, "w", function(err, fd) {
								fs.write(fd, gasUsed / Math.pow(10, _decimal) + ":" + transactionHash, function(err) {
									fs.close(fd);
								});
							})
						}, 
						function(error){
							fs.open(_transactionResultFile, "w", function(err, fd) {
								fs.write(fd, "error " + error, function(err) {
									fs.close(fd);
								});
							})
						}
					)
				} else {
					sendTransaction(dataArray[0], dataArray[1], dataArray[2], +dataArray[3], 
						function(gasUsed, transactionHash){
							fs.open(_transactionResultFile, "w", function(err, fd) {
								fs.write(fd, gasUsed / Math.pow(10, _decimal) + ":" + transactionHash, function(err) {
									fs.close(fd);
								});
							})
						}, 
						function(error){
							fs.open(_transactionResultFile, "w", function(err, fd) {
								fs.write(fd, "error" + error, function(err) {
									fs.close(fd);
								});
							})
						}
					);
				}
				
			});
			//account
			startMonitorFile(_accountFile, true, function(newData) {
				var dataArray = newData.substr(0, newData.length - 1).split(":");
				if (dataArray[0] === "create") {//create account dataArray[1] is name
					createAccount(dataArray[1], function(address, privateKey) {
						console.log("address is " + address + " and privateKey is " + privateKey);
						fs.open(_accountResultFile, "w", function(err, fd) {
							fs.write(fd, address + ":" + privateKey, function(err) {
								fs.close(fd);
							});
						})
						//添加本地缓存中
						fs.open(_privateKeysFile, "a", function(err, fd) {
							fs.write(fd, dataArray[1] + ":" + address + ":" + privateKey + "\n", function(err) {
								fs.close(fd);
							});
						})
						_privateKeys[address] = [dataArray[1], privateKey];
						//subscription.arguments[0].topics.push("0x" + fill64(address.slice(2)));
					}, function (error) {
						fs.open(_accountResultFile, "w", function(err, fd) {
							fs.write(fd, "error" + error, function(err) {
								fs.close(fd);
							});
						})
					})
				} else if (dataArray[0] === "add") {//add account addArray[1] is name and dataArray[2] is private key
					addAccount(dataArray[2], function(address) {
						console.log("address is " + address);
						fs.open(_accountResultFile, "w", function(err, fd) {
							fs.write(fd, address, function(err) {
								fs.close(fd);
							});
						})
						//添加本地缓存
						fs.open(_privateKeysFile, "a", function(err, fd) {
							fs.write(fd, dataArray[1] + ":" + address + ":" + dataArray[2] + "\n", function(err) {
								fs.close(fd);
							});
						})
						_privateKeys[address] = [dataArray[1], dataArray[2]];
						//subscription.arguments[0].topics.push("0x" + fill64(address.slice(2)));
					}, function(error) {
						fs.open(_accountResultFile, "w", function(err, fd) {
							fs.write(fd, "error " + error, function(err) {
								fs.close(fd);
							});
						})
					})
				}
			});
			callback(null, "B");
		},
		//monitor transaction
		function (callback) {
			console.log("subscribing to transactions...")
			subscription = startMonitorTransaction(function(from, to, coinAddress, coinName, count, transactionHash, time) {
				if (typeof _privateKeys[from] === "undefined" && typeof _privateKeys[to] !== "undefined") {//如果不是内部转账且是自己的账户收款
					fs.open(_receiveFile, "a", function(error, fd) {
						fs.write(fd, from + ":" + to + ":" + coinAddress + ":" + coinName + ":" + count + ":" + transactionHash + ":" + time + "\n", function(err) {
							fs.close(fd);
						})
					});
				}
			}, function() {
				callback(null, "C");
			});
		},
		function(callback) {
			setInterval(function(){
				web3.eth.getChainId().then(console.log);
			}, 3000);
			callback(null, "D");
		}
    ], function (err, results) {
        console.log("start done")
    }
);
