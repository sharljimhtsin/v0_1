/**
 * user.teach 用户点拨队列
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午3:23
 */


var admin = require("../model/admin");
var teach = require("../model/teach");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.teach", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.teach", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);

    var teachConfig = configData.getConfig("teach");

    var userUid = postData["userUid"];
    var datas = [];
    admin.addOneOperationLog("userInfo",query,postData);
    teach.getTeachList(userUid, function(err, res) {
        if (err){
            response.echo("user.teach", {"ERROR":"USER_ERROR","info":err});
        } else if(res == null) {
            response.echo("user.teach", []);
        } else {
            for(var i in res){
                if(res[i].teachUid != 0)
                    res[i]["name"] = teachConfig[res[i].level].name;
                datas.push(res[i]);
            }
            response.echo("user.teach", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);