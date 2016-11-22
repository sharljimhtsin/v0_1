/**
 * 取公告列表
 * User: liyuluan
 * Date: 14-2-7
 * Time: 下午5:59
 */
var admin = require("../model/admin");
var notice = require("../model/notice");
var jutil = require("../utils/jutil");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["login"], query["country"]) == false) {
        response.echo("notice.get", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "city") == false) {
        response.echo("notice.get", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("announcement",query,postData);
    var country = query["country"];
    var city = postData["city"];


    notice.getNotices(country, city, function(err, res) {
        if (err) response.echo("notice.get", {"ERROR":"DB_ERROR","info":"数据调用出错！"});
        else {
            for(var i in res){
                res[i].text = res[i].text.replace(/\\n/g, "\n");
            }
            response.echo("notice.get", res);
        }
    });
}

exports.start = admin.adminAPIProxy(start);