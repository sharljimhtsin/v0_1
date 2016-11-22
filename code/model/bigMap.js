/**
 * bigMap数据
 * User: peter.wang
 * Date: 14-9-17
 * Time: 上午11:00
 */
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var async = require("async");

/**
 * 取一个用户的所有big地图数据
 * @param userUid
 * @param callbackFn
 */
function getBigMap(userUid,callbackFn) {
    redis.user(userUid).s("bigMap").getObj(function(err,res){
        if (res == null) {
            var sql = "SELECT * FROM bigMap WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql,function(err, res) {
                if (err || res == null) callbackFn(err,null);
                else {
                    var returnObj = {};

                    for (var i = 0; i < res.length; i++) {
                        var resItem = res[i];
                        var mode = resItem["mode"];
                        var bigMapId = resItem["bigMapId"];
                        var level = resItem["level"];

                        if(returnObj[mode]==undefined) returnObj[mode] = {};
                        if(returnObj[mode][bigMapId]==undefined) returnObj[mode][bigMapId] = {};
                        returnObj[mode][bigMapId][level] = level;
                    }
                    redis.user(userUid).s("bigMap").setObj(returnObj, function(err,res){
                        redis.user(userUid).s("bigMap").expire(604800);
                        callbackFn(null,returnObj);
                    });
                }
            });
        } else {
            callbackFn(null,res);
        }
    });
}

/**
 * 取一个玩家某个模式某个big地图的分级
 * @param userUid
 * @param bigMapId
 * @param callbackFn
 */
function getBigMapItem(userUid,mode,bigMapId,callbackFn) {
    getBigMap(userUid,function(err,res){
        if (err || res == null) callbackFn(err, null);
        else {
            if(res[mode]==undefined || res[mode][bigMapId]==undefined){
                callbackFn(null,null);
            }else{
                callbackFn(null, res[mode][bigMapId]);
            }
        }
    });
}

function updateBigMap(userUid,bigMapData,callbackFn) {
    var insertSql = "INSERT INTO bigMap SET ?";
    bigMapData["userUid"] = userUid;
    mysql.game(userUid).query(insertSql,bigMapData,function(err,res){
        redis.user(userUid).s("bigMap").del();
        if (err) callbackFn(err);
        else callbackFn(null, 1);
    });
}

exports.getBigMap = getBigMap;
exports.getBigMapItem = getBigMapItem;
exports.updateBigMap = updateBigMap;