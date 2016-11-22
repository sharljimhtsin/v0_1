/**
 * 购买月卡
 * User: joseppe
 * Date: 14-3-19
 * Time: 上午10:49
 */

//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var async = require("async");
var monthCard = require("../model/monthCard");
var achievement = require("../model/achievement");
var stats = require("../model/stats");

/**
 * practice.eatbean
 * @param postData
 * @param response
 * @param query
 */

function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);
    var mainConfig = configData.getConfig("monthCard");
    var monthCardConfig = {};
    var userData = {};
    var userUpdata = {};
    var mcType = postData["monthCard"]; // 月卡类型,fifty高级
    var userMaxOnePay;
    async.series([
        function(callback){//取得用户基本信息
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    callback("noThisUser");
                }else{
                    userData = res;
                    callback(null);
                }
            });
        },
        function(callback){//判断是否已经拥有月卡
            //postData['monthCard']，用户要购买的月卡种类
            monthCardConfig = mainConfig[postData['monthCard']];
            if(typeof monthCardConfig == 'undefined'){
                callback('config error');
            } else if(userData.monthCard != '' && userData.monthCardTime > jutil.todayTime()){//已经拥有月卡
                callback('alreadyHaveMonthCard');
            } else if(userData.ingot < monthCardConfig.ingot){//ingot不足购买当前种类月卡
                callback('ingotNotEnough');
            } else if(userData.cumulativePay < monthCardConfig.payAll){
                callback('cumulativePayNotEnough');
            } else {
                callback(null);
            }
        },
        function(callback){//判断上次未领取奖励
            userVariable.getVariableTime(userUid, 'monthCard', function(err, res){
                if(res == null || res['value'] <= 0){
                    callback(null);
                } else {
                    monthCard.rewardToMail(userUid, res['value'], monthCardConfig.back, function(err, res){
                        callback(err);
                    });
                }
            });
        },
        function(callback){//允许购买
            userData.ingot = userData.ingot-monthCardConfig.ingot;
            //扣除ingot
            //重置用户累计充值数
            //修改用户月卡类型
            userData.monthCardTime = jutil.todayTime() + 86400*30;//过期时间
            userUpdata = {'ingot':userData.ingot,'cumulativePay':0,'monthCard':postData['monthCard'],'monthCardTime':userData.monthCardTime};
            user.updateUser(userUid,userUpdata,function(err,res) {
                if (err)
                    callback("dbError");
                else {
                    //統計累消
                    var userIP = '127.0.0.1';//response.response.socket.remoteAddress;
                    mongoStats.expendStats("ingot", userUid, userIP, userData, mongoStats.E_MONTHCARD, monthCardConfig.ingot);
                    callback(null);
                }
            });
        },
        function (callback) {
            userVariable.getVariableTime(userUid, "quarterCardD", function (err, res) {
                if (res != null && res["time"] == jutil.day()) {
                    userMaxOnePay = parseInt(res["value"]) - monthCardConfig.payAll;
                } else {
                    userMaxOnePay = 0;
                }
                callback(err);
            });
        },
        function (callback) {
            userVariable.setVariableTime(userUid, 'quarterCardD', userMaxOnePay, jutil.day(), callback);
        },
        function(callback){
            //重置领取奖励数据
            userVariable.setVariableTime(userUid, 'monthCard', 30, jutil.todayTime(),function(err, res){
                callback(err,res);
            });
        }
    ],function(err,res){
        if(err){
            console.log('error:'+err);
            response.echo("monthCard.buy",jutil.errorInfo(err));
        }else{
            if (mcType == "fifty") {
                stats.events(userUid, "127.0.0.1", null, mongoStats.monthCardBuy2);
            } else {
                stats.events(userUid, "127.0.0.1", null, mongoStats.monthCardBuy1);
            }
            if (mcType == "fifty") { // 高级月卡
                achievement.moonCardBuy(userUid, function(){});
            }

            response.echo('monthCard.buy',userUpdata);
        }
    });
}

exports.start = start;