/**
 * 删除邮件功能
 * ../code/api/mail.del.js
 * User: za
 * Date: 14-12-10
 * Time: 下午2:15
 */
var jutil = require("../utils/jutil.js");
var mail = require("../model/mail");
var async = require("async");
function start(postData, response, query, authorize) {
    if (jutil.postCheck(postData, "id") == false) {
        response.echo("mail.del", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var mailId = postData["id"];
    mail.delMail(userUid,mailId,function(err,res){
        if (err) response.echo("mail.del",jutil.errorInfo("dbError"));
        else{
            response.echo("mail.del",{"status":"1"});
        }
    });
}
exports.start = start;