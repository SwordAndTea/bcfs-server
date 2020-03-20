const Web3 = require('web3');
const fs = require('fs');
const Tx = require('ethereumjs-tx').Transaction;
const async = require('async');

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

function getBlance(address, contractAddress, callback) {
	var operate = "0x70a08231" + fill64(address.slice(2));
	web3.eth.call({
		to: contractAddress,
		data: operate
	}).then(function(result){
		callback(parseInt(result) / Math.pow(10, _decimal));
	});
}

function sendTransaction(from, to, contractAddress, number, successCallBack, failCallBack) {
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
		tx.sign(Buffer.from(_privateKeys[from], "hex"));
		var serializedTx = tx.serialize();
		web3.eth.sendSignedTransaction("0x" + serializedTx.toString("hex"))
		.on("receipt", console.log);
	});
}

function startMonitorFile(filePath, callback) {
	fs.access(filePath, function(err) {
		if (err) {
			console.log("monitor file doesn't exist");
			return;
		}
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
									console.log(data);
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
            startMonitorFile(_balanceFile, function(newData) {
				newData = newData.substr(0, newData.length-1);
				var dataArray = newData.split(":");
				getBlance(dataArray[0], dataArray[1], function(balance){
					console.log("balance is " + balance);
					fs.open(_balanceResultFile, "w", function(error, fd) {
						fs.write(fd, balance, function(err) {
							fs.close(fd);
						});
						
					})
				});
			});
			startMonitorFile(_transactionFile, function(newData) {
				var dataArray = newData.split(":");
				sendTransaction(dataArray[0], dataArray[1], dataArray[2], parseDouble(dataArray[3]), 
				function(){
					fs.open(_transactionResultFile, "w", function(error, fd) {
						fs.write(fd, "success", function(err) {
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
			startMonitorFile(_accountFile, function(newData) {

			});
			callback(null, "B");
        }
    ], function (err, results) {
        
    }
);
//getBlance("0x9e7D97F07097E9B3E21459776EEab507213DF52F", "0x3C1670cb9c9D27CeDf2119110165663efc77a22f", console.log);