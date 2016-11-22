/**
 * 获取上次召唤的时间信息
 * User: liyuluan
 * Date: 13-11-6
 * Time: 下午2:42
 */
var jutil = require("../utils/jutil");
var summon = require("../model/summon");
var async = require("async");


function start(postData, response, query) {
    var userUid = query["userUid"];
    var freesummon = null;
    var paysummon = null;
    async.series([
        function(cb) {
            summon.getFreesummon(userUid,function(err,res){
                if (err) {
                    cb("dbError");
                    //response.echo("summon.get",jutil.errorInfo("dbError"));
                } else {
                    freesummon = res;
                    cb(null);
//                    response.echo("summon.get",res);
                }
            });
        },
        function(cb) {
            summon.getSummon(userUid, function(err, res) {
                if (err) {
                    cb("dbError");
                } else {
                    paysummon = {};
                    if (res == null) {
                        paysummon["summon1"] = 0;
                        paysummon["summon2"] = 0;
                        paysummon["summon3"] = 0;
                    } else {
                        paysummon["summon1"] = res["summon1"];
                        paysummon["summon2"] = res["summon2"];
                        paysummon["summon3"] = res["summon3"];
                    }
                    cb(null);
                }
            });
        }
    ], function(err) {
        if (err) response.echo("summon.get", jutil.errorInfo("summon.get"));
        else {
            response.echo("summon.get", {"freesummon":freesummon, "paysummon":paysummon});
        }
    });
}

exports.start = start;