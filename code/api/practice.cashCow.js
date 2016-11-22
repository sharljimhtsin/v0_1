/**
 * 摇钱树活动的接口
 * User: za
 * Date: 15-7-28
 * Time: 下午17:17
 */
var jutil = require("../utils/jutil");
var async = require("async");
var cashCow = require("../model/practiceCashCow");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var stats = require("../model/stats");
var item = require("../model/item");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "action") == false) {
        echo("postError");
        return false;
    }
    var userUid = query["userUid"];
    var action = postData["action"];
    var currentConfig;
    var sTime = 0;
    var rewardList = [];
    var reward = "";
    var returnData = {};//返回集合
    var userData = {};//用户数据
    var pay = 0;//玩家活动消耗的金币数
    var freeId = "153631";//免费道具的id（许愿种子）
    var freeCount = 0;//免费道具的个数
//    var result = 0;//计算结果
    var danjia = 0;//单个道具的价格
    switch (action){
        case "get":
        default:
            async.series([function(cb) {// 取配置
                    cashCow.getConfig(userUid, function(err, res){
                        if (err) cb(err);
                        else {
                            sTime = res[0]-0;
                            currentConfig = res[2];
                            returnData["config"] = currentConfig;
                            cb(null);
                        }
                    });
                }
            ],function(err,res){
                echo(err,returnData);
            });
            break;
        case "cashCow"://抽奖：1--活动开始后根据id判断是否免费 （1,10,50次连抽根据实际情况判断）
            if (jutil.postCheck(postData, "mCount") == false) {
                echo("postError");
                return false;
            }
            var mCount = postData["mCount"];//档位
            if (mCount == null || typeArr.indexOf(mCount) == -1) {//档位类型判断
                echo("typeInvalid");
                return;
            }
            async.series([function(cb) {// 获取活动配置数据
                    cashCow.getConfig(userUid, function(err, res){
                        if (err) cb(err);
                        else {
                            sTime = res[0];
                            currentConfig = res[2];
                            rewardList = currentConfig["rewardList"];
                            cb(null);
                        }
                    });
                },function(cb){//取用户数据(金币消耗总数)
                    cashCow.getUserData(userUid, sTime,function(err,res){
                        if (err||res == null) cb("dbError"+"1");
                        else {
                            userData = res;
                            if(mCount == 1){
                                pay = currentConfig["singlePay"] - 0;
                                stats.events(userUid,"127.0.0.1",null,mongoStats.P_CASHCOW1);
                            }else if(mCount == 10){
                                pay = currentConfig["tenPay"] - 0;
                                stats.events(userUid,"127.0.0.1",null,mongoStats.P_CASHCOW2);//(userUid, userIP, userInfo, id)
                            }else if(mCount == 50){
                                pay = currentConfig["fiftyPay"] - 0;
                                stats.events(userUid,"127.0.0.1",null,mongoStats.P_CASHCOW3);
                            }else{
                                cb("typeInvalid"+"2");
                            }
                            userData["arg"]["type"] = mCount;
                            danjia = (pay / mCount)-0;
                            cb(null);
                        }
                    });
                },function(cb){//获取免费道具个数
                    item.getItem(userUid,freeId,function(err,res){
                        if (err) cb("dbError"+"9");
                        else{
                            if(res != null && res["number"] >0){
                                freeCount = res["number"]-0;
                                cb(null);
                            }else{
                                freeCount = 0;
                                cb(null);
                            }
                        }
                    });
                },
                function(cb) {//扣钱  &&  记录上一次的免费时间
                    user.getUser(userUid,function(err,res){
                        if (err || res == null){
                            cb("dbError"+"2");
                        }else if(freeCount <= 0){//道具没有的情况(优先)
                            if(res["ingot"] - pay < 0){//金币不够
                                cb("ingotNotEnough");
                            }else{//够了
                                returnData["userData"] = {"ingot":res["ingot"] - pay};
                                mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.P_CASHCOW4,pay);
                                // user.updateUser(userUid,returnData["userData"],cb);
                                modelUtil.addDropItemToDB("ingot",-pay,userUid,false,1,cb);
                            }
                        }else{//有道具情况
                            if(res["ingot"] - (pay - freeCount * danjia)  < 0){//没金币
                                cb("ingotNotEnough");
                            }else{//有金币
                                var pay1 = pay - (freeCount * danjia);
                                pay1 = pay1 <= 0 ? 0 : pay1;
                                returnData["userData"] = {"ingot":res["ingot"] - pay1};
                                var paycount = freeCount >= mCount ? mCount : freeCount;
                                async.series([function(cb){
                                    mongoStats.expendStats(freeId, userUid, "127.0.0.1", null, mongoStats.P_CASHCOW6,freeCount);//统计
                                    if(pay1!=0){
                                        mongoStats.expendStats("ingot", userUid, "127.0.0.1", null, mongoStats.P_CASHCOW4,pay1);//统计
                                    }
//                                    item.updateItem(userUid,freeId,-freeCount,cb);
                                    modelUtil.addDropItemToDB(freeId,-paycount,userUid,false,1,cb);
                                },function(cb){
                                    user.updateUser(userUid,returnData["userData"],cb);
                                }],function(err,res){
                                    cb(null);
                                });
                            }
                        }
                    });
                },function(cb){//设置数据
                        var list = [];
                        while(list.length < mCount){//需求：1,10,100
                            var randomRate = Math.random();
                            var p = 0;
                            for(var i in currentConfig["rewardList"]){
                                p += currentConfig["rewardList"][i]["prob"] - 0;
                                if (randomRate <= p) {
                                    list.push({"id":currentConfig["rewardList"][i]["id"],"count":currentConfig["rewardList"][i]["count"]});
                                    break;
                                }
                            }
                        }
                        returnData["reward"] = list;
                        userData["arg"]["rewardList"] = returnData["reward"];
                        cashCow.setUserData(userUid, userData, cb);
                    },function (cb) {//进背包
                        returnData["rewardList"] = [];
                        async.eachSeries(returnData["reward"], function (reward, esCb) {
                            mongoStats.dropStats(reward["id"], userUid, "127.0.0.1", null, mongoStats.P_CASHCOW5, reward["count"]);
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
                },function(cb){//获取免费道具个数
                    item.getItem(userUid,freeId,function(err,res){
                        if (err) cb("dbError"+"9");
                        else{
                            if(res != null && res["number"] >0){
                                freeCount = res["number"]-0;
                                returnData["freeCount"] = freeCount;
                                cb(null);
                            }else{
                                freeCount = 0;
                                returnData["freeCount"] = freeCount;
                                cb(null);
                            }
                        }
                    });
                }], function (err, res) {
            echo(err, returnData);//金币，次数，奖励集合
        });
        break;
    }
    function echo(err, res){
        if(err){
            response.echo("practice.cashCow", jutil.errorInfo(err));
        } else{
            response.echo("practice.cashCow", res);
        }
    }
}
var typeArr = [1, 10, 50];
exports.start = start;