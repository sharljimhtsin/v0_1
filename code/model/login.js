/**
 * 登录服务数据层
 * User: liyuluan
 * Date: 14-1-3
 * Time: 下午12:50
 */

var redis = require("../alien/db/redis");
var mysql = require("../alien/db/mysql");
var bitUtil = require("../alien/db/bitUtil");
var jutil = require("../utils/jutil");

/**
 * 取服务器列表
 * @param country
 * @returns {*}
 */
function getServerList(country, admin, callbackFn, preOpen) {
    getServerOpenList(country, function(err, res) {
        var openList = res;
        if (redis.checkServerTag(country) == false) {
            country = redis.getLocalCountry()[0];
        }
        var serverConfig = require("../../config/" + country + "_server.json");
        var mServerList = serverConfig["serverList"];
        var mArray = [];
        for (var key in mServerList) {
            var mItem = mServerList[key];
            var mObj = {};
            mObj["id"] = mItem["id"];
            mObj["isOpen"] = 0;
            mObj["openTime"] = mItem["sTime"] == undefined ? 0 : mItem["sTime"];

            if (mItem["merge"] && mItem["merge"] == "1") {
                mObj["merge"] = "1";
            }

            if (typeof mItem["name"] == "object") {
                mObj["name"] = mItem["name"];
            } else {
                mObj["name"] = jutil.toBase64(mItem["name"]);
            }

            var openTime = preOpen ? jutil.now() + preOpen : jutil.now();
            if (openList != null && openList[key] != null && openList[key] < openTime) { //如果数据库中标记了它已开启， 则开启
                mObj["openTime"] = openList[key];
                mObj["isOpen"] = openList[key] < jutil.now() ? 1 : 0;
                mArray.push(mObj);
            } else if (mItem["sTime"] == null || mItem["sTime"] < jutil.now() || admin == 1) {
                mObj["isOpen"] = 1;
                mArray.push(mObj);
            }
        }
        callbackFn(null, mArray);
    });
}

//取服务器开启列表
function getServerOpenList(country, callbackFn) {
    mysql.loginDB(country).query("SELECT * FROM serverlist where isClosed = 0", function (err, res) {
        if (err || res == null) {
            callbackFn(null, null);
        } else {
            var o = {};
            for (var i = 0; i < res.length; i++) {
                o[res[i]["serverId"]] = res[i]["openTime"];
            }
            callbackFn(null, o);
        }
    });
}


function getServerCitys(country, admin, callbackFn) {
    getServerOpenList(country, function (err, res) {
        var openList = res;
        if (redis.checkServerTag(country) == false) {
            country = redis.getLocalCountry()[0];
        }
        var serverConfig = require("../../config/" + country + "_server.json");
        var mServerList = serverConfig["serverList"];
        var mArray = [];
        for (var key in mServerList) {
            var mItem = mServerList[key];
            if (mItem.hasOwnProperty("merge")) {
                continue;
            }
            var mObj = {};
            mObj["id"] = mItem["id"];
            if (openList != null && openList[key] != null && openList[key] < jutil.now()) { //如果数据库中标记了它已开启， 则开启
                mArray.push(mObj["id"] - 0);
            } else if (mItem["sTime"] == null || mItem["sTime"] < jutil.now() || admin == 1) {
                mArray.push(mObj["id"] - 0);
            }
        }
        callbackFn(null, mArray);
    });
}




/**
 * 取最近登录服务器列表
 */
function getLastServer(country, platformId, platformUserId, callbackFn) {
    var mKey = "lServer:" + platformId + ":" + platformUserId;
    redis.login(country).z(mKey).getAllRev(callbackFn);
}

/**
 * 设置最近登录的服务器id
 * @param country 大区id
 * @param platformId 平台id
 * @param platformUserId 平台用户id 或用户名
 * @param callbackFn
 */
function setLastServer(country, platformId, platformUserId, serverId, callbackFn ) {
    var mKey = "lServer:"  + platformId + ":" + platformUserId;
    redis.login(country).z(mKey).add(jutil.now(), serverId, function(err, res) {
        if (err) {
            console.error(jutil.now(), serverId, err.stack);
        }
        redis.login(country).z(mKey).expire(604800);
        callbackFn(err, res);
    });
}

/**
 *
 * @param country
 * @param platformId
 * @param platformUserId
 * @param callbackFn
 */
function getCountryUserId(country, platformId, platformUserId, callbackFn) {
    var mKey = "CUid:" + platformId + ":" + platformUserId;
    var rDB = redis.login(country);
    var mDB = mysql.loginDB(country);

    rDB.s(mKey).get(function (err, res) {
        if (err) callbackFn(err);
        else if (res != null) {
            rDB.s(mKey).expire(604800);//设置7天的缓存有效期
            callbackFn(null, res);
        } else {
            mysqlQuery(mDB, rDB, platformUserId, platformId, function(err, res) {
                if (err) callbackFn(err);
                else if (res == null) {
                    var insertSql = "INSERT INTO user SET ?";
                    var data = {pUserId:platformUserId, platformId: platformId, createTime: Math.floor(Date.now() / 1000) };

                    mysql.loginDB(country).query(insertSql, data, function(err, res) {
                        mysqlQuery(mDB, rDB, platformUserId, platformId, callbackFn);
                    });
                } else {
                    callbackFn(null, res);
                }
            });
        }
    });
}

function getCountryUserData(country, platformId, pUserId, callbackFn) {
    var mKey = "CUid:" + platformId + ":" + pUserId;
    var rDB = redis.login(country);
    var mDB = mysql.loginDB(country);
    mysqlQueryData(mDB, rDB, pUserId, platformId, function(err, res) {
        if (err) callbackFn(err);
        else {
            callbackFn(null, res);
        }
    });
}

function blindingAccount(country , platformId , udid , platformUserId , cb) {
    var mDB = mysql.loginDB(country);
    var searchSql = "SELECT * FROM user WHERE " +
        "pUserId=" + mysql.escape(platformUserId) + " AND platformId=" + mysql.escape(platformId) + " LIMIT 1";
    var sql = "UPDATE user SET ? WHERE platformId=" +  mysql.escape(platformId) + " AND pUserId=" + mysql.escape(udid);
    var updateData = {};
    updateData["udid"] = platformUserId;
    mDB.query(searchSql, function(err, res) {
        if (err) cb(err);
        else {
            if (res.length > 0) {
                cb("hasBlinding", null);
            } else {
                mDB.query(sql,updateData,function(err, res) {
                    if(err || res==null){
                        cb("noThisUser" , null);
                    }else{
                        cb(null,res);
                    }
                });
            }
        }
    });
}
/**
 * 查找平台对应的唯一用户信息
 * @param mDB
 * @param rDB
 * @param platformUserId
 * @param platformId
 * @param callbackFn
 */
function mysqlQueryData(mDB, rDB, pUserId, platformId, callbackFn) {
    var mKey = "CUid:" + platformId + ":" + pUserId;
    var sql = "SELECT * FROM user WHERE " +
        "pUserId=" + mysql.escape(pUserId) + " AND platformId=" + mysql.escape(platformId) + " LIMIT 1";
    mDB.query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res.length > 0) {
                callbackFn(null, res[0]);
            } else {
                callbackFn(null, null);
            }
        }
    });
}
/**
 * 查找平台对应的唯一ID
 * @param mDB
 * @param rDB
 * @param platformUserId
 * @param platformId
 * @param callbackFn
 */
function mysqlQuery(mDB, rDB, platformUserId, platformId, callbackFn) {
    var mKey = "CUid:" + platformId + ":" + platformUserId;
    var sql = "SELECT id FROM user WHERE " +
        "platformId=" + mysql.escape(platformId) + " AND (pUserId=" + mysql.escape(platformUserId) + " OR udid=" + mysql.escape(platformUserId) + ") LIMIT 1";
    mDB.query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res.length > 0) {
                var cUserId = res[0]["id"];
                rDB.s(mKey).set(cUserId, function(err, res) {
                    rDB.s(mKey).expire(604800);//设置7天的缓存有效期
                    callbackFn(null, cUserId);
                });
            } else {
                callbackFn(null, null);
            }
        }
    });
}


/**
 * 取登录的用户状态
 * @param country
 * @param city
 * @param id
 * @param callbackFn
 */
function getUserUidStatus(country, city, id, callbackFn) {
    getDBUserStatus(country, city, id, function(err, res) {
        if (err) callbackFn(err);
        else if (res == null) callbackFn("dbError");
        else {
            callbackFn(null, res);
        }
    });
}


//取用户状态
function getDBUserStatus(country, city, id, callbackFn) {
    getUserUid(country, city, id, function(err, res) {
        if (err || res == null) callbackFn(err);
        else {
            var mUserUid = res;
            if (typeof (mUserUid) == "object") {
                callbackFn(null, [res, 0]);
            } else {
                var sql = "SELECT status FROM user WHERE userUid=" + mUserUid + " LIMIT 1";
                var mDB = mysql.game(null, country, city);
                mDB.query(sql, function (err, res) {
                    if (err) callbackFn(err);
                    else {
                        if (res == null || res.length == 0) {
                            callbackFn(null, [mUserUid, 0]);
                        } else {
                            var mStatus = res[0]["status"];
                            callbackFn(null, [mUserUid, mStatus]);
                        }
                    }
                });
            }
        }
    });
}


/**
 * 通过登录数据库id取分区数据库中取用户userUid
 * @param country
 * @param city
 * @param id
 * @param callbackFn
 */
function getUserUid(country, city, id, callbackFn) {
    var mDB = mysql.game(null, country, city);
    var sql = "SELECT userUid FROM userOwner WHERE ownerId=" + mysql.escape(id);
    mDB.query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res != null && res.length > 0) {
                if (res.length == 1) {
                    callbackFn(null, res[0]["userUid"]);
                } else {
                    var ids = [];
                    for (var i = 0; i < res.length; i++) {
                        ids.push(res[i]["userUid"]);
                    }
                    callbackFn(null, ids);
                }
            } else {
                generateUserUid(country, city, function(err, res) {
                    if (err || res == null) callbackFn(err);
                    else {
                        var mUserUid = bitUtil.createUserUid(country, city, res);
                        var newData = {};
                        newData["ownerId"] = id;
                        newData["userUid"] = mUserUid;
                        newData["createTime"] = Math.floor(Date.now()/1000);
                        var insertSql = "INSERT INTO userOwner SET ?";
                        mDB.query(insertSql, newData, function(err, res) {
                            if (err) callbackFn(err);
                            else {
                                callbackFn(null, mUserUid);
                            }
                        });
                    }
                });
            }
        }
    });
}


//生成一个uid
function generateUserUid(country, city, callbackFn) {
    var mDB = mysql.game(null, country, city);
    var random = Math.floor(Math.random() * Math.pow(2, 31));
    var sql = "INSERT INTO userGenerate (random) VALUES (" + random + ")";
    mDB.query(sql, function(err, res) {
//        var selectSql = "SELECT MAX(id) AS id FROM userGenerate";
        var selectSql = "SELECT id FROM userGenerate WHERE random=" + random;
        mDB.query(selectSql, function(err, res) {
            if (err || res == null || res.length == 0) callbackFn(err);
            else {
                callbackFn(null, res[res.length - 1]["id"]);
            }
        });
    });
}

//获取封号列表
function getStopAccountList(country, city, callbackFn) {
    redis.domain(country, city).h("stopClosing").getAllJSON(function(err, res) {
        var ret = [];
        for(var i in res){
            ret.push(res[i]);
        }
        callbackFn(err, ret);
    });
}

//设置封号
function setStopAccount(userUid, callbackFn) {
    var mCode = bitUtil.parseUserUid(userUid)
    redis.domain(mCode[0], mCode[1]).h("stopClosing").set(userUid, userUid, function(err, res) {
        callbackFn(err, res);
    });
}

//解除封号
function delStopAccount(userUid, callbackFn) {
    var mCode = bitUtil.parseUserUid(userUid)
    redis.domain(mCode[0], mCode[1]).h("stopClosing").hdel(userUid, function(err, res) {
        callbackFn(err, res);
    });
}

exports.getServerList = getServerList;
exports.getLastServer = getLastServer;
exports.setLastServer = setLastServer;
exports.getServerCitys = getServerCitys;

exports.getCountryUserId = getCountryUserId;
exports.getUserUidStatus = getUserUidStatus;
exports.getServerOpenList = getServerOpenList;
exports.getCountryUserData = getCountryUserData;
exports.blindingAccount = blindingAccount;
exports.getStopAccountList = getStopAccountList;
exports.setStopAccount = setStopAccount;
exports.delStopAccount = delStopAccount;