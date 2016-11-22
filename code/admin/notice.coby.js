/**
 * notice.add
 * User: liyuluan
 * Date: 14-2-7
 * Time: 下午6:24
 */


var admin = require("../model/admin");
var redis = require("../alien/db/redis");
var jutil = require("../utils/jutil");
var notice = require("../model/notice");
var async = require("async");

function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["notice"], query["country"]) == false) {
        response.echo("notice.coby", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "city", "notice") == false) {
        response.echo("notice.coby", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("announcement",query,postData);
    var country = query["country"];
    var city = postData["city"];
    var noticeData = postData["notice"]

    var resList = {};

    async.forEach(noticeData, function(n, forCb) {
        var noticeId = jutil.day() * 100000 + Math.floor(Math.random() * 100000);
        n.text = n.text.replace(/\n/g,"\\n");
        notice.getNoticesByTitle(country, city, n.title,function(err,res){
            if(err) forCb(err);
            else if(res != null && res.length != 0){//存在更新
                notice.updateNotice(country, city, noticeId, n.title, n.scrollText, n.name, n.text, n.stime, n.etime , n.channel , n.sort, function(err, res) {
                    if (err) resList[city] = 0;
                    else resList[city] = 1;
                    forCb(null);
                });
            }else{
                notice.addNotice(country, city, noticeId, n.title, n.scrollText, "", n.text, n.stime, n.etime , n.channel , n.sort, function(err, res) {
                    if (err) resList[city] = 0;
                    else resList[city] = 1;
                    forCb(null);
                });
            }
        });
    }, function(err, res) {
        redis.domain(country, city).s("noticeTime").set(jutil.now());
        redis.domain(country, city).s("notice").del();
        if(err){
            response.echo("notice.coby", null);
        }else{
            response.echo("notice.coby", resList);
        }
    });

}

exports.start = admin.adminAPIProxy(start);