var mysql = require("./mysql");

//左移操作  同 <<   支持大于int类型
function leftShift(value, num) {
    return Math.pow(2,num) * value;
}


//右移操作  同 >>   支持大于int类型
function rightShift(value, num) {
    return Math.floor(value / Math.pow(2,num));
}

/**
 * 截取一个数高位到低位之间的值  示例： slice(0x00E200, 16,8).toString(16)  返回 “E2"
 * @param value
 * @param start
 * @param end
 * @returns {Number}
 */
function slice(value, start, end) {
    var mValue = value;
    if (end > 1) {
        mValue = rightShift(value, end);
    }
    mValue = mValue % (Math.pow(2, start - end));
    return mValue;
}


/**
 * 解析用户ID  [0]=> 大分区码 a b c ...  [1]  分区id
 */
function parseUserUid(userUid, noConvert) {
    var returnArray = [];

    var mCountry = rightShift(userUid, 32);
    if (mCountry <= 0) {
        mCountry = 1;
    }
    returnArray.push(String.fromCharCode(mCountry + 96));

    var mCity = slice(userUid, 32, 24);
    if (mCity <= 0) {
        mCity = 1;
    }
    returnArray.push(mCity);

    if (noConvert) {
        return returnArray;
    }

    //处理合服
    returnArray[1] = mysql.getMergedCity(returnArray[0], returnArray[1]);
    return returnArray;
}

/**
 * 解析用户ID的所在区服值
 * @param userUid
 * @returns {Array}
 */
function userUidCC(userUid) {
    return rightShift(userUid, 24);
}


/**
 * 生成userUid
 * @param country
 * @param city
 * @param id
 */
function createUserUid(country, city, id) {
    var a = country.charCodeAt(0) - 96;
    var b = city - 0;
    var c = id - 0;
    return leftShift(a,32) + leftShift(b, 24) + c;
}



exports.leftShift = leftShift;
exports.rightShift = rightShift;
exports.slice = slice;
exports.parseUserUid = parseUserUid;
exports.createUserUid = createUserUid;
exports.userUidCC = userUidCC;