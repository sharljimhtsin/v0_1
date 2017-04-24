/**
 * 登录接口，取得token
 * User: liyuluan
 * Date: 13-10-10
 * Time: 下午4:18
 * To change this template use File | Settings | File Templates.
 */
var account = require("../controller/account");
var jutil = require("../utils/jutil");
var platform = require("../model/platform");
var userToken = require("../model/userToken");
var login = require("../model/login");
var platformConfig = require("../../config/platform");
var async = require("async");
var mail = require("../model/mail");
var user = require("../model/user");
var userVariable = require("../model/userVariable");
var practiceRegress = require("../model/practiceRegress");
var bitUtil = require("../alien/db/bitUtil");
var redis = require("../alien/db/redis");
var hero = require("../model/hero");
var achievement = require("../model/achievement");
/**
 * platformId : 平台id {"gt":设备号登录}
 * info ： 不同平台需要的验证参数 (参考 controller/account.js)
 *
 * @param postData
 * @param response
 * @param query
 */

function start(postData,response,query) {
    if (jutil.postCheck(postData,"platformId","platformUserId", "info", "serverId") == false) {
        response.echo("user.getToken",jutil.errorInfo("postError"));
        return;
    }

    var language = query["language"] == undefined?"en":query["language"];//用户系统语言
    var platformId = postData["platformId"];
    var platformUserId = postData["platformUserId"];
    var serverId = postData["serverId"];
    var isTomorrow = 0;
    var info = postData["info"];
    var packetName = postData["packetName"];//packet_five_1
    info["platformId"] = platformId;
    var isMo9 = postData["isMo9"] == undefined ? "0" : postData["isMo9"];
    var isMol = postData["isMol"] == undefined ? "0" : postData["isMol"];
    var userUidPOST = postData["UserUid"] == undefined ? "0" : postData["UserUid"];
    var userUidGET = query["UserUid"] == undefined ? "0" : query["UserUid"];
    if (postData["defaultUserUid"] != null) {
        var defaultUserUid = postData["defaultUserUid"];
        var defaultToken = postData["defaultToken"];
        response.echo("user.getToken", {"userUid":defaultUserUid, "status":1, "token":defaultToken, "time":jutil.nowMillisecond() });
        return ;
    }

    var checkFn;
    switch(platformId) {
        case 101:
            checkFn = account.check101;//使用设备号登录
            break;
        case "a91":
        case "a360":
        case "ucweb":
        case "xiaomi":
        case "sina":
        case "baidu":
        case "anzhi":
        case "dcn":
        case "yyh":
        case "wandoujia":
        case "a185":
        case "185":
        case "185ios":
        case "a8":
        case "3733":
        case "cc":
        case "dm":
        case "damai":
        case "1sdk":
        case "pyw":
            checkFn = require("../controller/uc").check;
            break;
        case "uc":
        case "haima":
        case "test":
        case "wyx":
            checkFn = require("../controller/uc").check;
            break;
        case "rus":
        case "rusios":
        case "rusen":
        case "rusiosen":
            checkFn = require("../controller/uc").check;
            break;
        case "jodo":
            checkFn = require("../controller/jodo").check;
            break;
        case "test2":
            checkFn = require("../controller/uc").check;
            break;
        case "p91":
            checkFn = require("../controller/uc").check;
            break;
        case "iosOfficial":
        case "ios":
            checkFn = require("../controller/ios").check;
            break;
        case "pp":
            checkFn = require("../controller/pp").check;
            break;
        case "ppzs":
            checkFn = require("../controller/ppzs").check;
            break;
        case "tb":
            checkFn = require("../controller/tb").check;
            break;
        case "ky":
            checkFn = require("../controller/ky").check;
            break;
        case "baxi":
            checkFn = require("../controller/uc").check;
            break;
        case "baxiA":
            checkFn = require("../controller/uc").check;
            break;
        case "baxiios":
            checkFn = require("../controller/uc").check;
            break;
        case "360":
            checkFn = require("../controller/360").check;
            break;
        case "kingnet":
        case "kingnetios":
        case "kythaily":
        case "kythaixy":
        case "kingnetenglishiosoffthai":
            checkFn = require("../controller/kingnet").check;
            break;
        case "kingnetenglish":
        case "kingnetenglishios":
        case "kingnetenglishoff":
        case "kingnetenglishiosoff":
        case "kingnetly":
        case "kyxyzs":
        case "gnetop":
        case "kyeniosly":
            checkFn = require("../controller/kingnetenglish").check;
            break;
        case "kk":
            checkFn = require("../controller/kk").check;
            break;
        case "anfan":
            checkFn = require("../controller/anfan").check;
            break;
        case "itools":
            checkFn = require("../controller/itools").check;
            break;
        case "thai":
        case "thaiios":
            checkFn = require("../controller/thailogin").check;
            break;
        case "meizu":
            checkFn = require("../controller/uc").check;
            //checkFn = require("../controller/meizu").check;
            break;
        case "youku":
            checkFn = require("../controller/uc").check;
            //checkFn = require("../controller/youku").check;
            break;
        case "i4":
            checkFn = require("../controller/uc").check;
            //checkFn = require("../controller/i4").check;
            break;
        case "lenovo":
            checkFn = require("../controller/uc").check;
            //checkFn = require("../controller/lenovo").check;
            break;
        case "xy":
            checkFn = require("../controller/uc").check;
            //checkFn = require("../controller/xy").check;
            break;
        case "ljkuaiyong":
            checkFn = require("../controller/ljkuaiyong").check;
            //checkFn = require("../controller/xy").check;
            break;
        case "ger":
            checkFn = require("../controller/uc").check;
            break;
        case "fra":
            checkFn = require("../controller/uc").check;
            break;
        case "esp":
            checkFn = require("../controller/uc").check;
            break;
        case "gera":
            checkFn = require("../controller/uc").check;
            break;
        case "fraa":
            checkFn = require("../controller/uc").check;
            break;
        case "espa":
            checkFn = require("../controller/uc").check;
            break;
        case "gergp":
            checkFn = require("../controller/uc").check;
            break;
        case "fragp":
            checkFn = require("../controller/uc").check;
            break;
        case "espgp":
            checkFn = require("../controller/uc").check;
            break;
        case "ara":
        case "araa":
        case "aragp":
            checkFn = require("../controller/uc").check;
            break;
        case "usa":
            checkFn = require("../controller/uc").check;
            break;
        case "yuenan":
            checkFn = require("../controller/uc").check;
            break;
        case "yuenanlumi":
            checkFn = require("../controller/uc").check;
            break;
        case "bangqu":
            checkFn = require("../controller/uc").check;
            break;
        case "usaa":
            checkFn = require("../controller/uc").check;
            break;
        default :
            checkFn = require("../controller/uc").check;
            break;
    }
    // 如果是来自MO9平台，跳过所有验证
    if (isMo9 == "1" || userUidGET != "0" || userUidPOST != "0" || isMol == "1") {
        checkFn = require("../controller/uc").check;
    }

    if (checkFn == null) {
        response.echo("user.getToken",jutil.errorInfo("platformIdError"));
        return;
    }

    var mConfig = platformConfig[platformId];
    if (mConfig == null || mConfig["country"] == null) {
        response.echo("user.getToken",jutil.errorInfo("configError"));
        return;
    }

    var mCountry = mConfig["country"]; //大区
    var countryUserId = null; //平台唯一id
    var gameUserUid = null;
    var gameUserStatus = null;
    var gameUserToken = null;
    var userUidList = [];//封号列表

    async.series( [
        function(cb) { //验证帐号有效性
            checkFn(platformUserId, info, function(err, res) {
                if (err) {
                    cb("accountInvalid");
                } else {
                    if (res != null && res["platformUserId"] != null) {
                        platformUserId = res["platformUserId"];
                    }
                    if(platformId=="ppzs") {//特处
                        platformId = "pp";
                    }
                    if(platformId == "thaiios") {
                        platformId = "thai";
                    }
                    if(platformId == "kythaily") {
                        platformId = "kythaily";
                    }
                    if (["ger", "gera", "fra", "fraa", "esp", "espa", "gergp", "fragp", "espgp", "ara", "araa", "aragp"].indexOf(platformId) != -1) {
                        platformId = "ger";
                    }
                    if(platformId == "mo9") {
                        platformId = "mo9";
                    }
                    if(["kingnetenglishios", "kingnetenglishiosoff", "kingnetenglishoff", "kingnetly", "kyxyzs", "gnetop", "kyeniosly","kingnetenglishiosoffthai"].indexOf(platformId) != -1) {
                        platformId = "kingnetenglish";
                    }
                    if (["usaa", "usaaoff", "usaa1", "usagp", "usausa", "usaglobal", "usaaoffIns", "usaazb", "usabzb", "usaczb", "usadzb", "usaezb", "usaaoffnew", "usafzb", "usagzb", "usaagp"].indexOf(platformId) != -1) {
                        platformId = "usa";
                    }
                    if(["yuenan", "yuenanlumi"].indexOf(platformId) != -1) {
                        platformId = "yuenan";
                    }
                    cb();
                }
            });
        },
        function(cb) { //取平台唯一id
            if (userUidGET != 0 || userUidPOST != 0) {
                cb();
            } else {
                login.getCountryUserId(mCountry, platformId, platformUserId, function (err, res) {
                    if (err || res == null) {
                        if (err) console.error("getToken:getUserUidStatus", err.stack);
                        cb("dbError");
                    } else {
                        countryUserId = res;
                        cb(null);
                    }
                });
            }
        },
        //加入服务器开启判断
        function(cb){
            var isOpen = false;
            var openTime = 0;
            login.getServerList(mCountry, 0, function(err, res){
                for(var i in res){
                    if(res[i]["id"] == serverId){
                        if(res[i]["openTime"] < jutil.now())
                            isOpen = true;
                        else
                            openTime = res[i]["openTime"];
                        break;
                    }
                }
                if(isOpen)cb(null);
                else cb(jutil.toBase64("服务器维护，预计开服时间为\n")+jutil.formatTime("Y-m-d H:i:s", openTime));
            }, mConfig["preOpen"]);
        },
        function(cb) { //取用户数据
            if (userUidGET != 0 || userUidPOST != 0) {
                gameUserUid = userUidGET != 0 ? userUidGET : userUidPOST;
                gameUserStatus = 1;
                cb();
            } else {
                login.getUserUidStatus(mCountry, serverId, countryUserId, function (err, res) {
                    if (err) {
                        cb("dbError");
                        console.error("getToken:getUserUidStatus", err.stack);
                    } else {
                        gameUserUid = res[0];
                        gameUserStatus = res[1];
                        cb(null);
                    }
                });
            }
        },
        function (cb) {
            if (typeof gameUserUid == "object") {
                var users = [];
                async.eachSeries(gameUserUid, function (item, eCb) {
                    user.getUser(item, function (err, res) {
                        users.push(res);
                        eCb(err);
                    });
                }, function (err, res) {
                    response.echo("user.getToken", users);
                    cb("user error");
                });
            } else {
                cb();
            }
        },
        function(cb){
            userVariable.getVariableTime(gameUserUid,"loginLog",function(err,res){
                if(err)cb(err);
                else{
                    if(res == null||res["time"] == 0||res["time"] == undefined){
                        isTomorrow = jutil.now();
                    }else{
                        isTomorrow = res["time"];
                    }
                    practiceRegress.setLastLoginTime(gameUserUid,isTomorrow);
                    practiceRegress.regressFresh(gameUserUid,cb);
                }
            });
        },
        function (cb) { //记录每天第一次登录的时间，并返回给前端
            cb();
            //TODO 与回归活动是否冲突
            //userVariable.setVariableTime(gameUserUid,"loginLog",1,isTomorrow,cb);
        },
        function(cb) { //取token
            userToken.getToken(gameUserUid,function(err,res) {
                if (err) {
                    cb("dbError");
                    console.error("getToken:getToken", err.stack);
                } else {
                    gameUserToken = res;
                    cb(null);
                }
            });
        },
        function(cb) {
            login.setLastServer(mCountry, postData["platformId"], platformUserId, serverId, cb);
        },
        function(cb) {
            login.getStopAccountList(mCountry, serverId, function(err, res){
                userUidList = res;
                cb(null);
            });
        },
        function(cb) { // 记录用户系统语言
            //language = 0;//0:英文 1:繁体
            userVariable.setLanguage(gameUserUid,language,cb);
        },
        function(cb) { // 记录用户平台号
            userVariable.setPlatformId(gameUserUid,postData["platformId"]+'|'+platformUserId,cb);
        },
        function(cb) {
            var country = bitUtil.parseUserUid(gameUserUid)[0];
            var rDB = redis.login(country);
            rDB.s("package:"+gameUserUid).setex(604800, query["packet"],function(err,res){
                cb(null);
            });
        }
    ], function(err) {
        if (err) {
            response.echo("user.getToken", jutil.errorInfo(err));
        } else {
            var heroList = [104088, 104084, 104088, 104084, 104085, 104083, 104100, 104101, 104102, 104103, 104089, 104090, 104091, 104092, 104093, 104094, 104095, 104096, 104110, 104111, 104108, 104109];
            hero.isOwn(gameUserUid, heroList, function (err, res) {
                if (err || res == null || res.length == 0) {
                    //do nothing
                } else {
                    async.eachSeries(res, function (heroId, esCb) {
                        heroId = heroId["heroId"];
                        achievement.getHero(gameUserUid, heroId, function (err, res) {
                            esCb(err, res);
                        });
                    }, function (err, res) {
                        //do nothing
                    });
                }
            });

            var userUidList2 = [
                12901684111,
                12901684208,
                12901684245,
                12901684290,
                12901681617,
                12901684670,
                12901685197,
                12901685064,
                12901686867,
                12901683842,
                12901684557,
                12901685305,
                12901685876,
                12901685891,
                12901686873,
                17196716369,
                17230257459,
                17247090057,
                17196646840];

            if (userUidList.indexOf(gameUserUid - 0) != -1) {
                var errInfo = jutil.errorInfo("blacklist");
                errInfo["info"] = jutil.toBase64(errInfo["info"]);
                response.echo("user.getToken", errInfo);
            } else if (userUidList2.indexOf(gameUserUid - 0) != -1) {
                var errInfo = jutil.errorInfo("blacklist");
                errInfo["info"] = jutil.toBase64(errInfo["info"]);
                response.echo("user.getToken", errInfo);
            } else {
                response.echo("user.getToken", {
                    "userUid": gameUserUid,
                    "status": gameUserStatus,
                    "isTomorrow": isTomorrow,
                    "token": gameUserToken,
                    "time": jutil.nowMillisecond(),
                    "timeZone": (new Date().getTimezoneOffset() / 60) * (-1)
                });
            }
        }
    });

}



var activityConfig = require("../model/activityConfig");
var practiceCostListActivity = require("../model/practiceCostListActivity");
var activityData = require("../model/activityData");

function sendCostListAward(userUid) {
    var mActivityConfig = null;
    var mAwardConfig = null;
    var activityType = activityData.COSTLIST_ACTIVITY;
    var activitySTime = 0;
    var activityETime = 0;

    async.series([
        function(cb) {//查看活动是否开启
            activityConfig.getConfig(userUid, "costListActivity", function(err, res) {
                if (err || res == null) {
                    cb(null);
                } else if (res != null) {
                    if (jutil.now() > res[5]) { //判断活动已结束
                        mActivityConfig = res[2];
                        activitySTime = res[4];
                        activityETime = res[5];
                    }
                    cb(null);
                }
            })
        },
        function(cb) { //查看是否对应的排行
            if (mActivityConfig == null) {
                cb(null);
                return;
            }
            practiceCostListActivity.getSelfRank(userUid, activitySTime, activityETime, function(err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    var mRank = res[0];//排名
                    var mRankVal = res[1];//排名相关值

                    if (mActivityConfig && mRankVal >= mActivityConfig["limitGold"]) {
                        mAwardConfig = mActivityConfig[mRank];//奖励的配置
                    }
                    cb(null);
                }
            });
        },
        function(cb) { //查看是否已发送
            if (mAwardConfig == null) { //如果对应排行没有奖励
                cb(null);
                return;
            }

            activityData.getActivityData(userUid, activityType, function(err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    if (res["status"] != 0 && res["statusTime"] > activityETime) { //表示已领取
                        cb (null); //不处理
                    } else {
                        activityData.updateActivityData(userUid, activityType, {"statusTime":jutil.now(), "status":1}, function(err, res) {
                            if (err) {
                                console.log("奖励未发送完成", err, err.stack);
                                cb(err);
                            } else {
                                mail.addMail(userUid, -1, "排行奖励", JSON.stringify(mAwardConfig), 140709, function(err, res) {
                                    if (err) {
                                        console.error("邮件发送失败", userUid, mAwardConfig);
                                        cb(null);
                                    } else {
                                        cb(null);
                                    }
                                });//
                            }
                        });
                    }
                }
            });

        }
    ], function(err, res) {
        //end
    });
}

exports.start = start;
exports.sendCostListAward = sendCostListAward;