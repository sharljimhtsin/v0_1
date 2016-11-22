/**
 * Created by xiayanxin on 2016/5/30.
 */


var admin = require("../model/admin");
var teach = require("../model/teach");
var jutil = require("../utils/jutil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.worldBossTeach.del", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.worldBossTeach.del", jutil.errorInfo("postError"));
        return;
    }
    var userUid = postData["userUid"];
    var teachUid = postData["teachUid"];
    var datas = [];
    admin.addOneOperationLog("userInfo",query,postData);
    teach.delWorldBossTeach(userUid,teachUid, function (err, res) {
        if (err){
            response.echo("user.worldBossTeach.del", {"ERROR":"USER_ERROR","info":err});
        } else if(res == null) {
            response.echo("user.worldBossTeach.del", []);
        } else {
            response.echo("user.worldBossTeach.del", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);