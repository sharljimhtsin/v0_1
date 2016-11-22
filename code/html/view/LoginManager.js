/**
 * Created by xiazhengxin on 2016/8/4.3:12
 */

function LoginManager() {

    var viewStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["id", "userUid", "serverId", "pUserId", "platformId", "userName", "password", "mailIP", "userPassWord", "isZhuAn"],
        data: []
    });

    function showWindow(title, data, callbackFn) {
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 420,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {
                    xtype: "button", text: LipiUtil.t("确定"), handler: function () {
                    var newData = Ext.getCmp("mWindowForm").getValues();
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
                    id: "mWindowForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {xtype: "textfield", fieldLabel: "id", name: "id"},
                        {xtype: "textfield", fieldLabel: "userUid", name: "userUid"},
                        {xtype: "textfield", fieldLabel: "pUserId", name: "pUserId"},
                        {xtype: "textfield", fieldLabel: "serverId", name: "serverId"},
                        {xtype: "textfield", fieldLabel: "platformId", name: "platformId", width: 600},
                        {xtype: "textfield", fieldLabel: "userName", name: "userName", width: 600},
                        {xtype: "textfield", fieldLabel: "password", name: "password", width: 600},
                        {xtype: "textfield", fieldLabel: "mailIP", name: "mailIP", width: 600},
                        {xtype: "textfield", fieldLabel: "userPassWord", name: "userPassWord", width: 600},
                        {xtype: "hiddenfield", name: "isZhuAn"}
                    ]
                }
            ]
        });
        mWindow.show();
        if (data != null) {
            Ext.getCmp("mWindowForm").form.setValues(data);
        }
    }

    var viewTable = Ext.create("Ext.grid.Panel", {
        store: viewStore,
        y: 0,
        tbar: [
            {
                xtype: 'textfield',
                fieldLabel: 'userUid',
                name: "用戶ID",
                labelWidth: 50,
                id: "userUid",
                width: 160,
                value: ""
            },
            "-",
            {
                xtype: 'textfield',
                fieldLabel: '郵箱地址',
                name: "email",
                labelWidth: 50,
                id: "email",
                width: 160,
                value: ""
            },
            "-",
            {
                xtype: 'button', text: LipiUtil.t('搜索'), handler: function () {
                getLoginList();
            }
            },
        ],
        anchor: "100% -355",
        columns: [//fields: ["id", "userUid", "serverId", "pUserId", "platformId", "userName","password","mailIP","userPassWord"],
            {text: "id", dataIndex: "id", flex: 1},
            {text: "userUid", dataIndex: "userUid", flex: 1},
            {text: "pUserId", dataIndex: "pUserId", flex: 1},
            {text: "serverId", dataIndex: "serverId", flex: 1},
            {text: "platformId", dataIndex: "platformId", flex: 1},
            {text: "userName", dataIndex: "userName", flex: 1},
            {text: "password", dataIndex: "password", flex: 1},
            {text: "mailIP", dataIndex: "mailIP", flex: 1},
            {text: "userPassWord", dataIndex: "userPassWord", flex: 1},
            {text: "isZhuAn", dataIndex: "isZhuAn", flex: 1, hidden: true},
            {
                xtype: "actioncolumn", "text": "编辑", align: "center", items: [
                {
                    iconCls: "edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showWindow("编辑", cData, function (newData) {
                            LipiUtil.showLoading();
                            LHttp.post("user.bind.update", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "user.bind.update") == false) return;
                                Ext.Msg.alert("编辑成功！");
                                getLoginList();
                            });
                        });
                    }
                },
                "-",
                {
                    iconCls: "delete",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        Ext.Msg.confirm("提示", "确定删除吗？", function (button) {
                            if (button == "yes") {
                                LipiUtil.showLoading();
                                LHttp.post("user.bind.del", cData, function (resData) {
                                    LipiUtil.hideLoading();
                                    if (LipiUtil.errorCheck(resData, "user.bind.del") == false) return;
                                    Ext.Msg.alert("删除成功！");
                                    getLoginList();
                                });
                            }
                        });
                    }
                }
            ]
            }
        ]
    });

    var viewPanel = Ext.create("Ext.panel.Panel", {
        title: LipiUtil.t("登錄用戶管理"),
        frame: true,//是否渲染表单
        layout: {type: 'fit'},
        items: [viewTable]
    });

    function getLoginList() {
        LipiUtil.showLoading()
        var userUid = Ext.getCmp("userUid").value;
        var email = Ext.getCmp("email").value;
        LHttp.post("user.bind.get", {"userUid": userUid, "email": email}, function (res) {
            LipiUtil.hideLoading();
            if (res != null) {
                var mList = res["user.bind.get"];
                refreshUI(mList);
            }
        });
    }

    function refreshUI(mList) {
        if (mList != null) {
            viewStore.loadData(mList);
        } else {
            viewStore.loadData([]);
        }
    }

    getLoginList();

    this.view = viewPanel;
}