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


/**
 * 宝箱N连开
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData,"itemId","openNum") == false) {
        response.echo("specialBox.mutiOpen",jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];
    var openNum = postData["openNum"];
    var itemId = postData["itemId"];

    var configData = configManager.createConfig(userUid);
    var specialBoxConfig = configData.getConfig("specialBox");

    var gItemData= null; //道具1数据
    var gItemNum = 0;      //道具1数量

    var gBoxData = null;//开宝箱记录
    var gRandomItems = [];//掉落项

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
                    gItemNum = gItemData["number"];
                    cb(null);
                }
            });
        },
        function(cb) { //取开宝箱记录
            specialBox.getUserBox(userUid, itemId,function(err,res) {
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
                //console.log(configArray);
                if (configArray[0] != false) {
                    specialBoxConfig = configArray[2] || specialBoxConfig; //如果报错，取默认为1的项
                }
                cb(null);
            });
        },
        function(cb) { // 掉落逻辑
            var mPoint = specialBoxConfig["pointAdd"][itemId];
            updateBoxData = jutil.copyObject(gBoxData);

            //N次开箱
            for(var times = 0; times < openNum; times++){
                updateBoxData["point"] += mPoint;

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

                if (randomItem == null) cb("configError");
                else {
                    gRandomItems.push(randomItem);
                }
            }
            cb(null);
        },
        function(cb) {
            async.forEachSeries(gRandomItems, function(randomItem, forCb) {
                //if (configData.idStar(randomItem["id"]) >= 4) {
                //    gameModel.addNews(userUid, gameModel.SPECIALBOX ,  gUserData["userName"], randomItem["id"]);
                //}
                mongoStats.dropStats(randomItem["id"], userUid, '127.0.0.1', null, mongoStats.SPECIALBOX, randomItem["count"]);
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
            specialBox.updateUserBox(userUid, itemId, updateBoxData, function(err, res) {
                cb(null);
                if (err) console.error("specialBox.open1",err.stack);
            });
        },
        function(cb) { //更新道具数量1
            mongoStats.expendStats(itemId, userUid, '127.0.0.1', null, mongoStats.SPECIALBOX, openNum);
            itemModel.updateItem(userUid, itemId, -openNum, function(err,res) {
                resultItem = res;
                if (err) console.error("specialBox.open2",err.stack);
                cb(null);
            });
        }
    ], function(err) {
        if (err) response.echo("specialBox.mutiOpen", jutil.errorInfo(err));
        else {
            timeLimitActivityReward.itemUsed(userUid, itemId, openNum, function(){
                response.echo("specialBox.mutiOpen", {"boxData":gRandomItems,"itemData":resultItem});
            });
        }
    });

}

exports.start = start;