/**
 * user.info 某个取用户信息
 * User: liyuluan
 * Date: 14-1-28
 * Time: 下午9:38
 */


var admin = require("../model/admin");
var user = require("../model/user");
var jutil = require("../utils/jutil");
var login = require("../model/login");
var bitUtil = require("../alien/db/bitUtil");
var configManager = require("../config/configManager");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.info", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.info", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);
    var userUid = postData["userUid"];
//    var country = query["country"];

    user.getUser(userUid, function(err, res) {
        if (err) response.echo("user.info", {"ERROR":"USER_ERROR","info":"没有此用户"});
        else if (res == null) {
            response.echo("user.info", {"ERROR":"USER_ERROR","info":"没有此用户"});
        } else {
            res["userName"] = jutil.fromBase64(res["userName"]);
            var mCode = bitUtil.parseUserUid(userUid)
            login.getStopAccountList(mCode[0], mCode[1], function(err, userUidList) {
                res['isStop'] = 0;
                if (userUidList.indexOf(userUid-0) != -1) {
                    res['isStop'] = 1;
                }
                res["country"] = mCode[0];
                res["city"] = mCode[1];
                var configData = configManager.createConfig(userUid);
                //读取当前体力和精力
                var time = jutil.now();
                var pve = configData.getPvePower(res["pvePower"],res["lastRecoverPvePower"],time);
                res["pvePower"] = pve[0];
                res["lastRecoverPvePower"] = pve[1];
                var pvp = configData.getPvpPower(res["pvpPower"],res["lastRecoverPvpPower"],time);
                res["pvpPower"] = pvp[0];
                res["lastRecoverPvpPower"] = pvp[1];
                //res['lv'] = configData.userExpToLevel(res["exp"]);
                response.echo("user.info", [res]);
            });
       }
    });

}
exports.start = admin.adminAPIProxy(start);