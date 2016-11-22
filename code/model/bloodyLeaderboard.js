/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 13-11-22
 * Time: 上午11:15
 * To change this template use File | Settings | File Templates.
 */
var redis = require("../alien/db/redis");
var async = require("async");
var budokai = require("../model/budokai");
var jutil = require("../utils/jutil");
function addPlayerInBoard(day,userUid,type,callBack){
    var getKey = type + ":" + day;
    var redisItem = redis.dynamic(userUid).z(getKey);
    var bloodBattleInfo;
    var returnData = {};
    async.series([
        function(callBack){
            budokai.getBloodyBattleInfo(userUid,function(err,res){
                if(err || res == null){
                    callBack("bloodRankWrong",null);
                }else{
//                    if(jutil.compTimeDay(jutil.now(),res["todayLastFightTime"]) == false){  //今天没打
//                     callBack("bloodRankWrong",null);
//                    }else{
                        bloodBattleInfo = res;
                        callBack(null,null);
//                    }
                }
            });
        },
        function(callBack){//获取第二十名
            redisItem.revrange(19 ,19 , "WITHSCORES",function(err,res){
                returnData = res;
                callBack(null,null);
            });
        },
        function(callBack){ //判断是否比20强  是的话插入排序中
            var rankNum = bloodBattleInfo["todayMostPoints"] * 10000 + bloodBattleInfo["todayMostStar"];
            if(returnData.length == 0){ //数据少于20个
                redisItem.add(rankNum,userUid,function(err,res){
                    callBack(null,null);
                });
            }else{
                if(rankNum > returnData[1]){
                    redisItem.add(rankNum,userUid,function(err,res){
                        callBack(null,null);
                    });
                }else{
                    callBack(null,null);
                }
            }
        }
    ],function(err,res){
        if(err){
            callBack(err,null);
        }else{
            callBack(null,null);
        }
    });
}
/**
 *
 * @param type排名类型
 * @param day 天数
 * @param callBack
 */
function getTopTwenty(userUid,type,day,callBack){ //获取前二十名
    var getKey = type + ":" + day;
    //var redisItem = redis.game(userUid).getClient().z(getKey);
    var redisItem = redis.dynamic(userUid).z(getKey);
    redisItem.revrange(0 ,19 ,"WITHSCORES",function(err,res){
        var returnData = [];
        for(var i = 0 ; i < res.length / 2  ; i ++){
            var obj = {};
            obj["top"] = i + 1;
            obj["value"] = res[i * 2 + 1];
            obj["userId"] = res[i * 2];
            returnData.push(obj);
        }
        callBack(null,returnData);
    });
}
function AnAward(){
    var topFiveTopTwenty = getTopTwenty()
}
function getCurrentUserTop(userUid,type){

}
exports.addPlayerInBoard = addPlayerInBoard;
exports.getTopTwenty = getTopTwenty;