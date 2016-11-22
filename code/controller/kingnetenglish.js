/******************************************************************************
 * Copyright (C) 671643387@qq.com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 * ***************************************************************************/

/******************************************************************************
 * 凯英 英语 安卓
 *****************************************************************************/

var post = require("../model/postData");
function check(platformUserId, info, callbackFn) {
    callbackFn(null, null);
    return;
    var token = info["token"];
    var kingnetid = info["kingnetid"];
    var sendData = {};
    sendData["token"] = token;
    sendData["kingnetid"] = kingnetid;
    var queryUrl = "http://api.4game.com.tw/m/mapp/valid?token=" + token + "&kingnetid=" + kingnetid;
    post.postData(queryUrl, sendData, function (err, res) {
        if (res != null && res["ret"] == 0) { // 验证成功
            callbackFn(null, null);
        } else {
            console.log("kingnet login", "http://api.4game.com.tw/m/mapp/valid", sendData, err, res);
            callbackFn(null, null);
            //callbackFn(res["ret"], res["msg"]);
        }
    });
}
exports.check = check;