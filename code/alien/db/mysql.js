/**
 * mysql 数据库处理类
 * @type {*}
 */

var mysql = require("mysql");
var bitUtil = require("./bitUtil");
var redis = require("./redis");
var gameConfigPath = "../../../config/";
var poolDic = {};
var loginDBDic = {};
var iosDBDic = {};
var adminDBDic = {};
var crossDBDic = {};
var mergeDic = {
    "g": {"3": "4", "5": "6"},
    "r": {
        "2": "1",
        "4": "3",
        "5": "3",
        "6": "3",
        "7": "3",
        "9": "8",
        "11": "10",
        "12": "10",
        "13": "10",
        "15": "14",
        "16": "14",
        "18": "17",
        "19": "17",
        "20": "17",
        "22": "21",
        "23": "21",
        "24": "21",
        "26": "25",
        "27": "25",
        "28": "25",
        "30": "29",
        "31": "29"
    }
};

function getMergedCity(country, city) {
    if (mergeDic.hasOwnProperty(country)) {
        var tmp = mergeDic[country];
        return tmp.hasOwnProperty(city) ? tmp[city] : city;
    } else {
        return city;
    }
}

function game(userUid, country, city) {
    city = getMergedCity(country, city);
    var mCode;
    if (arguments.length == 1) {
        mCode = bitUtil.parseUserUid(userUid);
    } else {
        mCode = [country, city];
    }
    if (redis.checkServerTag(mCode[0]) == false) {
        userUid = bitUtil.createUserUid(redis.getLocalCountry()[0], 1, 0);
        mCode = bitUtil.parseUserUid(userUid);
    }
    var mCodeStr = mCode[0] + mCode[1];
    if (poolDic[mCodeStr] != null) {
        return poolDic[mCodeStr];
    } else {
        var mCountry = mCode[0];
        var mCity = mCode[1];
        var cityConfig = require(gameConfigPath + mCountry + "_server.json")["serverList"][mCity];
        if (cityConfig == null) {
            return {
                query: function (sql, cb) {
                    if (typeof cb === "function") {
                        cb("noCity");
                    } else if (typeof arguments[arguments.length - 1] === "function") {
                        cb = arguments[arguments.length - 1];
                        cb("noCity");
                    }
                }, isNull: true
            };
        } else {
            var dbConfig = cityConfig["mysql"];
            dbConfig["connectionLimit"] = 5;
            var pool = mysql.createPool(dbConfig);
            poolDic[mCodeStr] = pool;
            return pool;
        }
    }
}

function loginDBFromUserUid(userUid) {
    var mCode = bitUtil.parseUserUid(userUid);
    var mCountry = mCode[0];
    return loginDB(mCountry);
}

function loginDB(country) {
    if (redis.checkServerTag(country) == false) {
        country = redis.getLocalCountry()[0];
    }
    if (loginDBDic[country] == null) {
        var mDB = require(gameConfigPath + country + "_server.json")["loginDB"]["mysql"][0];
        var pool = mysql.createPool(mDB);
        loginDBDic[country] = pool;
    }
    return loginDBDic[country];
}

function iosDB(country) {
    if (redis.checkServerTag(country) == false) {
        country = redis.getLocalCountry()[0];
    }
    if (iosDBDic[country] == null) {
        var mDB = require(gameConfigPath + country + "_server.json")["iosDB"]["mysql"][0];
        var pool = mysql.createPool(mDB);
        iosDBDic[country] = pool;
    }
    return iosDBDic[country];
}

function crossDB(countryOrUserUid) {
    var country = countryOrUserUid;
    if (countryOrUserUid.toString().length > 1) {
        country = bitUtil.parseUserUid(countryOrUserUid)[0];
    }
    if (redis.checkServerTag(country) == false) {
        country = redis.getLocalCountry()[0];
    }
    if (crossDBDic[country] == null) {
        var mDB = require(gameConfigPath + country + "_server.json")["crossDB"]["mysql"][0];
        var pool = mysql.createPool(mDB);
        crossDBDic[country] = pool;
    }
    return crossDBDic[country];
}

function adminDB(country) {
    if (redis.checkServerTag(country) == false) {
        country = redis.getLocalCountry()[0];
    }
    if (adminDBDic[country] == null) {
        var dbConfig = require(gameConfigPath + country + "_server.json")["adminDB"];
        if (dbConfig == null) return null;
        var pool = mysql.createPool(dbConfig);
        adminDBDic[country] = pool;
    }
    return adminDBDic[country];
}


function setGameConfigPath(configPath) {
    gameConfigPath = configPath;
}


//格式化数据
function escape(value) {
    return mysql.escape(value);
}


function getMaxId(from, field, whereField, whereValue, callbackFn) {
    if (arguments.length == 3) {
        whereField(null, Math.floor(Math.random() * 9999));
    } else {
        callbackFn(null, Math.floor(Math.random() * 9999));
    }
}


function dataIsExist(userUid, from, where, callbackFn) {
    var sql = "SELECT 1 FROM " + from + " WHERE " + where + " LIMIT 1";
    game(userUid).query(sql, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else if (res != null && res.length > 0) {
            callbackFn(null, 1);
        } else {
            callbackFn(null, 0);
        }
    });
}

function dataIsExistOnLoginDB(userUid, from, where, callbackFn) {
    var sql = "SELECT 1 FROM " + from + " WHERE " + where + " LIMIT 1";
    loginDBFromUserUid(userUid).query(sql, function (err, res) {
        if (err) {
            callbackFn(err, null);
        } else if (res != null && res.length > 0) {
            callbackFn(null, 1);
        } else {
            callbackFn(null, 0);
        }
    });
}

exports.game = game;
exports.loginDB = loginDB;
exports.iosDB = iosDB;
exports.adminDB = adminDB;
exports.escape = escape;
exports.setGameConfigPath = setGameConfigPath;
exports.getMaxId = getMaxId;
exports.dataIsExist = dataIsExist;
exports.loginDBFromUserUid = loginDBFromUserUid;
exports.dataIsExistOnLoginDB = dataIsExistOnLoginDB;
exports.getMergedCity = getMergedCity;
exports.crossDB = crossDB;