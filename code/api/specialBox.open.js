/**
 * 开活动宝箱
 * User: joseppe
 * Date: 14-07-01
 * Time: 下午14:45
 */
var jutil = require("../utils/jutil");
var itemModel = require("../model/item");
var specialBox = require("../model/specialBox");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var activityConfig = require("../model/activityConfig");
var gameModel = require("../model/gameModel");
var user = require("../model/user");
var async = require("async");
var timeLimitActivityReward = require("../model/timeLimitActivityReward");
var mongoStats = require("../model/mongoStats");


function start(postData, response, query) {
    if (jutil.postCheck(postData,"itemId") == false) {
        response.echo("specialBox.open",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var itemId = postData["itemId"];

    var configData = configManager.createConfig(userUid);
    var specialBoxConfig = configData.getConfig("specialBox");

    var gItemData= null; //道具1数据
    var gBoxData = null;//开宝箱记录
    var gRandomItem = null;//掉落项

    var updateBoxData = null; //开宝箱更新记录

    var resultItem = null;

    var boxProbConfig = null;
    var gUserData = null; //用户数据

    async.series([
        function(cb) {
            user.getUser(userUid, function(err, res) {
                if (err) cb("dbError");
                else {
                    gUserData = res;
                    cb(null);
                }
            });
        },
        function(cb) { //取道具信息
            itemModel.getItem(userUid, itemId, function(err,res) {
                if (err) cb("dbError");
                else if (res == null || res["number"] <= 0) cb("noItem");
                else {
                    gItemData = res;
                    cb(null);
                }
            });
        },
        function(cb) { //取开宝箱记录
            specialBox.getUserBox(userUid, itemId, function(err,res) {
                if (err) cb("dbError");
                else {
                    gBoxData = res;
                    cb(null);
                }
            });
        },
        function(cb) {
            activityConfig.getConfig(userUid, "specialBox", function(err, res) {
                var configArray = res;
                if (configArray[0] != false) {
                    specialBoxConfig = configArray[2] || specialBoxConfig; //如果报错，取默认为1的项
                }
                cb(null);
            });
        },
        function(cb) { // 掉落逻辑
            var mPoint = specialBoxConfig["pointAdd"][itemId];

            updateBoxData = {};
            if (gBoxData == null) {
                //没有初始数据
                updateBoxData["point"] = mPoint;
                updateBoxData["itemId"] = itemId;
                updateBoxData["goodProb"] = Math.floor(Math.random() * specialBoxConfig["goodProb"][itemId].length);
                updateBoxData["probed"] = [];
            } else {
                updateBoxData["point"] = gBoxData["point"] + mPoint;
                updateBoxData["goodProb"] = gBoxData["goodProb"];
                updateBoxData["probed"] = gBoxData["probed"];
            }
            if(specialBoxConfig["goodProb"][itemId][updateBoxData["goodProb"]] == null){
                updateBoxData["goodProb"] = 0;//Math.floor(Math.random() * specialBoxConfig["goodProb"][itemId].length);
            }
            var boxPointToGood = specialBoxConfig["goodProb"][itemId][updateBoxData["goodProb"]]['pointToGood'];
            var boxPointReduce = specialBoxConfig["goodProb"][itemId][updateBoxData["goodProb"]]['pointReduce'];
            var boxPointGoodMax = specialBoxConfig["goodProb"][itemId][updateBoxData["goodProb"]]['pointGoodMax'];

            //取配置表
            if (updateBoxData["point"] > boxPointToGood ) {
                var mProbability = (updateBoxData["point"] - boxPointToGood) /(boxPointGoodMax - boxPointToGood);
                if (Math.random() < mProbability) {
                    boxProbConfig = specialBoxConfig["goodProb"][itemId][updateBoxData["goodProb"]]['reward'];
                    updateBoxData["point"] = updateBoxData["point"] - boxPointReduce;
                    updateBoxData["point"] = (updateBoxData["point"] < 0) ? 0 : updateBoxData["point"];
                    //记录已经使用过的goodProb
                    updateBoxData["probed"].push(updateBoxData["goodProb"]-0);
                    if(updateBoxData["probed"].length >= specialBoxConfig["goodProb"][itemId].length){
                        updateBoxData["probed"] = [];
                    }
                    //计算新的goodProb
                    var r = Math.floor(Math.random() * (specialBoxConfig["goodProb"][itemId].length - updateBoxData["probed"].length));
                    for(var i in specialBoxConfig["goodProb"][itemId]){
                        var isUsed = false;
                        for(var j in updateBoxData["probed"]){
                            if(updateBoxData["probed"][j] == i){
                                isUsed = true;
                                break;
                            }
                        }
                        if(isUsed)
                            continue;
                        updateBoxData["goodProb"] = i;
                        if(r-- <= 0)
                            break;
                    }
                } else {
                    boxProbConfig = specialBoxConfig["badProb"][itemId];
                }
            } else {
                boxProbConfig = specialBoxConfig["badProb"][itemId];
            }

            //计算掉落
            var r = Math.random();
            var randomItem = null;
            for(var i in boxProbConfig){
                if(r < boxProbConfig[i]["prob"]){
                    //中了
                    randomItem = boxProbConfig[i];
                    break;
                }
            }
            //var randomItem = randomByConfig(itemId,boxProbConfig);
            gRandomItem = randomItem;
            if (randomItem == null) cb("configError");
            else {
                //if (configData.idStar(randomItem["id"]) >= 4) {
                //    gameModel.addNews(userUid, gameModel.SPECIALBOX ,  gUserData["userName"], randomItem["id"]);
                //}

                mongoStats.dropStats(randomItem["id"], userUid, '127.0.0.1', null, mongoStats.SPECIALBOX, randomItem["count"]);
                modelUtil.addDropItemToDB(randomItem["id"], randomItem["count"],userUid,0,1,function(err,res) {
                    if (err) cb("dbError");
                    else {
                        gRandomItem["dataInfo"] = res;
                        cb(null);
                    }
                });
            }
        },
        function(cb) { //更新开宝箱积分
            mongoStats.expendStats(itemId, userUid, '127.0.0.1', null, mongoStats.SPECIALBOX, 1);
            specialBox.updateUserBox(userUid, itemId, updateBoxData, function(err, res) {
                cb(null);
                if (err) console.error("specialBox.open1",err.stack);
            });
        },
        function(cb) { //更新道具数量
            itemModel.updateItem(userUid, itemId, -1, function(err,res) {
                resultItem = res;
                if (err) console.error("specialBox.open2",err.stack);
                //mongoStats.expendStats(itemId, userUid, '127.0.0.1', null, mongoStats.SPECIALBOX, 1);
                cb(null);
            });
        }
    ], function(err) {
        if (err) response.echo("specialBox.open", jutil.errorInfo(err));
        else {
            timeLimitActivityReward.itemUsed(userUid, itemId, 1, function(){
            	response.echo("specialBox.open", {"boxData":gRandomItem,"itemData":resultItem});
            });
        }
    });

}


function randomByConfig(itemId, config) {
    var mConfig = config[itemId];
    if (mConfig == null) return null;
    var randomValue = Math.random();

    for (var i = 0; mConfig.length; i++) {
        var mItem = mConfig[i];
        if (randomValue >= mItem["minProb"] && randomValue < mItem["maxProb"]) {
            var returnData = {"id":mItem["itemId"], "count":mItem["count"]};
            return returnData;
            break;
        }
    }
    return null;
}


exports.start = start;