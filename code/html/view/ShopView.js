/**
 * 商品上下架界面
 * User: liyuluan
 * Date: 14-2-25
 * Time: 下午4:06
 */

function ShopView() {
    var shopStore = Ext.create("Ext.data.ArrayStore",{
        fields:["shopUid", "type", "itemId", "name", "buyPrice", "originPrice", "priceType", "sTime", "eTime", "vip", "count", "isActivity","isReset","close"],
        data:[]
    });

    var typeComboboxStore = Ext.create("Ext.data.ArrayStore",{
        fields:["value","text"],
        data:[
            ["1","道具"],
            ["2","礼包"]
        ]
    });

    var priceTypeComboboxStore = Ext.create("Ext.data.ArrayStore",{
        fields:["value","text"],
        data:[
            ["1","元宝"]
        ]
    });




    function showWindow(title,data,callbackFn) {
        var mWindow = Ext.create("Ext.window.Window",{
            title:title,
            modal:true,
            width:400,
            height:420,
            fieldDefaults:{labelSeparator:":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons:[
                {xtype:"button",text:LipiUtil.t("确定"),handler:function(){
                    var newData = Ext.getCmp("mWindowForm").getValues();

                    var sDate = new Date(newData["sTime"]);
                    var sTimeArray = newData["sTime2"].split(":");
                    sDate.setHours(sTimeArray[0]-0);
                    sDate.setMinutes(sTimeArray[1]-0);

                    newData["sTime"] = Math.floor(sDate.getTime()/1000);


                    var eDate = new Date(newData["eTime"]);
                    var eTimeArray = newData["eTime2"].split(":");
                    eDate.setHours(eTimeArray[0]-0);
                    eDate.setMinutes(eTimeArray[1]-0);

                    newData["eTime"] = Math.floor(eDate.getTime()/1000);
                    newData["isActivity"] = (newData["isActivity"] == "on")?1:0;
                    newData["isReset"] = (newData["isReset"] == "on")?1:0;
                    newData["close"] = (newData["close"] == "on")?1:0;
                    callbackFn(newData);
                    mWindow.close();
                }},
                {xtype:"button",text:LipiUtil.t("取消"),handler:function(){
                    mWindow.close();
                }}
            ],
            items:[
                {
                    xtype:"form",
                    border:false,
                    bodyPadding:5,
                    id:"mWindowForm",
                    defaultType:"textfield",
                    bodyStyle:"background:#DFE9F6",
                    fieldDefaults:{labelWidth:80},
                    items:[
                        {xtype:"textfield", fieldLabel:"ID",name:"shopUid", width:150, readOnly:true},
                        {xtype : 'combobox',fieldLabel : '类别',name:"type",width:180,valueField:"value",
                            store:typeComboboxStore,value:"1",editable:false
                        },
                        {
                            xtype:"fieldcontainer",
                            fieldLabel:'活动配制',
                            layout:{type:'hbox'},
                            items:[
                                {xtype:"checkbox", fieldLabel:"是否活动",name:"isActivity",labelWidth:56},
                                {xtype: 'splitter'},
                                {xtype:"checkbox", fieldLabel:"是否重置",name:"isReset",labelWidth:56}
                            ]
                        },
                        {xtype:"textfield", fieldLabel:"物品id",name:"itemId"},
                        {xtype:"textfield", fieldLabel:"物品",name:"name"},
                        {xtype:"numberfield", fieldLabel:"售价",name:"buyPrice",  width:180, value:1000, minValue:1},
                        {xtype:"numberfield", fieldLabel:"原价",name:"originPrice", width:180,  value:1000, minValue:1},
                        {xtype : 'combobox',fieldLabel : '货币类型',name:"priceType",width:180,valueField:"value",
                            store:priceTypeComboboxStore,value:"1",editable:false
                        },
//                        {xtype:"datefield", name:"sTime",value:new Date(),fieldLabel : '开始时间',format: 'Y-m-d'},
                        {
                            xtype:"fieldcontainer",
                            fieldLabel:'开始时间',
                            layout:{type:'hbox'},
                            items:[
                                {xtype:"datefield", name:"sTime",value:new Date(),format: 'Y-m-d'},
                                {xtype: 'splitter'},
                                {xtype:"timefield", name:"sTime2",value:"08:00",format: 'H:i'}
                            ]
                        },
//                        {xtype:"datefield", name:"eTime",value:new Date(2028,0,1),fieldLabel : '结束时间', format: 'Y-m-d'},
                        {
                            xtype:"fieldcontainer",
                            fieldLabel:'结束时间',
                            layout:{type:'hbox'},
                            items:[
                                {xtype:"datefield", name:"eTime",value:new Date(new Date().getTime() + 24 * 60 * 60 * 1000 * 3),format: 'Y-m-d'},
                                {xtype: 'splitter'},
                                {xtype:"timefield", name:"eTime2",value:"08:00",format: 'H:i'}
                            ]
                        },

                        {xtype:"numberfield", fieldLabel:"VIP限制",name:"vip", value:0, width:180},
                        {xtype:"numberfield", fieldLabel:"数量限制",name:"count", value:0, width:180},

                        {xtype:"checkbox", fieldLabel:"是否关闭",name:"close"}
                    ]
                }
            ]
        });
        mWindow.show();
        if(data != null) {
            var newData = {};
            for (var key in data) {
                newData[key] = data[key];
            }

            newData["sTime"] = new Date(data["sTime"] * 1000);
            newData["sTime2"] = new Date(data["sTime"] * 1000);
            newData["eTime"] = new Date(data["eTime"] * 1000);
            newData["eTime2"] = new Date(data["eTime"] * 1000);
            Ext.getCmp("mWindowForm").form.setValues(newData);
        }
    }


    var shopTable = Ext.create("Ext.grid.Panel",{
        store:shopStore,
//        title:"商品 列表",
        y:0,
//        selModel:selModel,
        tbar:[
            {xtype:'button',text:LipiUtil.t('添加商品'),iconCls:"add",handler:function(){
                showWindow('添加商品', null, function(aData) {
                    LipiUtil.showLoading();
                    LHttp.post("shop.add", aData, function(data){
                        LipiUtil.hideLoading();
                        if (LipiUtil.errorCheck(data, "shop.add") == false) return;
                        Ext.Msg.alert("提示", "数据保存成功！");
                        var shopList = data["shop.add"];
                        sortOn(shopList, "shopUid",  -1);
                        if (shopList != null) shopStore.loadData(shopList);
                    });
                });
            }},
            {xtype:"button", text:"清除商品列表缓存", iconCls:"delete", handler:function(){
                Ext.Msg.confirm("提示", "确定删除缓存吗？", function(button) {
                    if (button == "yes") {
                        LipiUtil.showLoading();
                        LHttp.post("cache.del", {"key":"shopList"}, function(data){
                            LipiUtil.hideLoading();
                            if (LipiUtil.errorCheck(data, "cache.del") == false) return;
                            Ext.Msg.alert("提示", "清除成功");
                        });
                    }
                });
            }}
        ],
        anchor:"100% -355", //shopUid type buyPrice originPrice priceType sTime eTime vip count itemId close
        columns:[
            {text:LipiUtil.t("ID"),dataIndex:"shopUid",flex:1},
            {text:LipiUtil.t("类别"),dataIndex:"type",flex:1, renderer:function(v) {return (v == 1) ?"道具":"礼包";}},
            {text:LipiUtil.t("物品id"),dataIndex:"itemId",flex:1},
            {text:LipiUtil.t("物品"),dataIndex:"name",flex:1},
            {text:LipiUtil.t("售价"),dataIndex:"buyPrice",flex:1},
            {text:LipiUtil.t("原价"),dataIndex:"originPrice",flex:1},
            {text:LipiUtil.t("货币类型"),dataIndex:"priceType",flex:1, renderer:function(v) {return (v == 1) ?"元宝":"铜钱";}},
            {text:LipiUtil.t("开始时间"),dataIndex:"sTime",flex:1.5,renderer:function(v){
                var dt = new Date((v-0)*1000);
                return Ext.Date.format(dt, 'Y-m-d H:i');
            }},
            {text:LipiUtil.t("结束时间"),dataIndex:"eTime",flex:1.5,renderer:function(v){
                var dt = new Date((v-0)*1000);
                return Ext.Date.format(dt, 'Y-m-d H:i');
            }},
            {text:LipiUtil.t("VIP限制"),dataIndex:"vip",flex:1},
            {text:LipiUtil.t("数量限制"),dataIndex:"count",flex:1},
            {text:LipiUtil.t("活动"),dataIndex:"isActivity",flex:1,renderer:function(v) {return (v == 1) ?"是":"";}},
            {text:LipiUtil.t("重置"),dataIndex:"isReset",flex:1,renderer:function(v) {return (v == 1) ?"是":"";}},
            {text:LipiUtil.t("是否关闭"),dataIndex:"close",flex:1, renderer:function(v) {return (v == 1) ?"已关闭":"";}},
            {xtype:"actioncolumn","text":LipiUtil.t("编辑"),align:"center",items:[{
                iconCls:"edit",
                handler:function(view,row,col,item,e){
                    var cData = view.store.getAt(row).data;
                    var shopUid = cData.shopUid;
                    showWindow("修改商品", cData, function(adata) {
                        LipiUtil.showLoading();
                        LHttp.post("shop.update", adata, function(data){
                            LipiUtil.hideLoading();
                            if (LipiUtil.errorCheck(data, "shop.update") == false) return;
                            Ext.Msg.alert("提示", "数据保存成功！");
                            var shopList = data["shop.update"];
                            sortOn(shopList, "shopUid",  -1);
                            if (shopList != null) shopStore.loadData(shopList);
                        });
                    });
//                    showCDKey(giftID);
                }
            }]}
        ]
    });


    var ShopPanel = Ext.create("Ext.panel.Panel",{
        title:LipiUtil.t("商品列表"),
        frame:true,//是否渲染表单
        layout:{type:'fit'},
        items:[shopTable]
    });

    function sortOn(array, field, order) {
        array.sort(function(a, b) {
            return (a[field] - b[field]) * order;
        });
    }

    function getShopList() {
        LipiUtil.showLoading();
        LHttp.post("shop.get",null,function(res){
            LipiUtil.hideLoading();
            if (res != null) {
                var shopList = res["shop.get"];
                sortOn(shopList, "shopUid",  -1);
                if (shopList != null) shopStore.loadData(shopList);
            }
        });
    }

    getShopList();

    this.view = ShopPanel;
}


