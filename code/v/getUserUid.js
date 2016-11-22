/**
 * Created by xiayanxin on 2016/7/1.
 *
 * 裸包用户登录接口
 *
 * --
 -- 数据库: `dragonlogin_g`
 --

 -- --------------------------------------------------------

 --
 -- 表的结构 `mappingUser`
 --

 CREATE TABLE IF NOT EXISTS `mappingUser` (
 `id` int(11) NOT NULL AUTO_INCREMENT,
 `userUid` bigint(20) NOT NULL,
 `serverId` int(10) NOT NULL,
 `pUserId` varchar(50) NOT NULL,
 `platformId` varchar(20) NOT NULL,
 `userName` varchar(50) NOT NULL,
 `password` text NOT NULL,
 PRIMARY KEY (`id`)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='用户登录映射' AUTO_INCREMENT=1 ;
 *
 *
 *
 *
 */
var platformConfig = require("../../config/platform");
var user = require("../model/user");
var userToken = require("../model/userToken");
var jutil = require("../utils/jutil");
var async = require("async");
var mysql = require("../alien/db/mysql");
var bitUtil = require("../alien/db/bitUtil");
var crypto = require("crypto");
var login = require("../model/login");
var userVariable = require("../model/userVariable");
var practiceRegress = require("../model/practiceRegress");

function start(postData, response, query) {
    if (jutil.postCheck(postData, "username", "password", "serverId", "platformId") == false) {
        echo(jutil.errorInfo("postError"));
        return;
    }
    var userUid;
    var username = postData["username"];
    var password = postData["password"] + "";// TypeError: Not a string or buffer
    var serverId = postData["serverId"];
    var platformId = postData["platformId"];
    var country = platformConfig[platformId]["country"];
    var userData;
    var userTokenStr;
    var mappingData;
    var isZhuAn = false;
    var countryUserId;
    var isNew = false;
    var isTomorrow = 0;
    var userUidList = [];//封号列表
    var language = query["language"] == undefined ? "en" : query["language"];//用户系统语言
    if (postData["defaultUserUid"] != null) {
        var defaultUserUid = postData["defaultUserUid"];
        var defaultToken = postData["defaultToken"];
        echo({
            "userUid": defaultUserUid,
            "status": 1,
            "token": defaultToken,
            "time": jutil.nowMillisecond()
        });
        return;
    }
    var mConfig = platformConfig[platformId];
    if (mConfig == null || mConfig["country"] == null) {
        echo(jutil.errorInfo("configError"));
        return;
    }
    async.series([function (cb) {
        var sql = "SELECT * FROM `mailBind` WHERE `mailIP` = '" + username + "' AND `userPassWord` = '" + password + "'";
        mysql.loginDB(country).query(sql, function (err, res) {
            mappingData = res;
            cb(err);
        });
    }, function (cb) {
        if (mappingData && mappingData.length > 0) {
            isZhuAn = true;
            cb();
        } else {
            password = crypto.createHash('md5').update(password).digest('hex');
            var sql = "SELECT * FROM `mappingUser` WHERE `userName` = '" + username + "' AND `password` = '" + password + "'";
            mysql.loginDB(country).query(sql, function (err, res) {
                mappingData = res;
                cb(err);
            });
        }
    }, function (cb) {
        if (mappingData == null) {
            cb("NULL");
        } else if (mappingData.length == 0) {
            cb("NULL");
        } else {
            for (var i = 0; i < mappingData.length; i++) {
                var row = mappingData[i];
                userUid = row["userUid"];
                var city = bitUtil.parseUserUid(userUid)[1];
                if (city == parseInt(serverId)) {
                    isNew = false;
                    break;
                } else {
                    userUid = 0;
                    isNew = true;
                }
            }
            cb();
        }
    }, function (cb) {
        if (userUid == 0) {
            async.series([function (regCb) {
                login.getCountryUserId(country, platformId, username, function (err, res) {
                    if (err || res == null) {
                        regCb("dbError");
                    } else {
                        countryUserId = res;
                        regCb(null);
                    }
                });
            }, function (regCb) {
                login.getUserUidStatus(country, serverId, countryUserId, function (err, res) {
                    if (err) {
                        regCb("dbError");
                    } else {
                        userUid = res[0];
                        regCb(null);
                    }
                });
            }, function (regCb) {
                var sql = "show databases;";
                var newData = {};
                newData["userUid"] = userUid;
                newData["pUserId"] = username;
                if (isZhuAn) {
                    //INSERT INTO `mailBind`(`id`, `userUid`, `mailIP`, `userPassWord`, `pUserId`) VALUES ([value-1],[value-2],[value-3],[value-4],[value-5])
                    sql = "INSERT INTO `mailBind` SET ?";
                    newData["mailIP"] = username;
                    newData["userPassWord"] = password;
                } else {
                    //INSERT INTO `mappingUser`(`id`, `userUid`, `serverId`, `pUserId`, `platformId`, `userName`, `password`) VALUES ([value-1],[value-2],[value-3],[value-4],[value-5],[value-6],[value-7])
                    sql = "INSERT INTO `mappingUser` SET ?";
                    newData["serverId"] = serverId;
                    newData["platformId"] = platformId;
                    newData["userName"] = username;
                    newData["password"] = password;
                }
                mysql.loginDB(country).query(sql, newData, function (err, res) {
                    regCb(err);
                });
            }], function (err, res) {
                cb(err);
            });
        } else {
            cb();
        }
    }, function (cb) {
        userVariable.setPlatformId(userUid, platformId + '|' + username, cb);
    }, function (cb) {
        userVariable.setLanguage(userUid, language, cb);
    }, function (cb) {
        var isOpen = false;
        var openTime = 0;
        login.getServerList(country, 0, function (err, res) {
            for (var i in res) {
                if (res[i]["id"] == serverId) {
                    if (res[i]["openTime"] < jutil.now())
                        isOpen = true;
                    else
                        openTime = res[i]["openTime"];
                    break;
                }
            }
            if (isOpen) {
                cb(null);
            } else {
                cb(jutil.toBase64("服务器维护，预计开服时间为\n") + jutil.formatTime("Y-m-d H:i:s", openTime));
            }
        }, mConfig["preOpen"]);
    }, function (cb) {
        if (typeof userUid == "object") {
            var users = [];
            async.eachSeries(userUid, function (item, eCb) {
                user.getUser(item, function (err, res) {
                    users.push(res);
                    eCb(err);
                });
            }, function (err, res) {
                echo(users);
                cb("user error");
            });
        } else {
            cb();
        }
    }, function (cb) {
        userVariable.getVariableTime(userUid, "loginLog", function (err, res) {
            if (err)cb(err);
            else {
                if (res == null || res["time"] == 0 || res["time"] == undefined) {
                    isTomorrow = jutil.now();
                } else {
                    isTomorrow = res["time"];
                }
                practiceRegress.setLastLoginTime(userUid, isTomorrow);
                practiceRegress.regressFresh(userUid, cb);
            }
        });
    }, function (cb) {
        login.setLastServer(country, platformId, username, serverId, cb);
    }, function (cb) {
        login.getStopAccountList(country, serverId, function (err, res) {
            userUidList = res;
            cb(err);
        });
    }, function (cb) {
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
        if (userUidList.indexOf(userUid - 0) != -1) {
            var errInfo = jutil.errorInfo("blacklist");
            errInfo["info"] = jutil.toBase64(errInfo["info"]);
            cb(errInfo);
        } else if (userUidList2.indexOf(userUid - 0) != -1) {
            var errInfo = jutil.errorInfo("blacklist");
            errInfo["info"] = jutil.toBase64(errInfo["info"]);
            cb(errInfo);
        } else {
            cb();
        }
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            var defaultUserData = {"userUid": userUid, "status": 0};
            userData = isNew ? defaultUserData : res ? res : defaultUserData;
            cb(err);
        });
    }, function (cb) {
        cb();
    }, function (cb) {
        userToken.getToken(userUid, function (err, res) {
            userTokenStr = res;
            cb(err);
        });
    }, function (cb) {
        if (userTokenStr == null || userTokenStr == "") {
            cb("tokenInvalid");
        } else {
            cb();
        }
    }], function (err, res) {
        if (err) {
            echo(jutil.errorInfo(err));
        } else {
            userData["userToken"] = userTokenStr;
            userData["time"] = jutil.nowMillisecond();
            userData["timeZone"] = (new Date().getTimezoneOffset() / 60) * (-1);
            echo(userData);
        }
    });
    function echo(data) {
        var str = JSON.stringify(data);
        if (query != '' && query.callback != undefined) {
            response.end(query.callback + '(' + str + ')', "utf-8");
        } else {
            response.end(str, "utf-8");
        }
    }
}

exports.start = start;