/**
 * 修行（奇遇）吃豆 (吃鸡）
 * User: liyuluan
 * Date: 13-11-14
 * Time: 上午11:46
 */

//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var jutil = require("../utils/jutil");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var async = require("async");
var activityConfig = require("../model/activityConfig");
var vitality = require("../model/vitality");
/**
 * practice.eatbean
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);

    var mainConfig = configData.getConfig("growth");
    var beanRewardConfig = mainConfig["eatBean"]; // power mana

    var nowTime = jutil.now();
    var nowDate = new Date(nowTime * 1000);
    var nowHours = nowDate.getHours();
    if (nowHours != 12 && nowHours != 18) {
        response.echo("practice.eatbean",jutil.errorInfo("timeNotMatch"));
        return;
    }

    var gUpdateData = null;
    var multiple = 1;
    var addMax = 0;

    async.series([
        function(cb) { //判断是否允许吃豆
            userVariable.getVariableTime(userUid,"eatbean" + nowHours,function(err,res) {
                if (err) response.echo("practice.eatbean",jutil.errorInfo("dbError"));
                else {
                    if (res == null) cb(null);
                    else {
                        var preTime = res["time"] - 0;
                        var preData = new Date(preTime * 1000);
                        if (jutil.compTimeDay(nowTime,preTime) == true && nowHours == preData.getHours() ) {
                            cb("haveEaten");
                        } else {
                            cb(null);
                        }
                    }
                }
            });
        },
        function(cb) { //取吃豆的倍数
            activityConfig.getConfig(userUid, "eatBean", function(err, res) {
                var eatbeanConfig = res;
                if (eatbeanConfig[0] == true) {
                    multiple = 2;
                }
                cb(null);
            });
        },
        function(cb) { //计算吃豆值
            user.getUser(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    var userData = res;
                    var pvePower = userData["pvePower"] - 0;
                    var lastRecoverPvePower = userData["lastRecoverPvePower"] - 0;
                    var pvpPower = userData["pvpPower"] - 0;
                    var lastRecoverPvpPower = userData["lastRecoverPvpPower"] - 0;
                    if(userData["monthCard"] == "fifty"){
                        addMax = 18;
                    }else{
                        addMax = 0;
                    }
                    var newPvePowerData = configData.getPvePower(pvePower,lastRecoverPvePower,nowTime);
                    var newPvpPowerData = configData.getPvpPower(pvpPower,lastRecoverPvpPower,nowTime,addMax);
                    var addPvePower = beanRewardConfig["powerAddBase"];
                    var addPvpPower = beanRewardConfig["manaAddBase"];
                    var updateData = {};
                    updateData["pvePower"] = newPvePowerData[0] + addPvePower * multiple;
                    updateData["lastRecoverPvePower"] = newPvePowerData[1];
                    updateData["pvpPower"] = newPvpPowerData[0] + addPvpPower * multiple;
                    updateData["lastRecoverPvpPower"] = newPvpPowerData[1];
                    gUpdateData = updateData;
                    cb(null);
                }
            });
        },
        function(cb) { //写入新的体力
            user.updateUser(userUid,gUpdateData,function(err,res) {
                if (err) cb("dbError");
                else {
                    cb(null);
                }
            });
        },
        function(cb) { //更新已吃过
            userVariable.setVariableTime(userUid,"eatbean" + nowHours,0,nowTime,function(err,res) {
                cb(null);
            });
        }
    ],function(err) {
        if (err) response.echo("practice.eatbean",jutil.errorInfo(err));
        else {
            vitality.vitality(userUid, "eatBean", {"completeCnt":1}, function(){});
            response.echo("practice.eatbean",{"userData":gUpdateData});
        }
    });
}

exports.start = start;