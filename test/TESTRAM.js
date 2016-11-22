/**
 * Created by xiayanxin on 2016/9/23.
 */

var async = require("async");
var activityData = require("../code/model/activityData");
var activityConfig = require("../code/model/activityConfig");
var configManager = require("../code/config/configManager");
var jutil = require("../code/utils/jutil");
var redRibbon = require("../code/model/redRibbon");
require("../code/alien/log/console");

var userUid = "12935233570";
var redRibbonConfig = null;     // 活动配置
var point = 0;                  // 后台点数
var rwWord = null;                // 随机索引表
var rIndexArr = [];
var rwInfoArr = [];             // 奖励数据

async.series([
    function (cb) { // 判断活动是否开放
        redRibbonConfig = configManager.createConfig(userUid).getConfig("redRibbonTreasure");
        cb();
    },
    function (cb) { // 获取数据
        point = 10000;
        rwWord = 5;
        cb();
    },
    function (cb) { // 计算奖品INDEX
        async.until(function () { // 判断是否抽到10条
            return rwInfoArr.length == 10;
        }, function (ucb) {
            // 特殊奖励抽取
            if (point >= redRibbonConfig["pointToGood"]) {
                var prop = (point - redRibbonConfig["pointToGood"]) / (redRibbonConfig["pointGoodMax"] - redRibbonConfig["pointToGood"]);
                if (prop != 0) {
                    var random = Math.random();
                    if (random >= 0 && random < prop) { // 抽到了特殊的
                        var goodContent = redRibbonConfig["goodContent"];
                        rIndexArr.push(8); // 特殊奖励
                        rwInfoArr.push(__randomItemFromArray(goodContent));
                        point = Math.max(0, point - redRibbonConfig["pointGoodReduce"]);
                        ucb(null);
                        return;
                    }
                }
            }
            // 最后一天抽取
            if (true) {
                for (var i = 1; i <= 7; ++i) { // 索引1-7
                    if (!jutil.bitGet(rwWord, i - 1)) {
                        rIndexArr.push(i);
                        rwInfoArr.push(__randomItemFromArray(redRibbonConfig["badContent"][i]));
                        ucb(null);
                        return;
                    }
                }
            }
            // 普通抽取
            var randomVal = Math.random();
            var badProb = redRibbonConfig["badProb"];
            var baseVal = 0;
            for (var key in badProb) {
                if (badProb.hasOwnProperty(key)) {
                    if (randomVal >= baseVal && randomVal < (badProb[key] - 0 + baseVal)) {
                        rIndexArr.push(key);
                        rwInfoArr.push(__randomItemFromArray(redRibbonConfig["badContent"][key]));
                        ucb(null);
                        return;
                    }
                    baseVal += badProb[key] - 0;
                }
            }

        }, function (err) {
            if (err) cb(err);
            else cb(null);
        });
    }
], function (err) {
    console.log(err, rwInfoArr, rIndexArr, rwWord);
});

function __randomItemFromArray(arr) {
    var randomIdx = Math.floor(Math.random() * arr.length);
    return arr[randomIdx];
}