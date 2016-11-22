/**
 * 索尼币（银两）获得统计
 * User: liyuluan
 * Date: 14-4-17
 * Time: 下午4:03
 */

var mongo = require("../../alien/db/mongo");

var GoldGetSchema = new mongo.Schema(
    {
        userUid:Number,
        count:Number, //消耗数量
        typeId:Number, //用途
        other:String, //其它数据
        time:{type:Number, default:Date.now}
    });


function getModel(userUid) {
    return mongo.getModel(userUid, "GoldGet", GoldGetSchema);
}


exports.getModel = getModel;
