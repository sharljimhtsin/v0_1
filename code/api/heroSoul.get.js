/**
 * 取hero魂魄列表
 * User: liyuluan
 * Date: 13-11-1
 * Time: 下午5:16
 */

var jutil = require("../utils/jutil");
var heroSoul = require("../model/heroSoul");


function start(postData, response, query) {
    var userUid = query["userUid"];
    heroSoul.getHeroSoul(userUid,function(err,res) {
        if (err) response.echo("heroSoul.get",jutil.errorInfo("dbError"));
        else {
            response.echo("heroSoul.get",res);
        }
    });
}

exports.start = start;