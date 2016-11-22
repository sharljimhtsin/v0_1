/**
 * 取技能招式（碎片）列表
 * User: liyuluan
 * Date: 13-12-9
 * Time: 下午3:02
 */

var jutil = require("../utils/jutil");
var debris = require("../model/debris");

/**
 *  没有参数
 *  返回
 *      技能碎片列表(数组)
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];

    debris.getDebrisList(userUid, function(err,res) {
        if (err) response.echo("debris.get",jutil.errorInfo("dbError"));
        else {
            response.echo("debris.get", res);
        }
    });
}

exports.start = start;