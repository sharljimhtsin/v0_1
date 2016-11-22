/**
 * 领取季卡奖励
 * User: za 改自joseppe月卡
 * Date: 16-6-22
 * Time: 下午14:45
 */
var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var async = require("async");
var quarterCard = require("../model/quarterCard");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var backItems;
    var sTime;
    var reward = [];
    var currentConfig;
    var userVip = 0;
    async.series([function(callback){//取得用户月卡奖励领取情况
            userVariable.getVariableTime(userUid, 'quarterCardForVipS', function(err, res){
                if (err)callback(err);
                else{
                    if(res != null) {
                        if(res['value'] == -1){
                            callback('Already received awards');
                        }else{
                            callback(null);
                        }
                    } else {
                        callback(null);
                    }
                }
            });
        },
        function(callback){//取得用户月卡奖励领取情况
            userVariable.getVariableTime(userUid, 'quarterCardForVip', function(err, res){
                if (err || res == null) {
                    if (err) console.error("季卡vip奖励", userUid, err.stack);
                    callback('dbError');
                } else {
                    userVip = res["value"]-0;
                    callback(null);
                }
            });
        },
        function(cb){
            quarterCard.getConfig(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    sTime = res[0];
                    currentConfig = res[2];
                    if(currentConfig == null || currentConfig["vipReward"] == undefined || currentConfig["vipReward"][userVip] == undefined){
                        cb("configError");
                    }else{
                        reward = currentConfig["vipReward"][userVip];
                        cb(null);
                    }
                }
            });
        },
        function (callback) {
            quarterCard.reward(userUid, reward, function (err, res) {
                backItems = res;
                callback(err);
            }, true);
        }
    ],function(err,res){
        if(err){
            console.log('error:'+err);
            response.echo("quarterCard.vipReward",jutil.errorInfo(err));
        }else{
            response.echo('quarterCard.vipReward',backItems);
        }
    });
}

exports.start = start;