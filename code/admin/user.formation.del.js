/**
 * user.formation 用户编队队列--清空阵位信息功能
 * User: za
 * Date: 14-11-10
 * Time: 下午18:46
 */
var admin = require("../model/admin");
var formation = require("../model/formation");
var hero = require("../model/hero");
var skill = require("../model/skill");
var card = require("../model/card");
var equipment = require("../model/equipment");
var jutil = require("../utils/jutil");
var async = require("async");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.formation.del", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "formationUid") == false) {
        response.echo("user.formation.del", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);

    var userUid = postData["userUid"];
    var formationUid = postData["formationUid"];

    formation.removeFormation(userUid,formationUid,function(err, res){
        response.echo("user.formation.del", {"status":1});
    });
}
exports.start = admin.adminAPIProxy(start);