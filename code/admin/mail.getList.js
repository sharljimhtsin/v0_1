/**
 * Created with JetBrains WebStorm.
 * User: jichang
 * Date: 14-4-14
 * Time: 下午3:21
 * To change this template use File | Settings | File Templates.
 */
var admin = require("../model/admin");
var jutil = require("../utils/jutil.js");
var mail = require("../model/mail");
var async = require("async");
function start(postData, response, query, authorize) {
    mail.getOneMonthMailList(query["country"],function(err,res){
        if(err != null){
            response.echo("mail.getList", jutil.errorInfo(err));
        }else{
            response.echo("mail.getList", res);
        }
    });
}
exports.start = start;