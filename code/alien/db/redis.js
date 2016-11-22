/**
 * redis key value存储数据
 * User: lipi01
 * Date: 13-5-9
 * Time: 下午2:44
 *
 */
var redis = require('redis');
var bitUtil = require("./bitUtil");
var mysql = require("./mysql");
var fs = require('fs');
var SortedsetType = require("./dataTypes/SortedsetType");
var StringType = require("./dataTypes/StringType");
var HashType = require("./dataTypes/HashType");
var ListType = require("./dataTypes/ListType");
var KeyType = require("./dataTypes/KeyType");
var gameConfigPath = "../../../config/"; //服务器配置目录
var dynamicRedisDic = {}; //redis 客户端池 for 高I/O 读取
var difficultyRedisDic = {}; //redis 客户端池 for 高I/O 读取
var redisDic = {}; //redis 客户端池R
var loginRedis = {};//登录redis数据库
var countryRedis = {};//登录redis数据库
var serverRedis = {};//分区对应的redis

function getLocalCountry() {
    if (fs.existsSync("tag")) {
        var list = fs.readFileSync("tag", "utf8").split(",");
        return list;
    } else {
        return null;
    }
}

function checkServerTag(country) {
    var countries = getLocalCountry();
    if (countries == null) {
        return true;
    } else {
        if (typeof countries == "object" && countries.indexOf(country) != -1) {
            return true;
        } else {
            //TODO 此處需要類似于php die() 函數
            //process.exit(1);
            return false;
        }
    }
}

/**
 * 调用方法  redis.user(userUid).s("userName").set("短笛大魔王")
 * ;
 * 返回一个user相关的redis
 * @param userUid
 * @returns {RedisClient}
 */
function user(userUid) {
    var mClient = getClient(userUid);
    return new RedisClient(mClient, 1, userUid);
}

function userToken(userUid) {
    var mCode = bitUtil.parseUserUid(userUid);
    mCode[1] = mysql.getMergedCity(mCode[0], mCode[1]);
    if (checkServerTag(mCode[0]) == false) {
        userUid = bitUtil.createUserUid(getLocalCountry()[0], 1, 0);
        mCode = bitUtil.parseUserUid(userUid);
    }
    var mCodeStr = mCode[0] + mCode[1] + "userToken";
    if (dynamicRedisDic[mCodeStr] == null) {
        var index = 1;
        var redisServer = require(gameConfigPath + mCode[0] + "_server.json")["userToken"]["redis"][index]; //取redis配置
        var mClient = createClient(redisServer);
        dynamicRedisDic[mCodeStr] = mClient;
    }
    var mClient = dynamicRedisDic[mCodeStr];
    return new RedisClient(mClient, 1, userUid);
}

/**
 * 返回一个域相关的redis，如果写入的数据不属于某个user时使用(但可以使用userUid来取出一个userUid对应的库)
 * @param country
 * @param city
 * @returns {RedisClient}
 */
function domain(countryOrUserUid, city) {
    var mClient = null;
    var mValue = null;
    if (arguments.length == 1) {
        mClient = getClient(countryOrUserUid);
        if (mClient == null) {
            return null;
        }
        var mArr = bitUtil.parseUserUid(countryOrUserUid);
        mArr[1] = mysql.getMergedCity(mArr[0], mArr[1]);
        mValue = mArr[0] + mArr[1];
    } else {
        mClient = getClient(null, countryOrUserUid, city);
        city = mysql.getMergedCity(countryOrUserUid, city);
        mValue = countryOrUserUid + city;
        if (mClient == null) {
            return null;
        }
    }
    return new RedisClient(mClient, 2, mValue);
}

function dynamic(countryOrUserUid, city) {
    var mClient = null;
    var mValue = null;
    if (arguments.length == 1) {
        mClient = getClientForDynamic(countryOrUserUid);
        if (mClient == null) {
            return null;
        }
        var mArr = bitUtil.parseUserUid(countryOrUserUid);
        mArr[1] = mysql.getMergedCity(mArr[0], mArr[1]);
        mValue = mArr[0] + mArr[1];
    } else {
        mClient = getClientForDynamic(null, countryOrUserUid, city);
        city = mysql.getMergedCity(countryOrUserUid, city);
        mValue = countryOrUserUid + city;
        if (mClient == null) {
            return null;
        }
    }
    return new RedisClient(mClient, 2, mValue);
}

/**
 * @param country
 * @returns {*}
 */
function login(country) {
    if (checkServerTag(country) == false) {
        country = getLocalCountry()[0];
    }
    var mClient = initLoginRedis(country);
    return new RedisClient(mClient, 3, "");
}

/**
 * @param country
 * @returns {*}
 */
function loginFromUserUid(userUid) {
    var mCode = bitUtil.parseUserUid(userUid);
    var country = mCode[0];
    if (checkServerTag(country) == false) {
        country = getLocalCountry()[0];
    }
    var mClient = initLoginRedis(country);
    return new RedisClient(mClient, 3, "");
}

function countryForDynamic(userUid) {
    var mCode = bitUtil.parseUserUid(userUid);
    mCode[1] = mysql.getMergedCity(mCode[0], mCode[1]);
    if (checkServerTag(mCode[0]) == false) {
        userUid = bitUtil.createUserUid(getLocalCountry()[0], 1, 0);
        mCode = bitUtil.parseUserUid(userUid);
    }
    var mCodeStr = mCode[0] + mCode[1] + "country";
    if (dynamicRedisDic[mCodeStr] == null) {
        var redisServer = require(gameConfigPath + mCode[0] + "_server.json")["userToken"]["redis"][0]; //取redis配置
        var mClient = createClient(redisServer);
        dynamicRedisDic[mCodeStr] = mClient;
    }
    var mClient = dynamicRedisDic[mCodeStr];
    return new RedisClient(mClient, 3, userUid);
}

function country(userUid) {
    var mCode = bitUtil.parseUserUid(userUid);
    var country = mCode[0];
    if (checkServerTag(country) == false) {
        country = getLocalCountry()[0];
    }
    var mClient = initCountryRedis(country);
    return new RedisClient(mClient, 3, "");
}
/**
 * 通过配置初始化redis
 */
function initRedis(mCountry) {
    if (redisDic[mCountry] == null) {
        var redisServerList = require(gameConfigPath + mCountry + "_server.json")["redis"]["list"]; //取所有redis配置
        redisDic[mCountry] = {};
        for (var key in redisServerList) { //初始化所有redis客户端
            var configData = redisServerList[key];
            var mClient = createClient(configData);
            redisDic[mCountry][key] = mClient;
        }
    }
}

function initRedisForDynamic(mCountry) {
    if (dynamicRedisDic[mCountry] == null) {
        var redisServerList = require(gameConfigPath + mCountry + "_server.json")["dynamic"]["list"]; //取所有redis配置
        dynamicRedisDic[mCountry] = {};
        for (var key in redisServerList) { //初始化所有redis客户端
            var configData = redisServerList[key];
            var mClient = createClient(configData);
            dynamicRedisDic[mCountry][key] = mClient;
        }
    }
}
function initRedisForDifficulty(mCountry) {
    if (difficultyRedisDic[mCountry] == null) {
        var redisServerList = require(gameConfigPath + mCountry + "_server.json")["difficulty"]["list"]; //取所有redis配置
        difficultyRedisDic[mCountry] = {};
        for (var key in redisServerList) { //初始化所有redis客户端
            var configData = redisServerList[key];
            var mClient = createClient(configData);
            difficultyRedisDic[mCountry][key] = mClient;
        }
    }
}
/**
 * 取得夸大区连接
 */
function initCountryRedis(country) {
    if (countryRedis[country] == null) {
        var mRedisConfig = require(gameConfigPath + country + "_server.json")["loginDB"]["redis"][1]; //取所有redis配置
        var mClient = createClient(mRedisConfig);
        countryRedis[country] = mClient;
    }
    return countryRedis[country];
}

/**
 * 取登录服务器数据库
 */
function initLoginRedis(country) {
    if (loginRedis[country] == null) {
        var mRedisConfig = require(gameConfigPath + country + "_server.json")["loginDB"]["redis"][0]; //取所有redis配置
        var mClient = createClient(mRedisConfig);
        loginRedis[country] = mClient;
    }
    return loginRedis[country];
}


/**
 * 取一个物品的唯一ID
 * @param callbackFn
 */
function getNewId(userUid, callbackFn) {
    getNewIds(userUid, 1, function (err, res) {
        if (err) callbackFn(err);
        else {
            if (res.length > 0) {
                callbackFn(null, res[0]);
            } else {
                callbackFn(null, 0);
            }
        }
    });
}


/**
 * 取一个物品的唯一ID， 多个
 * @param userUid
 * @param count
 * @param callbackFn
 */
function getNewIds(userUid, count, callbackFn) {
    var redisClient = domain(userUid);
    redisClient.s(0).getTime(function (err, res) {
        if (err) {
            callbackFn(err);
            return;
        }
        var userUidCode = bitUtil.parseUserUid(userUid);
        var timeSecond = res[0];
        var timeValue = timeSecond - Math.floor(new Date(2014, 0, 1).getTime() / 1000);
        timeValue = bitUtil.leftShift(timeValue, 24);
        var mKey = "uuid" + timeValue;
        var cityValue = bitUtil.leftShift(userUidCode[1], 8);
        var mIds = [];
        for (var i = 0; i < count; i++) {
            redisClient.s(mKey).incr(function (err, res) {
                if (res > 65534) {
                    callbackFn(null, 0);
                } else {
                    var mID = timeValue + cityValue + ((res || 0) - 0);
                    redisClient.s(mKey).expire(900); //15分钟清除
                    mIds.push(mID);
                    if (mIds.length == count) {
                        callbackFn(null, mIds);
                    }
                }
            });
        }
    });
}


//创建redis client
function createClient(data) {
    var port = data.port;
    var host = data.host;
    var select = data.select || 0;
    var client = redis.createClient(port, host);
    var targetError = new Error('error...' + port + ":" + host);
    client.on("error", function (err) {
        console.error("redis error: err.message" + err.message);
        console.error("redis error: err.stack" + err.stack);
        console.error("redis error: targetError.stack" + targetError.stack);
        console.error("redis error: data" + JSON.stringify(data));
    });
    client.select(select, function (err, res) {
    });
    return client;
}

function getClient(userUid, country, city) {
    var mCode;
    if (arguments.length == 1) {
        mCode = bitUtil.parseUserUid(userUid);
    } else {
        mCode = [country, city];
    }
    mCode[1] = mysql.getMergedCity(mCode[0], mCode[1]);
    if (checkServerTag(mCode[0]) == false) {
        userUid = bitUtil.createUserUid(getLocalCountry()[0], 1, 0);
        mCode = bitUtil.parseUserUid(userUid);
    }
    var mCodeStr = mCode[0] + mCode[1];
    initRedis(mCode[0]);
    if (serverRedis[mCodeStr] != null) {
        return serverRedis[mCodeStr]; //如果当前分区客户已初始化直接返回
    } else {
        var mCountry = mCode[0]; //大区
        var mCity = mCode[1];//分区
        var serverList = require(gameConfigPath + mCountry + "_server.json")["serverList"]; //取分区配置
        if (serverList[mCity] == null) {
            return null;
        }
        var redisId = serverList[mCity]["redis"]; //取分区使用的redis服务器id
        serverRedis[mCodeStr] = redisDic[mCountry][redisId]; //保存分区对应的redis
        return serverRedis[mCodeStr];
    }
}

//存放武道会，乱斗会等复杂数据
function difficulty(countryOrUserUid, city) {
    var mClient = null;
    var mValue = null;
    if (arguments.length == 1) {
        mClient = getClientForDifficulty(countryOrUserUid);
        if (mClient == null) {
            return null;
        }
        var mArr = bitUtil.parseUserUid(countryOrUserUid);
        mArr[1] = mysql.getMergedCity(mArr[0], mArr[1]);
        mValue = mArr[0] + mArr[1];
    } else {
        mClient = getClientForDifficulty(null, countryOrUserUid, city);
        city = mysql.getMergedCity(countryOrUserUid, city);
        mValue = countryOrUserUid + city;
        if (mClient == null) {
            return null;
        }
    }
    return new RedisClient(mClient, 3, mValue);
}

function getClientForDynamic(userUid, country, city) {
    var mCode;
    if (arguments.length == 1) {
        mCode = bitUtil.parseUserUid(userUid);
    } else {
        mCode = [country, city];
    }
    mCode[1] = mysql.getMergedCity(mCode[0], mCode[1]);
    if (checkServerTag(mCode[0]) == false) {
        userUid = bitUtil.createUserUid(getLocalCountry()[0], 1, 0);
        mCode = bitUtil.parseUserUid(userUid);
    }
    var mCodeStr = mCode[0] + mCode[1] + "dynamic";
    initRedisForDynamic(mCode[0]);
    if (serverRedis[mCodeStr] != null) {
        return serverRedis[mCodeStr]; //如果当前分区客户已初始化直接返回
    } else {
        var mCountry = mCode[0]; //大区
        var mCity = mCode[1];//分区
        var serverList = require(gameConfigPath + mCountry + "_server.json")["serverList"]; //取分区配置
        if (serverList[mCity] == null) {
            return null;
        }
        var redisId = serverList[mCity]["dynamic"]; //取分区使用的redis服务器id
        serverRedis[mCodeStr] = dynamicRedisDic[mCountry][redisId]; //保存分区对应的redis
        return serverRedis[mCodeStr];
    }
}

function getClientForDifficulty(userUid, country, city) {
    var mCode;
    if (arguments.length == 1) {
        mCode = bitUtil.parseUserUid(userUid);
    } else {
        mCode = [country, city];
    }
    mCode[1] = mysql.getMergedCity(mCode[0], mCode[1]);
    if (checkServerTag(mCode[0]) == false) {
        userUid = bitUtil.createUserUid(getLocalCountry()[0], 1, 0);
        mCode = bitUtil.parseUserUid(userUid);
    }
    var mCodeStr = mCode[0] + mCode[1] + "difficulty";
    initRedisForDifficulty(mCode[0]);
    if (serverRedis[mCodeStr] != null) {
        return serverRedis[mCodeStr]; //如果当前分区客户已初始化直接返回
    } else {
        var mCountry = mCode[0]; //大区
        var mCity = mCode[1];//分区
        var serverList = require(gameConfigPath + mCountry + "_server.json")["serverList"]; //取分区配置
        if (serverList[mCity] == null) {
            return null;
        }
        var redisId = serverList[mCity]["difficulty"]; //取分区使用的redis服务器id
        serverRedis[mCodeStr] = difficultyRedisDic[mCountry][redisId]; //保存分区对应的redis
        return serverRedis[mCodeStr];
    }
}

exports.checkServerTag = checkServerTag;
exports.getLocalCountry = getLocalCountry;
exports.getNewId = getNewId;
exports.user = user;
exports.userToken = userToken;
exports.domain = domain;
exports.countryForDynamic = countryForDynamic;
exports.dynamic = dynamic;
exports.login = login;
exports.loginFromUserUid = loginFromUserUid;
exports.country = country;
exports.getNewIds = getNewIds;
exports.difficulty = difficulty;

/**
 * 类别1 user 类别2 domain 类别3 直接写入key
 * @param client
 * @param type
 * @param value
 * @constructor
 */
function RedisClient(client, type, value) {
    this.type = type;
    this.value = value;
    this.client = client;
}

RedisClient.prototype.fullkey = function (type, value, key) {
    value = value.toString().trim();
    key = key.toString().trim();
    var mFullkey = null;
    if (type == 1) { //user、userToken
        mFullkey = key + ":" + value; //实际存入key为 hero:1829889
    } else if (type == 2) { //"domain"、"dynamic"
        mFullkey = value + ":" + key; //实际存入key为 a1:battle:sort
    } else if (type == 3) { //直接key,countryForDynamic
        mFullkey = key;
    } else {
        mFullkey = key;
    }
    return mFullkey;
};

//返回字符串操作类
RedisClient.prototype.s = function (key) {
    var isLog = false;
    var mFullkey = this.fullkey(this.type, this.value, key);
    return new StringType(this.client, mFullkey, isLog, arguments.length == 2 ? arguments[1] : null);
};


//返回有序集合操作类
RedisClient.prototype.z = function (key) {
    var isLog = false;
    var mFullkey = this.fullkey(this.type, this.value, key);
    return new SortedsetType(this.client, mFullkey, isLog, arguments.length == 2 ? arguments[1] : null);
};

//哈希
RedisClient.prototype.h = function (key) {
    var isLog = false;
    var mFullkey = this.fullkey(this.type, this.value, key);
    return new HashType(this.client, mFullkey, isLog, arguments.length == 2 ? arguments[1] : null);
};

//LIST
RedisClient.prototype.l = function (key) {
    var isLog = false;
    var mFullkey = this.fullkey(this.type, this.value, key);
    return new ListType(this.client, mFullkey, isLog, arguments.length == 2 ? arguments[1] : null);
};

RedisClient.prototype.k = function (key) {
    var isLog = false;
    var mFullkey = this.fullkey(this.type, this.value, key);
    return new KeyType(this.client, mFullkey, isLog, arguments.length == 2 ? arguments[1] : null);
};