/**
 * 团购活动（跨服） 领奖接口
 * User: joseppe
 * Date: 15-03-03
 * Time: 下午15:55
 */

var async = require("async");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var item = require("../model/item");
var mongoStats = require("../model/mongoStats");
var groupPurchase = require("../model/groupPurchase");
var stats = require("../model/stats");
var modelUtil = require("../model/modelUtil");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var sTime = 0;
    var eTime = 0;
    var activityConfig = {};
    var key = 1;
    var isAll = 0;
    var returnData = {};
    var top = 0;
    async.series([
        function (cb) { // 活动配制
            groupPurchase.getConfig(userUid, groupPurchase.GROUPPURCHASE3, function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    sTime = res[0];
                    eTime = res[1];
                    activityConfig = res[2];
                    key = activityConfig["key"];
                    isAll = parseInt(activityConfig["isAll"]) || 0;
                    cb(null);
                }
            })
        },
        function(cb){
            groupPurchase.getRankRewardStatus(userUid, eTime, key, function(err,res){
                if(err)cb(err);
                else{
                    console.log(res,"getStatu....");
                    if(res-0 == 2){
                        cb("haveReceive");
                    }else if(res-0 == 0){
                        cb("notRwardTime");
                    }else{
                        returnData["rewardStatus"] = res-0;
                        cb(null);
                    }
                }
            });
        },function(cb){
            var rk = isAll ? (isAll == 2 ? "loginFromUserUid" : "difficulty") : "domain";//210--跨服|全平台|单服
            redis[rk](userUid).z(groupPurchase.GROUPPURCHASE3 + ":userBuyCountRank:" + key).revrangeRev(0, 19, function (err, res) {//userBuyCountRank
                var ss = false;
                for (var i = 0; i < res.length; i ++) {
                    if(userUid == res[i]){
                        top = i+1;
                        ss = true;
                        break;
                    }
                }
                if(ss){
                    //发奖
                    returnData["reward"] = activityConfig["rankReward"][top];
                }else{
                    returnData["reward"] = [];
                }
                cb(null);
            });
        },function(cb){
            groupPurchase.setRankRewardStatus(userUid, key, cb);
        },function (cb) {
            returnData["rewardList"] = [];
            async.eachSeries(returnData["reward"], function (reward, esCb) {
                modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                    if (err) {
                        esCb(err);
                        console.error(reward["id"], reward["count"], err.stack);
                    } else {
                        if (res instanceof Array) {
                            for (var i in res) {
                                returnData["rewardList"].push(res[i]);
                            }
                        } else {
                            returnData["rewardList"].push(res);
                        }
                        esCb(null);
                    }
                });
            }, cb);
        }
    ], function (err, res) {
        if (err) {
            response.echo("practice.groupPurchase3.getRankReward", jutil.errorInfo(err));
        } else {
            response.echo("practice.groupPurchase3.getRankReward", returnData);
        }
    })
}

exports.start = start;