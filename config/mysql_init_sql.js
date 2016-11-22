
var mArgv = process.argv;
if (mArgv.length > 2) {
    var mName = mArgv[2];
    switch (mName) {
        case "rank":
            var pvpRankFakeDataJSON = require("./a/pvpRankFakeData");
            var mConfig = pvpRankFakeDataJSON["pvpRankFakeData"];
            console.log(initPvpRobot(mConfig));
            break;
        case "shop":
            var shopJSON = require("./a/shop");
            var mConfig = shopJSON["shop"];
            console.log(initShop(mConfig));
            break;
        default :
            console.log("请传参数 rank shop");
            break;
    }

} else {
    console.log("请传参数 rank shop");
}


function initPvpRobot(config) {
    var pvpRankFakeDataConfig = config;
    var sql = "INSERT INTO `pvptop` (`top`, `userUid`, `robot`) VALUES \n";
    var rank = 1;
    var list = [];
    for (var key in pvpRankFakeDataConfig) {
        list.push("(" + rank + "," + (key - 0) + ",1)");
        rank++;
    }
    sql += list.join(",\n");
    sql += ";"
    return sql;
}


function initShop(config) {
    var sql = "INSERT INTO `shop` (`type`, `buyPrice`, `originPrice`, `priceType`,`vip`,`count`,`itemId`) VALUES \n";
    var list = [];
    for (var key in config) {
        var cList = [];
        var itemConfig = config[key];
        cList.push(itemConfig["type"] - 0);
        cList.push(itemConfig["buyPrice"] - 0);
        cList.push(itemConfig["originPrice"] - 0);
        cList.push((itemConfig["buyPriceType"] == "imegga")?1:0);
        cList.push(itemConfig["canBuyVip"] - 0);
        cList.push(itemConfig["buyCountTotal"] - 0);
        cList.push('"' + key + '"');
        var rowStr = cList.join(",");
        list.push("(" + rowStr + ")");
    }
    sql += list.join(",\n");
    sql += ";"
    return sql;
}
