/**
 * 消费排行榜获取接口
 * User: za
 * Date: 14-12-29
 * Time: 下午14:11
 */
var jutil = require("../utils/jutil");
var async = require("async");
var consumeRanking = require("../model/consumeRanking");
var user = require("../model/user");
var formation = require("../model/formation");
function start(postData, response, query) {
    var userUid = query["userUid"];
    var currentConfig;
    var key = null;
    var topList = [];
    var top = 0;
    var number = 0;
    var eTime = 0;
    var sTime = 0;
    var mStatus = 0;//奖励领取状态
    var isAll = 0;
    async.series([
        // 获取活动配置数据
        function(cb) {
            consumeRanking.getConfig(userUid, function(err, res){
                if (err) cb(err);
                else {
                    sTime = res[0];
                    eTime = res[1];
                    currentConfig = res[2];
                    key = currentConfig["key"];
                    isAll = parseInt(currentConfig["isAll"])||0;
                    cb(null);
                }
            });
        },
        function(cb) {
            consumeRanking.getTop(userUid, key,isAll, function(err, res){
                if (err) cb(err);
                else {
                    if(res != null)
                        top = res-0+1;
                    cb(null);
                }
            });
        },
        function(cb) {//获取消费数
            consumeRanking.getNumber(userUid, key,isAll, function(err, res){
                if (err) cb(err);
                else {
                    if(res != null)
                        number = res-0; //&& res-0>20000;
                    cb(null);
                }
            });
        },
        // 取个人保存的奖励列表
        function(cb) {
            consumeRanking.getTopList(userUid, key,isAll, function(err, res){
                if (err) cb(err);
                else {
                    topList = res;
                    cb(null);
                }
            });
        },
        //获取领取状态
        function(cb){
            consumeRanking.getRewardStatus(userUid,sTime,function(err,res){
                if (err) cb(err);
                else {
                    if(res != null){
                        mStatus = res;
                    }
                    cb(null);
                }
            });
        },
        function(cb){
            async.eachSeries(topList, function(item,esCb){
                user.getUser(item["userUid"], function(err, res){
                    if(err){
                        esCb(err);
                    } else {
                        item["userName"] = res["userName"];
                        formation.getUserHeroId(item["userUid"],function(err, res){
                            if(err){
                                esCb(err);
                            }else{
                                item["heroId"] = res;
                                esCb(null);
                            }
                        });
                    }
                });
            }, cb);
        }
    ], function(err){
        if (err) {
            response.echo("consumeRanking.get",  jutil.errorInfo(err));
        } else {
            response.echo("consumeRanking.get",  {"currentConfig":currentConfig,"topList":topList, "top":top, "number":number,"eTime":eTime,"mStatus":mStatus});
        }
    },true);
}
exports.start = start;