/**
 * 1.增加普通、困难两种领取模式
 * 2.吃仙豆改为领取宝箱
 * User: peter.wang
 * Date: 14-09-14
 * Time: 下午4:10
 */
var jutil = require("../utils/jutil");
var map = require("../model/map");
var bigMap = require("../model/bigMap");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var user = require("../model/user");
var battleModel = require("../model/battle");
var async = require("async");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query){
    if (jutil.postCheck(postData,"bigMapId", "level", "mode") == false) {
        response.echo("eatingReward",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var postMode = (postData["mode"]==undefined)? '':postData["mode"];
    var bigMapId = "" + postData["bigMapId"];
    var postLevel = "" + postData["level"];
    var configData = configManager.createConfig(userUid);

    // 检测模式参数是否有效
    var modeList = battleModel.getModeList();
    if(modeList[postMode]==undefined){
        response.echo("eatingReward", jutil.errorInfo("postError"));
        return;
    }

    var userObj = {};
    var returnData = {};
    var bigMapConfig = configData.getConfig(battleModel.getModeBigMap(postMode));
    var levelMinStar = bigMapConfig[bigMapId]["reward"][postLevel]["rewardStar"];
    var childArr = (bigMapConfig[bigMapId]==undefined)? null:bigMapConfig[bigMapId]["child"];

    if (childArr == null) {
        response.echo("eatingReward",jutil.errorInfo("postError"));
        return;
    }

    var resultData = [];

    async.auto({
        "judgeStar":function(cb){
            map.judgeAllMapSumStar(userUid,childArr,function(err,res){
                if(err){
                    cb(err,null);
                }else if((res-0)<levelMinStar){ // 不能吃
                    cb("postError", null);
                }else{
                    cb(null, res);
                }
            });
        },
        "judgeHasNotEat":function(cb){
            bigMap.getBigMapItem(userUid,postMode,bigMapId,function(err,res){
                if(err){
                    cb(err,null);
                }else if(res == null){
                    cb(null,null);
                }else{
                    if(res[postLevel]!=undefined){
                        cb("beansHasEatNew",null);
                    }else{
                        cb(null,null);
                    }
                }
            });
        },
        "getUserData":function(cb){
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    cb("noThisUser",null);
                }else{
                    userObj = res;
                    cb(null,res);
                }
            })
        },
        "rewardUser":["judgeStar","judgeHasNotEat","getUserData",function(cb,results){
            //console.log("Print#1:\n" + JSON.stringify(results));
            var reward = bigMapConfig[bigMapId]["reward"][postLevel];
            if(reward == undefined){
                cb("postError", null);
            }else {
                mongoStats.dropStats(reward["id"], userUid, '127.0.0.1', null, mongoStats.PVE_EAT, reward["count"]);
                modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, 0, 1, function (err, res) {
                    if (err) cb(err, null);
                    else {
                        resultData.push(res);
                        cb(null, null);
                    }
                });
            }
        }],
        "updateBigMap":["rewardUser",function(cb,results){
            var bigMapData = {};
            bigMapData["mode"] = postMode;
            bigMapData["bigMapId"] = bigMapId;
            bigMapData["level"] = postLevel;
            bigMap.updateBigMap(userUid,bigMapData,function(err,res){
                if(err){
                    cb(err,null);
                }else{
                    returnData["mapItem"] = bigMapData;
                    cb(null,null);
                }
            });
        }]
    },function(err,res){
        if(err){
            response.echo("eatingReward",jutil.errorInfo(err));
        }else{
            response.echo("eatingReward",{"resultData":resultData, "returnData":returnData });
        }
    });
}
exports.start = start;