/**
 * 标记mail列表为已读
 * User: liyuluan
 * Date: 13-12-4
 * Time: 下午4:41
 */

var mail = require("../model/mail");
var jutil = require("../utils/jutil");

/**
 * 标记成功返回 ： {"result":1}
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    var userUid = query["userUid"];

    mail.markingHaveRead(userUid,function(err,res) {
        if (err) response.echo("mail.read",jutil.errorInfo("dbError"));
        else {
            response.echo("mail.read",{"result":1});
        }
    });
}

exports.start = start;