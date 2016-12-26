/**
 * user.info 某个取用户信息
 * User: liyuluan
 * Date: 14-1-28
 * Time: 下午9:38
 */


var admin = require("../model/admin");
var user = require("../model/user");
var titleModel = require("../model/titleModel");
var jutil = require("../utils/jutil");
var login = require("../model/login");
var bitUtil = require("../alien/db/bitUtil");
var configManager = require("../config/configManager");
var async = require("async");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.info", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.info", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo", query, postData);
    var userUid = postData["userUid"];
    var titlePoint = 0;
    var userData;
    async.series([function (cb) {
        titleModel.getTitlesPoint(userUid, function (point) {
            titlePoint = point;
            cb();
        });
    }, function (cb) {
        user.getUser(userUid, function (err, res) {
            if (err) {
                cb(err);
            } else if (res == null) {
                cb("ERROR");
            } else {
                res["userName"] = jutil.fromBase64(res["userName"]);
                var mCode = bitUtil.parseUserUid(userUid);
                login.getStopAccountList(mCode[0], mCode[1], function (err, userUidList) {
                    res['isStop'] = 0;
                    if (userUidList.indexOf(userUid - 0) != -1) {
                        res['isStop'] = 1;
                    }
                    res["country"] = mCode[0];
                    res["city"] = mCode[1];
                    var configData = configManager.createConfig(userUid);
                    //读取当前体力和精力
                    var time = jutil.now();
                    var pve = configData.getPvePower(res["pvePower"], res["lastRecoverPvePower"], time);
                    res["pvePower"] = pve[0];
                    res["lastRecoverPvePower"] = pve[1];
                    var pvp = configData.getPvpPower(res["pvpPower"], res["lastRecoverPvpPower"], time);
                    res["pvpPower"] = pvp[0];
                    res["lastRecoverPvpPower"] = pvp[1];
                    res["momentum"] = titlePoint;//parseInt(res["momentum"]) + parseInt(titlePoint);
                    userData = res;
                    cb();
                });
            }
        });
    }], function (err, res) {
        if (err) {
            response.echo("user.info", {"ERROR": "USER_ERROR", "info": "没有此用户"});
        } else {
            response.echo("user.info", [userData]);
        }
    });
}
exports.start = admin.adminAPIProxy(start);