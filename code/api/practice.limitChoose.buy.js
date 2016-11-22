/**
 * Created with JetBrains WebStorm.
 * 限时礼包api--practice.limitChoose.get
 * User: za
 * Date: 16-5-13
 * Time: 下午13:57
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var pLc = require("../model/practiceLimitChoose");
var modelUtil = require("../model/modelUtil");
function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var type = postData["type"]-0;
    var returnData = {};
    var day = postData["day"]-0;
    var list = {};
    var rewardData = [];
    var limit1 = 0;
    var limit2 = 0;
    var currentConfig;
    var isAll = "";
    var rk = "";
    var key = "";
    var chooseList = {};
    var limitA = 0;
    var limitB = 0;
    var dayNo = 0;
    var dayType = "";
    var sTime = 0;
    var pay = 0;
    var tPay = 0;
    var rewardList = {};
    var rIndex = 0;
    var userIngot = 0;
    var needPay = 0;
    async.series([function(cb){
            pLc.getConfig(userUid,function(err,res){
                if(err)cb(err);
                else{
                    sTime = res[0];
                    currentConfig = res[2];
                    key = currentConfig["key"];
                    isAll = parseInt(currentConfig["isAll"]);
                    rk = isAll?(isAll == 2?"country":"loginFromUserUid"):"domain";
                    chooseList = currentConfig["chooseList"];
                    dayNo = Math.floor((jutil.now() - sTime) / 86400);
                    dayType = "day"+dayNo;
                    rewardList = chooseList[dayType];
                    limit1 = currentConfig["limit1"]-0;
                    limit2 = currentConfig["limit2"]-0;
                    pay = currentConfig["pay"]-0;
                    tPay = currentConfig["tPay"]-0;
                    cb(null);
                }
            });
        },function(cb){
            pLc.getUserData(userUid,function(err,res){//根据传入的下标，找到对应的奖励
                if(err)cb(err);
                else if(res["arg"] == undefined){
                    cb("dbError");
                }else{
                    list = res["arg"];
                    limitA = list["limitA"]-0;
                    limitB = list["limitB"]-0;
                    cb(null);

                }
            });
        },function(cb){
            while (returnData["reward"].length < type) {//需求：1
                var randomRate1 = Math.random();
                var p = 0;
                for (var i in rewardList) {
                    p += chooseList[i]["prob"] - 0;
                    if (randomRate1 <= p) {
                        rIndex = i;
                        if(i == 1){
                            if(limitA-1 > 0){
                                limitA--;
                                returnData["reward"].push({"id": chooseList[i]["id"], "count": chooseList[i]["count"]});
                                break;
                            }else{
                                continue;
                            }
                        }else if(i == 2){
                            if(limitB-1 >0){
                                limitB--;
                                returnData["reward"].push({"id": chooseList[i]["id"], "count": chooseList[i]["count"]});
                                break;
                            }else{
                                continue;
                            }
                        }else{
                            returnData["reward"].push({"id": chooseList[i]["id"], "count": chooseList[i]["count"]});
                            break;
                        }
                    }
                }
            }
            cb(null);
        },function(cb){
            if(type == limit1){//1连抽
                needPay = pay;
                cb(null);
            }else if(type == limit2){//10连抽
                needPay = tPay;
                cb(null);
            }else{
                cb("typeError");
            }
        },function(cb){
                //扣钱
                user.getUser(userUid,function(err,res){
                    if(err || res == null){
                        cb("dbError");
                    } else {
                        userIngot = res["ingot"]-0;
                        if(userIngot - needPay < 0){
                            cb("ingotNotEnough");
                        }else{
                            var myIngot = userIngot - needPay;
                            user.updateUser(userUid,{"ingot":myIngot},cb);
                        }
                    }
                });
        },function(cb){
            pLc.setUserData(userUid,list,cb);
        },function(cb){
            returnData["rewardList"] = [];
            returnData["reward"] = rewardData;
            async.eachSeries(returnData["reward"], function (reward, esCb) {
                modelUtil.addDropItemToDB(reward["id"], reward["count"], userUid, false, 1, function (err, res) {
                    if (err) {
                        esCb(err);
                        console.error(reward["id"], reward["count"], reward["isPatch"], reward["level"], err.stack);
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
    }],function(err,res){
        if(err){
            response.echo("practice.limitChoose.buy", jutil.errorInfo(err));
        } else{
            response.echo("practice.limitChoose.buy",returnData);
        }
    });
}
exports.start = start;