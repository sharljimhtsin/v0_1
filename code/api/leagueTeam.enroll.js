/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 16-06-22
 * Time: 下午14:52
 * 联盟战 成员加入 參戰
 */

var league = require("../model/league");
var jutil = require("../utils/jutil");
var async = require("async");
var user = require("../model/user");
var lt = require("../model/leagueTeam");
var forgeData = require("../model/forgeData");
var formation = require("../model/formation");
var TAG = "leagueTeam.enroll";

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
    var cost = [];
    var manor;
    var userData = {};
    var returnData = {};
    var needInitial = false;

    async.series([function (cb) {
        lt.getConfig(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else {
                if (res != null) {
                    sTime = res[0];
                    key = res[2]["key"];
                    cost = res[2]["memberCost"];
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
                    needInitial = false;
                    cb();
                } else {
                    needInitial = true;
                    cb();
                }
            }
        });
    }, function (cb) {
        if (needInitial) {
            cb();
        } else {
            lt.getTargetManor(userUid, leagueUid, key, function (err, res) {
                if (res && res > 0) {
                    cb("isJoin");
                } else {
                    cb(err);
                }
            });
        }
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
        if (jutil.now() > manor["freezingTime"]) {
            var ourTeam = [];
            var substitute = manor["substitute"];
            if (substitute.hasOwnProperty(leagueUid)) {
                ourTeam = substitute[leagueUid];
                if (ourTeam.length >= 3) {
                    cb("enoughPeopleYet");
                } else {
                    ourTeam.push({"userUid": userUid, "userName": userData["userName"], "level": userData["lv"]});
                    manor["substitute"][leagueUid] = ourTeam;
                    lt.setManor(userUid, index, manor, key, cb);
                }
            } else {
                ourTeam.push({"userUid": userUid, "userName": userData["userName"], "level": userData["lv"]});
                manor["substitute"][leagueUid] = ourTeam;
                lt.setManor(userUid, index, manor, key, cb);
            }
        } else {
            cb("Freezing");
        }
    }, function (cb) {
        async.eachSeries(cost, function (item, eCb) {
            forgeData.expendItem(userUid, item["id"], item["type"], item["count"], eCb);
        }, cb);
    }, function (cb) {
        if (needInitial) {
            lt.memberJoin(userUid, leagueUid, key, cb);
        } else {
            cb();
        }
    }, function (cb) {
        lt.setTargetManor(userUid, leagueUid, index, key, cb);
    }, function (cb) {
        lt.getManor(userUid, index, key, function (err, res) {
            manor = res;
            async.series([function (youCb) {
                if (manor["isRobot"] == 1) {
                    manor["you"] = manor["robotList"];
                    youCb();
                } else {
                    var tmp = manor["owner"];
                    var playList = [];
                    async.eachSeries(tmp, function (one, eCb) {
                        formation.getUserHeroIds(one["userUid"], function (err, res) {
                            one["formation"] = res;
                            playList.push(one);
                            eCb(err);
                        });
                    }, function (err, res) {
                        manor["you"] = playList;
                        youCb(err);
                    });
                }
            }, function (meCb) {
                var tmp = manor["substitute"][leagueUid];
                var playList = [];
                async.eachSeries(tmp, function (one, eCb) {
                    formation.getUserHeroIds(one["userUid"], function (err, res) {
                        one["formation"] = res;
                        playList.push(one);
                        eCb(err);
                    });
                }, function (err, res) {
                    manor["me"] = playList;
                    meCb(err);
                });
            }, function (dataCb) {
                returnData["manor"] = manor;
                dataCb();
            }], cb);
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