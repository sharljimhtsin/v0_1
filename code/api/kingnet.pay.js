/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-5-16
 * Time: 下午5:57
 * To change this template use File | Settings | File Templates.
 */
var https = require("https");
var urlParse = require("url").parse;
var async = require("async");
var jutil = require("../utils/jutil");
var post = require("../model/methodPost");
function start(postData, response, query) {
    postData["role_id"] = query["userUid"];
    postData["user_id"] = postData["kingnetid"];
    postData["app_extra1"] = postData["active1"];
    console.log("jichang.........." + JSON.stringify(postData));
    postData["inapp_data_signature"] = encodeURIComponent(postData["inapp_data_signature"]).replace(/%20/g, '+');
    delete postData["kingnetid"];
    delete postData["active1"];
//    postData["action"] = "googleplay";
//    postData["resource_id"] = "1146095";
    var url = "http://pay4.kingnet.com/?action=googleplay&resource_id=1146095";
    console.log("requestTimeStart............." + jutil.now());
    post.nodePostData(url,postData,function(err,res){
        console.log("requestTimeEnd............." + jutil.now());
        if(err) {
            response.echo("kingnet.pay", jutil.errorInfo(err));
        }else {
            response.echo("kingnet.pay", {"msg":res["msg"]});
        }
    });
}
exports.start = start;