/**
 * Created with JetBrains WebStorm.
 * 赛亚人图阵api--matrix.summon 召唤图阵模块（类似随机箱子）
 * User: za
 * Date: 16-4-8
 * Time: 下午19:51(预计三周)
 * To change this template use File | Settings | File Templates.
 */

var user = require("../model/user");
var jutil = require("../utils/jutil");
var async = require("async");
var mat = require("../model/matrix");
var modelUtil = require("../model/modelUtil");
var item = require("../model/item");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "type") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var type = postData["type"];
    var currentConfig;
    var returnData = {};
    var pay = 0;
    var list = {};
    var myIngot = 0;
    var summonList;
    var limit = 0;
    var rewardData = [];
    var summonFPay = 0;
    var limitB = 0;
    var summonPay = 0;
    var limitA = 0;
    var summonTimes = 0;
    async.series([function(cb){
            mat.getConfig(userUid,function(err,res){//取配置
                if(err)cb(err);
                else{
                    currentConfig = res[2];
                    summonPay = currentConfig["summonPay"]-0;
                    limitA = currentConfig["limitA"]-0;
                    summonFPay = currentConfig["summonFPay"]-0;
                    limitB = currentConfig["limitB"]-0;
                    summonList = currentConfig["summonList"];
                    cb(null);
                }
            });
        },function(cb){
            mat.getUserData(userUid,function(err,res){//取数据
                if(err)cb(err);
                else{
                    list = res["arg"];
                    summonTimes = list["summon"]["summonTimes"]-0;
                    //次数小于5
                    if(type == "0"){
                        if(summonTimes <=0){//次数不够 扣金币
                            pay = summonPay;
                            limit = currentConfig["limitA"];//奖励个数
                        }else{//扣次数
                            summonTimes--;
                            limit = currentConfig["limitA"];//奖励个数
                            pay = 0;
                        }
                        cb(null);
                    }else if(type == "1"){
                            pay = summonFPay;
                            limit = currentConfig["limitB"];//奖励个数
                        cb(null);
                    }else{
                        cb("typeError");
                    }
                }
            });
        },function(cb){
            user.getUser(userUid, function (err, res) {
                if (err)cb(err);
                else if (res == null || res["Ingot"] - 0 - pay < 0) {
                    cb("ingotNotEnough");
                } else {
                    myIngot = res["ingot"] - 0 - pay;
                    returnData["userIngot"] = myIngot;
                    user.updateUser(userUid,{"ingot":myIngot},cb);
                }
            });
        },function(cb){
            while(rewardData.length < limit){
                var randomRate = Math.random();
                var q = 0;
                for(var j in summonList){
                    q += summonList[j]["prob"] - 0;
                    if (randomRate <= q) {
                        rewardData.push({"id":summonList[j]["id"],"count":summonList[j]["count"]});
                        break;
                    }
                }
            }
            list["summon"]["reward"] = rewardData;
            cb(null);
        },function(cb){
            list["summon"]["summonTimes"] = summonTimes;
            returnData["userData"] = list["summon"];
            mat.setUserData(userUid,list,cb);
        },function(cb){
            returnData["rewardList"] = [];
            async.eachSeries(rewardData, function (reward, esCb) {
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
            response.echo("matrix.summon.extract", jutil.errorInfo(err));
        } else{
            response.echo("matrix.summon.extract",returnData);
        }
    });
}
exports.start = start;