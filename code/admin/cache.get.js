/**
 * cache.get
 * User: za
 * Date: 14-3-3
 * Time: 下午4:32
 */

var admin = require("../model/admin");
var jutil = require("../utils/jutil");
var async = require("async");
var redis = require("../alien/db/redis");


function start(postData, response, query, authorize) {
    if (admin.checkAuth(authorize, ["userView"], query["country"]) == false) {
        response.echo("cache.get", admin.AUTH_ERROR);
        return;
    }
    if (jutil.postCheck(postData,"userUid","key") == false) {
        response.echo("cache.get", jutil.errorInfo("postError"));
        return;
    }
    var country = query["country"];
    var city = postData["city"];
    var key = postData["key"];
    var keyType = postData["keyType"];
    var userUid = postData["userUid"];


    var rest = [];
    var redisDB;
    switch (keyType){
        case 'user':
            redisDB = redis.user(userUid);
            break;
        case 'domain':
            redisDB = redis.domain(country,city);
            break;
        case 'login':
            redisDB = redis.login(country);
            break;
        default :
            redisDB = redis.user(userUid);
            break;
    }

    redisDB.k(key).keys(function(err, res){
        async.each(res, function(k, cb){
            var sk = k.split(":");
            if(keyType == "user"){
                sk.pop();
            } else if(keyType == "domain") {
                sk.shift();
            }
            var nk = sk.join(":");
            redisDB.k(nk).type(function(err, res){
                switch (res){
                    case "string":
                        redisDB.s(nk).get(function(err, res){
                            rest.push({"key":nk, "name":nk, "value":res, "city":city,"userUid":userUid});
                            cb(null);
                        })
                        break;
                    case "hash":
                        redisDB.h(nk).getObj(function(err, res){
                            for(var i in res){
                                rest.push({"key":nk, "name":i,"value":res[i], "city":city,"userUid":userUid});
                            }
                            cb(null);
                        })
                        break;
                    case "zset":
                        redisDB.z(nk).getAllRevKV(function(err, res){
                            for(var i = 0; i < res.length; i+=2){
                                rest.push({"key":nk, "name":res[i],"value":res[i+1], "city":city,"userUid":userUid});
                            }
                            cb(null);
                        })
                        break;
                    case "list":
                        redisDB.l(nk).range(0, 100, function (err, res) {
                            for (var i = 0; i < res.length; i += 2) {
                                rest.push({"key": nk, "name": i, "value": res[i], "city": city, "userUid": userUid});
                            }
                            cb(null);
                        })
                        break;
                    default :
                        cb(null);
                }
            });
        },function(err, res){
            response.echo("cache.get",rest);
        });
    });
}
exports.start = admin.adminAPIProxy(start);