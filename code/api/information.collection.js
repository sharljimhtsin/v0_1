/**
 * 信息收集
 * User: joseppe
 * Date: 14-5-13
 * Time: 下午4:49
 */

var jutil = require("../utils/jutil");
var user = require("../model/user");
var modelUtil = require("../model/modelUtil");
var async = require("async");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"name","qq","mobile") == false) {
        response.echo("information.collection", jutil.errorInfo("postError"));
        return;
    }

    var userUid = query["userUid"];

    var giftList = [{'id':151836,'count':1},{'id':151601,'count':5},{'id':150901,'count':200}]; // 奖励物品

    var rewardList = null;
    var info = {};
    info['reward'] = '';
    info['name'] = postData['name']==null?'':postData['name'].trim();
    info['qq'] = postData['qq']==null?'':postData['qq'].trim();
    info['mobile'] = postData['mobile']==null?'':postData['mobile'].trim();

    async.series([
        //用户vip等级限制
        function(callbackFn) {
            user.getUser(userUid,function(err, res){
                if(res != null && res['vip'] >= 7){
                    callbackFn(null);
                } else {
                    callbackFn('need vip 7');
                }
            });
        },
        //判断是否已经写入
        function(callbackFn) {
            user.getInformation(userUid,function(err, res){
                if(res != null && res['reward'] != ''){
                    info['reward'] = res['reward'];
                    info['name'] = jutil.fromBase64(res['name']);
                    giftList = [];
                    callbackFn(null);
                } else {
                    callbackFn(null);
                }
            });
        },
        //领取物品
        function(callbackFn) {
            rewardList = [];
            if(info['reward'] == '' && info['name'] != '' && info['qq'] != '' && info['mobile'] != ''){
                info['reward'] = jutil.now();
                async.forEach(giftList, function(giftItem, forCb) {
                    if (giftItem == null || giftItem["id"] == null) {
                        forCb(null);
                    } else {
                        var mCount = giftItem["count"] || 1;
                        var mIsPatch = giftItem["isPatch"] || 0;
                        var mLevel = giftItem["level"] || 1;
                        var mIsHero = giftItem["isHero"] || false;

                        //mongoStats.dropStats(giftItem["id"], userUid, 0, null, mongoStats.CDKEY, mCount);
                        modelUtil.addDropItemToDB(giftItem["id"], mCount, userUid, mIsPatch, mLevel, mIsHero, function(err, res) {
                            if (err) console.error(err.stack);
                            rewardList.push(res);
                            forCb(null);
                        });
                    }
                }, function(err) {
                    callbackFn(null);
                });
            } else {
                callbackFn(null);
            }
        },
        //写入
        function(callbackFn) {
            user.setInformation(userUid, info, function(err, res) {
                if (err) { console.error(err.stack) };
                callbackFn(null);
            });
        }
    ], function(err) {
        if (err) response.echo("information.collection", jutil.errorInfo(err));
        else {
            info["name"] = jutil.toBase64(info["name"]);
            response.echo("information.collection", {"rewardList":rewardList, "giftList":giftList, "information":info});
        }
    });
}

exports.start = start;