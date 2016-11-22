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
        response.echo("notice.add", admin.AUTH_ERROR);
        return;
    }

    if (jutil.postCheck(postData, "city", "title", "scrollText", "channel","name", "text", "stime", "etime") == false) {
        response.echo("notice.add", jutil.errorInfo("postError"));
        return;
    }
    admin.addOneOperationLog("announcement",query,postData);
    var country = query["country"];
    var city = postData["city"];

    var cityList = null;
    if (city == 0) {
        cityList = admin.getCountryCityList(country);
    } else {
        cityList = [city];
    }

    var p = postData;

    var resList = {};
    var noticeId = jutil.day() * 100000 + Math.floor(Math.random() * 100000);
    p.text = p.text.replace(/\n/g,"\\n");
    async.forEach(cityList, function(cityValue, forCb) {
        notice.getNoticesByTitle(country, cityValue , p.title ,function(err,res){
            if(err) forCb(err);
            else if(res != null && res.length != 0){//存在更新
                notice.updateNotice(country, cityValue, noticeId, p.title, p.scrollText, p.name, p.text, p.stime, p.etime , p.channel , p.sort, function(err, res) {
                    if (err) resList[cityValue] = 0;
                    else resList[cityValue] = 1;
                    redis.domain(country, cityValue).s("noticeTime").set(jutil.now());
                    redis.domain(country, cityValue).s("notice").del();
                    forCb(null);
                });
            }else{
                notice.addNotice(country, cityValue, noticeId, p.title, p.scrollText, p.name, p.text, p.stime, p.etime , p.channel , p.sort, function(err, res) {
                    if (err) resList[cityValue] = 0;
                    else resList[cityValue] = 1;
                    redis.domain(country, cityValue).s("noticeTime").set(jutil.now());
                    redis.domain(country, cityValue).s("notice").del();
                    forCb(null);
                });
            }
        });
    }, function(err, res) {
        response.echo("notice.add", resList);
    });
}

exports.start = admin.adminAPIProxy(start);