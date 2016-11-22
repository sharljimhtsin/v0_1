/**
 * user.teach 用户指点队列
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午3:23
 */


var admin = require("../model/admin");
var teach = require("../model/teach");
var jutil = require("../utils/jutil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.worldBossTeach", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.worldBossTeach", jutil.errorInfo("postError"));
        return;
    }
    var userUid = postData["userUid"];
    var datas = [];
    admin.addOneOperationLog("userInfo",query,postData);
    teach.getWorldBossTeachList(userUid, function(err, res) {
        if (err){
            response.echo("user.worldBossTeach", {"ERROR":"USER_ERROR","info":err});
        } else if(res == null) {
            response.echo("user.worldBossTeach", []);
        } else {
            for(var k in res){
                if(res[k].teachUid != 0){
                    if(res[k].level == 26){
                        res[k]["name"] = "加林仙人指点";//26
                    }else if(res[k].level == 59){
                        res[k]["name"] = "波波先生指点";//59
                    }else{
                        res[k]["name"] = "大长老指点";//116
                    }
                    datas.push(res[k]);
                }
            }
            response.echo("user.worldBossTeach", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);