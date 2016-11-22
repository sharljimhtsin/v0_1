/**
 * user.stopAccount 用户封号
 * User: joseppe
 * Date: 14-5-19
 * Time: 下午18:30
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var login = require("../model/login");
var bitUtil = require("../alien/db/bitUtil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.stopAccount", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.stopAccount", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("stopAccount",query,postData);

    var userUid = postData["userUid"];
    var isStop = 0;
    var mCode = bitUtil.parseUserUid(userUid)
    login.getStopAccountList(mCode[0], mCode[1], function(err, res){
        if (res.indexOf(userUid-0) != -1) {
            isStop = 1;
        }
        if(isStop == 1){//解除封号
            login.delStopAccount(userUid, function(err, res){
                response.echo("user.stopAccount", res);
            });
        } else {//设置封号
            login.setStopAccount(userUid, function(err, res){
                response.echo("user.stopAccount", res);
            });
        }
    });
}
exports.start = admin.adminAPIProxy(start);