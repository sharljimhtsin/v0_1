/**
 * 缓存管理
 * User: za
 * Date: 14-11-13
 * Time: 下午4:45
 */
function CacheView() {
    //缓存列表信息
    var cacheStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["key", "name", "value", "city", "userUid"],
        data: []
    });

    var cityComboboxStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["value", "text"],
        data: gData["serverList"]
    });

    function showEditWindow(title, data, callbackFn){
        var items = [];
        for(var i in data){
            if(i == "value"){
                items.push({xtype : 'textareafield',fieldLabel : i,name:i,width:600,height:300});
            } else {
                items.push({"fieldLabel":i, "name":i});
            }
        }
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 450,
            autoScroll:true,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text:LipiUtil.t("确定") , handler: function () {
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


    //.缓存列表
    var cacheTable = Ext.create("Ext.grid.Panel",{
        store: cacheStore,
        border: false,
        tbar: [
            {
                xtype: 'combobox',fieldLabel: 'key类型:',labelWidth: 50, editable:false,"id":"keyType",valueField: "value",value:"user",
                store:Ext.create("Ext.data.ArrayStore", {
                    fields: ["value", "text"],
                    data: [["login","全服"],["domain","区服"],["user","userUid"]]
                }),
                listeners: {select: function () {
                    if(this.value == "user"){
                        Ext.getCmp("userUid").setVisible(true);
                        Ext.getCmp("icity").setVisible(false);
                    } else if(this.value == "domain") {
                        Ext.getCmp("icity").setVisible(true);
                        Ext.getCmp("userUid").setVisible(false);
                    } else if(this.value == "login") {
                        Ext.getCmp("icity").setVisible(false);
                        Ext.getCmp("userUid").setVisible(false);
                    }
                }}
            },
            {xtype: 'combobox', fieldLabel: '分区', name: "icity", labelWidth: 40, id: "icity", width: 160, valueField: "value",store: cityComboboxStore, value: "0", editable: false, "hidden":true},
            {xtype: 'textfield',fieldLabel: 'userUid:',labelWidth: 50,id:"userUid","name":"userUid","hidden":false},
            {xtype: 'textfield',fieldLabel: 'key:',labelWidth: 20,id:"key"},
            {xtype: 'button', text: LipiUtil.t("搜索"), iconCls: "settings",handler:function(){
                getCache();
            }},
            {xtype: 'button', text: LipiUtil.t("删除"), iconCls: "delete",handler:function(){
                delCache();
            }}
        ],
        columns: [
            {text: "key", dataIndex: "key", flex: 1},
            {text: "name", dataIndex: "name", flex: 1},
            {text: "value", dataIndex: "value", flex: 1},
            {xtype:"actioncolumn","text":"编辑",align:"center",items:[
                {
                    iconCls:"edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        showEditWindow("编辑", cData, function (newData) {
                            LipiUtil.showLoading();
                            newData["keyType"] = Ext.getCmp("keyType").getValue();
                            LHttp.post("cache.edit", newData, function (data) {
                                LipiUtil.hideLoading();
                                if (LipiUtil.errorCheck(data, "cache.edit") == false) return;
                                getCache();
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
                                cData["keyType"] = Ext.getCmp("keyType").getValue();
                                LHttp.post("cache.del", cData, function(data){
                                    LipiUtil.hideLoading();
                                    if (LipiUtil.errorCheck(data, "cache.del") == false) return;
                                    getCache();
                                    Ext.Msg.alert("提示", "数据删除成功！");
                                });
                            }
                        });
                    }
                }
            ]}
        ]
    });

    var cachePanel = Ext.create("Ext.panel.Panel",{
        title: LipiUtil.t("缓存列表"),
        frame:true,//是否渲染表单
        //autoScroll:true,
        layout:{type:'fit'},
        items:[cacheTable]
    });

    function getCache(){
        var key = getKey();
        if(key){
            LipiUtil.showLoading();
            //获取到客户端输入的userUid和key，post到cache.get
            LHttp.post("cache.get", key, function (data) {
                LipiUtil.hideLoading();
                if (LipiUtil.errorCheck(data, "cache.get") == false) return;
                cacheStore.loadData(data["cache.get"]);
            });
        }
    }

    function delCache(){
        var key = getKey();
        if(key){
            LipiUtil.showLoading();
            //获取到客户端输入的userUid和key，post到cache.get
            LHttp.post("cache.del", key, function (data) {
                LipiUtil.hideLoading();
                if (LipiUtil.errorCheck(data, "cache.del") == false) return;
                cacheStore.loadData([]);
            });
        }
    }

    function getKey(){
        var city = Ext.getCmp("icity").getValue();
        var userUid = Ext.getCmp("userUid").getValue();
        var keyType = Ext.getCmp("keyType").getValue();
        if(keyType == "user"){
            if(userUid == "" || userUid < 10000){
                Ext.Msg.alert("提示", "userUid错误！");
                return false;
            }
        } else if(keyType == "domain"){
            if(city == 0 || city == "0"){
                Ext.Msg.alert("提示", "请选择服务器！");
                return false;
            }
        } else if(keyType == "login"){

        }

        var key = Ext.getCmp("key").getValue();
        if(key == ""){
            Ext.Msg.alert("提示", "key不能为空！");
            return false;
        }
        return {city:city, userUid:userUid, key: key, keyType:keyType};
    }

    this.view = cachePanel;
}