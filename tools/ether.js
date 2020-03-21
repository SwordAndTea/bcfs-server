const Web3 = require('web3');
const fs = require('fs');
const Tx = require('ethereumjs-tx').Transaction;
const async = require('async');
//const Account = require('web3-eth-accounts');

let base_dir = process.env.HOME + "/.UserInfos";

let _transactionFile = base_dir + "/.transaction";

let _transactionResultFile = base_dir + "/.transaction_result";

let _balanceFile = base_dir + "/.balance";

let _balanceResultFile = base_dir + "/.balance_result";

let _accountFile = base_dir + "/.account";//file to record account name

let _accountResultFile = base_dir + "/.account_result";

let _receive_file = base_dir + "/.receive"

let _privateKeysFile = base_dir + "/.private_keys";//file to record address and private_key

var _privateKeys = {"" : ""};

const _decimal = 18;


if (typeof web3 !== "undefined") {
	web3 = new Web3(web3.currentProvider);
} else {
	web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/912555e49dd7489b9689e8e0e4b79f55"));
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
	}).then(function(result){
		successCallBack(parseInt(result) / Math.pow(10, _decimal));
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
		tx.sign(Buffer.from(_privateKeys[from].slice(2), "hex"));
		var serializedTx = tx.serialize();
		web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
		.on("receipt", function(receipt){
			console.log(receipt);
			successCallBack(receipt.transactionHash);
		}).on("error", function(err) {
			failCallBack("error");
		});
	});
}

/**
 * create a new account
 * @param {string} name the alias of your new account
 * @param {function(address: string, privateKey: string)} successCallBack if sussess, do something with the address and private key
 * @param {function(error: string)} failCallBack if fail, do something with the error message
 */

function create_account(name, successCallBack, failCallBack) {
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

function add_account(private_key, successCallBack, failCallBack) {
	var data = web3.eth.accounts.privateKeyToAccount(private_key);
	if (typeof data !== "undefined") {
		successCallBack(data.address);
	} else {
		failCallBack("error");
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
					if (event === "change") {
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
					}
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

async.series(
    [
        function (callback) {
            fs.open(_privateKeysFile, "r", function(error, fd) {
				fs.stat(_privateKeysFile, function(error, state){
					buffer = Buffer.alloc(state.size, 0);
					fs.read(fd, buffer, 0, state.size, 0, function(error, byteRead, buffer){
						var data = buffer.toString();
						var dataArray = data.split("\n");
						for (var i = 0; i < dataArray.length; ++i) {
							var aData = dataArray[i];
							var subDataArray = aData.split(":");
							_privateKeys[subDataArray[0]] = subDataArray[1];
						}
						callback(null, "A");
					});
				});
			});
        },
        function (callback) {
            startMonitorFile(_balanceFile, true, function(newData) {
				newData = newData.substr(0, newData.length-1);
				var dataArray = newData.split(":");
				getBalance(dataArray[0], dataArray[1], function(balance){
					console.log("balance is " + balance);
					fs.open(_balanceResultFile, "w", function(error, fd) {
						fs.write(fd, balance, function(err) {
							fs.close(fd);
						});
						
					})
				});
			});
			startMonitorFile(_transactionFile, true, function(newData) {
				var dataArray = newData.substr(0, newData.length - 1).split(":");
				sendTransaction(dataArray[0], dataArray[1], dataArray[2], +dataArray[3], 
				function(transactionHash){
					fs.open(_transactionResultFile, "w", function(error, fd) {
						fs.write(fd, transactionHash, function(err) {
							fs.close(fd);
						});
					})
				}, 
				function(error){
					fs.open(_transactionResultFile, "w", function(error, fd) {
						fs.write(fd, "error", function(err) {
							fs.close(fd);
						});
					})
				});
			});
			startMonitorFile(_accountFile, true, function(newData) {
				var dataArray = newData.substr(0, newData.length - 1).split(":");
				if (dataArray[0] === "create") {
					create_account(dataArray[1], function(address, private_key) {
						fs.open(_accountResultFile, "w", function(error, fd) {
							fs.write(fd, address+":"+private_key, function(err) {
								fs.close(fd);
							});
						})
						fs.open(_privateKeysFile, "a", function(error, fd) {
							fs.write(fd, address+":"+private_key + "\n", function(err) {
								fs.close(fd);
							});
						})
						_privateKeys[address] = private_key;
					}, function (err) {
						fs.open(_accountResultFile, "w", function(error, fd) {
							fs.write(fd, "error", function(err) {
								fs.close(fd);
							});
						})
					})
				} else if (dataArray[0] === "add") {
					add_account(dataArray[1], function(address) {
						fs.open(_accountResultFile, "w", function(error, fd) {
							fs.write(fd, address, function(err) {
								fs.close(fd);
							});
						})
						fs.open(_privateKeysFile, "a", function(error, fd) {
							fs.write(fd, address+":"+dataArray[1] + "\n", function(err) {
								fs.close(fd);
							});
						})
						_privateKeys[address] = dataArray[1];
					}, function(err) {
						fs.open(_accountResultFile, "w", function(error, fd) {
							fs.write(fd, "error", function(err) {
								fs.close(fd);
							});
						})
					})
				}
			});
			callback(null, "B");
        }
    ], function (err, results) {
        
    }
);