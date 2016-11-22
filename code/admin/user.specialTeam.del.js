/**
 * user.specialTeam.del 用户特战队队列--清空阵位信息功能
 * User: za
 * Date: 15-4-16
 * Time: 下午11:53
 */
var admin = require("../model/admin");
var specialTeam = require("../model/specialTeam");
var jutil = require("../utils/jutil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userModify"], query["country"]) == false) {
        response.echo("user.specialTeam.del", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid", "position") == false) {
        response.echo("user.specialTeam.del", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("userInfo",query,postData);

    var userUid = postData["userUid"];
    var position = postData["position"];

    specialTeam.getByPosition(userUid,position,function(err,res){
        if(err){
            callback(err);
        }else if(res != null && res["heroUid"] != undefined){
            specialTeam.removeByPosition(userUid,position,function(err,res){
                if(err){
                    callback(err);
                }else{
                    response.echo("user.specialTeam.del", {"status":1});
                }
            });
        }
    });
}
exports.start = admin.adminAPIProxy(start);