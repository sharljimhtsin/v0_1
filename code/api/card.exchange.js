/**
 * card.exchange
 * User: liyuluan
 * Date: 13-11-26
 * Time: 下午2:25
 */
var jutil = require("../utils/jutil");
var user = require("../model/user");
var card = require("../model/card");
var itemModel = require("../model/item");
//var configData = require("../model/configData");
var configManager = require("../config/configManager");
var async = require("async");

function start(postData, response, query) {
    if (jutil.postCheck(postData,"cardId") == false) {
        response.echo("card.exchange", jutil.errorInfo("postError"));
        return;
    }
    var userUid = query["userUid"];
    var cardId = postData["cardId"];
    var configData = configManager.createConfig(userUid);

    var cardConfig = configData.getConfig("card");
    var cardItemConfig = cardConfig[cardId];
    if (cardItemConfig == null || cardItemConfig["exchangeCost"] == 0) {
        response.echo("card.exchange", jutil.errorInfo("noExchange"));
        return;
    }

    var gUserData = null;
    var gExchangeCost = null;//兑换需要数量
    var rCard = null;//兑换出来的卡片
    var rSex = null;//色情杂志信息

    async.series([
        function(cb) {
            user.getUser(userUid,function(err,res) {
                if (err) cb("dbError");
                else {
                    gUserData = res;
                    //var mUserExp = gUserData["exp"];
                    //var mUserLevel = configData.userExpToLevel(mUserExp);
                    if (gUserData["lv"] < cardItemConfig["exchangeLevelLimit"]) {
                        cb ("userLevelInsufficient");
                    } else {
                        cb (null);
                    }
                }
            });
        },
        function(cb) { //判断兑换数量是否够
            itemModel.getItem(userUid,"151601",function(err,res) {
                if (err) cb("dbError");
                else if (res == null) cb("sexInability")
                else {
                    var sexNumber = res["number"];
                    if (sexNumber < cardItemConfig["exchangeCost"]) {
                        cb("sexInability");
                    } else {
                        gExchangeCost = cardItemConfig["exchangeCost"] - 0;
                        cb(null);
                    }
                }
            });
        },
        function(cb) {//添加卡片
            card.addCardList(userUid,[cardId],function(err,res) {
                if (err) cb("dbError");
                else {
                    rCard = (res != null)?res[0]:null;
                    cb(null);
                }
            });
        },
        function(cb) { //删除色情杂志（真元)
            itemModel.updateItem(userUid,"151601",-gExchangeCost,function(err,res) {
                rSex = (res == null)?0:res["number"];
                cb (null);
                if (err) console.error("card.exchange", err.stack);
            });
        }
    ],function(err) {
        if (err) response.echo("card.exchange",jutil.errorInfo(err));
        else {
            response.echo("card.exchange",{"card":rCard,"sex":rSex});
        }
    });
}

exports.start = start;