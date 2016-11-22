/**
 * 取传书列表
 * User: liyuluan
 * Date: 13-12-4
 * Time: 下午3:57
 */

var mail = require("../model/mail");
var jutil = require("../utils/jutil");


function start(postData, response, query) {
    var userUid = query["userUid"];

//    mail.addMail(5,-1,"请早起",0,0,function(err,res) {
//        response.echo("mail.get",{"err":err, "res":res});
//    });
    mail.getMailList(userUid, function(err,res) {
        if (err) response.echo("mail.get",jutil.errorInfo("dbError"));
        else {
            for(var i in res){
                if(res[i]["message"] != null){
                    res[i]["message"] = jutil.toBase64(res[i]["message"]);
                }
            }
            response.echo("mail.get",res);
        }
    });
}

exports.start = start;