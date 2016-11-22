/**
 * user.specialTeam.edit 用户特战队队列--编辑阵位信息功能
 * User: za
 * Date: 15-4-16
 * Time: 中午12:04
 */
var admin = require("../model/admin");
var specialTeam = require("../model/specialTeam");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");
var async = require("async");
function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.specialTeam.edit", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "position") == false) {
        response.echo("user.specialTeam.edit", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var userUid = postData["userUid"];
    var position = postData["position"];
//    delete postData["specialTeam"];-- ？？？
    for(var i in postData){
        postData[i] = postData[i] - 0;
    }
    specialTeam.updateByPosition(userUid,position,postData,function(err,res){
        response.echo("user.specialTeam.edit", {"status":1});
    });
}
exports.start = admin.adminAPIProxy(start);