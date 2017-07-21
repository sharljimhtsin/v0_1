/**
 * 创建一个新的玩家
 * User: liyuluan
 * Date: 13-10-11
 * Time: 下午6:17
 */

var jutil = require("../utils/jutil");
var user = require("../model/user");
var hero = require("../model/hero");
var formation = require("../model/formation");
var async = require("async");
var userVariable = require("../model/userVariable");
var configManager = require("../config/configManager");
var pvptop = require("../model/pvptop");
var modelUtil = require("../model/modelUtil");
var stats = require("../model/stats");
var mongoStats = require("../model/mongoStats");

function start(postData, response, query) {
    if ( jutil.postCheck(postData,"userName","selectedHeroId") == false ) {
        response.echo("user.create",jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var userName = postData["userName"];
    var selectedHeroId = postData["selectedHeroId"];
    var configData = configManager.createConfig(userUid);
    var platformId = "";
    var pUserId = "";
    var newHeroData;
    var userData;

    userName = jutil.filterWord(userName);
    if (userName == false) {
        response.echo("user.create", jutil.errorInfo("userNameInvalid"));
        return;
    }

    async.series([
        function(callbackFn) {//判断是否可添加
            user.getUser(userUid,function(err,res) {
                if (err) {
                    callbackFn(new jutil.JError("userInvalid"));
                } else if (res != null) {
                    callbackFn(new jutil.JError("userExist"));
                } else {
                    callbackFn();
                }
            });
        },
        function(callbackFn) {//判断用户名是否可用
            user.userNameIsExist(userUid, userName, function (err, res) {
                if (res == 1) {
                    callbackFn(new jutil.JError("userNameInvalid"));
                } else {
                    callbackFn();
                }
            });
        },
        function(callbackFn) {
            user.getUserPlatformId(userUid, function (err, res) {
                if (err || res == null) {
                    callbackFn(new jutil.JError("userInvalid"));
                } else {
                    platformId = res["platformId"];
                    pUserId = res["pUserId"];
                    callbackFn();
                }
            });
        },
        function(callbackFn) { //添加用户
            user.create(userUid, userName, platformId, pUserId, function (err, res) {
                if (err) {
                    callbackFn(new jutil.JError("userInvalid"));
                } else {
                    callbackFn();
                }
            });
        },
        function (callbackFn) { //更新platform用户的状态
            user.getUser(userUid, function (err, res) {
                userData = res;
                callbackFn(err);
            })
        },
        // function (callbackFn) {
        //     userData.monthCardTime = jutil.todayTime() + 86400 * 30 * 12 * 10;//过期时间
        //     var userUpdate = {'monthCard': "fifty", 'monthCardTime': userData.monthCardTime};
        //     user.updateUser(userUid, userUpdate, function (err, res) {
        //         callbackFn(err);
        //     });
        // },
        function(callbackFn) { //添加主选hero
            var optionalHero = configData.getConfig("base")["optionalHero"];
            var selectedObj = optionalHero[selectedHeroId];
            if (selectedObj == null) {
                callbackFn(new jutil.JError("userInvalid"));
            } else {
                var heroId = selectedObj["heroId"];
                var exp = selectedObj["exp"];
                hero.addHero(userUid, heroId, exp, 1, function (err, res) {
                    if (err) {
                        callbackFn(new jutil.JError("userInvalid"));
                    } else {
                        newHeroData = res;
                        callbackFn();
                    }
                });
            }
        },
        function(callbackFn) {//加入编队
            var heroUid = newHeroData["heroUid"];
            formation.addHeroToFormation(userUid, 1, heroUid, function (err, res) {
                if (err) {
                    callbackFn(new jutil.JError("userInvalid"));
                } else {
                    callbackFn();
                }
            });
        },
        function(callbackFn) { //加入初始化物品
            var initList = configData.g("base")("initUser")("list")();
            if (initList == null) {
                callbackFn();
            } else {
                async.forEach(initList, function (listItem, forCb) {
                    var isPatch = 0;
                    if (listItem["isPatch"] != undefined) {
                        isPatch = listItem["isPatch"];
                    }
                    mongoStats.dropStats(listItem["id"], userUid, '127.0.0.1', null, mongoStats.USER_CREATE, listItem["count"]);
                    modelUtil.addDropItemToDB(listItem["id"], listItem["count"], userUid, isPatch, 1, function () {
                        forCb();
                    });
                }, function () {
                    callbackFn();
                });
            }
        },
        function(callbackFn) { //加入初始化激站积分
            var pvpRankPoint = configData.getConfig("base")["initUser"]["pvpRankPoint"];
            if (pvpRankPoint == undefined || pvpRankPoint == null || pvpRankPoint == 0) {
                callbackFn();
            } else {
                userVariable.setVariableTime(userUid, "redeemPoint", pvpRankPoint, jutil.now(), function (err, res) {
                    if (err) {
                        callbackFn(err);
                    } else {
                        callbackFn();
                    }
                });
            }
        },
        function(callbackFn) { //加入排行榜
            pvptop.addNewUser(userUid, 0, function () {
                callbackFn();
            });
        }
    ], function (err) {
        if (err) {
            response.echo("user.create", jutil.errorInfo(err.info));//创建失败
        } else {
            var userIP = response.response.socket.remoteAddress;
            response.echo("user.create", {"result": 1});
            stats.userCreate(userUid, userIP);
        }
    });
}

exports.start = start;
