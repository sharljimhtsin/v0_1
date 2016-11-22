/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-06-22
 * Time: 下午14:52
 * 联盟战 戰斗
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var lt = require("../model/leagueTeam");
var TAG = "leagueTeam.battle";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var index = postData["index"];
    var leagueUid = "";
    var sTime = 0;
    var key;
    var manor;
    var finalManor;
    var userData = {};
    var returnData = {};

    async.series([function (cb) {
        lt.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    key = res[2]["key"];
                    if (sTime >= jutil.now() || sTime + 86400 * 4.5 >= jutil.now() || jutil.now() >= sTime + 86400 * 5.8) {
                        cb("timeNotMatch");
                    } else {
                        cb();
                    }
                } else {
                    cb("configError");
                }
            }
        });
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res == null || res["leagueUid"] == 0) {
                    cb("noLeague");
                } else {
                    userData = res;
                    leagueUid = userData["leagueUid"];
                    cb();
                }
            }
        });
    }, function (cb) {
        lt.checkMemberJoin(userUid, leagueUid, key, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res) {
                    cb();
                } else {
                    cb("NotJoin");
                }
            }
        });
    }, function (cb) {
        lt.getManor(userUid, index, key, function (err, res) {
            manor = res;
            if (manor) {
                cb(err);
            } else {
                cb("dataError");
            }
        });
    }, function (cb) {
        lt.getTeamFreezing(userUid, leagueUid, key, function (err, res) {
            if (res != null) {
                if (res > jutil.now()) {
                    cb("CDing");
                } else {
                    cb(err);
                }
            } else {
                cb("dataError");
            }
        });
    }, function (cb) {
        lt.isManorLock(userUid, index, key, function (err, res) {
            if (res) {
                cb("LOCKED");
            } else {
                cb(err);
            }
        });
    }, function (cb) {
        lt.getManor(userUid, index, key, function (err, res) {
            finalManor = res;
            if (finalManor) {
                cb(err);
            } else {
                cb("dataError");
            }
        });
    }, function (cb) {
        if (jutil.now() > finalManor["freezingTime"]) {
            var ourTeam = [];
            var substitute = finalManor["substitute"];
            if (substitute.hasOwnProperty(leagueUid)) {
                ourTeam = substitute[leagueUid];
                if (ourTeam.length == 3) {
                    var battleResult;
                    async.series([function (battleCb) {
                        lt.isManorLock(userUid, index, key, function (err, res) {
                            if (res) {
                                battleCb("LOCKED");
                            } else {
                                battleCb(err);
                            }
                        });
                    }, function (battleCb) {
                        lt.lockManor(userUid, index, key, battleCb);
                    }, function (battleCb) {
                        var enemyList = finalManor["isRobot"] == 1 ? ["one", "two", "three"] : finalManor["owner"];//here is workaround FUCK CJX
                        lt.battle(userUid, leagueUid, finalManor["leagueUid"], ourTeam, enemyList, finalManor["isRobot"], index, key, function (err, res) {
                            battleResult = res;
                            battleCb(err);
                        });
                    }, function (battleCb) {
                        returnData["battleResult"] = battleResult;
                        if (battleResult["ownLoserList"].length == 3) {
                            returnData["battleIsWin"] = false;
                            lt.quitManorWhileLose(userUid, leagueUid, index, key, battleCb);
                        } else {
                            returnData["battleIsWin"] = true;
                            lt.changeManorOwner(userUid, leagueUid, battleResult, index, key, battleCb);
                        }
                    }], function (err, res) {
                        lt.unlockManor(userUid, index, key, cb);
                    });
                } else {
                    cb("noEnoughPeople");
                }
            } else {
                cb("teamNotJoin");
            }
        } else {
            cb("CDing");
        }
    }], function (err) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnData);
        }
    });
}

exports.start = start;