/**
 * PVE关卡数据
 * User: liyuluan
 * Date: 13-10- 22
 * Time: 上午11:55
 */
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var async = require("async");

/**
 * 取一个用户的所有地图数据
 * @param userUid
 * @param callbackFn
 */
function getMap(userUid,callbackFn) {
//    redis.game(userUid).getObj("map:" + userUid, function(err,res){
    redis.user(userUid).s("map").getObj(function(err,res){
        if (res == null) {
            var sql = "SELECT * FROM map WHERE userUid = " + mysql.escape(userUid);
            mysql.game(userUid).query(sql,function(err, res) {
                if (err || res == null) callbackFn(err,null);
                else {
                    var returnObj = {};
                    for (var i = 0; i < res.length; i++) {
                        var resItem = res[i];
                        var mapId = resItem["mapId"];
                        returnObj[mapId] = resItem;
                    }
//                    redis.game(userUid).setObj("map:" + userUid,
                    redis.user(userUid).s("map").setObj(returnObj, function(err,res){
                        redis.user(userUid).s("map").expire(604800);
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
 * 取一个玩家某个地图的详细信息
 * @param userUid
 * @param mapId
 * @param callbackFn
 */
function getMapItem(userUid,mapId,callbackFn) {
    getMap(userUid,function(err,res){
        if (err || res == null) callbackFn(err, null);
        else {
            var mapItem = res[mapId];
            callbackFn(null,mapItem);
        }
    });
}

function updateMap(userUid,mapId,mapData,callbackFn) {
    var whereSql = "userUid=" + mysql.escape(userUid) + " AND mapId=" + mysql.escape(mapId);
    mysql.dataIsExist(userUid,"map",whereSql,function(err, res) {
        if (res == 0) {
            var insertSql = "INSERT INTO map SET ?";
            mapData["userUid"] = userUid;
            mapData["mapId"] = mapId;
            mysql.game(userUid).query(insertSql,mapData,function(err,res){
                redis.user(userUid).s("map").del();
//                redis.game(userUid).del("map:" + userUid);
                if (err) callbackFn(err);
                else callbackFn(null, 1);
            });
        } else {
            var updateSql = "UPDATE map SET ? WHERE " + whereSql;
            var newMapData = {};
            if (mapData['id'] != null) {
                newMapData["star"] = mapData["star"];
                newMapData["number"] = mapData["number"];
                newMapData["preTime"] = mapData["preTime"];
                newMapData["clearance"] = mapData["clearance"];
            } else {
                newMapData = mapData;
            }

            mysql.game(userUid).query(updateSql, newMapData, function(err, res) {
                redis.user(userUid).s("map").del();
//                redis.game(userUid).del("map:" + userUid);
                if (err) callbackFn(err);
                else callbackFn(null, 1);
            });
        }
    });
}
function judgeAllMapThreeStar(userUid,arr,cb){
    var isAllThreeStar = true;
    async.forEach(arr,function(item,callBack){
        getMapItem(userUid,item,function(err,res){
            if(err || res == null){
                callBack("getMapInfoWrong");
                return;
            }else{
                if(item["star"] != 3){
                    isAllThreeStar = false;
                }
                callBack(null);
            }
        })
    },function(err){
        if(err){
            cb(err,null);
        }else{
            cb(err,isAllThreeStar);
        }
    });
}

function judgeAllMapSumStar(userUid,arr,callbackFn){
    var sumStar = 0;
    getMap(userUid,function(err,res){
        if (err || res == null) callbackFn(err, sumStar);
        else {
            for(var index in arr){
                if(res[arr[index]]!=undefined) {
                    sumStar += res[arr[index]]["star"] - 0;
                }
            }
            callbackFn(null, sumStar);
        }
    });
}

exports.getMap = getMap;
exports.getMapItem = getMapItem;
exports.updateMap = updateMap;
exports.judgeAllMapThreeStar = judgeAllMapThreeStar;
exports.judgeAllMapSumStar = judgeAllMapSumStar;