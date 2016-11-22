/**
 * package.open
 * User: liyuluan
 * Date: 14-1-8
 * Time: 上午10:37
 */

var jutil = require("../utils/jutil");
var itemModel = require("../model/item");
var configManager = require("../config/configManager");
var modelUtil = require("../model/modelUtil");
var async = require("async");
var mongoStats = require("../model/mongoStats");


/**
 * 礼包打开接口 package.open
 * 参数
 *      itemId 物品ID
 * 返回
 *      newItemData  当前的物品数据
 *      resultData  得到的物品当前数据
 *      packContent 礼包里的内容
 *
 * @param postData
 * @param response
 * @param query
 */
function start(postData, response, query) {
    if (jutil.postCheck(postData, "itemId") == false) {
        response.echo("package.open", jutil.errorInfo("postError"));
        return;
    }
    var itemId = postData["itemId"];
    var itemCount = postData["itemCount"] ? postData["itemCount"] - 0 : 1;
    var userUid = query["userUid"];
    var configData = configManager.createConfig(userUid);
    var itemData = null;
    var resultData = []; //掉落的结果
    var packContent = null;//包内容
    var newItemData = null;//道具信息
    async.series([
        function (cb) { //取item
            itemModel.getItem(userUid, itemId, function (err, res) {
                if (err) {
                    cb("dbError");
                } else if (res == null || res["number"] < itemCount) {
                    cb("noItem");
                } else {
                    itemData = res;
                    cb();
                }
            });
        },
        function (cb) {
            itemModel.updateItem(userUid, itemId, -1 * itemCount, function (err, res) {
                newItemData = res;
                cb(err);
            });
        },
        function (cb) {
            var mPackContent = configData.g("package")(itemId)();
            packContent = [];
            for (var i = 0; i < itemCount; i++) {
                for (var key in mPackContent) {
                    var mKey = key;
                    if (key == "zeni") mKey = "gold";
                    if (key == "imegga") mKey = "ingot";
                    packContent.push({"id": mKey, "count": mPackContent[key]});
                }
            }
            async.eachSeries(Object.keys(packContent), function (key, esCb) {
                var packItem = packContent[key];
                mongoStats.dropStats(packItem["id"], userUid, '127.0.0.1', null, mongoStats.PACKAGE, packItem["count"]);
                modelUtil.addDropItemToDB(packItem["id"], packItem["count"], userUid, 0, 1, function (err, res) {
                    resultData.push(res);
                    esCb(err);
                });
            }, function (err) {
                cb(err);
            });
        }
    ], function (err) {
        if (err) {
            response.echo("package.open", jutil.errorInfo(err));
        } else {
            response.echo("package.open", {
                "newItemData": newItemData,
                "resultData": resultData,
                "packContent": packContent
            });
        }
    });
}

exports.start = start;