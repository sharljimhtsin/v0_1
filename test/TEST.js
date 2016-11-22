/**
 *
 * Date: 14-5-26
 * Time: 下午3:22
 */
var async = require("async");
var jutil = require("../code/utils/jutil");
var rs = new Response();

function Response() {
    // nothing
}
Response.prototype.echo = function (str1, str2) {
    console.log(str1, str2);
};

var isAll;
var key;
var stageReward;
var userList = [];
var userUid = "38856038406";
var total = 859;
var limit = 2000;

async.series([function (cb) {
    isAll = 1;
    key = "";
    stageReward = "";
    cb();
}, function (cb) {
    for (var i = 1; i <= total; i++) {
        userList.push(i + "user");
    }
    cb();
}, function (cb) {
    prepareBattleNew(isAll, key, stageReward, userList, cb);
}], function (err, res) {
    console.log(err, res);
    //process.exit();
});

function prepareBattleNew(isAll, key, stageReward, userList, callbackFn) {
    var limit = 2000;
    var loseList = [];
    var allList = [];
    var sum = 0;
    async.whilst(function () {
        loseList = [];
        return userList.length > 1;
    }, function (wlCb) {
        var length = userList.length >= limit ? limit : userList.length;
        var half = parseInt(length / 2);
        var n = 0;
        while (Math.pow(2, n) < length) {
            n++;
        }
        var stage = Math.pow(2, n - 1);
        var times = half >= 100 ? half : length - stage;
        userList.sort(function () {
            return 0.5 - Math.random();
        });
        console.log("userlength", length);
        console.log("half", half);
        console.log("stage", stage);
        console.log("battleTimes", times);
        var q = async.queue(function (task, qCb) {
            var he = task.he;
            var she = task.she;
            if (he && she) {
                doBattle(he, she, times, isAll, key, stageReward, function (err, res) {
                    if (err) {
                        qCb(null);
                    } else {
                        if (res["isWin"]) {
                            loseList.push(task.herPos);
                            if (allList.indexOf(she) == -1) {
                                allList.push(she);
                            }
                        } else {
                            loseList.push(task.hisPos);
                            if (allList.indexOf(he) == -1) {
                                allList.push(he);
                            }
                        }
                        qCb(null);
                    }
                });
            } else {
                qCb(null);
            }
        }, times);
        for (var j = 0; j < times; j++) {
            var he = userList[j];
            var she = userList[times + j];
            q.push({"he": he, "she": she, "hisPos": j, "herPos": times + j}, function (err, res) {
                //pushed
            });
        }
        q.drain = function () {
            loseList.sort(function (x, y) {
                return y - x;
            });
            for (var k in loseList) {
                userList.splice(loseList[k], 1);
            }
            console.log(userList.length);
            console.log(loseList.length);
            sum += loseList.length;
            wlCb();
        }
    }, function (err, res) {
        console.log(userList);
        console.log(sum);
        console.log(allList.length);
        callbackFn(err, res);
    });
}

function doBattle(he, her, stage, isAll, key, stageReward, cb) {
    cb(null, {"isWin": Math.random() > 0.5});
}