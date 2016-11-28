/**
 * Created by xiayanxin on 2016/11/2.
 *
 * buffer 戰斗
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var lt = require("../model/leagueTeam");
var TAG = "leagueTeam.bufferBattle";

function start(postData, response, query) {
    if (jutil.postCheck(postData, "index") == false) {
        response.echo(TAG, jutil.errorInfo("postError"));
        return false;
    }
    var userUid = query["userUid"];
    var index = postData["index"];
    var leagueUid = "";
    var sTime = 0;
    var seconds;
    var key;
    var buffer;
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
                    seconds = res[2]["bufferExpire"];
                    if (sTime >= jutil.now() || sTime + 86400 * 4.8 >= jutil.now() || jutil.now() >= sTime + 86400 * 5.8) {
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
        lt.checkLeaderJoin(userUid, leagueUid, key, function (err, res) {
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
        lt.getTeamBuff(userUid, leagueUid, key, function (err, res) {
            if (res) {
                if (res["id"] > 0 && res["TTL"] > jutil.now()) {
                    cb("bufferGotYet");
                } else {
                    cb(err);
                }
            } else {
                cb("dataError");
            }
        });
    }, function (cb) {
        lt.getBuffer(userUid, index, key, function (err, res) {
            buffer = res;
            if (buffer) {
                cb(err);
            } else {
                cb("dataError");
            }
        });
    }, function (cb) {
        lt.isBufferLock(userUid, index, key, function (err, res) {
            if (res) {
                cb("LOCKED");
            } else {
                cb(err);
            }
        });
    }, function (cb) {
        lt.getFightingManor(userUid, leagueUid, key, function (err, res) {
            if (res != null) {
                cb(res > 0 ? "FORBIDDEN" : err);
            } else {
                cb(err);
            }
        });
    }, function (cb) {
        var battleResult;
        var isWin = false;
        async.series([function (battleCb) {
            lt.isBufferLock(userUid, index, key, function (err, res) {
                if (res) {
                    battleCb("LOCKED");
                } else {
                    battleCb(err);
                }
            });
        }, function (battleCb) {
            lt.lockBuffer(userUid, index, key, battleCb);
        }, function (battleCb) {
            lt.bufferBattle(userUid, leagueUid, index, key, function (err, res) {
                battleResult = res;
                isWin = battleResult["battleResult"]["isWin"];
                battleCb(err);
            });
        }, function (battleCb) {
            returnData["battleResult"] = battleResult;
            battleCb();
        }], function (err, res) {
            if (isWin) {
                lt.changeBufferOwner(userUid, leagueUid, battleResult, seconds, index, key, cb);
            } else {
                lt.unlockBuffer(userUid, index, key, cb);
            }
        });
    }], function (err) {
        if (err) {
            response.echo(TAG, jutil.errorInfo(err));
        } else {
            response.echo(TAG, returnData);
        }
    });
}

exports.start = start;