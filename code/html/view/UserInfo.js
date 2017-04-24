/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-7-16
 * Time: 下午6:22
 * To change this template use File | Settings | File Templates.
 */
function UserInfo() {

    var userUid = null;
    var offsetTime = 0;

//  用户基本信息 /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    var selModel = Ext.create('Ext.selection.CheckboxModel');
    //基本信息页签
    var userInfoStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["userUid", "userName", "exp", "lv", "gold", "ingot","pvePower", "pvpPower","lastRecoverPvePower","lastRecoverPvpPower",
            "vip", "cumulativePay", "momentum", "city","action", "isStop"],//"acrtion","isStop","lastRecoverPvpPower", "lastRecoverPvePower", "country", "status",
        data: []
    });
    //扩展信息
    var userMoreInfoStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["name", "des", "value", "time", "table"],
        data: []
    });
    //编队
    var userFormationStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["formationUid", "hero",
            "skill2", "skill3",
            "equip1", "equip2", "equip3",
            "card1", "card2", "card3", "card4", "card5", "card6"],
        data: []
    });
    //特战队
    var userSpecialTeamStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["position", "heroUid", "strong", "level", "times"],
        data: []
    });
    //英雄
    var userHeroStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["heroUid", "hero", "exp", "level", "hp", "attack", "defence",
            "spirit", "skillLevel", "skillExp", "research", "hpAdd", "attackAdd",
            "defenceAdd", "spiritAdd", "potential", "break", "train", "energy"],
        data: []
    });
    //装备
    var userEquipmentStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["equipmentUid", "equipment", "level", "refining", "refiningLevel", "hole1", "hole2", "hole3", "hole4"],
        data: []
    });
    //道具
    var userItemStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["id", "itemId", "item", "number", "type"],
        data: []
    });
    //技能
    var userSkillStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["skillUid", "skillId", "skill", "skillLevel", "skillExp"],
        data: []
    });
    //魂魄
    var userHeroSoulStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["id", "heroId", "hero", "count"],
        data: []
    });
    //技能碎片
    var userDebrisStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["id", "skill", "type1", "type2", "type3", "type4", "type5", "type6", "operand", "operandNum"],
        data: []
    });
    //邮件
    var userMailStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["id", "rewardId", "sender", "status", "message", "reward", "sendTime", "receiveTime"],
        data: []
    });
    //卡片
    var userCardStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["cardUid", "cardId", "card", "exp", "level"],
        data: []
    });
    //充值
    var userPayOrderStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["id", "orderNo", "platformId", "uin",
            "productId", "goodsCount", "orderMoney",
            "payStatus", "createTime", "status"],
        data: []
    });
    //指点
    var userWorldBossTeachStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["teachUid", "level", "time","name"],
        data: []
    });
    //点拨
    var userTeachStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["teachUid", "level", "time","name"],
        data: []
    });

    //修改用户信息窗口
    function showWindow(title, data, callbackFn) {
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 400,
            height: 450,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text:LipiUtil.t("确定"), handler: function () {
                    var newData = Ext.getCmp("mWindowForm").getValues();
                    callbackFn(newData);
                    mWindow.close();
                }},
                {xtype: "button", text: LipiUtil.t("取消"), handler: function () {
                    mWindow.close();
                }}
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "mWindowForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {fieldLabel: 'userUid', name: "userUid", disabled: true},
                        {fieldLabel: "用户名", name: "userName"},
                        {fieldLabel: "经验", name: "exp", xtype: 'numberfield'},
                        {fieldLabel: "等级", name: "lv", xtype: 'numberfield'},
                        {fieldLabel: "金币", name: "gold", xtype: 'numberfield'},
                        {fieldLabel: "元宝", name: "ingot", xtype: 'numberfield'},
                        {fieldLabel: "体力", name: "pvePower", xtype: 'numberfield'},
                        {fieldLabel: "体力倒计时", name: "lastRecoverPvePower", xtype: 'hidden'},
                        {fieldLabel: "精力", name: "pvpPower", xtype: 'numberfield'},
                        {fieldLabel: "精力倒计时", name: "lastRecoverPvpPower", xtype: 'hidden'},
                        {fieldLabel: "VIP", name: "vip", xtype: 'numberfield'},
                        {fieldLabel: "累计充值", name: "cumulativePay", xtype: 'numberfield'},
                        {fieldLabel: "先手值", name: "momentum", xtype: 'numberfield'},
                        {fieldLabel: "服", name: "city", disabled: true}
                    ]
                }
            ]
        });
        if (data != null) {
            Ext.getCmp("mWindowForm").form.setValues(data);
        }
        mWindow.show();
    }

    //绑定用户登录信息窗口
    function showBindWindow(title, data, callbackFn) {
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 400,
            height: 450,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {
                    xtype: "button", text: LipiUtil.t("确定"), handler: function () {
                    var newData = Ext.getCmp("bindWindowForm").getValues();
                    callbackFn(newData);
                    mWindow.close();
                }
                },
                {
                    xtype: "button", text: LipiUtil.t("取消"), handler: function () {
                    mWindow.close();
                }
                }
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "bindWindowForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {fieldLabel: 'userUid', name: "userUid", disabled: true},
                        {fieldLabel: "用户名", name: "userName"},
                        {fieldLabel: "密码", name: "password"}
                    ]
                }
            ]
        });
        if (data != null) {
            data["userName"] = "a@b.cd";
            data["password"] = "123456";
            Ext.getCmp("bindWindowForm").form.setValues(data);
        }
        mWindow.show();
    }

    //充值窗口
    function showPayWindow(title, callbackFn) {
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 400,
            height: 250,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text: LipiUtil.t("确定"), handler: function () {
                    var newData = Ext.getCmp("mPayWindowForm").getValues();
                    callbackFn(newData);
                    mWindow.close();
                }},
                {xtype: "button", text: "取消", handler: function () {
                    mWindow.close();
                }}
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "mPayWindowForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {fieldLabel: "充值项", name: "productId", xtype: 'numberfield',value:1},
                        {fieldLabel: "金额(RMB)", name: "payMoney", xtype: 'numberfield',value:0},
                        {fieldLabel: "次数", name: "times", xtype: 'numberfield',value:1},
                        {xtype: "label", text: "若填写了金额，则充值以金额为准",style:'color:#999'}
                    ]
                }
            ]
        });
        mWindow.show();
    }

    //1.基本信息：(攻能：1.用户搜索,2.获取token,3.充值，4.解禁)
    var userInfoGrid = Ext.create("Ext.grid.Panel", {
        store: userInfoStore,
        border: false,
        columns: [
            {text: LipiUtil.t("userUid"), dataIndex: "userUid", flex: 0.8},
            {text: LipiUtil.t("用户名"), dataIndex: "userName", flex: 0.7},
            {text: LipiUtil.t("经验"), dataIndex: "exp", flex: 0.8},
            {text: LipiUtil.t("等级"), dataIndex: "lv", flex: 0.2},
            {text: LipiUtil.t("金币"), dataIndex: "gold", flex: 0.7},
            {text: LipiUtil.t("元宝"), dataIndex: "ingot", flex: 0.5},
            {text: LipiUtil.t("体力"), dataIndex: "pvePower", flex: 0.2},
            {text: LipiUtil.t("精力"), dataIndex: "pvpPower", flex: 0.2},
            {text: LipiUtil.t("VIP"), dataIndex: "vip", flex: 0.2},
            {text: LipiUtil.t("累充"), dataIndex: "cumulativePay", flex: 0.3},
            {text: LipiUtil.t("先手值"), dataIndex: "momentum", flex: 0.2},
            {text: LipiUtil.t("服"), dataIndex: "city", flex: 0.2},
            {xtype:"actioncolumn","text":LipiUtil.t("功能"),align:"center",flex: 0.8,items:[
                {    //攻能：1.修改基本信息
                    iconCls:"edit",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
                        showWindow("修改基本信息", cData, function (newUserData) {
                            var loadMask = Ext.create(Ext.LoadMask, Ext.getBody(), {msg: "请求中..."});
                            loadMask.show();
                            var mUserData = {};
                            mUserData["userName"] = newUserData["userName"];
                            mUserData["exp"] = newUserData["exp"];
                            mUserData["lv"] = newUserData["lv"];
                            mUserData["gold"] = newUserData["gold"];
                            mUserData["ingot"] = newUserData["ingot"];
                            mUserData["pvePower"] = newUserData["pvePower"];
                            mUserData["pvpPower"] = newUserData["pvpPower"];
                            mUserData["lastRecoverPvePower"] = newUserData["lastRecoverPvePower"];
                            mUserData["lastRecoverPvpPower"] = newUserData["lastRecoverPvpPower"];
                            mUserData["vip"] = newUserData["vip"];
                            mUserData["cumulativePay"] = newUserData["cumulativePay"];
                            mUserData["momentum"] = newUserData["momentum"];
                            LHttp.post("user.modify", {"userUid": userUid, "userData": mUserData}, function (data) {
                                loadMask.hide();
                                if (LipiUtil.errorCheck(data, "user.modify") == false) return;
                                reloadData(userInfoStore, "user.info");
                                Ext.Msg.alert("提示", "保存成功！");
                            });
                        });
                    }
                },
                '-',
                {    //2.获取token
                    iconCls:"settings",
                    handler: function (view,row,col,item,e) {
                    var cData = view.store.getAt(row).data;
                    LipiUtil.showLoading();
                        LHttp.post("user.getUserToken", {"userUid": cData.userUid}, function (data) {
                        LipiUtil.hideLoading();
                            if (LipiUtil.errorCheck(data, "user.getUserToken") == false) return;
                            Ext.Msg.alert("提示", data["user.getUserToken"]["token"]);
                        });
                    }
                },
                '-',
                {   //3.充值
                    iconCls:"add",
                    handler:function(view,row,col,item,e){
		    	        var cData = view.store.getAt(row).data;
                        showPayWindow("充值", function (newPayData) {
                            LipiUtil.showLoading();
                            newPayData["times"] = newPayData["times"] > 0?newPayData["times"]:1;
                            newPayData["userUid"] = cData.userUid;
                            LHttp.jsonp("user.charge", newPayData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.charge") == false) return;
                                reloadData(userInfoStore, "user.info");
                                Ext.Msg.alert("提示", "保存成功！");
                            });
                        });
                    }
                },
                '-',
                {   //4.解禁
                    iconCls:"delete",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
                        LipiUtil.showLoading();
                        LHttp.post("user.stopAccount", {"userUid": cData.userUid}, function (data) {
                            LipiUtil.hideLoading();
                            if (LipiUtil.errorCheck(data, "user.stopAccount") == false){
                                return;
                            }
                            reloadData(userInfoStore, "user.info");
                            if(cData["isStop"] == 1){
                                Ext.Msg.alert("提示", "解禁成功！");
                            }else{
                                Ext.Msg.alert("提示", "禁用成功！");
                            }
                        });
                    }
                },
                '-',
                {   //4.绑定
                    iconCls: "down",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showBindWindow("绑定登录信息", cData, function (newUserData) {
                            var loadMask = Ext.create(Ext.LoadMask, Ext.getBody(), {msg: "请求中..."});
                            loadMask.show();
                            var userName = newUserData["userName"];
                            var password = newUserData["password"];
                            LHttp.post("user.bind", {
                                "userUid": userUid,
                                "userName": userName,
                                "password": password
                            }, function (data) {
                                loadMask.hide();
                                if (LipiUtil.errorCheck(data, "user.bind") == false) return;
                                Ext.Msg.alert("提示", "绑定成功！");
                            });
                        });
                    }
                }
            ]}
        ]
    });
    //用户扩展信息
    var moreInfoGrid = Ext.create("Ext.grid.Panel", {
        store: userMoreInfoStore,
        border: false,
        columns: [
            {text: LipiUtil.t("字段名"), dataIndex: "name", flex: 1},
            {text: LipiUtil.t("字段说明"), dataIndex: "des", flex: 1},
            {text: LipiUtil.t("值"), dataIndex: "value", flex: 1},
            {text: LipiUtil.t("时间"), dataIndex: "time", flex: 1},
            //编辑和删除按钮
            {xtype:"actioncolumn","text":LipiUtil.t("编辑"),align:"center",items:[
                {
                    iconCls:"edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showEditWindow("编辑扩展信息", cData, function (newData) {
                            newData["time"] = Math.floor((new Date(newData["time"]).getTime())/1000);
                            LipiUtil.showLoading();
                            LHttp.post("user.moreInfo.edit", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.moreInfo.edit") == false) return;
                                var hero = data["user.moreInfo.edit"];
                                reloadData(userMoreInfoStore, "user.moreInfo");
                                Ext.Msg.alert("提示", "数据保存成功！");
                            });
                        });
                    }
                }
//                ,   待修改，先放着（za）
//                "-",
//                {
//                    iconCls:"delete",
//                    handler:function(view,row,col,item,e){
//                        var cData = view.store.getAt(row).data;
//                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
//                            if (button == "yes") {
//                                LipiUtil.showLoading();
//                                LHttp.post("user.moreInfo.del", {"userUid":cData.userUid}, function(data){
//                                    LipiUtil.hideLoading();
//                                    var hero = data["user.moreInfo.del"];
//                                    console.log(hero);
//                                    if (LipiUtil.errorCheck(data, "user.moreInfo.del") == false) return;
//                                    console.log(hero);
//                                    reloadData(userMoreInfoStore, "user.moreInfo");
//                                    Ext.Msg.alert("提示", "数据删除成功！");
//                                });
//                            }
//                        });
//                    }
//                }
            ]}
        ]
    });
    //2.用户信息--编队列表
    var userFormationGrid = Ext.create("Ext.grid.Panel", {
        store: userFormationStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "formationUid",width:80},
            {text: LipiUtil.t("弟子"), dataIndex: "hero", flex: 1},
            {text: LipiUtil.t("技能2"), dataIndex: "skill2", flex: 1},
            {text: LipiUtil.t("技能3"), dataIndex: "skill3", flex: 1},
            {text: LipiUtil.t("装备1"), dataIndex: "equip1", flex: 1},
            {text: LipiUtil.t("装备2"), dataIndex: "equip2", flex: 1},
            {text: LipiUtil.t("装备3"), dataIndex: "equip3", flex: 1},
            {text: LipiUtil.t("卡牌1"), dataIndex: "card1", flex: 1},
            {text: LipiUtil.t("卡牌2"), dataIndex: "card2", flex: 1},
            {text: LipiUtil.t("卡牌3"), dataIndex: "card3", flex: 1},
            {text: LipiUtil.t("卡牌4"), dataIndex: "card4", flex: 1},
            {text: LipiUtil.t("卡牌5"), dataIndex: "card5", flex: 1},
            {text: LipiUtil.t("卡牌6"), dataIndex: "card6", flex: 1},
            {xtype:"actioncolumn","text":LipiUtil.t("删除"),align:"center",items:[
                {
                    iconCls:"delete",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.formation.del", {"formationUid":cData.formationUid, "userUid":userUid}, function(data){
                                    LipiUtil.hideLoading();
                                    var uf = data["user.formation.del"];
                                    if (LipiUtil.errorCheck(data, "user.formation.del") == false) return;
                                    reloadData(userFormationStore, "user.formation");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    
    });

    function showEditWindow(title, data, callbackFn){
        var items = [];
        for(var i in data){
            items.push({"fieldLabel":i, "name":i});
        }
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 400,
            height: 450,
            autoScroll:true,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text: "确定", handler: function () {
                    var newData = Ext.getCmp("mWindowForm").getValues();
                    newData["userUid"] = userUid;
                    callbackFn(newData);
                    mWindow.close();
                }},
                {xtype: "button", text: LipiUtil.t("取消"), handler: function () {
                    mWindow.close();
                }}
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "mWindowForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    autoScroll:true,
                    items: items
                }
            ]
        });
        if (data != null) {
            Ext.getCmp("mWindowForm").form.setValues(data);
        }
        mWindow.show();
    }

    function addHeroToFormation(title, callbackFn) {
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 400,
            height: 200,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text: LipiUtil.t("确定"), handler: function () {
                    var newData = Ext.getCmp("formationUid").getValues();
                    callbackFn(newData);
                    mWindow.close();
                }},
                {xtype: "button", text: LipiUtil.t("取消"), handler: function () {
                    mWindow.close();
                }}
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "formationUid",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {fieldLabel: "阵位", name: "formationUid", xtype: 'numberfield'}
                    ]
                }
            ]
        });
        mWindow.show();
    }

    //@@.用户信息--特战队列表
    var userSpecialTeamGrid = Ext.create("Ext.grid.Panel", {
        store: userSpecialTeamStore,
        border: false,
        columns: [  //"id"，"position", "heroUid", "strong", "level", "times"
            {text: LipiUtil.t("阵位"), dataIndex: "position",flex: 1},
            {text: LipiUtil.t("上阵英雄"), dataIndex: "heroUid", flex: 1},
            {text: LipiUtil.t("强化"), dataIndex: "strong", flex: 1},
            {text: LipiUtil.t("强化等级"), dataIndex: "level", flex: 1},
            {text: LipiUtil.t("次数"), dataIndex: "times", flex: 1},
            {xtype:"actioncolumn","text":LipiUtil.t("编辑"),align:"center",items:[
                {
                    iconCls:"edit",
                    handler: function (view, row, col, item, e) {//需要修改
                        var cData = view.store.getAt(row).data;
                        showEditWindow("编辑特战队", cData, function (newData) {
                            LipiUtil.showLoading();
                            LHttp.post("user.specialTeam.edit", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.specialTeam.edit") == false) return;
                                reloadData(userSpecialTeamStore, "user.specialTeam");
                                Ext.Msg.alert("提示", "数据保存成功！");
                            });
                        });
                    }
                }
                ,
                "-",
                {
                    iconCls:"delete",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.specialTeam.del", {"position":cData.position, "userUid":userUid}, function(data){
                                    LipiUtil.hideLoading();
                                    var specialTeam = data["user.specialTeam.del"];
                                    if (LipiUtil.errorCheck(data, "user.specialTeam.del") == false) return;
                                    reloadData(userSpecialTeamStore, "user.specialTeam");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });
    //用户信息--伙伴列表
    var userHeroGrid = Ext.create("Ext.grid.Panel", {
        store: userHeroStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "heroUid", flex: 1},
            {text: LipiUtil.t("弟子"), dataIndex: "hero", flex: 1},
            {text: LipiUtil.t("弟子经验"), dataIndex: "exp", flex: 1},
            {text: LipiUtil.t("弟子等级"), dataIndex: "level", flex: 1},
            {text: LipiUtil.t("血量"), dataIndex: "hp", flex: 1},
            {text: LipiUtil.t("攻击"), dataIndex: "attack", flex: 1},
            {text: LipiUtil.t("防御"), dataIndex: "defence", flex: 1},
            {text: LipiUtil.t("内力"), dataIndex: "spirit", flex: 1},
            {text: LipiUtil.t("技能等级"), dataIndex: "skillLevel", flex: 1},
            {text: LipiUtil.t("技能经验"), dataIndex: "skillExp", flex: 1},
            {text: LipiUtil.t("研究院等级"), dataIndex: "research", flex: 1},
            {text: LipiUtil.t("培养而未接受的血量"), dataIndex: "hpAdd", flex: 1},
            {text: LipiUtil.t("培养而未接受的攻击"), dataIndex: "attackAdd", flex: 1},
            {text: LipiUtil.t("培养而未接受的防御"), dataIndex: "defenceAdd", flex: 1},
            {text: LipiUtil.t("培养而未接受的内力"), dataIndex: "spiritAdd", flex: 1},
            {text: LipiUtil.t("潜力值"), dataIndex: "potential", flex: 1},
            {text: LipiUtil.t("突破次数"), dataIndex: "break", flex: 1},
            {text: LipiUtil.t("培养丹消耗"), dataIndex: "train", flex: 1},
            {text: LipiUtil.t("已充入能量"), dataIndex: "energy", flex: 1},
            {xtype:"actioncolumn","text":LipiUtil.t("编辑"),align:"center",items:[
                {
                    iconCls:"add",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        addHeroToFormation("上阵英雄", function (newData) {
                            LipiUtil.showLoading();
                            LHttp.post("user.hero.add", {"userUid":userUid, "heroUid":cData.heroUid, "formationUid":newData.formationUid}, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.hero.add") == false) return;
                                reloadData(userFormationStore, "user.formation");
                                Ext.Msg.alert("提示", "数据保存成功！");
                            });
                        });
                    }
                },
                "-",
                {
                    iconCls:"edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showEditWindow("编辑英雄", cData, function (newData) {
                            LipiUtil.showLoading();
                            LHttp.post("user.hero.edit", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.hero.edit") == false) return;
                                var hero = data["user.hero.edit"];
                                reloadData(userHeroStore, "user.hero");
                                Ext.Msg.alert("提示", "数据保存成功！");
                            });
                        });
                    }
                },
                "-",
                {
                    iconCls:"delete",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.hero.del", {"heroUid":cData.heroUid, "userUid":userUid}, function(data){
                                    LipiUtil.hideLoading();
                                    var hero = data["user.hero.del"];
                                    if (LipiUtil.errorCheck(data, "user.hero.del") == false) return;
                                    reloadData(userHeroStore, "user.hero");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });
    //用户信息--装备列表
    var userEquipmentGrid = Ext.create("Ext.grid.Panel", {
        store: userEquipmentStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "equipmentUid", flex: 1},
            {text: LipiUtil.t("装备"), dataIndex: "equipment", flex: 1},
            {text: LipiUtil.t("等级"), dataIndex: "level", flex: 1},
            {text: LipiUtil.t("精炼值"), dataIndex: "refining", flex: 1},
            {text: LipiUtil.t("精炼等级"), dataIndex: "refiningLevel", flex: 1},
            {text: LipiUtil.t("hole1"), dataIndex: "hole1", flex: 1},
            {text: LipiUtil.t("hole2"), dataIndex: "hole2", flex: 1},
            {text: LipiUtil.t("hole3"), dataIndex: "hole3", flex: 1},
            {text: LipiUtil.t("hole4"), dataIndex: "hole4", flex: 1},
            {xtype:"actioncolumn","text":LipiUtil.t("编辑"),align:"center",items:[
                {
                    iconCls:"edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showEditWindow("编辑装备", cData, function (newData) {
                            LipiUtil.showLoading();
                            LHttp.post("user.equipment.edit", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.equipment.edit") == false) return;
                                reloadData(userEquipmentStore, "user.equipment");
                                Ext.Msg.alert("提示", "数据保存成功！");
                            });
                        });
                    }
                },
                "-",
                {
                    iconCls:"delete",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.equipment.del", {"equipmentUid":cData.equipmentUid, "userUid":userUid}, function(data){
                                    LipiUtil.hideLoading();
                                    var equipment = data["user.equipment.del"];
                                    if (LipiUtil.errorCheck(data, "user.equipment.del") == false) return;
                                    reloadData(userEquipmentStore, "user.equipment");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });
    //用户信息--道具列表
    var userItemGrid = Ext.create("Ext.grid.Panel", {
        store: userItemStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "id", flex: 1},
            {text: LipiUtil.t("道具id"), dataIndex: "itemId", flex: 1},
            {text: LipiUtil.t("道具"), dataIndex: "item", flex: 1},
            {text: LipiUtil.t("数量"), dataIndex: "number", flex: 1},
            {text: LipiUtil.t("类型"), dataIndex: "type", flex: 1},
            {xtype:"actioncolumn","text":LipiUtil.t("编辑"),align:"center",items:[
                {
                    iconCls:"edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showEditWindow("编辑物品", cData, function (newData) {
                            LipiUtil.showLoading();
                            LHttp.post("user.item.edit", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.item.edit") == false) return;
                                var item = data["user.item.edit"];
                                reloadData(userItemStore, "user.item");
                                Ext.Msg.alert("提示", "数据保存成功！");
                            });
                        });
                    }
                },
                '-',
                {
                    iconCls:"delete",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.item.edit", {"itemId":cData.itemId, "userUid":userUid, "number":0}, function(data){
                                    LipiUtil.hideLoading();
                                    if (LipiUtil.errorCheck(data, "user.item.edit") == false) return;
                                    var item = data["user.item.edit"];
                                    reloadData(userItemStore, "user.item");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });
    //用户信息--技能列表
    var userSkillGrid = Ext.create("Ext.grid.Panel", {
        store: userSkillStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "skillUid", flex: 1},
            {text: LipiUtil.t("技能id"), dataIndex: "skillId", flex: 1},
            {text: LipiUtil.t("技能"), dataIndex: "skill", flex: 1},
            {text: LipiUtil.t("技能等级"), dataIndex: "skillLevel", flex: 1},
            {text: LipiUtil.t("技能经验"), dataIndex: "skillExp", flex: 1},
            {xtype:"actioncolumn","text":LipiUtil.t("删除"),align:"center",items:[
                {
                    iconCls:"edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showEditWindow("编辑技能", cData, function (newData) {
                            LipiUtil.showLoading();
                            LHttp.post("user.skill.edit", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.skill.edit") == false) return;
                                var skill = data["user.skill.edit"];
                                reloadData(userSkillStore, "user.skill");
                                Ext.Msg.alert("提示", "数据保存成功！");
                            });
                        });
                    }
                },
                '-',
                {
                    iconCls:"delete",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.skill.del", {"skillUid":cData.skillUid, "userUid":userUid}, function(data){
                                    LipiUtil.hideLoading();
                                    var skill = data["user.skill.del"];
                                    if (LipiUtil.errorCheck(data, "user.skill.del") == false) return;
                                    reloadData(userSkillStore, "user.skill");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });
    //用户信息--魂魄列表
    var userHeroSoulGrid = Ext.create("Ext.grid.Panel", {
        store: userHeroSoulStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "id", flex: 1},
            {text: LipiUtil.t("弟子id"), dataIndex: "heroId", flex: 1},
            {text: LipiUtil.t("弟子"), dataIndex: "hero", flex: 1},
            {text: LipiUtil.t("数量"), dataIndex: "count", flex: 1},
            {xtype:LipiUtil.t("actioncolumn"),"text":LipiUtil.t("编辑"),align:"center",items:[
                {
                    iconCls:"edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showEditWindow("编辑魂魄", cData, function (newData) {
                            LipiUtil.showLoading();
                            LHttp.post("user.heroSoul.edit", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.heroSoul.edit") == false) return;
                                var heroSoul = data["user.heroSoul.edit"];
                                reloadData(userHeroSoulStore, "user.heroSoul");
                                Ext.Msg.alert("提示", "数据保存成功！");
                            });
                        });
                    }
                },
                '-',
                {
                    iconCls:"delete",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.heroSoul.edit", {"heroId":cData.heroId, "userUid":userUid, "count":0}, function(data){
                                    LipiUtil.hideLoading();
                                    if (LipiUtil.errorCheck(data, "user.heroSoul.edit") == false) return;
                                    var heroSoul = data["user.heroSoul.edit"];
                                    reloadData(userHeroSoulStore, "user.heroSoul");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });
    //用户信息--技能碎片列表
    var userDebrisGrid = Ext.create("Ext.grid.Panel", {
        store: userDebrisStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "id", flex: 1},
            {text: LipiUtil.t("技能"), dataIndex: "skill", flex: 1},
            {text: LipiUtil.t("type1"), dataIndex: "type1", flex: 1},
            {text: LipiUtil.t("type2"), dataIndex: "type2", flex: 1},
            {text: LipiUtil.t("type3"), dataIndex: "type3", flex: 1},
            {text: LipiUtil.t("type4"), dataIndex: "type4", flex: 1},
            {text: LipiUtil.t("type5"), dataIndex: "type5", flex: 1},
            {text: LipiUtil.t("type6"), dataIndex: "type6", flex: 1},
            {text: LipiUtil.t("可合成数"), dataIndex: "operand", flex: 1},
            {text: LipiUtil.t("已合成数"), dataIndex: "operandNum", flex: 1}
        ]
    });
    //用户信息--卡片列表
    var userCardGrid = Ext.create("Ext.grid.Panel", {
        store: userCardStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "cardUid", flex: 1},
            {text: LipiUtil.t("ID"), dataIndex: "cardId", flex: 1},
            {text: LipiUtil.t("弟子"), dataIndex: "card", flex: 1},
            {text: LipiUtil.t("经验"), dataIndex: "exp", flex: 1},
            {text: LipiUtil.t("等级"), dataIndex: "level", flex: 1},
            {xtype:"actioncolumn","text":LipiUtil.t("编辑"),align:"center",items:[
                {
                    iconCls:"delete",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.card.del", {"cardUid":cData.cardUid, "userUid":userUid}, function(data){
                                    LipiUtil.hideLoading();
                                    if (LipiUtil.errorCheck(data, "user.card.del") == false) return;
                                    reloadData(userCardStore, "user.card");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });
    //用户信息--邮件列表
    var userMailGrid = Ext.create("Ext.grid.Panel", {
        store: userMailStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "id", flex: 1},
            {text: LipiUtil.t("奖励ID"), dataIndex: "rewardId", flex: 1},
            {text: LipiUtil.t("发送者"), dataIndex: "sender", flex: 1},
            {text: LipiUtil.t("状态"), dataIndex: "status", flex: 1},
            {text: LipiUtil.t("内容"), dataIndex: "message", flex: 1},
            {text: LipiUtil.t("物品"), dataIndex: "reward", flex: 1},
            {text: LipiUtil.t("发送时间"), dataIndex: "sendTime", flex: 1},
            {text: LipiUtil.t("领取时间"), dataIndex: "receiveTime", flex: 1},
            {xtype:"actioncolumn","text":LipiUtil.t("编辑"),align:"center",items:[
                {
                    iconCls:"edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showEditWindow("编辑邮件", cData, function (newData) {
                            LipiUtil.showLoading();
                            LHttp.post("user.mail.edit", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.mail.edit") == false) return;
                                reloadData(userMailStore, "user.mail");
                                Ext.Msg.alert("提示", "数据保存成功！");
                            });
                        });
                    }
                },
                "-",
                {
                    iconCls:"delete",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.mail.del", {"id":cData.id, "userUid":userUid}, function(data){
                                    LipiUtil.hideLoading();
                                    var equipment = data["user.mail.del"];
                                    if (LipiUtil.errorCheck(data, "user.mail.del") == false) return;
                                    reloadData(userMailStore, "user.mail");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });
    //用户信息--充值列表
    var userPayOrderGrid = Ext.create("Ext.grid.Panel", {
        store: userPayOrderStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "id", flex: 1},
            {text: LipiUtil.t("订单号"), dataIndex: "orderNo", flex: 1},
            {text: LipiUtil.t("平台"), dataIndex: "platformId", flex: 1},
            {text: LipiUtil.t("uin"), dataIndex: "uin", flex: 1},
            {text: LipiUtil.t("物品"), dataIndex: "productId", flex: 1},
            {text: LipiUtil.t("增加金币"), dataIndex: "goodsCount", flex: 1},
            {text: LipiUtil.t("金额"), dataIndex: "orderMoney", flex: 1},
            {text: LipiUtil.t("支付状态"), dataIndex: "payStatus", flex: 1},
            {text: LipiUtil.t("创建时间"), dataIndex: "createTime", flex: 1},
            {text: LipiUtil.t("订单状态"), dataIndex: "status", flex: 1}
        ]
    });
    //用户信息--点拨列表
    var userTeachGrid = Ext.create("Ext.grid.Panel", {
        store: userTeachStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "teachUid", flex: 1},
            {text: LipiUtil.t("等级"), dataIndex: "level", flex: 1},
            {text: LipiUtil.t("时间"), dataIndex: "time", flex: 1},
            {text: LipiUtil.t("点拨"), dataIndex: "name", flex: 1},
            {xtype:"actioncolumn","text":LipiUtil.t("编辑"),align:"center",items:[
                {
                    iconCls:"delete",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
//                        var teachUid = view.store.getAt(row).data.teachUid;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.teach.del", {"teachUid":cData.teachUid, "userUid":userUid}, function(data){
                                    LipiUtil.hideLoading();
                                    if (LipiUtil.errorCheck(data, "user.teach.del") == false) return;
                                    reloadData(userTeachStore, "user.teach");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });
    //用户信息--指点列表 userWorldBossTeachGrid
    var userWorldBossTeachGrid = Ext.create("Ext.grid.Panel", {
        store: userWorldBossTeachStore,
        border: false,
        columns: [
            {text: LipiUtil.t("序号"), dataIndex: "teachUid", flex: 1},
            {text: LipiUtil.t("等级"), dataIndex: "level", flex: 1},
            {text: LipiUtil.t("时间"), dataIndex: "time", flex: 1},
            {text: LipiUtil.t("指点"), dataIndex: "name", flex: 1},
            {xtype:"actioncolumn","text":LipiUtil.t("编辑"),align:"center",items:[
                {
                    iconCls:"delete",
                    handler:function(view,row,col,item,e){
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除记录吗？", function(button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.worldBossTeach.del", {"teachUid":cData.teachUid, "userUid":userUid}, function(data){
                                    LipiUtil.hideLoading();
                                    if (LipiUtil.errorCheck(data, "user.worldBossTeach.del") == false) return;
                                    reloadData(userWorldBossTeachStore, "user.worldBossTeach");
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });
    var tabPanel = new Ext.TabPanel({
        items: [
            {
                layout:{type:'fit'},
                title: LipiUtil.t("基本信息"),
                items: [userInfoGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("扩展信息"),
                items: [moreInfoGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("编队列表"),
                items: [userFormationGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("特战队列表"),
                items: [userSpecialTeamGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("hero列表"),
                items: [userHeroGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("装备列表"),
                items: [userEquipmentGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("道具列表"),
                items: [userItemGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("技能列表"),
                items: [userSkillGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("魂魄列表"),
                items: [userHeroSoulGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("技能碎片列表"),
                items: [userDebrisGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("卡片列表"),
                items: [userCardGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("邮件列表"),
                items: [userMailGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("充值列表"),
                items: [userPayOrderGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("指点列表"),
                items: [userWorldBossTeachGrid]
            },
            {
                layout:{type:'fit'},
                title: LipiUtil.t("点拨列表"),
                items: [userTeachGrid]
            }
        ],
        activeItem: 0
    });

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //搜索一个用户
    function searchButtonClick() {
        userUid = Ext.getCmp("userIdTextField").getValue();

        if (isNaN(userUid - 0)) {
            Ext.Msg.alert("提示", "用户名无效！");
            return;
        }
        var country = Ext.util.Cookies.get("country");
        var city = Ext.getCmp("city").getValue();
        city = city == "0"?"1":city;
        if(userUid < 10000){
            userUid = LipiUtil.createUserUid(country,city,userUid);
        }
        var marray = LipiUtil.parseUserUid(userUid);
        if (marray[0] != country) {
            Ext.Msg.alert("提示", "用户不在此服务器。<br/>服=>" + marray[2] + ";  区=>" + marray[1]);
            return;
        }
        var apiData = {"user.info":userInfoStore,"user.moreInfo":userMoreInfoStore,"user.formation":userFormationStore,"user.specialTeam":userSpecialTeamStore,"user.hero":userHeroStore,"user.equipment":userEquipmentStore,
            "user.item":userItemStore,"user.skill":userSkillStore,"user.heroSoul":userHeroSoulStore,"user.debris":userDebrisStore,"user.card":userCardStore,"user.mail":userMailStore,"user.payOrder":userPayOrderStore,"user.teach":userTeachStore,"user.worldBossTeach":userWorldBossTeachStore};
        async.eachSeries(Object.keys(apiData), function(api, esCb){
            reloadData(apiData[api], api, esCb);
        });
    }

    function reloadData(store, api, callback){
        if(!userUid){
            userUid = Ext.getCmp("userIdTextField").getValue();
        }
        LipiUtil.showLoading();
        LHttp.post(api, {userUid: userUid}, function (data) {
            LipiUtil.hideLoading();
            if (LipiUtil.errorCheck(data, api) == false) return;
            var list = data[api];
            for(var i = 0;i<list.length;i++){
                list[i]["id"] = list[i]["teachUid"];
            }
            store.loadData(list);
            if(callback){
                callback();
            }
        });
    }
    //用户名
    function nameToIDHandler() {
        var mWindow = Ext.create("Ext.window.Window", {
            title: LipiUtil.t("用户名转ID"),
            modal: true,
            width: 300,
            height: 180,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text: LipiUtil.t("确定"), handler: function () {
                    var newData = Ext.getCmp("nameToIDWindowForm").getValues();
                    mWindow.close();
                    LipiUtil.showLoading();
                    LHttp.post("user.getUserUid", newData, function (data) {
                        LipiUtil.hideLoading();
                        if (LipiUtil.errorCheck(data, "user.getUserUid") == false) return;

                        var mUserUid = data["user.getUserUid"];
                        if (mUserUid == null || mUserUid.length == 0) {
                            Ext.Msg.alert("提示", "没有此用户!");
                        } else {
                            var mList = data["user.getUserUid"];
                            var mIds = [];
                            for (var i = 0; i < mList.length; i++) {
                                mIds.push(mList[i]["userUid"]);
                            }
                            Ext.Msg.alert("提示", mIds.join(","));
                        }
                    });
                }},
                {xtype: "button", text: LipiUtil.t("取消"), handler: function () {
                    mWindow.close();
                }}
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "nameToIDWindowForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {fieldLabel: "分区", name: "city"},
                        {fieldLabel: "用户名", name: "userName"},
                        {fieldLabel: "平台用户id", name: "pUserId"}
                    ]
                }
            ]
        });
        mWindow.show();
    }
    //改变时间处理
    function changeTimeHandler() {
        var interval;
        var mWindow = Ext.create("Ext.window.Window", {
            title: "修改服务器时间",
            modal: true,
            width: 300,
            height: 150,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {
                    xtype: "button", text: LipiUtil.t("确定"), handler: function () {
                    var mData = Ext.getCmp("changeTimeWindowForm").getValues();
                    offsetTime = mData["offsetTime"];
                    var data = {offsetTime: offsetTime, nowTime: mData["nowTime"]};
                    mWindow.close();
                    LipiUtil.showLoading();
                    LHttp.jsonp("admin.changeTime", data, function (data) {
                        LipiUtil.hideLoading();
                        if (LipiUtil.errorCheck(data, "admin.changeTime") == false) return;
                        var nowValue = data["admin.changeTime"]["result"];
                        var nowDate = new Date((nowValue - 0) * 1000);
                        getTimeOffset();
                        console.log(nowDate, "from api");
                        Ext.Msg.alert("提示", Ext.util.Format.date(nowDate, "Y-m-d H:i:s"));
                    });
                    if (LHttp.isTest()) {
                        //LHttp.post("admin.changeTime",data, function(){});
                    }
                }
                },
                {
                    xtype: "button", text: LipiUtil.t("取消"), handler: function () {
                    mWindow.close();
                }
                }
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "changeTimeWindowForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {fieldLabel: "偏移时间", name: "offsetTime", id: "offsetTime", value: "-1"},
                        {fieldLabel: "当前时间", name: "nowTime", id: "nowTime", value: ""},
                        {
                            xtype: "button", text: "■", listeners: {
                            click: function () {
                                if (this.text == "■") {
                                    if (interval != null) {
                                        clearInterval(interval);
                                        interval = null;
                                    }
                                    this.setText("►");
                                } else {
                                    interval = setInterval(function () {
                                        var nowData = new Date();
                                        Ext.getCmp("nowTime").setValue(Ext.util.Format.date(new Date(nowData.getTime() + offsetTime * 60 * 1000), "Y-m-d H:i:s"));
                                    }, 1000);
                                    this.setText("■");
                                }
                            }
                        }
                        }
                    ]
                }
            ]
        });

        //计时器获取当前时间
        var nowData = new Date();
        Ext.getCmp("offsetTime").setValue(offsetTime);
        Ext.getCmp("nowTime").setValue(Ext.util.Format.date(new Date(nowData.getTime() + offsetTime * 60 * 1000), "Y-m-d H:i:s"));
        //console.log(offsetTime);//输出当前时间
        interval = setInterval(function () {
            var nowData = new Date();
            var newData = nowData.getTime() + offsetTime * 60 * 1000;
//            console.log(nowData, newData, offsetTime);
            Ext.getCmp("offsetTime").setValue(-1);
            Ext.getCmp("nowTime").setValue(Ext.util.Format.date(new Date(newData), "Y-m-d H:i:s"));
        }, 1000);//************计时器设定，窗口加载****************
        mWindow.show();
        mWindow.on("close", function () {
            //console.log(interval);//输出计时器时间
            if (interval != null) {//如果计时器不为空，就清除计时器
                clearInterval(interval);
                interval = null;
            }
        });
    }
    function timestampHandler() {
        var mWindow = Ext.create("Ext.window.Window", {
            title: LipiUtil.t("时间戳工具"),
            modal: true,
            width: 300,
            height: 150,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text: LipiUtil.t("确定"), handler: function () {
                    var newData = Ext.getCmp("timestampFrom").getValues();
                    mWindow.close();
                    var timestamp = newData["timestamp"] - 0;
                    var time = newData["time"];
                    var str = "";
                    if(time == "" && timestamp == ""){
                        return ;
                    } else if(timestamp != "" && isNaN(timestamp)){
                        Ext.Msg.alert("提示", "格式错误");
                        return ;
                    } else if(timestamp != ""){
                        str = LipiUtil.formatTime('Y-m-d H:i:s', timestamp);
                    } else {
                        str = Math.floor(new Date(time).getTime()/1000);
                    }

                    Ext.Msg.alert("提示", str);
                }},
                {xtype: "button", text: LipiUtil.t("取消"), handler: function () {
                    mWindow.close();
                }}
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "timestampFrom",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {fieldLabel: "时间戳", name: "timestamp"},
                        {fieldLabel: "时间", name: "time"}
                    ]
                }
            ]
        });
        mWindow.show();
    }
    function specialOpenAllHandler(){
        if(userUid == null || isNaN(userUid - 0)){
            Ext.Msg.alert("提示", "用户名无效！");
            return;
        }
        LipiUtil.showLoading();
        LHttp.post("user.specialOpenAll",{"userUid":userUid},function(data){
            LipiUtil.hideLoading();
            searchButtonClick();
        });
//        mWindow.show();
    }
    function addWTeachHandler(){//指点&&点拨
        if(userUid == null || isNaN(userUid - 0)){
            Ext.Msg.alert("提示", "用户名无效！");
            return;
        }
        var mWindow = Ext.create("Ext.window.Window",{
            title:"添加指点点拨",
            modal:true,
            width:500,
            minHeight:100,
            items : [{
                xtype: 'checkboxgroup',
                name: '添加指点点拨',
                width: 500,
                minHeight: 100,
                columns: 2,
                align:"center",
                id:"addWTeach",
                items:[
                    {xtype: "numberfield", fieldLabel: "指点个数", name: "wBTCt", id: "wBTCt", width: 150, value: 0, minValue: 0},
                    {
                        xtype: 'combobox',fieldLabel: '指点类型:',labelWidth: 80, editable:false,"id":"wBTType",valueField: "value",value:"请选择指点类型",
                        store:Ext.create("Ext.data.ArrayStore", {
                            fields: ["value", "text"],
                            data: [[26,"加林仙人"],[59,"波波先生"],[116,"大长老"]]
                        })
                    },
                    {xtype: "numberfield", fieldLabel: "点拨个数", name: "teachCt", id: "teachCt", width: 150, value: 0, minValue: 0},
                    {
                        xtype: 'combobox',fieldLabel: '点拨类型:',labelWidth: 80, editable:false,"id":"teachType",valueField: "value",value:"请选择点拨类型",
                        store:Ext.create("Ext.data.ArrayStore", {
                            fields: ["value", "text"],
                            data: [[1,"龟仙人"],[2,"神仙"],[3,"老界王神"]]
                        })
                    }
                ]
            }],
            buttons:[
                {xtype:"button",text:LipiUtil.t("确定"),handler:function(){
                    var worldBCt = Ext.getCmp("wBTCt").getValue();
                    var wLv = Ext.getCmp("wBTType").getValue();
                    var teachCt = Ext.getCmp("teachCt").getValue();
                    var tLv = Ext.getCmp("teachType").getValue();
                    mWindow.close();
                    var teachLv;
                    var worldBLv;
                    LipiUtil.showLoading();
                    if(isNaN(tLv) && isNaN(wLv)){
                        teachLv = 0;
                        worldBLv = 0;
                    }else{
                        if(isNaN(tLv)){
                            teachLv = 0;
                        }else if(isNaN(wLv)) {
                            worldBLv = 0;
                        }else{
                            teachLv = tLv;
                            worldBLv = wLv;
                        }
                    }
//                    console.log(worldBCt,worldBLv,teachCt,teachLv,"??????");
                    LHttp.post("user.teach.add",{"userUid":userUid,"worldBCt":worldBCt,"worldBLv":worldBLv,"teachCt":teachCt,"teachLv":teachLv},function(data){
                        LipiUtil.hideLoading();
                        searchButtonClick();
                    });
                }},
                {xtype:"button",text:LipiUtil.t("取消"),handler:function(){
                    mWindow.close();
                }}
            ]
        });
        mWindow.show();

    }

    function deleteAllHandler(){
        if(userUid == null || isNaN(userUid - 0)){
            Ext.Msg.alert("提示", "用户名无效！");
            return;
        }
        var mWindow = Ext.create("Ext.window.Window",{
            title:"批量删除",
            modal:true,
            width:572,
            minHeight:220,
            items : [{
                xtype: 'checkboxgroup',
                name: '批量删除',
                width: 572,
                minHeight: 220,
                columns: 3,
                align:"center",
                id:"deleteAll",
                items:[
                    {boxLabel: "所有", name: "all",checked: true,listeners: {afterrender: function (obj) {
                        obj.getEl().last().last().last().first().dom.onclick = function (obj) {
                            var checkGroup = Ext.getCmp('deleteAll').items;
                            var checkL = checkGroup.length;
                            var check = checkGroup.get(0).checked == false ? true : false;
                            for(var j = 1 ; j < checkL ; j ++){
                                var item = checkGroup.get(j);
                                item.setValue(check);
                            }
                        }
                    }}},
//                    {boxLabel: "编队", name: "formation",checked: true},
                    {boxLabel: "特战队", name: "specialTeam",checked: true},
                    {boxLabel: "英雄", name: "hero",checked: true},
                    {boxLabel: "装备", name: "equipment",checked: true},
                    {boxLabel: "道具", name: "item",checked: true},
                    {boxLabel: "技能", name: "skill",checked: true},
                    {boxLabel: "魂魄", name: "heroSoul",checked: true},
                    {boxLabel: "技能碎片", name: "debris",checked: true},
                    {boxLabel: "卡片", name: "card",checked: true},
                    {boxLabel: "邮件", name: "mail",checked: true},
                    {boxLabel: "指点", name: "wBTeach",checked: true},
                    {boxLabel: "点拨", name: "teach",checked: true}
                ]
            }],
            buttons:[
                {xtype:"button",text:LipiUtil.t("确定"),handler:function(){
                    var checkGroup = Ext.getCmp('deleteAll').items;
                    var checkL = checkGroup.length;
                    var funList = [];
                    for(var j = 1 ; j < checkL ; j ++){
                        if(checkGroup.get(j).checked == true){
                            funList.push(checkGroup.get(j).name);
                        }
                    }
                    mWindow.close();
                    if(funList.length > 0){
                        LipiUtil.showLoading();
                        LHttp.post("user.deleteAll",{"userUid":userUid,"funList":funList},function(data){
                            LipiUtil.hideLoading();
                            searchButtonClick();
                        });
                    }
                }},
                {xtype:"button",text:LipiUtil.t("取消"),handler:function(){
                    mWindow.close();
                }}
            ]
        });
        mWindow.show();

    }
    var cityComboboxStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["value", "text"],
        data: gData["serverList"]
    });
    //初始化界面显示
    var infoPanel = Ext.create("Ext.panel.Panel", {
        title: LipiUtil.t('用户信息'),//表单标题
        frame: true,//是否渲染表单
        layout:{type:'fit'},
        tbar: [
            {xtype: 'combobox', fieldLabel: '分区', name: "city", labelWidth: 40, id: "city", width: 160, valueField: "value",store: cityComboboxStore, value: "0", editable: false},
            {xtype: 'textfield', fieldLabel: '用户ID', labelWidth: 45, id: "userIdTextField", listeners: {specialKey: function (field, e) {
                if (e.getKey() == Ext.EventObject.ENTER) {
                    searchButtonClick();
                }
            } }},
            {xtype: 'button', text: LipiUtil.t('搜索'), id: "searchButton", iconCls: "settings", handler: searchButtonClick},
            {xtype: 'button', text: LipiUtil.t('nameToID'), id: "nameToIDButton", iconCls: "settings", handler: nameToIDHandler},
            {xtype: 'button', text: LipiUtil.t('更改时间'), id: "changeTimeButton", iconCls: "settings", handler: changeTimeHandler, hidden:true},//修改时间
            {xtype: 'button', text: LipiUtil.t('时间戳'), id: "timestampButton", iconCls: "settings", handler: timestampHandler},
            {xtype: 'button', text: LipiUtil.t('批量删除'), id: "deleteAllButton", iconCls: "delete", handler: deleteAllHandler, hidden:true},
            {xtype: 'button', text: LipiUtil.t('添加阵位'), id: "specialOpenAllButton", iconCls: "add", handler: specialOpenAllHandler},
            {xtype: 'button', text: LipiUtil.t('添加指点点拨'), id: "addWTeachButton", iconCls: "add", handler: addWTeachHandler}
        ],
        items: [tabPanel]

    });
    //页面加载时把时间元素加入
    this.view = infoPanel;
    getTimeOffset();
    function getTimeOffset() {
        LHttp.jsonp("admin.getTimeOffset", {}, function (data) {
            if (LipiUtil.errorCheck(data, "admin.getTimeOffset") == false) return;
            offsetTime = Math.floor(data["admin.getTimeOffset"]["result"] / 60000);
        });
    }

    if (LHttp.isTest() || LHttp.isDev()) {
        Ext.getCmp("changeTimeButton").setVisible(true);
        Ext.getCmp("deleteAllButton").setVisible(true);
    }
}


