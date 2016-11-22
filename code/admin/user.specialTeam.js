/**
 * user.specialTeam 用户特战队信息
 * User: za
 * Date: 15-4-16
 * Time: 下午11:27
 */
var admin = require("../model/admin");
var specialTeam = require("../model/specialTeam");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.specialTeam", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.specialTeam", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    var specialTeamConfig = configData.getConfig("specialTeam");
    var userUid = postData["userUid"];
    var datas = [];
    admin.addOneOperationLog("userInfo",query,postData);
    specialTeam.get(userUid, function(err, res) {
        if (err){
            response.echo("user.specialTeam", {"ERROR":"USER_ERROR","info":err});
        } else if(res == null) {
            response.echo("user.specialTeam", []);
        } else {
            for(var i in res){
                if(res[i].position != 0 && specialTeamConfig["position"][res[i].position] != undefined)
                    res[i]["specialTeam"] = specialTeamConfig["position"][res[i].position].name;
                datas.push(res[i]);
            }
            response.echo("user.specialTeam", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);