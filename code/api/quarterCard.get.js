/**
 * 获取用户季卡数据
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

function start(postData, response, query) {
    var userUid = query["userUid"];
    var quarterCardConfig = {};
    var returnData = {};
    var nowVip = 0;
    async.series([function(cb){//取得用户基本信息
            user.getUser(userUid,function(err,res){
                if(err || res == null){
                    cb("noThisUser");
                }else{
                    nowVip = res["vip"];
                    cb(null);
                }
            });
        },function(cb){//记录充值数
            userVariable.getVariableTime(userUid,"quarterCardD",function(err,res){
                if(res != null && res["value"] != undefined && res["time"] == jutil.day()){
                    returnData["quarterCardD"] = res["value"];
                    cb(null);
                } else {
                    returnData["quarterCardD"] = 0;
                    cb(null);
                }
            });
        },function(cb){
            userVariable.getVariableTime(userUid, 'quarterCardTAB', function(err, res){
                if(err)cb(err);
                else if(res != null && res['value'] == "ninety"){
                    returnData["quarterCardStatus"] = 1;
                    returnData["quarterCardBuyTime"] = res["time"];
                    cb(null);
                } else {
                    returnData["quarterCardStatus"] = 0;
                    returnData["quarterCardBuyTime"] = 0;
                    cb(null);
                }
            });
        },
        function(cb){
            userVariable.getVariableTime(userUid, 'quarterCard', function(err, res){
                if (err)cb(err);
                else if(res != null) {
                    if(res['time'] > jutil.todayTime()) {
                        returnData["quarterCardTodayStatus"] = 1;
                        cb(null);
                    } else {
                        returnData["quarterCardTodayStatus"] = 0;
                        cb(null);
                    }
                }else {
                    returnData["quarterCardTodayStatus"] = 0;
                    cb(null);
                }
            });
        },
        function(cb){
            userVariable.getVariableTime(userUid, 'quarterCardForVip', function(err, res){
                if(err)cb(err);
                else if (res != null && res["value"] != undefined) {
                    returnData["beforeVip"] = res["value"];
                    cb(null);
                }else{
                    returnData["beforeVip"] = nowVip;
                    cb(null);
                }
            });
        },
        function(cb){
            userVariable.getVariableTime(userUid, 'quarterCardForVipS', function(err, res){
                if(err)cb(err);
                else if (res != null && res["value"] != undefined) {
                    if(res["value"] == -1){
                        returnData["vipRewardStatus"] = 1;
                        cb(null);
                    }else{
                        returnData["vipRewardStatus"] = 0;
                        cb(null);
                    }

                }else{
                    returnData["vipRewardStatus"] = 0;
                    cb(null);
                }
            });
        },
        function(cb){
            quarterCard.getConfig(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    if(res[2] == undefined){
                        returnData["quarterCardConfig"] = quarterCardConfig;
                    }else{
                        returnData["quarterCardConfig"] = res[2];
                    }
                    cb(null);
                }
            });
        }
    ],function(err,res){
        if(err){
            console.log('error:'+err);
            response.echo("quarterCard.get",jutil.errorInfo(err));
        }else{
            response.echo('quarterCard.get',returnData);
        }
    });
}

exports.start = start;