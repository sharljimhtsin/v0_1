/**
 * 购买季卡
 * User: za 改自joseppe月卡
 * Date: 16-6-22
 * Time: 下午14:45
 */
var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var async = require("async");
var quarterCard = require("../model/quarterCard");
var achievement = require("../model/achievement");
var stats = require("../model/stats");
var monthCard = require("../model/monthCard");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var quarterCardConfig = {};
    var userData = {};
    var returnData = {};
    var sTime;
    var quarterData = {};
    var userCumulativePay = 0;
    async.series([function(cb){//取得用户基本信息
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    cb("noThisUser");
                }else{
                    userData = res;
                    cb(null);
                }
            });
        },
        function(cb){//取得用户季卡奖励领取情况
            userVariable.getVariableTime(userUid, 'quarterCardForVip', function(err, res){
                if(err)cb(err);
                else{
                    if(res != null && res["value"] != undefined){
                        returnData["beforeVip"] = res["value"];
                        cb(null);
                    }else{
                        returnData["beforeVip"] = userData["vip"];
                        cb(null);
                    }
                }
            });
        },
        function(cb){
            userVariable.getVariableTime(userUid,"quarterCardD",function(err,res){
                if(res != null && res["time"] == jutil.day()){
                    userCumulativePay = parseInt(res["value"]);
                    cb(null);
                } else {
                    cb("needMoreRecharge");
                }
            });
        },
        function(cb){
            userVariable.getVariableTime(userUid, 'quarterCardTAB', function(err, res){
                if(res != null && res['value'] == "ninety" &&  res['time'] > jutil.todayTime()){
                    cb("alreadyHaveQuarterCard");
                } else {
                    cb(null);//可以买
                }
            });
        },
        function(cb){
            quarterCard.getConfig(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    sTime = res[0];
                    quarterCardConfig = res[2]["buy"];
                    cb(null);
                }
            });
        },
        function(cb){
            quarterCard.getUserData(userUid,sTime,function(err,res){
                if (err) cb(err);
                else {
                    quarterData = res;
                    cb(null);
                }
            });
        },
        function(cb){//判断是否已经拥有月卡
            if(userData["ingot"] < quarterCardConfig["ingot"]){//ingot不足购买当前种类月卡
                cb('ingotNotEnough');
            } else if(userCumulativePay < quarterCardConfig["payAll"]){
                cb('needMoreRecharge');
            } else {
                userCumulativePay = userData["cumulativePay"] - quarterCardConfig["payAll"];
                cb();
            }
        },
        function(cb){//判断上次未领取奖励
            userVariable.getVariableTime(userUid, 'quarterCard', function(err, res){
                if(res == null || res['value'] <= 0){
                    cb(null);
                } else {
                    quarterCard.rewardToMail(userUid, res['value'], quarterCardConfig["back"],0,cb);
                }
            });
        },
        function(cb){//允许购买
            //1.扣除ingot 2.重置用户累计充值数 3.修改用户季卡类型
            userData["ingot"] = userData["ingot"] - quarterCardConfig["ingot"];
            quarterData["data"] = jutil.todayTime() + 86400 * 30 * 3;//过期时间
            monthCard.isWork(userUid, function (err, res, obj) {
                if (res) {
                    returnData["userData"] = {'ingot': userData["ingot"], 'cumulativePay': userCumulativePay};
                } else {
                    returnData["userData"] = {'ingot': userData["ingot"]};
                }
                user.updateUser(userUid, returnData["userData"], function (err, res) {
                    if (err)
                        cb("dbError");
                    else {//統計累消
                        mongoStats.expendStats("ingot", userUid, '127.0.0.1', userData, mongoStats.E_QUARTERCARD, quarterCardConfig["ingot"]);
                        cb(null);
                    }
                });
            });
        },
        function (cb) {//重置领取奖励数据
            returnData["buyTime"] = quarterData["data"];
            userVariable.setVariableTime(userUid, 'quarterCardTAB', "ninety", quarterData["data"], cb);
        },
        function (cb) {//重置领取奖励数据
            userVariable.setVariableTime(userUid, 'quarterCardForVip', userData["vip"], jutil.todayTime(), cb);
        },
        function (cb) {
            quarterCard.setUserData(userUid, quarterData, cb);
        },
        function (cb) {//重置领取奖励数据
            userVariable.setVariableTime(userUid, 'quarterCard', 90, jutil.todayTime(), cb);
        },
        function (cb) {
            userVariable.delVariable(userUid, "quarterCardForVipS", cb);
        }
    ],function(err,res){
        if(err){
            console.log('error:'+err);
            response.echo("quarterCard.buy",jutil.errorInfo(err));
        }else{
            stats.events(userUid, "127.0.0.1", null, mongoStats.quarterCardBuy);
            achievement.quarterCardBuy(userUid, function(){});
            response.echo('quarterCard.buy',returnData);
        }
    });
}

exports.start = start;