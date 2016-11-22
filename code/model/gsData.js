/**
 * 跨服战
 * User: peter.wang
 * Date: 14-11-19
 * Time: 下午3:56
 */
var async = require("async");
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var login = require("../model/login");
var bitUtil = require("../alien/db/bitUtil");
var activityConfig = require("../model/activityConfig");
var GS_TABLETSCOMPETE = 'tabletsCompete';// 跨服神位争夺
var GS_GROUPPURCHASE = 'groupPurchase';// 跨服团购
var GS_GROUPPURCHASE2 = 'groupPurchase2';// 跨服团购2

// 获取当前期号，开始时间为当前期号
function getCurIssueId(userUid, name, callbackFn) {
    _getActivityConfig(userUid, name, function (err, res) {
        var configArray = res;
        if (err) callbackFn(err);
        else if (configArray[0] == false) {  // 当前无此活动(活动未开始，活动已结束)
            callbackFn(null, 0);
        } else if (configArray[1] == 0) { // 当前无此活动(活动未开启)
            callbackFn(null, 0);
        }else if(configArray[4] -0 <=0){
            callbackFn("beginTimeError");
        } else {// 活动进行中...
            redis.loginFromUserUid(userUid).s(getGSRedisKey(name,"","IssueId")).get(function (err, res) {
                if (err) callbackFn(err);
                else if (res != null) {
                    callbackFn(null, res);
                } else {
                    _getGSDataStatus1(userUid, name, function (err, res) {
                        if (err) callbackFn(err);
                        else {
                            if (res == 0) {
                                addGSDataInfo(userUid, name, configArray[4], {"status": 1}, function (err, res) {
                                    if (err) callbackFn(err);
                                    else {
                                        redis.loginFromUserUid(userUid).s(getGSRedisKey(name,"","IssueId")).setex(86400, configArray[4]);
                                        callbackFn(null, configArray[4])
                                    }
                                });
                            } else {
                                redis.loginFromUserUid(userUid).s(getGSRedisKey(name,"","IssueId")).setex(86400, res);
                                callbackFn(null, res)
                            }
                        }
                    });
                }
            });
        }
    });
}

// 添加活动数据
function addGSDataInfo(userUid, name, issueId, argsData, callbackFn) {
    redis.loginFromUserUid(userUid).s(getGSRedisKey(name, issueId, "lock:addGSDataInfo")).setnx(1, function (err, res) {
        if (err || res == 0) {
            callbackFn(null, 1);
        } else {
            async.series([
                function (cb) {
                    var sql = "SELECT * FROM gsData WHERE issueId=" + mysql.escape(issueId) + " and name=" + mysql.escape(name);
                    mysql.loginDBFromUserUid(userUid).query(sql, function (err, res) {
                        if (err) cb(err);
                        else {
                            if (res == null || res.length == 0) {
                                var insertSql = "INSERT INTO gsData SET ?";
                                var insertData = {"issueId": issueId, "name": name};
                                if (argsData["data"] != null) insertData["data"] = argsData["data"];
                                if (argsData["status"] != null) insertData["status"] = argsData["status"];
                                mysql.loginDBFromUserUid(userUid).query(insertSql, insertData, function (err, res) {
                                    if (err) cb(err);
                                    else cb(null, 1);
                                });
                            } else {
                                cb("exist");
                            }
                        }
                    });
                }
            ], function (err, res) {
                if (err && err != "exist") {
                    redis.loginFromUserUid(userUid).s(getGSRedisKey(name, issueId, "lock:addGSDataInfo")).del();//添加失败
                    callbackFn(err);
                } else {
                    redis.loginFromUserUid(userUid).s(getGSRedisKey(name, issueId, "lock:addGSDataInfo")).expire(7776000);//缓存90天
                    callbackFn(null, 1);
                }
            });
        }
    })
}
// 更新活动数据
function updateGSDataInfo(userUid, name, issueId, argsData, callbackFn){
    var sql = "SELECT * FROM gsData WHERE issueId=" + mysql.escape(issueId) + " and name="+mysql.escape(name);
    mysql.loginDBFromUserUid(userUid).query(sql, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res == null || res.length == 0) {
                callbackFn("issueId notExist");
            } else {
                var updateSql = "UPDATE gsData SET ? WHERE issueId=" + mysql.escape(issueId) + " and name="+mysql.escape(name);
                var updateData = {};
                if (argsData["data"] != null) updateData["data"] = argsData["data"];
                if (argsData["status"] != null) updateData["status"] = argsData["status"];

                mysql.loginDBFromUserUid(userUid).query(updateSql, updateData, function (err, res) {
                    if (err) callbackFn(err);
                    else {
                        callbackFn(null, 1);
                    }
                });
            }
        }
    });
}

// 取最近期号,排行榜
function getMaxIssueId(userUid, name, callbackFn) {
    var sql = "SELECT issueId FROM gsData WHERE name="+mysql.escape(name) + " ORDER BY issueId DESC LIMIT 1";
    mysql.loginDBFromUserUid(userUid).query(sql, function (err, res) {
        if(err) callbackFn(err);
        else{
            if(res == null || res.length ==0){
                callbackFn(null,0);
            }else{
                callbackFn(null,res[0]["issueId"]);
            }
        }
    });
}
// 获取活动期列表(adm)
function getGSDataList(county, name, callbackFn){
    var sql = "SELECT * FROM gsData WHERE name="+mysql.escape(name) + " ORDER BY issueId DESC";
    mysql.loginDB(county).query(sql, function(err, res) {
        if(err) callbackFn(err);
        else callbackFn(null, res);
    });
}
// 获取状态值为2
function getGSDataStatus2(userUid,name,callbackFn){
    var sql = "SELECT * FROM gsData WHERE status=2 and name="+mysql.escape(name)+" ORDER BY issueId desc LIMIT 1";
    mysql.loginDBFromUserUid(userUid).query(sql, function (err, res) {
        if(err) callbackFn(err);
        else{
            if(res == null || res.length ==0){
                callbackFn(null,null);
            }else{
                callbackFn(null,res[0]);
            }
        }
    });
}

// 获取状态值为1的期号
function _getGSDataStatus1(userUid,name,callbackFn){
    var sql = "SELECT issueId FROM gsData WHERE status=1 and name="+mysql.escape(name)+" ORDER BY issueId DESC LIMIT 1";
    mysql.loginDBFromUserUid(userUid).query(sql, function (err, res) {
        if(err) callbackFn(err);
        else{
            if(res == null || res.length ==0){
                callbackFn(null,0);
            }else{
                callbackFn(null,res[0]["issueId"]);
            }
        }
    });
}


// 用户所属区开服信息
function getUserServerInfo(userUid, callbackFn){
    var mCode = bitUtil.parseUserUid(userUid);
    login.getServerList(mCode[0], 0 ,function(err,res){
        if (err) callbackFn(err);
        else {
            var userServer = {};
            for(var key in res){
                if(res[key]["id"]==mCode[1]){
                    userServer = res[key];
                    break;
                }
            }
            callbackFn(null, userServer);
        }
    });
}

function getGSRedisKey(name,issueId,key){
    return jutil.formatString("{0}:{1}:{2}", [name,issueId,key]);
}

// 获取(跨服战)活动数据
function _getActivityConfig(userUid,name,callbackFn){
    var mCode = bitUtil.parseUserUid(userUid);
    userUid = _getDefaultServerUserUid(mCode[0]);//1服
    activityConfig.getConfig(userUid, name, function(err, res) {
        callbackFn(err,res);
    });
}
// 用于取1服的活动配制
function _getDefaultServerUserUid(country){
    return bitUtil.createUserUid(country, "1", "0");
}

exports.getUserServerInfo = getUserServerInfo;
exports.getCurIssueId = getCurIssueId;
exports.getMaxIssueId = getMaxIssueId;
exports.getGSRedisKey = getGSRedisKey;
exports.getGSDataList = getGSDataList;
exports.getGSDataStatus2 = getGSDataStatus2;
exports.getGSDataStatus1 = _getGSDataStatus1;
exports.updateGSDataInfo = updateGSDataInfo;
exports.getActivityConfig = _getActivityConfig;
exports.getDefaultServerUserUid = _getDefaultServerUserUid;
exports.addGSDataInfo = addGSDataInfo;
exports.GS_TABLETSCOMPETE = GS_TABLETSCOMPETE;// 跨服神位争夺
exports.GS_GROUPPURCHASE = GS_GROUPPURCHASE;// 跨服团购
exports.GS_GROUPPURCHASE2 = GS_GROUPPURCHASE2;// 跨服团购2