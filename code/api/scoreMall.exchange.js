/**
* 积分商城兑换接口
* * User: za
* Date: 14-12-11
* Time: 下午21:30
*/
var jutil = require("../utils/jutil");
var async = require("async");
var item = require("../model/item");
var modelUtil = require("../model/modelUtil");
var mongoStats = require("../model/mongoStats");
var scoreMall = require("../model/scoreMall");
var redis = require("../alien/db/redis");
var user = require("../model/user");
var stats = require("../model/stats");
function start(postData, response, query) {
    if (jutil.postCheck(postData,"index") == false) {
        response.echo("scoreMall.exchange", jutil.errorInfo("postError"));
        return;
    }
    var index = postData["index"];
    var userUid =query["userUid"];
    var userPoint = 0;
    var buyCount = 1;
    var buyResult;
    var shopList;
    var shopItem;
    async.series([
        function(cb){//取用户积分
            scoreMall.getData(userUid,function (err, res) {
                if (err) cb(err);
                else {
                    userPoint = res[3]["point"]-0;
                    shopList = res[2]["shopList"];
                    cb(null);
                }
            });
        },
        function(cb){//取商城数据(根据下标)
            if(shopList[index] == undefined){
                cb("notSold");
            } else {
                shopItem = shopList[index];
                cb(null);
            }
        },
        function (cb) {//兑换，1。先判断积分是否充足，够的情况下，积分扣除，物品获得；不够的情况，报错
            userPoint = userPoint - shopItem["cost"] * buyCount;
            if (userPoint < 0) {
                cb("pointNotEnough");
            }else{//兑换
                scoreMall.setPoint(userUid,userPoint,cb);
            }
        },
        function(cb){
            var mItemId = shopItem["id"];
            stats.dropStats(mItemId, userUid, "127.0.0.1", null, mongoStats.scoreMall, buyCount * shopItem["count"]);
            mongoStats.dropStats(mItemId, userUid, '127.0.0.1', null, mongoStats.SCOREMALL_BUY, buyCount * shopItem["count"]);
            modelUtil.addDropItemToDB(mItemId, buyCount * shopItem["count"], userUid, false, 1, function (err, res) {
                buyResult = res;
                cb(null);
            });

        }
    ],function(err, res){
        if(err)
            response.echo("scoreMall.exchange", jutil.errorInfo(err));
        else{
            var resultData = {};
            resultData["chipData"] = userPoint;
            resultData["dropItemData"] = buyResult;

            response.echo("scoreMall.exchange", resultData);
        }
    });
}
exports.start = start;

