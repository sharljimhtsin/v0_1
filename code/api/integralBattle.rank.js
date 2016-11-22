/**
 * Created with JetBrains WebStorm.
 * User: za
 * Date: 14-10-28
 * Time: 下午4:36
 * To change this template use File | Settings | File Templates.
 */
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var integral = require("../model/integralBattle");

function start(postData, response, query) {
    var userUid = query["userUid"];
    var returnData = {};
    var sTime;
    var eTime;
    var key = "";
    var isAll = 0;
    async.series([function (cb) {//取配置
        integral.getConfig(userUid, function (err, res) {
            if (err)cb(err);
            else {
                sTime = res[0];
                eTime = res[1];
                key = res[2]["key"];
                returnData["config"] = res[2];
                isAll = parseInt(res[2]["isAll"]) || 0;
                cb(null);
            }
        });
    }, function (cb) {
        integral.getUserData(userUid, sTime, function (err, res) {
            if (err)cb(err);
            else {
                returnData["userData"] = {
                    "winTimes": res["data"],
                    "dataTime": sTime,
                    "eTime": eTime,
                    "point": res["status"],
                    "battleTimes": res["statusTime"],
                    "residueTimesList": res["arg"]["residueTimesList"]
                };
                cb(null);
            }
        });
    }, function (cb) {//获取积分排行
        integral.getRankList(userUid, isAll, key, function (err, res) {
            if (err)cb(err);
            else {
                returnData["rankList"] = res;
                cb(null);
            }
        });
    }], function (err) {
        if (err) {
            response.echo("integralBattle.rank", jutil.errorInfo(err));
        } else {
            response.echo("integralBattle.rank", returnData);
        }
    });
}

exports.start = start;