/**
 * 领取月卡奖励
 * User: joseppe
 * Date: 14-3-19
 * Time: 下午15:13
 */

//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var async = require("async");
var modelUtil = require("../model/modelUtil");
var monthCard = require("../model/monthCard");

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
    var monthCardTime = 0;
    var backItems;
    var times = 30;
    async.series([
        function(callback){//取得用户月卡对应配置信息
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    callback("noThisUser");
                } else if(res.monthCard == '' || res.monthCardTime <= jutil.now()){
                    //userData = res;
                    callback("Have no monthCard!");
                } else {
                    monthCardTime = res.monthCardTime;
                    monthCardConfig = mainConfig[res.monthCard];
                    callback(null);
                }
            });
        },
        function(callback){//取得用户月卡奖励领取情况
            userVariable.getVariableTime(userUid, 'monthCard', function(err, res){
                if (err || res == null) {
                    if (err) console.error("月卡奖励", userUid, err.stack);
                    callback('dbError');
                }else if(res['time'] > jutil.todayTime()) {
                    callback('Already received awards');
                } else {
                    times = res['value'];
                    callback(null);
                }
            });
        },
        function(callback){//发放奖励
            userVariable.setVariableTime(userUid, 'monthCard', times-1, jutil.todayTime()+86400, callback);
        },
        function(callback){
            monthCard.reward(userUid, monthCardConfig.back, function(err, res){
                backItems = res;
                times--;
                callback(err);
            });
        },
        function(callback){
            if(times > 0 && monthCardTime == jutil.todayTime()+86400){
                //调用一个方法，发放剩余所有奖励到邮箱
                monthCard.rewardToMail(userUid, times, monthCardConfig.back, callback);
            } else {
                callback(null);
            }
        }
    ],function(err,res){
        if(err){
            console.log('error:'+err);
            response.echo("monthCard.reward",jutil.errorInfo(err));
        }else{
            response.echo('monthCard.reward',backItems);
        }
    });
}

exports.start = start;