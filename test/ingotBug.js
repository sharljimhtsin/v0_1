var mongo = require("../code/alien/db/mongo");
var async = require("async");

//元宝消耗
var IngotExpendSchema = new mongo.Schema(
    {
        userUid:Number,
        ingot:Number, //元宝数
        typeId:String, //消耗类别
        time:{type:Number, default:Date.now}
    });






var mArgv = process.argv;

if (mArgv.length < 4){
    return;
}


var server = mArgv[3];
var serverSE = server.split("_");
var serverS = 1;
var serverE = 1;
if (serverSE.length == 1) {
    serverE = serverSE[0] -1;
} else {
    serverS= serverSE[0] - 0;
    serverE= serverSE[1] - 0;
}

var cityList = [];
for (var i = serverS; i <= serverE; i++) {
    cityList.push(i);
}

var country = mArgv[2];

var nameDic = {"c":"越狱", "d":"IOS", "f":"Android"};

console.log("平台:", nameDic[country]);

async.forEachSeries(cityList, function(city, cb) {

    console.log("区服:", city);
    var IngotExpend = mongo.getModelFromCountry(country, city, "IngotExpend", IngotExpendSchema);
    IngotExpend.find({"ingot":{"$lt":0}}, function(err, res) {
        var userList = {};
        for (var i = 0; i < res.length; i++) {
            var mUserUid = res[i]["userUid"];
            var mIngot = res[i]["ingot"];
            if (userList[mUserUid] == null) userList[mUserUid] = 0;

            userList[mUserUid] += mIngot;
        }
        console.log(JSON.stringify(userList, null, 2));
        cb(null);
    });
}, function(err, res) {
    console.log("END......");
});


