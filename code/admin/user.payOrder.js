/**
 * user.payOrder 用户充值记录
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午3:58
 */


var admin = require("../model/admin");
var order = require("../model/order");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.payOrder", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.payOrder", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);
    admin.addOneOperationLog("userInfo",query,postData);
    var payConfig = configData.getConfig("pay");

    var userUid = postData["userUid"];
    var status = 1;
    var datas = [];

    order.getOrderList(userUid, function(err, res) {
        if (err || res == null){
            response.echo("user.payOrder", {"ERROR":"USER_ERROR","info":err});
        } else {
            for(var i in res){
                var d = new Date(parseInt(res[i].createTime) * 1000);
                res[i].createTime = jutil.formatTime("Y-m-d H:i:s", res[i].createTime);
                if(res[i].status != status)continue;
                //if(payConfig[res[i].platformId] != undefined && payConfig[res[i].platformId][res[i].productId] != undefined)
                //    res[i]["product"] = skillConfig[res[i].skillId].name;
                datas.push(res[i]);
            }
            response.echo("user.payOrder", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);