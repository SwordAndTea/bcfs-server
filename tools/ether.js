//const { exec } = require('child_process');
const Web3 = require('web3');
const fs = require('fs');
const Tx = require('ethereumjs-tx').Transaction;
const async = require('async');

var _monitorFile = "";

if (process.argv.length == 3) {
	_monitorFile = process.argv[2];
} else {
	console.log("error parameters");
	process.exit(1);
}


const _from = "0x9e7D97F07097E9B3E21459776EEab507213DF52F";

const _contractAddress = "0x3C1670cb9c9D27CeDf2119110165663efc77a22f";

var _privateKeys = {"" : ""};

const _decimal = 18;


if (typeof web3 !== "undefined") {
	web3 = new Web3(web3.currentProvider);
} else {
	web3 = new Web3(new Web3.providers.HttpProvider("https://ropsten.infura.io/v3/912555e49dd7489b9689e8e0e4b79f55"));
}



//填充地址为64位
function fill64(hexAddress) {
	if (hexAddress.length < 64) {
		filledAddress = new Array(64 - hexAddress.length + 1).join("0") + hexAddress;
	}
	return filledAddress;
}

function getBlance(address) {
	var operate = "0x70a08231" + fill64(address.slice(2));
	web3.eth.call({
		to: contractAddress,
		data: operate
	}).then(function(result){
		console.log(parseInt(result) / Math.pow(10, _decimal)); 
	});
}

function sendTransaction(from, to, contractAddress, number) {
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


var pre_size;

async.series(
    [
        function (callback) {
			const privateKeyPath = ".private_keys";
            fs.open(privateKeyPath, "r", function(error, fd) {
				fs.stat(privateKeyPath, function(error, state){
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
            fs.access(_monitorFile, function(err) {
				if (err) {
					console.log("monitor file doesn't exist");
					process.exit(1);
				}
				fs.stat(_monitorFile, function(error, initState) {
					pre_size = initState.size;
					fs.watch(_monitorFile, function (event, filename) {
						fs.stat(_monitorFile, function(error, state) {
							if (pre_size < state.size) {
								fs.open(_monitorFile, "r", function(error, fd) {
									buffer = Buffer.alloc(state.size - pre_size, 0);
									fs.read(fd, buffer, 0, state.size - pre_size, pre_size, function(error, byteRead, buffer) {
										var data = buffer.toString();
										var dataArray = data.split(":");
										sendTransaction(dataArray[0], dataArray[1], dataArray[2], dataArray[3]);
									});
								});
							}
							pre_size = state.size;
						});
					});
				});
				callback(null, "B");
			});
        }
    ], function (err, results) {
        
    }
);



