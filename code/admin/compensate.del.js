/**
 * compensate.del
 * User: liyuluan
 * Date: 14-3-3
 * Time: 下午3:32
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");



function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["sendGift"], query["country"]) == false) { //添加补偿采用 发送奖励权限
        response.echo("compensate.del", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "id") == false) {
        response.echo("compensate.del", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("compensateM",query,postData);
    var country = query["country"];
    var mId = postData["id"];
    admin.delCompensate(country, mId, function(err, res) {
        if (err) response.echo("compensate.del", jutil.errorInfo("dbError"));
        else {
            response.echo("compensate.del", res);
        }
    });
}
exports.start = admin.adminAPIProxy(start);