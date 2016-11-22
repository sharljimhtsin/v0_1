/**
 * 功能开关
 * User: liyuluan
 * Date: 14-1-14
 * Time: 下午5:26
 */

var redis = require("../alien/db/redis");
var mysql = require("../alien/db/mysql");
var DBJoint = require("../alien/db/DBJoint");
var jutil = require("../utils/jutil");

var _DBJoint = new DBJoint()
    .key("gameSwitch")
    .sql("SELECT * FROM switch")
    .mysqlKey("id")
    .redis("domain");


function getSwitchOpen(userUid, id, callbackFn ) {
    _DBJoint.toCache(userUid, function(err, res) {
        if (err) callbackFn(err);
        else {
            if (res == 0) {
                callbackFn(null, 0);
                return;
            }
            redis.domain(userUid).h("gameSwitch").getJSON(id, function(err, res) {
                if (err) callbackFn(err);
                else {
                    if (res == null) callbackFn(null, 0);
                    else {
                        if (res["open"] == 0) callbackFn(null, 0);
                        else {
                            var eTime = (res["eTime"] == 0) ? jutil.now() + 999999 : res["eTime"];
                            if (jutil.now() > res["sTime"] && jutil.now() < eTime) {
                                callbackFn(null, res["open"]);
                            } else {
                                callbackFn(null, 0);
                            }
                        }
                    }
                }
            });
        }
    });
}

//    redis.domain(userUid).h("gameSwitch").getJSON(id, function(err, res) {
//        if (res == null) {
//            var sql = "SELECT * FROM switch WHERE id=" + mysql.escape(id) + "LIMIT 1";
//            mysql.game(userUid).query(sql, function(err, res) {
//                if (err || res == null || res.length == 0) callbackFn(err);
//                else {
//                    var mObj = res[0];
//                    redis.domain(userUid).h("gameSwitch").setJSON(id, mObj);
//                    callbackFn(null, mObj);
//                }
//            });
//        } else {
//            callbackFn(null, res);
//        }
//    });
//}


exports.SHAKE_ACTIVITY = 1;

exports.getSwitchOpen = getSwitchOpen;