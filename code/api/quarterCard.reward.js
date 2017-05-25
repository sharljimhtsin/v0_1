/**
 * 领取季卡奖励
 * User: za 改自joseppe月卡
 * Date: 16-6-22
 * Time: 下午14:45
 */
var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var async = require("async");
var modelUtil = require("../model/modelUtil");
var quarterCard = require("../model/quarterCard");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var quarterCardTime = 0;
    var backItems;
    var times = 90;
    var sTime;
    var quarterData = {};
    var reward = [];
    var userData = {};
    var currentConfig;
    var quarterCardTAB;
    async.series([function(callback){
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    callback("noThisUser");
                } else {
                    userData = res;
                    callback(null);
                }
            });
        },
        function(cb){
            userVariable.getVariableTime(userUid, 'quarterCardTAB', function(err, res){
                quarterCardTAB = res;
                cb(null);
            });
        },
        function(cb){
            quarterCard.getConfig(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    sTime = res[0];
                    currentConfig = res[2];
                    if(currentConfig == null || currentConfig["buy"]["back"] == undefined){
                        cb("configError");
                    }else{
                        reward = currentConfig["buy"]["back"];
                        cb(null);
                    }
                }
            });
        },
        function(callback){
            quarterCard.getUserData(userUid,sTime,function(err,res){
                if (err) callback(err);
                else {
                    quarterData = res;
                    if(quarterCardTAB == null || quarterCardTAB["value"] == undefined ||quarterCardTAB["time"] <= jutil.now()){
                        callback("Have no quarterCard!");
                    } else {
                        quarterCardTime = quarterData["data"];
                        callback(null);
                    }
                }
            });
        },
        function(cb){
            userVariable.getVariableTime(userUid, 'quarterCard', function(err, res){
                if (err || res == null) {
                    if (err) console.error("季卡奖励", userUid, err.stack);
                    cb('dbError');
                }else if(res['time'] > jutil.todayTime()) {
                    cb('Already received awards');
                } else {
                    times = res['value'];
                    if(times - 1 == 0){
                        userData["cumulativePay"] = 0;
                        user.updateUser(userUid,{'cumulativePay':userData["cumulativePay"]},cb);
                    }else{
                        cb(null);
                    }
                }
            });
        },
        function(cb){
            userVariable.setVariableTime(userUid, 'quarterCard', times-1, jutil.todayTime()+86400, cb);
        },
        function(callback){
            quarterCard.reward(userUid, reward, function(err, res){
                backItems = res;
                times--;
                callback(err);
            });
        },
        function(callback){
            if(times > 0 && quarterCardTime == jutil.todayTime()+86400){
                //调用一个方法，发放剩余所有奖励到邮箱
                quarterCard.rewardToMail(userUid, times, reward, 0, callback);
            } else {
                callback(null);
            }
        }
    ],function(err,res){
        if(err){
            console.log('error:'+err);
            response.echo("quarterCard.reward",jutil.errorInfo(err));
        }else{
            response.echo('quarterCard.reward',backItems);
        }
    });
}

exports.start = start;