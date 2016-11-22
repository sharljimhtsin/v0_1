/**
 * user.card 用户卡片队列
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午3:23
 */


var admin = require("../model/admin");
var card = require("../model/card");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.card", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData, "userUid") == false) {
        response.echo("user.card", jutil.errorInfo("postError"));
        return;
    }
    var configData = configManager.createConfigFromCountry(query["country"]);

    var cardConfig = configData.getConfig("card");

    var userUid = postData["userUid"];
    var datas = [];
    admin.addOneOperationLog("userInfo",query,postData);
    card.getCardList(userUid, function(err, res) {
        if (err){
            response.echo("user.card", {"ERROR":"USER_ERROR","info":err});
        } else if(res == null) {
            response.echo("user.card", []);
        } else {
            for(var i in res){
                if(res[i].cardId != 0 && cardConfig[res[i].cardId] != undefined)
                    res[i]["card"] = cardConfig[res[i].cardId].name;
                datas.push(res[i]);
            }
            response.echo("user.card", datas);
        }
    });
}
exports.start = admin.adminAPIProxy(start);