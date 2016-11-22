/**
 * ChatView 聊天
 * User: joseppe
 * Date: 14-4-9
 * Time: 下午2:57
 */



function ChatView() {
    var typeComboboxStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["value", "text"],
        data: gData["serverList"]
    });


    var sendChatWindow = function (title, data) {
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 300,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            items: [
                {
                    xtype: "form",
                    frame: true,//是否渲染表单
                    layout: {type: "vbox"},
                    height: 140,
                    bodyPadding: "10px 0 0 10px",
                    fieldDefaults: {labelWidth: 70, labelSeparator: ":"},
                    defaults: {border: false, bodyPadding: "0 0 0 0", bodyStyle: 'background-color:#DFE9F6'},
                    id: "sendChatWindowFrom",
                    items: [
                        {xtype: 'textareafield', fieldLabel: '内容', name: "msg", width: 500, height: 200}
                    ],
                    buttons: [
                        {xtype: "button", text: LipiUtil.t("发送"), handler: function () {
                            var chatFormObj = Ext.getCmp("sendChatWindowFrom").getValues();
                            var mText = chatFormObj["msg"];
                            chatFormObj["city"] = Ext.getCmp("city").value;
                            var toJSON = '{"msg":"' + mText + '"}';
                            try {
                                JSON.parse(toJSON);
                            } catch (err) {
                                Ext.Msg.alert("提示", "文本格式不对");
                                return;
                            }

                            LipiUtil.showLoading();
                            LHttp.post("chat.send", chatFormObj, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "chat.send") == false) return;
                                Ext.Msg.alert("发送成功！ =>" + JSON.stringify(data["chat.send"]));
                                getChat();
                            });
                            //console.log(chatFormObj);
                        }}
                    ]
                }
            ]
        });
        mWindow.show();
    };


    var showGagWindows = function (title, data) {
        getGag();
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 300,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            items: [
                {
                    xtype: "grid",
                    store: gagStore,
                    id:"gagWindowTable",
                    y: 0,
                    selModel: Ext.create('Ext.selection.CheckboxModel'),
                    //anchor:"100% -355",
                    columns: [
                        {text: "userUid", dataIndex: "userUid", flex: 1}
                    ]
                }
            ],
            buttons: [
                {xtype: "button", text:  LipiUtil.t("发送"), handler: function () {
                    var selectionArray = Ext.getCmp("gagWindowTable").getSelectionModel().getSelection();
                    if (selectionArray == null || selectionArray.length <= 0) {
                        Ext.Msg.alert("提示", "需要选中一个用户");
                    } else {
                        LipiUtil.showLoading();
                        var uidArr = [];
                        for (var i in selectionArray) {
                            if (!Ext.Array.contains(uidArr, selectionArray[i].data.userUid)) {
                                uidArr.push(selectionArray[i].data.userUid);
                            }
                        }
                        LHttp.post("chat.setGag", {"uidArr": uidArr, "gag": 0}, function (data) {
                            LipiUtil.hideLoading();
                            if (LipiUtil.errorCheck(data, "chat.setGag") == false) return;
                            getGag();//再搜索一次
                            Ext.Msg.alert("提示", "解除禁言！ =>" + JSON.stringify(data["chat.setGag"]));
                        });
                    }
                }
                }
            ]

        });
        mWindow.show();
    };


//    id title text scrollText stime etime del

    var chatStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["userUid", "userName", "msg"],
        data: []
    });

    var gagStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["userUid"],
        data: []
    });

    //var selModel = Ext.create('Ext.selection.CheckboxModel');

    var chatTable = Ext.create("Ext.grid.Panel", {
        store: chatStore,
        //y:8,
        selModel: Ext.create('Ext.selection.CheckboxModel'),
        //anchor:"100% -355",
        margin: "0 0 10px 0",
        tbar: [
            {xtype: 'combobox', fieldLabel: '分区', name: "city", labelWidth: 40, id: "city", width: 160, valueField: "value",
                store: typeComboboxStore, value:"0",editable: false,
                listeners: {select: function () {
                    getChat();
                }}
            },
            {xtype: 'button', text:  LipiUtil.t("禁言"), iconCls: "settings", handler: function () {
                var selectionArray = chatTable.getSelectionModel().getSelection();
                if (selectionArray == null || selectionArray.length <= 0) {
                    Ext.Msg.alert("提示", "需要选中一个用户");
                } else {
                    var loadMask = Ext.create(Ext.LoadMask, Ext.getBody(), {msg: "请求中..."});
                    var uidArr = [];
                    for (var i in selectionArray) {
                        if (!Ext.Array.contains(uidArr, selectionArray[i].data.userUid)) {
                            uidArr.push(selectionArray[i].data.userUid);
                        }
                    }
                    loadMask.show();
                    LHttp.post("chat.setGag", {"uidArr": uidArr, "gag": 1}, function (data) {
                        loadMask.hide();
                        if (LipiUtil.errorCheck(data, "chat.setGag") == false) return;
                        getGag();//再搜索一次
                        Ext.Msg.alert("提示", "禁言成功！ =>" + JSON.stringify(data["chat.setGag"]));
                    });
                }
            }},
            {xtype: 'button', text: LipiUtil.t("解除禁言"), iconCls: "settings", handler: function () {
                showGagWindows("解除禁言");
            }},
            {xtype: 'button', text: '发送', iconCls: "settings", handler: function () {
                sendChatWindow("发送文本");
            }}
        ],
        columns: [
            {text: "uid", dataIndex: "userUid", flex: 1},
            {text:  LipiUtil.t("用户名"), dataIndex: "userName", flex: 1},
            {text: LipiUtil.t("内容"), dataIndex: "msg", flex: 1}
        ]
    });




    var chatPanel = Ext.create("Ext.panel.Panel", {
        title:  LipiUtil.t("聊天"),
        frame: true,//是否渲染表单
        layout: {type:'fit'},
        items: [chatTable] //,addChatForm,gagTable
    });


    function getChat() {
        var mCity = Ext.getCmp("city").value||1;
        mCity = (mCity == 0)?1:mCity;
        LHttp.post("chat.get", {"city": mCity}, function (res) {
            var chatList = res["chat.get"];
            chatStore.loadData(chatList);
        });
    }

    function getGag() {
        var mCity = Ext.getCmp("city").value||1;
        mCity = (mCity == 0)?1:mCity;
        LHttp.post("chat.getGag", {"city": mCity}, function (res) {
            var gagList = res["chat.getGag"];
            console.log(gagList);
            gagStore.loadData(gagList);
        });
    }

    getChat();
    getGag();

    this.view = chatPanel;

}