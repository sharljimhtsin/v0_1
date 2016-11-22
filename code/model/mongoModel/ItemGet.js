/**
 * 道具获得的统计
 * User: liyuluan
 * Date: 14-4-17
 * Time: 下午3:40
 */


var mongo = require("../../alien/db/mongo");

//道具消耗
var ItemGetSchema = new mongo.Schema(
    {
        userUid:Number,
        itemId:String, //道具ID
        count:Number, //获得数量
        typeId:Number, //来源
        other:String, //其它数据
        time:{type:Number, default:Date.now}
    });


function getModel(userUid) {
    return mongo.getModel(userUid, "ItemGet", ItemGetSchema);
}


exports.getModel = getModel;


exports.SHOP = 1;//商店