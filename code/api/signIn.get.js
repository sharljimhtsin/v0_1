/******************************************************************************
 * 每日签到
 * 数据获取接口
 * Create by MR.Luo.
 * Create at 14-7-4.
 *****************************************************************************/

var async = require("async");
var jutil = require("../utils/jutil");
var signInMod = require("../model/signIn");

exports.start = function(postData, response, query) {
    var userUid = query["userUid"];
    var signInData = null; // 签到数据
    var gRes = {};
    var F_DAY_MASK = 0; // 以前
    var T_DAY_MASK = 1; // 今天
    var B_DAY_MASK = 2; // 以后
    async.series([
        function(cb) { // 获取数据
            signInMod.getData(userUid, function(err, res){
                if (err) cb(err);
                else {
                    signInData = res;
                    cb(null);
                }
            });
        },
        function(cb) {
            var date = new Date(jutil.now() * 1000);
            var curMonth = date.getMonth() + 1;
            var curDate = date.getDate();
            gRes["month"] = curMonth; // 当前月份，用于前端选择配置
            var attrMap = {};
            var monthConfig = signInData["monthConfig"];
            var signInCount = signInData["signInCount"];
            var getMask = signInData["getMask"]; // getMask < 2 表示今天有可能可以领取，等于2表示已经领取
            var oldVipLv = signInData["oldVipLv"];
            var newVipLv = signInData["newVipLv"];
            var tKey = null;
            for (var key in monthConfig) {
                if (monthConfig.hasOwnProperty(key)) {
                    var nKey = key - 0;
                    if (nKey < curDate) {
                        attrMap[key] = {
                            "dayMask" : F_DAY_MASK
                        };
                    } else if (nKey == curDate) {
                        if (getMask == 0) {
                            attrMap[key] = {
                                "dayMask" : F_DAY_MASK
                            };
                        } else { // 今天的数据
                            attrMap[key] = {
                                "dayMask" : T_DAY_MASK,
                                "getMask" : getMask
                            };
                            tKey = key;
                        }
                    } else {
                        if (nKey != (curDate + 1)) {
                            attrMap[key] = {
                                "dayMask" : B_DAY_MASK
                            };
                        } else {
                            if (getMask == 0) { // 今天的数据
                                attrMap[key] = {
                                    "dayMask" : T_DAY_MASK,
                                    "getMask" : getMask
                                };
                                tKey = key;
                            } else {
                                attrMap[key] = {
                                    "dayMask" : B_DAY_MASK
                                };
                            }
                        }
                    }
                }
            }

            if (tKey) { // 检查是否可以领奖
                var todayAttr= attrMap[tKey];
                if (todayAttr["getMask"] == 0) { // 今日可以领取
                    todayAttr["canGet"] = true;
                } else {
                    if (todayAttr["getMask"] == 1) { // 有可能可以领取
                        var todayRwCfg = monthConfig[tKey];
                        if (todayRwCfg["isDouble"] == 1) {
                            var dVipLv = todayRwCfg["doubleVip"];
                            if (oldVipLv < dVipLv && newVipLv >= dVipLv) {
                                todayAttr["canGet"] = true;
                            }
                        }
                    }
                }
            }
            gRes["attrMap"] = attrMap;
            gRes["signInCount"] = signInCount;
            cb(null);
        }
    ], function(err){
        if (err) {
            response.echo("signIn.get",  jutil.errorInfo(err));
        } else {
            response.echo("signIn.get",  gRes);
        }
    });
};