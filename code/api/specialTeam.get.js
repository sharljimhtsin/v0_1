/**
 * 取特战队数据
 * User: joseppe
 * Date: 14-4-21
 * Time: 下午5:29
 */

//var user = require("../model/user");
var specialTeam = require("../model/specialTeam");
//var hero = require("../model/hero");
//var async = require("async");
var jutil = require("../utils/jutil");

function start(postData, response, query) {
    var userUid = query["userUid"];

    specialTeam.get(userUid,function(err, res){
        if(err){
            response.echo("specialTeam.get",jutil.errorInfo("getUserError"));
        } else {
            response.echo("specialTeam.get",res);
        }
    });
}

exports.start = start;