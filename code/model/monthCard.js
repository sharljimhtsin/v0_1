/**
 * 月卡奖励发放
 * User: joseppe
 * Date: 14-03-20
 * Time: 下午17:31
 */
var mysql = require("../alien/db/mysql");
var redis = require("../alien/db/redis");
var async = require("async");
var modelUtil = require("../model/modelUtil");
var mail = require("../model/mail");
var userVariable = require("../model/userVariable");
var user = require("../model/user");
var mongoStats = require("../model/mongoStats");
var jutil = require("../utils/jutil");

function isWork(userUid, callbackFn) {
    user.getUser(userUid, function (err, res) {
        if (err) {
            console.log("更新玩家充值记录 failed!");
            callbackFn(err, false);
        } else {
            var hasMonthCard = res["monthCard"] != "";
            var monthCardTime = res["monthCardTime"];
            var now = jutil.now();
            var monthCardExpired = now > monthCardTime;
            callbackFn(null, !hasMonthCard || monthCardExpired, res);
        }
    });
}

/**
 * 发放奖励
 * @param userUid
 * @param callbackFn
 */
function reward(userUid,reward,callbackFn) {
    var backItems = {'user':{}, 'items':{}};
    async.series([
        function(callback){
            mongoStats.dropStats("ingot", userUid, '127.0.0.1', null, mongoStats.MONTH_CARD, reward['ingot']);
            modelUtil.addDropItemToDB('ingot', reward['ingot'], userUid, 0, 1, function(err,res){
                if (err) callback("dbError");
                else {
                    backItems['user'] = res;
                    callback(null);
                }
            });
        },
        function(callback){
            mongoStats.dropStats("151001", userUid, '127.0.0.1', null, mongoStats.MONTH_CARD, reward['151001']);
            modelUtil.addDropItemToDB('151001', reward['151001'], userUid, 0, 1, function(err,res){
                if (err) callback("dbError");
                else {
                    backItems['items'] = res;
                    callback(null);
                }
            });
        }
        ],function(err){
            callbackFn(err,backItems);
    });
}

/**
 * 发放奖励到邮箱
 * @param userUid
 * @param mapId
 * @param callbackFn
 */
function rewardToMail(userUid, times, reward, callbackFn, language) {
    if(times > 0){
        var configManager = require("../config/configManager");
        var jutil = require("../utils/jutil");
        var configData = configManager.createConfig(userUid);
        var mailConfig;
        var mailConfigDefault = configData.getConfig("mail");
        var mailConfigLocal = configData.getConfig("mail" + "_" + language);
        if (mailConfigLocal) {
            mailConfig = mailConfigLocal;
        } else {
            mailConfig = mailConfigDefault;
        }
        var items = {'ingot':reward['ingot']*times,'151001':reward['151001']*times};
        var message = jutil.formatString(mailConfig["monthCardReward"],[items['ingot'],items['151001']]);
        var mailReward = [{'id':'ingot','count':items['ingot']},{'id':'151001','count':items['151001']}];
        var mailRewardId = mail.getRewardId(times);
        mongoStats.dropStats("ingot", userUid, '127.0.0.1', null, mongoStats.MONTH_CARD, items['ingot']);
        mongoStats.dropStats("151001", userUid, '127.0.0.1', null, mongoStats.MONTH_CARD, items['151001']);
        mail.addMail(userUid, -1, message, JSON.stringify(mailReward), mailRewardId, function(err, res) {
            if(err){
                callbackFn(err, res);
            } else {
                times = 0;
                userVariable.setVariableTime(userUid, 'monthCard', times, jutil.todayTime()+86400, function(err, res){
                    callbackFn(err,res);
                });
            }
        });
    }
}

/**
 * 用户登录时检测月卡状态
 * @param userUid
 * @param mapId
 * @param callbackFn
 */
function login(userUid) {
    var monthCardConfig;
    var times = 0;
    var language = "";
    async.series([
        function(callback){
            var user = require("../model/user");
            user.getUser(userUid,function(err,res){
                var jutil = require("../utils/jutil");
                if(res.monthCard && res.monthCard != '' && res.monthCardTime <= jutil.now()){
                    var configManager = require("../config/configManager");
                    var configData = configManager.createConfig(userUid);
                    var mainConfig = configData.getConfig("monthCard");
                    monthCardConfig = mainConfig[res.monthCard];
                    callback(null);
                } else {
                    callback("postError");
                }
            });
        },
        function(callback){
            userVariable.getVariableTime(userUid, 'monthCard', function(err, res){
                if(res == null || res['value'] <= 0) {
                    callback('postError');
                } else {
                    times = res['value'];
                    callback(null);
                }
            });
        },
        function (callback) {
            userVariable.getLanguage(userUid, function (err, res) {
                language = res;
                callback(err);
            });
        },
        function (callback) {
            rewardToMail(userUid, times, monthCardConfig.back, function (err, res) {
                callback(err, res);
            }, language);
        }
    ],function(err){
    });
}

exports.reward = reward;
exports.rewardToMail = rewardToMail;
exports.login = login;
exports.isWork = isWork;