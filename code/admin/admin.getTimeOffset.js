/**
 * User: liyuluan
 * Date: 14-3-26
 * Time: 下午3:51
 */
//获取服务器数据
var admin = require("../model/admin");
var jutil = require("../utils/jutil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("admin.getTimeOffset", admin.AUTH_ERROR);
        return;
    }
    response.echo("admin.getTimeOffset", {"result":jutil.getTimeOffset()});
}


exports.start = admin.adminAPIProxy(start);
