/**
 * 开宝箱
 * User: liyuluan
 * Date: 13-11-21
 * Time: 下午12:27
 */
var jutil = require("../utils/jutil");
var itemModel = require("../model/item");
var box = require("../model/box");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var activityConfig = require("../model/activityConfig");
var gameModel = require("../model/gameModel");
var user = require("../model/user");
var async = require("async");
var mongoStats = require("../model/mongoStats");
var timeLimitActivityReward = require("../model/timeLimitActivityReward");
var achievement = require("../model/achievement");


/**
 * 宝箱N连开
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"itemId","openNum") == false) {
        response.echo("box.mutiOpen",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var openNum = postData["openNum"];
    var itemId1 = postData["itemId"];
    var itemId2 = keybox(itemId1);
    if (itemId2 == null) {
        response.echo("box.mutiOpen",jutil.errorInfo("postError"));
        return;
    }

    var configData = configManager.createConfig(userUid);
    var boxConfig = configData.getConfig("box");

    var gItemData1= null; //道具1数据
    var gItemData2 = null; //道具2数据
    var gItemNum1 = 0;      //道具1数量
    var gItemNum2 = 0;      //道具2数量
    var gMaxOpenNum = 0;    //最大开箱数

    var gBoxData = null;//开宝箱记录
    var gRandomItems = [];//掉落项

    var updateBoxData = null; //开宝箱更新记录

    var resultItem1 = null;
    var resultItem2 = null;

    var gGoodBoxProb = null;
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
            itemModel.getItem(userUid, itemId1, function(err,res) {
                if (err) cb("dbError");
                else if (res == null || res["number"] <= 0) cb("noItem");
                else {
                    gItemData1 = res;
                    gItemNum1 = gItemData1["number"];
                    cb(null);
                }
            });
        },
        function(cb) { //取道具信息(匹配道具)
            itemModel.getItem(userUid, itemId2, function(err, res) {
                if (err) cb("dbError");
                else if (res == null || res["number"] <= 0) cb("noItem");
                else {
                    gItemData2 = res;
                    gItemNum2 = gItemData2["number"];
                    gMaxOpenNum = Math.min(gItemNum1,gItemNum2);
                    if (openNum > gMaxOpenNum) {//验证前台传入的连开次数是否有效
                        cb("noItem");
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function(cb) { //取开宝箱记录
            box.getUserBox(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    gBoxData = res;
                    cb(null);
                }
            });
        },
        function(cb) {
            activityConfig.getConfig(userUid, "box", function(err, res) {
                var configArray = res;
                if (configArray[0] == false) {
                    gGoodBoxProb = boxConfig["goodBoxProb"]["1"]; //当前没有活动， 取默认
                } else {
                    var mArg = configArray[1];
                    if (mArg == -1) {
                        gGoodBoxProb = configArray[2] || boxConfig["goodBoxProb"]["1"]; //如果报错，取默认为1的项
                    } else {
                        gGoodBoxProb = boxConfig["goodBoxProb"][mArg];
                        if (gGoodBoxProb == null) gGoodBoxProb = boxConfig["goodBoxProb"]["1"]; //如果参数中无此项，取默认
                    }
                }
                cb(null);
            });
        },

        function(cb) { // 掉落逻辑
            var boxPointAddConfig = boxConfig["boxPointAdd"];
            var boxPointToGood = boxConfig["boxPointToGood"] - 0;
            var boxPointReduce = boxConfig["boxPointReduce"] - 0;
            var boxPointGoodMax = boxConfig["boxPointGoodMax"] - 0;
            var boxProbConfig = null;
            updateBoxData = jutil.copyObject(gBoxData);

            //N次开箱
            for(var i = 0; i < openNum; i++){
                var pay1 = false; //item1是否用钱购买
                var pay2 = false; //item2是否用钱购买
                var mPoint = 0;
                if (updateBoxData != null) {
                    if (updateBoxData["b" + itemId1] != null && updateBoxData["b" + itemId1] - 0 > 0) {
                        pay1 = true;
                        updateBoxData["b" + itemId1] = updateBoxData["b" + itemId1] - 1;
                    }
                    if (updateBoxData["b" + itemId2] != null && updateBoxData["b" + itemId2] - 0 > 0) {
                        pay2 = true;
                        updateBoxData["b" + itemId2] = updateBoxData["b" + itemId2] - 1;
                    }
                    mPoint = updateBoxData["point"] - 0;
                }
                if (pay1 == true) mPoint += (boxPointAddConfig[itemId1] - 0);
                if (pay2 == true) mPoint += (boxPointAddConfig[itemId2] - 0);

                if (mPoint >= boxPointToGood ) {
                    var mProbability = (mPoint - boxPointToGood) /(boxPointGoodMax - boxPointToGood);
                    if (Math.random() < mProbability) {
                        boxProbConfig = gGoodBoxProb;
                        mPoint = mPoint - boxPointReduce;
                        mPoint = (mPoint < 0) ? 0 : mPoint;
                    } else if (pay1 == true || pay2 == true) {
                        boxProbConfig = boxConfig["payBoxProb"];
                    } else {
                        boxProbConfig = boxConfig["freeBoxProb"];
                    }
                } else if (pay1 == true || pay2 == true) {
                    boxProbConfig = boxConfig["payBoxProb"];
                } else {
                    boxProbConfig = boxConfig["freeBoxProb"];
                }
                updateBoxData["point"] = mPoint;
                var randomItem = randomByConfig(itemId1,itemId2,boxProbConfig);

                if (randomItem == null) cb("configError");
                else {
                    gRandomItems.push(randomItem);
                }
            }
            cb(null);
        },
        function(cb) {
            async.forEachSeries(gRandomItems, function(randomItem, forCb) {
                if (configData.idStar(randomItem["id"]) >= 4) {
                    gameModel.addNews(userUid, gameModel.BOX ,  gUserData["userName"], randomItem["id"]);
                }
                mongoStats.dropStats(randomItem["id"], userUid, '127.0.0.1', null, mongoStats.BOX, randomItem["count"]);
                modelUtil.addDropItemToDB(randomItem["id"], randomItem["count"],userUid,0,1,function(err,res) {
                    if (err) forCb("dbError");
                    else {
                        randomItem["dataInfo"] = res;
                        forCb(null);
                    }
                });
            }, function(err) {
                if(err) cb(err);
                else cb(null);
            });
        },
        function(cb) { //更新开宝箱积分
            box.updateUserBox(userUid, updateBoxData, function(err, res) {
                cb(null);
                if (err) console.error("box.open1",err.stack);
            });
        },
        function(cb) { //更新道具数量1
            itemModel.updateItem(userUid, itemId1, -openNum, function(err,res) {
                resultItem1 = res;
                if (err) console.error("box.open2",err.stack);
                cb(null);
            });
        },
        function(cb) { //更新道具数量2
            itemModel.updateItem(userUid, itemId2, -openNum, function(err,res) {
                resultItem2 = res;
                if (err) console.error("box.open3",err.stack);
                cb(null);
            });
        },
        function(cb) { // 成就数据更新
            var itemsConfig = configData.getConfig("item");
            var itemConfig = itemsConfig[itemId1];
            if (itemConfig && itemConfig["star"] == 4) {
                achievement.boxOpen(userUid, openNum, function(){
                    cb(null);
                });
            } else {
                cb(null);
            }
        }
    ], function(err) {
        if (err) response.echo("box.mutiOpen", jutil.errorInfo(err));
        else {
            timeLimitActivityReward.itemUsed(userUid, itemId1, openNum, function(){
                response.echo("box.mutiOpen", {"boxData":gRandomItems,"itemData":[resultItem1,resultItem2]});
            });
        }
    });

}


/**
 * 通过宝箱返回keyID,或通key返回宝箱id
 * @param itemId
 */
function keybox(itemId) {
    itemId += "";
    switch (itemId) {
        case "150301":return "150401";break;
        case "150302":return "150402";break;
        case "150303":return "150403";break;
        case "150304":return "150404";break;
        case "150401":return "150301";break;
        case "150402":return "150302";break;
        case "150403":return "150303";break;
        case "150404":return "150304";break;
        default :
            return null;
    }
}

function randomByConfig(itemId1, itemId2, config) {
    var mConfig = (config[itemId1] == null) ? config[itemId2]:config[itemId1];
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