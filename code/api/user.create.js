/**
 * 创建一个新的玩家
 * User: liyuluan
 * Date: 13-10-11
 * Time: 下午6:17
 */

var jutil = require("../utils/jutil");
//var platform = require("../model/platform");
var user = require("../model/user");
var hero = require("../model/hero");
var formation = require("../model/formation");
var async = require("async");
//var configData = require("../model/configData");
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

    userName = jutil.filterWord(userName);
    if (userName == false) {
        response.echo("user.create", jutil.errorInfo("userNameInvalid"));
        return;
    }


    async.series([
        function(callbackFn) {//判断是否可添加
            user.getUser(userUid,function(err,res) {
                if (err) {
                    console.error("user.create user.getUser", err.stack);
                    callbackFn(new jutil.JError("userInvalid"),null);
                } else if (res != null) {
                    //console.log("user.create user.getUser222", res);
                    callbackFn(new jutil.JError("userInvalid"),null);
                } else {
                    callbackFn(null,null);
                }
            });
        },
        function(callbackFn) {//判断用户名是否可用
            user.userNameIsExist(userUid, userName,function(err,res) {
                if (res == 1) {
                    callbackFn(new jutil.JError("userNameInvalid"),null);
                } else {
                    callbackFn(null,null);
                }
            });
        },
        function(callbackFn) {
            user.getUserPlatformId(userUid, function(err, res) {
                if (err || res == null) {
                    console.error("user.create user.getUserPlatformId", err.stack);
                    callbackFn(new jutil.JError("userInvalid"),null);
                }
                else {
                    platformId = res["platformId"];
                    pUserId = res["pUserId"];
                    callbackFn(null);
                }
            });
        },
        function(callbackFn) { //添加用户
            user.create(userUid,userName,platformId, pUserId, function(err,res) {
                if (err) {
                    console.error("user.create user.create", err.stack);
                    callbackFn(new jutil.JError("userInvalid"),null);
                } else {
                    callbackFn(null,null);
                }
            });
        },
//        function(callbackFn) { //更新platform用户的状态
//            platform.updateUserStatus(userUid,1,function(err,res) {
//                if (err) {
//                    callbackFn(new jutil.JError("userInvalid"),null);
//                } else {
//                    callbackFn(null,null);
//                }
//            });
//        },
        function(callbackFn) { //添加主选hero
            var optionalHero = configData.getConfig("base")["optionalHero"];
            var selectedObj = optionalHero[selectedHeroId];
            if (selectedObj == null) {
                console.error("配置错误");
                callbackFn(new jutil.JError("userInvalid"),null);
            } else {
                var heroId = selectedObj["heroId"];
                var exp = selectedObj["exp"];
                hero.addHero(userUid,heroId,exp,1,function(err,res) {
                    if (err) {
                        console.error("user.create hero.addHero ", err.stack);
                        callbackFn(new jutil.JError("userInvalid"),null);
                    } else {
                        newHeroData = res;
                        callbackFn(null,null);
                    }
                });
            }
        },
        function(callbackFn) {//加入编队
            var heroUid = newHeroData["heroUid"];
            formation.addHeroToFormation(userUid,1,heroUid,function(err,res) {
                if (err) {
                    console.error("user.create formation.addHeroToFormation", err.stack);
                    callbackFn(new jutil.JError("userInvalid"),null);
                } else {
                    callbackFn(null,null);
                }
            });
        },
        function(callbackFn) { //加入初始化物品
            var initList = configData.g("base")("initUser")("list")();
            if (initList == null) {
                callbackFn(null);
            } else {
                async.forEach(initList, function(listItem,forCb) {
                    var isPatch = 0;
                    if(listItem["isPatch"]!=undefined) isPatch=listItem["isPatch"];

                    mongoStats.dropStats(listItem["id"], userUid, '127.0.0.1', null, mongoStats.USER_CREATE, listItem["count"]);
                    modelUtil.addDropItemToDB(listItem["id"], listItem["count"], userUid, isPatch, 1, function(err, res) {
                        forCb(null);
                    });
                }, function(err) {
                    callbackFn();
                });
            }
        },
        function(callbackFn) { //加入初始化激站积分
            var pvpRankPoint = configData.getConfig("base")["initUser"]["pvpRankPoint"];
            if(pvpRankPoint==undefined || pvpRankPoint == null || pvpRankPoint == 0){
                callbackFn(null);
            } else {
                userVariable.setVariableTime(userUid, "redeemPoint", pvpRankPoint, jutil.now(), function (err, res) {
                    if (err) {
                        callbackFn(err,null);
                    } else {
                        callbackFn(null);
                    }
                });
            }
        },
        function(callbackFn) { //加入排行榜
            pvptop.addNewUser(userUid,0,function(err,res) {
                callbackFn(null);
            });
        }

    ],function(err,value) {
        console.log(err,value);
//        response.echo("user.create",jutil.errorInfo("userInvalid"));//创建失败
        if (err) {
//            console.error("user.create", err.stack);
            response.echo("user.create",jutil.errorInfo(err.info));//创建失败
        } else {



            var userIP = response.response.socket.remoteAddress;
//            console.log({"result":1});
            response.echo("user.create",{"result":1});

            stats.userCreate(userUid, userIP, null);
        }
    });
}

exports.start = start;
