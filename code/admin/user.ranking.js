/**
 * 返回用户的排行榜
 * user.ranking
 * User: liyuluan
 * Date: 14-4-23
 * Time: 下午2:52
 */


var admin = require("../model/admin");
var jutil = require("../utils/jutil");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("user.ranking", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "type", "city", "day") == false) {
        response.echo("user.ranking", jutil.errorInfo("postError"));
        return;
    }

    var country = query["country"];
    var city = postData["city"];
    var mType = postData["type"]; //类别 level  pvp top5,6,7,8
    var day = parseInt(postData["day"]);//时间
    if (mType != "rechargeRanking" && mType != "consumeRanking" && mType != "cosmosEvaluation" && mType != "cosmosLeague" && mType != "leagueStarInfo" &&
        mType != "level" && mType != "pvp" && mType != "top5" && mType != "top6" && mType != "top7" && mType != "top8" || isNaN(day)) {
        response.echo("user.ranking", jutil.errorInfo("postError"));
        return;
    }

    if (mType == "level") {
        admin.getLevelRanking(country, city, jutil.day() - day, function(err, res) {
           if (err) {
               response.echo("user.ranking", jutil.errorInfo("dbError"));
           } else {
               response.echo("user.ranking", res || []);
           }
        });
    } else if(mType == "rechargeRanking") {//充值排行
        admin.getRechargeRanking(country, city, postData["key"], function(err, res) {
            if (err) {
                response.echo("user.ranking", jutil.errorInfo("dbError"));
            } else {
                response.echo("user.ranking", res || []);
            }
        });
    }else if(mType == "consumeRanking") {//消费排行
        admin.getConsumeRanking(country, city, postData["key"], function(err, res) {
            if (err) {
                response.echo("user.ranking", jutil.errorInfo("dbError"));
            } else {
                response.echo("user.ranking", res || []);
            }
        });
    }else if(mType == "cosmosEvaluation") {//宇宙第一排行
        admin.getCosmosEvaluation(country, city, postData["key"], function(err, res) {
            if (err) {
                response.echo("user.ranking", jutil.errorInfo("dbError"));
            } else {
                response.echo("user.ranking", res || []);
            }
        });
    }else if(mType == "cosmosLeague") {//宇宙第一联盟排行
        admin.getCosmosLeague(country, city, postData["key"], function(err, res) {
            if (err) {
                response.echo("user.ranking", jutil.errorInfo("dbError"));
            } else {
                response.echo("user.ranking", res || []);
            }
        });
    }else if(mType == "leagueStarInfo") {//联盟星球战信息
        admin.getLeagueStarInfo(country, city, function(err, res) {
            if (err) {
                response.echo("user.ranking", jutil.errorInfo("dbError"));
            } else {
//                console.log(res,"admin..");
                response.echo("user.ranking", res || []);
            }
        });
    }else if(mType == "pvp") {
        admin.getPvpRanking(country, city, jutil.day() - day, function(err, res) {
            if (err) {
                response.echo("user.ranking", jutil.errorInfo("dbError"));
            } else {
                response.echo("user.ranking", res || []);
            }
        });
    } else {
        admin.getBloodyRanking(country, city, mType, jutil.day() - day, function(err, res) {
            if (err) {
                response.echo("user.ranking", jutil.errorInfo("dbError"));
            } else {
                response.echo("user.ranking", res || []);
            }
        })
    }

}
exports.start = admin.adminAPIProxy(start);