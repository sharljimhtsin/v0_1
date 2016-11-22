/**
 * 用户道具的消耗统计
 * User: liyuluan
 * Date: 14-4-17
 * Time: 下午3:39
 */


var mongo = require("../../alien/db/mongo");

//道具消耗
var ItemConsumeSchema = new mongo.Schema(
    {
        userUid:Number,
        itemId:String, //道具ID
        count:Number, //消耗数量
        typeId:{type:Number, default:0}, //用途 ， 对于有多种用途的道具需要有用途类别
        other:String, //其它数据
        time:{type:Number, default:Date.now}
    });


function getModel(userUid) {
    return mongo.getModel(userUid, "ItemConsume", ItemConsumeSchema);
}


exports.getModel = getModel;

