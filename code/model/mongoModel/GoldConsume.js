/**
 * 索尼币（银两）消耗统计
 * User: liyuluan
 * Date: 14-4-17
 * Time: 下午3:56
 */

var mongo = require("../../alien/db/mongo");

var GoldConsumeSchema = new mongo.Schema(
    {
        userUid:Number,
        count:Number, //消耗数量
        typeId:{type:Number, default:0}, //用途
        other:String, //其它数据
        time:{type:Number, default:Date.now}
    });


function getModel(userUid) {
    return mongo.getModel(userUid, "GoldConsume", GoldConsumeSchema);
}


exports.getModel = getModel;
