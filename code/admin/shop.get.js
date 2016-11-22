/**
 * Shop.get
 * User: liyuluan
 * Date: 14-2-25
 * Time: 下午4:34
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var configManager = require("../config/configManager");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("shop.get", admin.AUTH_ERROR);
        return;
    }


    admin.addOneOperationLog("shopM",query,postData);
    var country = query["country"];
    var configData = configManager.createConfigFromCountry(country);//后台使用中文配置
    var itemConfig = configData.getConfig("item");

    admin.getShopList(country, function(err, res) {
        if (err) response.echo("shop.get", jutil.errorInfo("dbError"));
        else {
            //var resultData = [];//res;
            for(var i in res){
                res[i]["name"] = '';
                if(itemConfig[res[i]["itemId"]] != undefined)
                    res[i]["name"] = itemConfig[res[i]["itemId"]]["name"];
            }
            var listStr = "[]";
            try {
                listStr = JSON.stringify(res);
            } catch(error) {
                console.error(error.stack);
            }
            response.echoString("shop.get", listStr)
        }
    });
}
exports.start = admin.adminAPIProxy(start);