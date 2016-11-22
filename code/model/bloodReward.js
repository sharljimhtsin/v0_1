/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-3-3
 * Time: 下午5:46
 * To change this template use File | Settings | File Templates.
 */
var cron = require("../utils/Cron");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var redis = require("../alien/db/redis");
var bitUtil = require("../alien/db/bitUtil");
var async = require("async");
var mCountry = [];
var mail = require("../model/mail");
var leagueMap = require("../model/leagueMap");
var userVariable = require("../model/userVariable");
var login = require("../model/login");
var title = require("../model/titleModel");
var pvptop = require("../model/pvptop");
var pushCron = require("../model/pushCron");
var gsTabletsUser = require("../model/gsTabletsUser");
var leagueDragon = require("../model/leagueDragon");
var reShop = require("../model/practiceRebateShop");
var bej = require("../model/practiceBejeweled");
var modelUtil = require("../model/modelUtil");
var formation = require("../model/formation");
var user = require("../model/user");
var lc = require("../model/practiceLimitChoose");
var intB = require("../model/integralBattle");
var activityConfig = require("../model/activityConfig");
var fs = require('fs');
var mysql = require("../alien/db/mysql");
var pvpTopCross = require("../model/pvpTopCross");

cron.addCron(0, 0, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            anAward(country, city, cb);
        }, function (err) {
            callbackFn(null);
        });
    })
});

// 定时任务：激战排名奖励
cron.addCron(21, 0, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            pvpReward(country, city, cb);
        }, function (err, res) {
            callbackFn(null);
        });
    });
});

// 定时任务：宝石迷阵 0点发奖
cron.addCron(0, 3, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            bejDataRresh(country, city, cb);
        }, function (err, res) {
            console.log("bejCron @ 0, 3");
            callbackFn(null);
        });
    });
});

// 定时任务：折扣商店 9点刷新
cron.addCron(9, 0, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            var type = 1;
            forch(country, city, type, cb);
        }, function (err, res) {
            console.log("cron @ 9, 0");
            callbackFn(null);
        });
    });
});

// 定时任务：折扣商店 12点刷新
cron.addCron(12, 0, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            var type = 1;
            forch(country, city, type, cb);
        }, function (err, res) {
            console.log("cron @ 12, 0");
            callbackFn(null);
        });
    });
});

// 定时任务：折扣商店 18点刷新
cron.addCron(18, 0, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            var type = 1;
            forch(country, city, type, cb);
        }, function (err, res) {
            console.log("cron @ 18, 0");
            callbackFn(null);
        });
    });
});

// 定时任务：折扣商店 21点刷新
cron.addCron(21, 0, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            var type = 1;
            forch(country, city, type, cb);
        }, function (err, res) {
            console.log("cron @ 21, 0");
            callbackFn(null);
        });
    });
});

// 定时任务：折扣商店 24点刷新
cron.addCron(0, 2, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            var type = 2;
            forch(country, city, type, cb);
        }, function (err, res) {
            console.log("cron @ 0, 2");
            callbackFn(null);
        });
    });
});

// 定时任务：限时礼包 12点刷新
cron.addCron(12, 5, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            limiC(country, city, cb);
        }, function (err, res) {
            console.log("cron @ 12, 5");
            callbackFn(null);
        });
    });
});

// 定时任务：限时礼包 18点刷新
cron.addCron(18, 5, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            limiC(country, city, cb);
        }, function (err, res) {
            console.log("cron @ 18, 5");
            callbackFn(null);
        });
    });
});

// 定时任务：限时礼包 21点刷新
cron.addCron(21, 5, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            limiC(country, city, cb);
        }, function (err, res) {
            console.log("cron @ 21, 5");
            callbackFn(null);
        });
    });
});

//限时礼包：取活动数据
function limiC(country, city, callbackFn) {
    var users;
    var activityType = 60;
    var sql = "SELECT `userUid` FROM activityData WHERE type=" + mysql.escape(activityType);
    var rDB = redis.dynamic(country, city);
    var getKey = "cronRun:limiC" + ":" + jutil.day();
    rDB.s(getKey).setnx(jutil.now(), function (err, res) {
        rDB.s(getKey).expire(86400 * 2);
        if (err || res == 0) {
            callbackFn(null);
        } else {
            async.series([function (cb) {
                mysql.game(null, country, city).query(sql, function (err, res) {
                    if (err) cb(err);
                    else {
                        users = res;
                        cb(null);
                    }
                });
            }, function (cb) {
                async.eachSeries(users, function (item, eCb) {
                    limChoose(item["userUid"], eCb);
                }, function (err, res) {
                    cb(err);
                })
            }], function (err, res) {
                callbackFn(err);
            });
        }
    });
}

/**
 * 限时礼包 每日刷新（12,18,21点补货）
 * @param redisItem
 * @param country
 * @param city
 */
function limChoose(userUid, callbackFn) {// country, city, type, callbackFn
    var returnData = {"data": 0, "dataTime": 0, "status": 0, "statusTime": 0, "arg": {}};
    var rk = "";
    var dayNo = 0;
    var sTime = 0;
    var currentConfig;
    var key = "";
    var isAll = 0;
    var chooseList = {};
    var limitA = 0;
    var limitB = 0;
    async.series([function (cb) {
        lc.getConfig(userUid, function (err, res) {
            if (err)cb(err);
            else {
                sTime = res[0];
                currentConfig = res[2];
                key = currentConfig["key"];
                isAll = parseInt(currentConfig["isAll"]);
                rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
                chooseList = currentConfig["chooseList"];
                dayNo = Math.floor((jutil.now() - sTime) / 86400);
                limitA = chooseList["day" + dayNo][1]["limitA"] - 0;
                limitB = chooseList["day" + dayNo][2]["limitB"] - 0;
                cb(null);
            }
        });
    }, function (cb) {
        returnData["arg"] = {"dayNo": dayNo, "nowTime": jutil.now(), "limitA": limitA, "limitB": limitB};
        lc.setUserData(userUid, isAll, key, returnData, cb);
    }], function (err, res) {
        callbackFn(null);
    });
}

// 定时任务：激战排名奖励 尝试补发一个小时后
cron.addCron(22, 0, function (country, h, m, callbackFn) {
    login.getServerCitys(country, 0, function (err, res) {
        if (err)console.log(jutil.formatTime("Y-m-d H:i:s", jutil.now()));
        var _citys = res;
        async.eachSeries(_citys, function (city, cb) {
            pvpReward(country, city, cb);
        }, function (err, res) {
            callbackFn(null);
        });
    });
});

// 定时任务：跨服激戰刷新用戶排行榜積分
cron.addCron(12, 11, function (country, h, m, callbackFn) {
    var fakeUserUid = bitUtil.createUserUid(country, 1, 1);
    var isAll;
    var key;
    var sTime;
    var eTime;
    var currentConfig;
    var userList = [];
    async.series([function (cb) {
        pvpTopCross.getConfig(fakeUserUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                isAll = parseInt(res[2]["isAll"]) || 0;
                key = res[2]["key"] || "1";
                currentConfig = res[2];
                sTime = res[0];
                eTime = res[1];
                cb();
            }
        });
    }, function (cb) {
        pvpTopCross.getRankListWithoutScore(fakeUserUid, isAll, key, function (err, res) {
            userList = res;
            cb(err);
        });
    }, function (cb) {
        async.eachSeries(userList, function (uid, refreshCb) {
            var ownPvpTop;
            async.series([function (innerCb) {
                pvpTopCross.getUserTop(uid, isAll, function (err, res) {
                    ownPvpTop = parseInt(res["top"]);
                    innerCb(err);
                });
            }, function (innerCb) {
                pvpTopCross.refreshCurrentPoint(uid, ownPvpTop, innerCb);
            }], function () {
                refreshCb();
            });
        }, cb);
    }], function (err, res) {
        console.log("PVP TOP CROSS RANK LIST REFRESHED! @ 12:00 AM")
        callbackFn();
    });
});

// 定时任务：神位争夺
cron.addCron(0, 1, function (country, h, m, callbackFn) {
    gsTabletsUser.tabletsTaskDailyReward(country, callbackFn);
});

// 定时任务：擂台赛积分战 每周任务：发送排行榜奖励邮件
cron.addCron(0, 10, function (country, h, m, callbackFn) {
    weeklyReward(country, 1, callbackFn);
    console.log("integralCron @ 0, 10");
});

//擂台赛积分战：活动结束刷新数据 每日任务：发送奖励邮件
function weeklyReward(country, city, callbackFn) {
    var users = [];
    var fakeUserUid = bitUtil.createUserUid(country, city, 1);
    var isAll = 0;
    var key = "";
    var currentConfig;
    var rDB = redis.dynamic(country, city);
    var getKey = "cronRun:integralWeekReward" + ":" + jutil.day();
    rDB.s(getKey).setnx(jutil.now(), function (err, res) {
        if (err || res == 0) {
            callbackFn(null);
        } else {
            async.series([function (cb) {
                activityConfig.getConfig(fakeUserUid, "integralBattle", function (err, res) {
                    if (err || res == null) {
                        cb("CannotgetConfig");
                    } else {
                        currentConfig = res[2];
                        isAll = parseInt(currentConfig["isAll"]) || 0;
                        key = currentConfig["key"];
                        cb();
                    }
                });
            }, function (cb) {
                var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
                redis[rk](fakeUserUid).z("integral:topList:" + key).revrangeRev(0, 99, function (err, res) {
                    if (res == null || res.length < 2) {
                        cb(err, null);
                    } else {
                        users = res;
                        cb();
                    }
                });
            }, function (cb) {//发送邮件奖励
                async.eachSeries(users, function (item, eCb) {
                    intB.weeklyReward(item, eCb);
                }, function (err, res) {
                    cb(err);
                });
            }], function (err, res) {
                callbackFn(err);
            });
        }
    });
}

// 定时任务：擂台赛积分战 每周任务：清除活动数据
cron.addCron(0, 13, function (country, h, m, callbackFn) {
    weeklyFresh(country, 1, callbackFn);
    console.log("integralCron @ 0, 13");
});

//擂台赛积分战：活动结束刷新数据 每日任务：清除数据
function weeklyFresh(country, city, callbackFn) {
    var users = [];
    var fakeUserUid = bitUtil.createUserUid(country, city, 1);
    var isAll = 0;
    var key = "";
    var currentConfig;
    var rDB = redis.dynamic(country, city);
    var getKey = "cronRun:integralWeekFresh" + ":" + jutil.day();
    rDB.s(getKey).setnx(jutil.now(), function (err, res) {
        if (err || res == 0) {
            callbackFn(null);
        } else {
            async.series([function (cb) {
                activityConfig.getConfig(fakeUserUid, "integralBattle", function (err, res) {
                    if (err || res == null) {
                        cb("CannotgetConfig");
                    } else {
                        currentConfig = res[2];
                        isAll = parseInt(currentConfig["isAll"]) || 0;
                        key = currentConfig["key"];
                        cb();
                    }
                });
            }, function (cb) {
                var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
                redis[rk](fakeUserUid).z("integral:topList:" + key).revrangeRev(0, 1, function (err, res) {
                    if (res == null || res.length < 1) {
                        cb(err, null);
                    } else {
                        users = res;
                        cb();
                    }
                });
            }, function (cb) {//发送邮件奖励
                async.eachSeries(users, function (item, eCb) {
                    intB.weeklyFresh(item, eCb);
                }, function (err, res) {
                    cb(err);
                });
            }], function (err, res) {
                callbackFn(err);
            });
        }
    });
}

// 定时任务：擂台赛积分战 每日任务：1.清除数据
cron.addCron(0, 7, function (country, h, m, callbackFn) {
    integralDay(country, 1, callbackFn);
    console.log("integralCron @ 0, 7");
});

//擂台赛积分战：每日刷新挑战次数，刷新次数
function integralDay(country, city, callbackFn) {
    var users = [];
    var fakeUserUid = bitUtil.createUserUid(country, city, 1);
    var isAll = 0;
    var key = "";
    var currentConfig;
    var rDB = redis.dynamic(country, city);
    var getKey = "cronRun:integralDay" + ":" + jutil.day();
    rDB.s(getKey).setnx(jutil.now(), function (err, res) {
        if (err || res == 0) {
            callbackFn(null);
        } else {
            async.series([function (cb) {
                activityConfig.getConfig(fakeUserUid, "integralBattle", function (err, res) {
                    if (err || res == null) {
                        cb("CannotgetConfig");
                    } else {
                        currentConfig = res[2];
                        isAll = parseInt(currentConfig["isAll"]) || 0;
                        key = currentConfig["key"];
                        cb();
                    }
                });
            }, function (cb) {
                var rk = isAll ? (isAll == 2 ? "country" : "loginFromUserUid") : "domain";
                redis[rk](fakeUserUid).z("integral:topList:" + key).revrangeRev(0, 9999, function (err, res) {
                    if (res == null || res.length < 1) {
                        cb(err, null);
                    } else {
                        users = res;
                        cb();
                    }
                });
            }, function (cb) {
                async.eachSeries(users, function (item, eCb) {
                    intB.dailyFresh(item, eCb);
                }, function (err, res) {
                    cb(err);
                });
            }], function (err, res) {
                callbackFn(err);
            });
        }
    });
}

//联盟副本奖励发放
for (var min = 5, hour = 0; hour < 24; hour += 2) {
    cron.addCron(hour, min, function (country, h, m, callbackFn) {
        login.getServerCitys(country, 0, function (err, res) {
            var _citys = res;
            async.eachSeries(_citys, function (city, cb) {
                leagueMap.auctionResult(country, city, h, m, cb);
            }, function (err) {
                callbackFn(null);
            })
        });
    });
}

for (var min = 3, hour = 0; hour < 24; min += 5) {
    if (min >= 60) {
        hour++;
        min = 3;
    }
    if (hour >= 24) {
        break;
    }
    cron.addCron(hour, min, function (country, h, m, callbackFn) {
        login.getServerCitys(country, 0, function (err, res) {
            var _citys = res;
            async.eachSeries(_citys, function (city, cb) {
                pushCron.toPush(country, city, h, m, cb);
            }, function (err) {
                callbackFn(null);
            });
        });
    });
}

var isAdd = {};
cron.addCron(0, 4, function (country, h, m, callbackFn) {
    var configData = configManager.createConfigFromCountry(country);
    var dragonConfig = configData.getConfig("starCraft");
    if (dragonConfig != null) {
        var startTime = jutil.monday() + dragonConfig["startWeektime"];
        if (jutil.now() < startTime)
            startTime -= 604800;
        if (isAdd["1"] == undefined && jutil.compTimeDay(jutil.now(), startTime + dragonConfig["doTime"]["battleTime1"])) {
            var date = new Date((startTime + dragonConfig["doTime"]["battleTime1"] - 180) * 1000);
            cron.addCron(date.getHours(), date.getMinutes(), function (country, _h, _m, _callbackFn) {
                leagueDragon.toBattle(country, 1, _callbackFn);
            });
            isAdd["1"] = 1;
        }
        if (isAdd["2"] == undefined && jutil.compTimeDay(jutil.now(), startTime + dragonConfig["doTime"]["battleTime2"])) {
            var date = new Date((startTime + dragonConfig["doTime"]["battleTime2"] - 180) * 1000);
            cron.addCron(date.getHours(), date.getMinutes(), function (country, _h, _m, _callbackFn) {
                leagueDragon.toBattle(country, 2, _callbackFn);
            });
            isAdd["2"] = 1;
        }
        if (isAdd["3"] == undefined && jutil.compTimeDay(jutil.now(), startTime + dragonConfig["doTime"]["battleEnd"])) {
            var date = new Date((startTime + dragonConfig["doTime"]["battleEnd"] - 60) * 1000);
            cron.addCron(date.getHours(), date.getMinutes(), function (country, _h, _m, _callbackFn) {
                leagueDragon.battleEnd(country, _callbackFn);
            });
            isAdd["3"] = 1;
        }
    }
    callbackFn(null);
});

function anAward(country, city, callbackFn) {
    var rDB = redis.dynamic(country, city);
    var getKey = "cronRun:bloodBattle" + ":" + (jutil.day() - 1);
    rDB.s(getKey).setnx(jutil.now(), function (err, res) {
        rDB.s(getKey).expire(86400 * 2);
        if (err || res == 0) { //奖励已经发放
            callbackFn(null);
        } else {
            async.series([
                function (cb) {
                    getTopTwenty(rDB, "top5", jutil.day() - 1, function (err, res) {
                        if (err || res == null) {
                            var errorMessage = "kind:top5  " + "country:" + country + "   " + "city:" + city;
                            console.log(errorMessage);
                            cb(null, null);
                        } else {
                            sendReward(res, country, city, "5", cb);
                        }
                    });
                },
                function (cb) {
                    getTopTwenty(rDB, "top6", jutil.day() - 1, function (err, res) {
                        if (err || res == null) {
                            var errorMessage = "kind:top6  " + "country:" + country + "   " + "city:" + city;
                            console.log(errorMessage);
                            cb(null, null);
                        } else {
                            sendReward(res, country, city, "6", cb);
                        }
                    });
                },
                function (cb) {
                    getTopTwenty(rDB, "top7", jutil.day() - 1, function (err, res) {
                        if (err || res == null) {
                            var errorMessage = "kind:top7  " + "country:" + country + "   " + "city:" + city;
                            console.log(errorMessage);
                            cb(null, null);
                        } else {
                            sendReward(res, country, city, "7", cb);
                        }
                    });
                },
                function (cb) {
                    getTopTwenty(rDB, "top8", jutil.day() - 1, function (err, res) {
                        if (err || res == null) {
                            var errorMessage = "kind:top8  " + "country:" + country + "   " + "city:" + city;
                            console.log(errorMessage);
                            cb(null, null);
                        } else {
                            sendReward(res, country, city, "8", cb);
                        }
                    });
                }
            ], function (err, res) {
                callbackFn(null);
            });
        }
    });
}

function sendReward(userArr, country, city, key, callbackFn) {
    var config = configManager.createConfigFromCountry(country);
    var bloodConfig = config.getConfig("bloodBattle");
    var bloodBattleFormationSize = bloodConfig["bloodBattleFormationSize"];
    var rewardItem = bloodBattleFormationSize[key];
    var rankReward = rewardItem["rankReward"];
    async.eachSeries(userArr, function (item, callbackEach) {
        var userUid = item["userId"];
        var top = item["top"];
        var reward = [];
        var rankRewardItem = rankReward[top];
        var ingot = rankRewardItem["imegga"] ? rankRewardItem["imegga"] : 0;
        var gold = rankRewardItem["zeniReward"] ? rankRewardItem["zeniReward"] : 0;
        reward.push({"id": "gold", "count": gold});
        reward.push({"id": "ingot", "count": ingot});
        sendRewardItem(userUid, "top" + key, reward, config, function (err, res) {
            if (err) {
                var errorMessage = "kind:top8   " + "top:" + key + "      " + "country:" + country + "   " + "city:" + city;
                console.log(errorMessage);
            }
            // ADD BY LXB
            title.bloodBattleRankChange(userUid, top);
            // END

            callbackEach(null, null);
        });
    }, function (err, res) {
        callbackFn(null);
    });
}

function sendRewardItem(userUid, type, reward, config, cb) {
    var lang;
    async.series([
        function (callBack) {
            userVariable.getLanguage(userUid, function (err, res) {
                lang = res;
                callBack(err);
            });
        },
        function (callBack) { //未发奖励，发放奖励
            var mailConfig;
            var mailConfigDefault = config.getConfig("mail");
            var mailConfigLocal = config.getConfig("mail" + "_" + lang);
            if (mailConfigLocal) {
                mailConfig = mailConfigLocal;
            } else {
                mailConfig = mailConfigDefault;
            }
            var bloodBattleRankReward = mailConfig["bloodBattleRankReward"];
            setContinueTimes(userUid, function (err, res) {
            });
            mail.addMail(userUid, -1, bloodBattleRankReward, JSON.stringify(reward), "111111", function (err, res) {
                if (err) {
                    callBack(err, null);
                } else {
                    callBack(null, null);
                }
            })
        }
    ], function (err, res) {
        cb(err, res);
    });
}

function getTopTwenty(redisT, type, day, callBack) { //获取前二十名
    var getKey = type + ":" + day;
    var redisItem = redisT.z(getKey);
    redisItem.revrange(0, 19, "WITHSCORES", function (err, res) {
        var returnData = [];
        res = res || [];
        for (var i = 0; i < res.length / 2; i++) {
            var obj = {};
            obj["top"] = i + 1;
            obj["value"] = res[i * 2 + 1];
            obj["userId"] = res[i * 2];
            returnData.push(obj);
        }
        callBack(null, returnData);
    });
}

//宝石迷阵：过凌晨刷新数据
function bejDataRresh(country, city, callbackFn) {
    var users;
    var activityType = 57;//activityData.PRACTICE_REBATESHOP;
    var config = configManager.createConfigFromCountry(country);
    var sql = "SELECT `userUid` FROM activityData WHERE type=" + mysql.escape(activityType);
    var rDB = redis.dynamic(country, city);
    var getKey = "cronRun:bejeweled" + ":" + jutil.day();
    rDB.s(getKey).setnx(jutil.now(), function (err, res) {
        rDB.s(getKey).expire(86400 * 2);
        if (err || res == 0) {
            callbackFn(null);
        } else {
            async.series([function (cb) {
                mysql.game(null, country, city).query(sql, function (err, res) {
                    if (err) cb(err);
                    else {
                        users = res;
                        cb(null);
                    }
                });
            }, function (cb) {//发送邮件奖励
                async.eachSeries(users, function (item, eCb) {
                    bejSetReward(item["userUid"], config, eCb);
                }, function (err, res) {
                    cb(err);
                });
            }, function (cb) {
                async.eachSeries(users, function (item, eCb) {//1.刷新数据 删除排行榜
                    bejFresh(item["userUid"], eCb);
                }, function (err, res) {
                    cb(err);
                });
            }], function (err, res) {
                callbackFn(err);
            });
        }
    });
}

//宝石迷阵 发奖
function bejSetReward(userUid, config, callbackFn) {
    var currentConfig;
    var rankReward = {};
    var rankList = [];
    var lang;
    var top = 0;
    var kkkk = false;

    /*
     1.判断是否进榜  不符合：跳过
     2.发奖
     */

    async.series([function (cb) {//取配置
        bej.getConfig(userUid, function (err, res) {
            if (err)cb(err);
            else {
                currentConfig = res[2];
                rankReward = currentConfig["rankReward"];
                cb(null);
            }
        });
    }, function (cb) {
        userVariable.getLanguage(userUid, function (err, res) {
            lang = res;
            cb(err);
        });
    }, function (cb) {
        bej.getRankList(userUid, function (err, res) {
            if (err)cb(err);
            else {
                if (res == null || res[0] == undefined) {
                    cb(null);
                } else {
                    rankList = res;
                    for (var x in rankList) {
                        if (rankList[x]["userUid"] == userUid) {//进榜了。。
                            kkkk = true;
                            top = x - 0 + 1;
                            break;
                        }
                    }
                    cb();
                }
            }
        });
    }, function (cb) {//发邮件
        if (kkkk == true) {
            var reward = [];
            for (var w in rankReward[top]) {
                reward.push({"id": rankReward[top][w]["id"], "count": rankReward[top][w]["count"]});
            }
            var mailConfig;
            var mailConfigDefault = config.getConfig("mail");
            var mailConfigLocal = config.getConfig("mail" + "_" + lang);
            if (mailConfigLocal) {
                mailConfig = mailConfigLocal;
            } else {
                mailConfig = mailConfigDefault;
            }
            var bejeweledRankReward = mailConfig["bejeweledRankReward"];
            mail.addMail(userUid, -1, bejeweledRankReward, JSON.stringify(reward), "111111", function (err, res) {
                if (err) {
                    cb(err);
                } else {
                    cb(null);
                }
            });
        } else {
            cb(null);
        }
    }], function (err, res) {
        callbackFn(null);
    });
}

//宝石迷阵 时间点刷新数据
function bejFresh(userUid, callbackFn) {
    var returnData = {};//返回用户初始化数据集合
    var currentConfig;//配置
    var list = {};
    var bejeweledType = 0;
    var bejeweledLine = 0;
    var bejData = {};
    var key = "";
    var curfreeStep = 0;
    var bejList = [];
    async.series([function (cb) {
        bej.getConfig(userUid, function (err, res) {
            if (err)cb(err);
            else {
                currentConfig = res[2];
                bejeweledType = currentConfig["bejeweledType"] - 0;
                bejeweledLine = currentConfig["bejeweledLine"] - 0;
                key = currentConfig["key"];
                returnData["config"] = currentConfig;
                curfreeStep = currentConfig["freeStep"] - 0;
                cb(null);
            }
        });
    }, function (cb) {
        bej.getUserData(userUid, function (err, res) {
            if (err)cb(err);
            else {
                list = res;
                cb(null);
            }
        });
    }, function (cb) {//随机生成【0-5】,5组的二位数组
        bejList = bej.checkedUnRepeat(bejeweledLine, bejeweledType);
        cb(null);
    }, function (cb) {
        bejData = {
            "bejList": [],
            "point": 0,
            "step": 0,
            "buyStepTimes": 0,
            "specialStatusList": [],
            "ghostStatus": 0,
            "rankStatus": 0,
            "ghostTimes": 0,
            "recordList": [],
            "rankList": []
        };
        bejData["bejList"] = bejList;
        bejData["step"] = curfreeStep;
        cb(null);
    }, function (cb) {//过凌晨初始化数据
        list["arg"] = bejData;
        bej.setUserData(userUid, list["arg"], cb);
    }, function (cb) {//过凌晨清除排行榜
        bej.del(userUid, cb);
    }], function (err, res) {
        callbackFn(null);
    });
}

//折扣商店：取活动数据
function forch(country, city, type, callbackFn) {
    var users;
    var activityType = 54;//activityData.PRACTICE_REBATESHOP;
    var sql = "SELECT `userUid` FROM activityData WHERE type=" + mysql.escape(activityType);
    async.series([function (cb) {
        mysql.game(null, country, city).query(sql, function (err, res) {
            if (err) cb(err);
            else {
                users = res;
                cb(null);
            }
        });
    }, function (cb) {
        async.eachSeries(users, function (item, eCb) {
            rebateShopFresh(item["userUid"], type, eCb);
        }, function (err, res) {
            cb(err);
        })
    }], function (err, res) {
        callbackFn(err);
    })
}

/**
 * 折扣商店 时间点刷新（刷新商城数据）
 * @param redisItem
 * @param country
 * @param city
 */
function rebateShopFresh(userUid, type, callbackFn) {// country, city, type, callbackFn
    var returnData = {};//返回用户初始化数据集合
    var currentConfig;//配置
    var limit = 0;
    var limit1 = 0;
    var aList = [];
    var bList = [];
    var aShop = [];
    var bShop = [];
    var reAList = [];
    var reBList = [];
    var reNowPlan = 0;
    var nowPlan = 0;
    var planStatus = 0;
    var nowPlanStatus = 0;
    var freshTimes = 0;
    var list = {};
    async.series([
        function (cb) {
            reShop.getConfig(userUid, function (err, res) {
                if (err) cb(err);
                else {
                    if (res[2] != undefined) {
                        currentConfig = res[2];
                        currentConfig["sTime"] = res[0];
                        currentConfig["eTime"] = res[1];
                        returnData["config"] = currentConfig;
                        limit = currentConfig["limitReward"] - 0;
                        limit1 = currentConfig["limitReward1"] - 0;
                        aShop = currentConfig["aShop"];
                        bShop = currentConfig["bShop"];
                        cb(null);
                    } else {
                        cb(null);
                    }
                }
            });
        },
        function (cb) {
            var xList = [];
            var limit2 = limit - limit1;
            while (aList.length < limit1) {//1格
                var randomRate1 = Math.random();
                var a = 0;
                for (var i in aShop) {//需求：商城第一格必须为gold兑换
                    a += aShop[i]["prob"] - 0;
                    if (randomRate1 <= a) {
                        if (aShop[i]["costType"] == "gold") {
                            aList.push({"id": i, "status": 0});
                            break;
                        }
                    }
                }
            }
            while (xList.length < limit2) {//5格
                var randomRate2 = Math.random();
                var p = 0;
                for (var k in aShop) {//需求：商城后五个格子不能为gold兑换
                    p += aShop[k]["prob"] - 0;
                    if (randomRate2 <= p) {
                        if (aShop[k]["costType"] != "gold") {
                            xList.push({"id": k, "status": 0});
                            break;
                        }
                    }
                }
            }
            for (var hh in xList) {
                aList.push({"id": xList[hh]["id"], "status": 0});
            }
            while (bList.length < limit) {
                var randomRate3 = Math.random();
                var q = 0;
                for (var j in bShop) {
                    q += bShop[j]["prob"] - 0;
                    if (randomRate3 <= q) {
                        bList.push({"id": j, "status": 1});
                        break;
                    }
                }
            }
            cb(null);
        },
        function (cb) { //取配置数据
            reShop.getUserData(userUid, currentConfig["sTime"], function (err, res) {
                if (err)cb(err);
                else {
                    list = res;
                    if (list["arg"] == undefined) {
                        list["arg"] = {
                            "sTime": currentConfig["sTime"],
                            "eTime": currentConfig["eTime"],
                            "aList": aList,
                            "bList": bList,
                            "nowPlan": nowPlan,
                            "planStatus": planStatus,
                            "freshTimes": jutil.now()
                        };
                    } else if (list["arg"] != undefined) {
                        reAList = res["arg"]["aList"];
                        reBList = res["arg"]["bList"];
                        reNowPlan = res["arg"]["nowPlan"];
                        planStatus = res["arg"]["planStatus"] - 0;
                        freshTimes = res["arg"]["freshTimes"];
                        if (type == 1) {
                            list["arg"] = {
                                "sTime": currentConfig["sTime"],
                                "eTime": currentConfig["eTime"],
                                "aList": aList,
                                "bList": reBList,
                                "nowPlan": reNowPlan,
                                "planStatus": planStatus,
                                "freshTimes": freshTimes
                            };
                        } else if (type == 2) {
                            list["arg"] = {
                                "sTime": currentConfig["sTime"],
                                "eTime": currentConfig["eTime"],
                                "aList": reAList,
                                "bList": bList,
                                "nowPlan": nowPlan,
                                "planStatus": nowPlanStatus,
                                "freshTimes": freshTimes
                            };
                        }
                    }
                    cb(null);
                }
            });
        },
        function (cb) {
            reShop.setUserData(userUid, list["arg"], cb);
        }
    ], function (err, res) {
        callbackFn(null);
    });
}

/**
 * 激战排名奖励（pvp前N名发送奖励）
 * @param redisItem
 * @param county
 * @param city
 */
function pvpReward(county, city, callbackFn) {
    var configData = configManager.createConfigFromCountry(county);
    var dailyReward = configData.getConfig("pvpRankDailyReward");
    var rDB = redis.domain(county, city);
    var existKey = jutil.day() + ":exist";
    rDB.s("cronRun:pvptopLimit:" + existKey).setnx(1, function (err, res) {
        var msg = {"existKey": existKey, "county": county, "city": city, "err": err, "res": res};
        fs.appendFile('pvpReward.log', JSON.stringify(msg) + "\n", 'utf8');
        rDB.s("cronRun:pvptopLimit:" + existKey).expire(86400 * 2);
        if (err || res == 0) { //已经发放
            callbackFn(null);
        } else {
            var limitValue = 0;
            var userList = [];
            for (var c in dailyReward) {
                limitValue++;
            }
            async.series([
                function (cb) { //缓存Limit数据
                    pvptop.toTopLimit(county, city, limitValue, function (err, res) {
                        var msg = {"toTopLimit": existKey, "county": county, "city": city, "err": err, "res": res};
                        fs.appendFile('pvpReward.log', JSON.stringify(msg) + "\n", 'utf8');
                        if (err) cb(err, null);
                        else cb(null, res);
                    });
                },
                function (cb) { //取Limit数据
                    pvptop.getTopLimit(county, city, limitValue, function (err, res) {
                        var msg = {"getTopLimit": limitValue, "county": county, "city": city, "err": err, "res": res};
                        fs.appendFile('pvpReward.log', JSON.stringify(msg) + "\n", 'utf8');
                        if (err) cb(err, null);
                        else {
                            userList = res;
                            cb(null);
                        }
                    });
                },
                function (cb) { // 发奖励
                    async.eachSeries(Object.keys(userList), function (key, esCb) {
                        var pvpuser = userList[key];
                        if (pvpuser["robot"] == "0") {
                            if (dailyReward[pvpuser["top"]] != undefined) {
                                var rKey = "cronRun:pvptopLimit:" + existKey + ":" + pvpuser["userUid"];
                                rDB.s(rKey).setnx(1, function (err, res) {
                                    rDB.s(rKey).expire(86400 * 2);
                                    if (err || res == 0) { //已经发放
                                        esCb(null);
                                    } else {
                                        var lang;
                                        async.series([function (cbb) {
                                            userVariable.getLanguage(pvpuser["userUid"], function (err, res) {
                                                lang = res;
                                                cbb(err);
                                            });
                                        }, function (cbb) {
                                            var mailConfig;
                                            var mailConfigDefault = configData.getConfig("mail");
                                            var mailConfigLocal = configData.getConfig("mail" + "_" + lang);
                                            if (mailConfigLocal) {
                                                mailConfig = mailConfigLocal;
                                            } else {
                                                mailConfig = mailConfigDefault;
                                            }
                                            var pvpRankDailyReward = mailConfig["pvpRankDailyReward"];
                                            mail.addMail(pvpuser["userUid"], -1, pvpRankDailyReward, JSON.stringify(dailyReward[pvpuser["top"]]), jutil.day(), function (err, res) {
                                                var msg = {
                                                    "addMail": pvpuser,
                                                    "county": county,
                                                    "city": city,
                                                    "day": jutil.day(),
                                                    "err": err,
                                                    "res": res
                                                };
                                                fs.appendFile('pvpReward.log', JSON.stringify(msg) + "\n", 'utf8');
                                                if (err) {
                                                    console.log("pvpReward:", "mail.addMail-", err);
                                                }
                                                cbb();
                                            });
                                        }], function (err, res) {
                                            esCb(null);
                                        });
                                    }
                                });
                            } else {
                                esCb(null);
                            }
                        } else {
                            esCb(null);
                        }
                    }, function (err) {
                        cb(null, null);
                    });
                }
            ], function (err, res) {
                callbackFn(null);
            });
        }
    });
}

/**
 * 设置连续进榜天数 +1
 * @param userUid
 */
function setContinueTimes(userUid, callBack) {
    var oldData;
    var newData = {};
    async.series([
        function (cb) { //获取连续进榜的天数
            userVariable.getVariableTime(userUid, "bloodBattle:times", function (err, res) {
                if (err) {
                    cb(err, null);
                } else {
                    if (res == null) {
                        oldData = {};
                        oldData["value"] = 0;
                        oldData["time"] = jutil.now();
                    } else {
                        var yesterday = jutil.now() - 86400;
                        var yesterdayWrite = jutil.compTimeDay(res["time"], yesterday); //昨天是否写了
                        var todayWrite = jutil.compTimeDay(res["time"], jutil.now()); //今天是不是写了
                        if (yesterdayWrite || todayWrite) { //昨天入榜了或者今天写了
                            oldData = res;
                        } else {
                            oldData = {};
                            oldData["value"] = 0;
                            oldData["time"] = jutil.now();
                        }
                    }
                    cb(null, null);
                }
            });
        },
        function (cb) {//更新连续进榜的天数
            if (jutil.compTimeDay(oldData["time"], jutil.now()) == true && oldData["value"] != 0) {
                cb(null, null);//已经写过了
            } else {
                newData["value"] = (oldData["value"] - 0) + 1;
                newData["time"] = jutil.now();
                userVariable.setVariableTime(userUid, "bloodBattle:times", newData["value"], newData["time"], function (err, res) {
                    cb(err, res);
                });
            }
        }
    ], function (err, res) {
        callBack(err, res);
    });
}

function addSever(c) {
    for (var i in mCountry) {
        if (mCountry[i] == c) return;
    }
    mCountry.push(c);
}
exports.addSever = addSever;