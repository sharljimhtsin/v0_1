/**
 * 取用户数据
 * User: liyuluan
 * Date: 13-10-11
 * Time: 下午6:17
 */

var user = require("../model/user");
var hero = require("../model/hero");
var formation = require("../model/formation");
var specialTeam = require("../model/specialTeam");
var async = require("async");
var jutil = require("../utils/jutil");
var stats = require("../model/stats");
var timeLimitMallApi = require("./practice.timeLimitMall");
var title = require("../model/titleModel");
var configManager = require("../config/configManager");
var redRibbon = require("../model/redRibbon");
var financial = require("../model/financialPlan");
var achievement = require("../model/achievement");
var groupPurchase = require("../model/groupPurchase");
var practice = require("../model/practice");
var gsTabletsUser = require("../model/gsTabletsUser");
var gravity = require("../model/gravity");
var leagueDragon = require("../model/leagueDragon");
var redis = require("../alien/db/redis");
var globalContest = require("../model/globalContestData");
var mixContest = require("../model/mixContestData");
var bahamutWish = require("../model/bahamutWish");
var upStar = require("../model/upStar");
var intB = require("../model/integralBattle");
var nobleGet = require("../api/noble.get");
var yearCard = require("../model/yearCard");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);
    var udid = "TEST";
    if (postData != null) {
        udid = postData["udid"] || "TEST";
    }
    var kingnetSwitch = configData.getConfig("kingnetSwitch");
    var echoObj = {};
    async.series([function (cb) {
        user.getUser(userUid, function (err, res) {
            echoObj["userInfo"] = res;
            echoObj["userInfo"]["debris"] = {};
            cb(err);
        });
    }, function (cb) {
        yearCard.isWork(userUid, function (isOwn) {
            echoObj["yearCard"] = isOwn;//1 => 有 ,0 => 没有
            cb();
        });
    }, function (cb) {
        hero.getHero(userUid, function (err, res) {
            echoObj["hero"] = res;
            cb(err);
        });
    }, function (cb) {
        upStar.getStarData(userUid, function (err, res) {
            if (res && res.length > 0) {
                var uids = Object.keys(res);
                var heroList = echoObj["hero"];
                for (var i = 0; i < uids.length; i++) {
                    var uid = uids[i];
                    if (heroList.hasOwnProperty(uid)) {
                        var tmpObj = res[uid];
                        heroList[uid]["major"] = tmpObj["major"];
                        heroList[uid]["minor"] = tmpObj["minor"];
                    }
                }
                echoObj["hero"] = heroList;
            }
            cb(err);
        });
    }, function (cb) {
        formation.getUserFormation(userUid, function (err, res) {
            echoObj["formation"] = res;
            cb(err);
        });
    }, function (cb) {
        user.getInformation(userUid, function (err, res) {
            echoObj["information"] = res;
            cb(err);
        });
    }, function (cb) {
        specialTeam.get(userUid, function (err, res) {
            echoObj["specialTeam"] = res;
            cb(err);
        });
    }, function (cb) {
        nobleGet.getData(userUid, function (err, res) {
            echoObj["noble"] = {"list": res};
            cb(err);
        });
    }, function (cb) {
        var baseV = ["hpp", "attackp", "defencep", "spiritp"];
        gravity.getHeroList(userUid, function (err, res) {
            if (err)
                cb(err);
            else {
                for (var i in res) {
                    for (var j in baseV)
                        res[i][baseV[j]] /= 10000;
                }
                echoObj["gravity"] = res;
                cb(err, res);
            }
        });
    }, function (cb) {//龙珠的祝福
        var debrisArr = ["153632", "153633", "153634", "153635", "153636", "153637", "153638"];
        var eatArr = ["153639", "153640", "153641"];
        var eatList = [];
        var list = {};
        var userData = {};
        var debrisList = [];
        var holeList = [];
        bahamutWish.getUserData(userUid, function (err, res) {
            if (err)cb(err);
            else {
                if (res["arg"]["ballList"] == undefined) {
                    userData["data"] = res["data"];
                    userData["dataTime"] = res["dataTime"];
                    userData["status"] = res["status"];
                    userData["statusTime"] = res["statusTime"];
                    userData["arg"] = res["arg"];
                    for (var x1 in debrisArr) {
                        debrisList.push({"id": debrisArr[x1], "count": 0});
                    }
                    for (var x2 in eatArr) {
                        eatList.push({"id": debrisArr[x2], "count": 0});
                    }
                    list["debrisList"] = debrisList;
                    list["eatList"] = eatList;
                    var ballList = {"lv": -1, "exp": 0, "point": 0, "payPoint": 0};//point-技能点,payPoint-消耗的技能点
                    var kk = [];
                    for (var a = 1; a <= 5; a++) {
                        holeList.push({"id": -2, "lv": 0, "lock": 0, "type": 0, "value": 0, "payLockPoint": 0});//,"status":-1-孔的状态
                    }
                    ballList["holeList"] = holeList;
                    for (var b = 1; b <= debrisArr.length; b++) {
                        kk.push(ballList);
                    }
                    list["ballList"] = kk;
                    list["payIngot"] = 0;//玩家消耗的金币总数
                    userData["arg"] = list;
                    echoObj["bhmtWish"] = userData;
                    cb(err, echoObj["bhmtWish"]);
                } else {
                    echoObj["bhmtWish"] = res;
                    cb(err, res);
                }
            }
        });
    }, function (cb) {
        leagueDragon.getDragon(userUid, echoObj["userInfo"]["leagueUid"], function (err, res) {
            if (err)
                cb(err);
            else {
                echoObj["leagueDragon"] = res;
                cb(null);
            }
        });
    }, function (cb) {
        leagueDragon.getStar(userUid, echoObj["leagueDragon"]["starId"], function (err, res) {
            if (err)
                cb(err);
            else {
                echoObj["leagueDragon"]["starData"] = res;
                cb(null);
            }
        });
    }, function (cb) {
        redis.loginFromUserUid(userUid).h("packetName").getObj(function (err, res) {
            if (!err) {
                var packetList = res == null ? {} : res;
                if (query["packet"] != undefined && query["packet"] != null && query["packet"] != "") {
                    var packet = query["packet"];
                    if (Object.keys(packetList).indexOf(packet) == -1) {
                        packetList[packet] = '1';
                        redis.loginFromUserUid(userUid).h("packetName").setObj(packetList);
                    }
                }
                var chargeArr = [];
                for (var charge in packetList) {
                    if (packetList[charge] == '1') {
                        chargeArr.push(charge);
                    }
                }
                kingnetSwitch["kingNetChargeArr"] = chargeArr;
                echoObj["kingnetSwitch"] = kingnetSwitch;
                cb(null);
            } else {
                cb(null);
            }
        });
    }, function (cb) {
        practice.pvpTopCross(userUid, function (err, res) {
            if (res[1] == true) {
                echoObj["userInfo"]["debris"][res[0]] = 1;//跨服激戰图标
            }
            cb(err);
        });
    }, function (cb) {
        practice.tabletsCompete(userUid, function (err, res) {
            if (res[1] == true) echoObj["userInfo"]["debris"][res[0]] = 1;//神位争夺图标
            cb(err);
        });
    }, function (cb) {
        globalContest.getConfig(userUid, function (err, res) {
            if (!err) echoObj["userInfo"]["debris"]["globalContest"] = 1;//武道会图标
            cb(null);
        })
    }, function (cb) {
        mixContest.getConfig(userUid, function (err, res) {
            if (!err) echoObj["userInfo"]["debris"]["mixContest"] = 1;//乱斗会图标
            cb(null);
        });
    }, function (cb) {
        intB.getConfig(userUid, function (err, res) {
            if (!err) {
                if (res[1] != undefined && jutil.now() < res[1] - 86400) {
                    echoObj["userInfo"]["debris"]["integralBattle"] = 1;//擂台赛积分战图标
                    cb(null);
                } else {
                    cb(null);
                }
            } else {
                cb(null);
            }
        });
    }], function (err, res) {
        if (err) {
            response.echo("user.get", jutil.errorInfo("getUserError"));
        } else {
            var monthCard = require("../model/monthCard");
            monthCard.login(userUid);
            var quarterCard = require("../model/quarterCard");
            quarterCard.login(userUid);
            var yearCard = require("../model/yearCard");
            yearCard.login(userUid);
            var scoreMall = require("../model/scoreMall");
            scoreMall.login(userUid);
            var mail = require("../model/mail");
            mail.compensateMail(userUid);
            var user_getToken = require("../api/user.getToken");
            user_getToken.sendCostListAward(userUid);
            groupPurchase.groupPurchaseSendLastReward(userUid);
            gsTabletsUser.sendClickReward(userUid, function (err) {
            });
            timeLimitMallApi.autoFreshTest(userUid);
            title.onlyCallOnce(userUid, function () {
            });
            redRibbon.sendRankReward(userUid, function (err) {
            });
            financial.sendUnGetReward(userUid, function (err) {
            });
            achievement.onlyCallOnce(userUid, function (err) {
            });
            var userIP = response.ip;
            response.echo("user.get", echoObj);
            stats.login(userUid, userIP, res[0], udid);
        }
    });
}

exports.start = start;