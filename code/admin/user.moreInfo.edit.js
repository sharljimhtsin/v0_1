/**
 * user.moreInfo.eidt 用户扩展信息编辑
 * User: za
 * Date: 14-11-15
 * Time: 下午15:13
 */
var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var user = require("../model/user");
var configManager = require("../config/configManager");
var userVariable = require("../model/userVariable");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.moreInfo.edit", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "name") == false) {
        response.echo("user.moreInfo.edit", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);
    var userUid = postData["userUid"];
    var name = postData["name"];
    var value = postData["value"];
    var time = postData["time"];
    var table = postData["table"];
    switch(table){
        case "user":
            var newData = {};
            newData[name] = value;
            user.updateUser(userUid, newData, function(err, res){
                response.echo("user.moreInfo.edit",{"status":1});
            });
            break;
        case "variable":
            userVariable.setVariableTime(userUid,name,value,time, function(err, res){
                response.echo("user.moreInfo.edit",{"status":1});
            });
            break;
    }
}
exports.start = admin.adminAPIProxy(start);