/**
 * User: liyuluan
 * Date: 14-2-13
 * Time: 下午3:26
 */
var fs = require("fs");


var _logPath = require("path").resolve(require.resolve("./path.json"),"../../../../../log/") + "/";

var isExists = fs.existsSync(_logPath);
if (isExists == false) {
    fs.mkdirSync(_logPath);
}

//调试日志 ;  运营相关日志;  错误日志; 系统监控日志;
var _config = {
    "log" : {
        "off":false,
        "buffer":[],
        "delay":10
    },
    "info" : {
        "off":false,
        "buffer":[],
        "delay":10
    },
    "sys" : {
        "off":false,
        "buffer":[],
        "delay":10
    },
    "error" :{
        "off":false,
        "buffer":[],
        "delay":1
    }
};



//调试日志
function log(str) {
    writeLog("log", arguments);
}

function info(str) {
    writeLog("info", arguments);
}

function error(str) {
    writeLog("error", arguments);
}

function sys(str) {
    writeLog("sys", arguments);
}


//关闭或打开某个配置
function off(type, value) {
    _config[type]["off"] = value;
}

function writeLog(type, arr) {
    if (_config[type] == null) return;
    if (_config[type]["off"] == true) return;

    var argArray = [];
    var mNow = new Date();
    argArray.push(dateYMD(mNow) + " " + dateHMS(mNow));
    for (var i = 0; i < arr.length; i++ ) {
        var item = arr[i];
        if (typeof item === "string") {
            argArray.push(item);
        } else {
            try {
                argArray.push(JSON.stringify(item));
            } catch(err) {
                argArray.push(item.toString());
            }
        }
    }
    var argStr = argArray.join("|");
    _config[type]["buffer"].push(argStr);
}

var intervalCount = 0;

setInterval(function() {
    intervalCount++;
    for (var key in _config) {
        if (_config[key]["buffer"].length > 0 && (intervalCount % _config[key]["delay"] == 0)) {
            var str = _config[key]["buffer"].join("\r\n");
            _config[key]["buffer"] = [];
            str += "\r\n";
            try {
                fs.appendFile(_logPath + getFileName(key), str, function (err) {
                });
            } catch (err) {
                console.error("写不进");
            }

        }
    }
}, 1000);

function getFileName(type) {
    var d = new Date();
    var mm = (d.getMonth() + 1);
    if(mm < 10) mm = "0" + mm;
    var dd = d.getDate();
    if (dd < 10) dd = "0" + dd;
    return type + d.getFullYear() + mm + dd  + ".log";
}

// 返回YYYY-MM-DD格式
function dateYMD(date) {
    var d = date;
    var mm = (d.getMonth() + 1);
    if(mm < 10) mm = "0" + mm;
    var dd = d.getDate();
    if (dd < 10) dd = "0" + dd;
    return d.getFullYear() + "-" + mm + "-" + dd;
}

// 返回HH:MM:ss格式
function dateHMS(date) {
    var d = date;
    var hh = d.getHours();
    if(hh < 10) hh = "0" + hh;
    var mm = d.getMinutes()
    if(mm < 10) mm = "0" + mm;
    var ss = d.getSeconds();
    if (ss < 10) ss = "0" + ss;
    return hh + ":" + mm + ":" + ss;
}

//////////////////////统计处理程序

var RabbitMQ = require("./Rabbitmq");
var bitUtil = require("../db/bitUtil");
var gameConfigPath = "../../../config/";
var rabbitmqCache = {};

/**
 *
 * @param userUid
 * @returns {Rabbitmq}
 */
function gameStat(userUid) {
    var mCode = bitUtil.parseUserUid(userUid);
    var mCountry = mCode[0];
    var mCity = mCode[1];
    var mHashValue = mCity % 10;

    if (rabbitmqCache[mCountry] != null) {
        return rabbitmqCache[mCountry];
    } else {
        var rc = require(gameConfigPath + mCountry + "_server.json")["rabbitmq"];
        var r = null;
        if (rc == null) {
            r = new RabbitMQ();
        } else {
            r = new RabbitMQ();
            r.createConnection(rc["conn"], rc["option"], rc["exchange_name"] + mHashValue, rc["routing_key_name"], rc["queue_name"] + mHashValue);
        }
        rabbitmqCache[mCountry] = r;
        return r;
    }
}

//通过大分区取统计库
function gameStatFromCountry(mCountry) {
    var mHashValue = 0;
    if (rabbitmqCache[mCountry] != null) {
        return rabbitmqCache[mCountry];
    } else {
        var rc = require(gameConfigPath + mCountry + "_server.json")["rabbitmq"];
        var r = null;
        if (rc == null) {
            r = new RabbitMQ();
        } else {
            r = new RabbitMQ();
            r.createConnection(rc["conn"], rc["option"], rc["exchange_name"] + mHashValue, rc["routing_key_name"], rc["queue_name"] + mHashValue);
        }
        rabbitmqCache[mCountry] = r;
        return r;
    }
}




exports.log = log;
exports.info = info;
exports.error = error;
exports.sys = sys;
exports.gameStat = gameStat;
exports.gameStatFromCountry = gameStatFromCountry;

exports.off = off;




