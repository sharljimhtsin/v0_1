/**
 * 发送一条留言
 * User: liyuluan
 * Date: 13-12-4
 * Time: 下午6:14
 */

var jutil = require("../utils/jutil");
var mail = require("../model/mail");

/**
 * 参数:
 *      addressee 收件人
 *      message 发送的消息
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "addressee", "message") == false) {
        response.echo("mail.send",jutil.errorInfo("postError"));
        return;
    }
    var addressee = postData["addressee"];
    var message = postData["message"];

    if (message.length > 200) message = message.substring(0,200);
    message = jutil.filterWord2(message);
    var userUid = query["userUid"];
    mail.addMail(addressee,userUid,message,"",0,function(err,res) {
        if (err) response.echo("mail.send","dbError");
        else {
            response.echo("mail.send",{"result":1});
        }
    });
}

exports.start = start;