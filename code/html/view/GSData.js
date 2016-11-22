/*
* 跨服活动数据统计
* */
function GSData(){
    function showDetail(title,data){//显示详细信息
        var mWindow = Ext.create("Ext.window.Window", {
            title: title,
            modal: true,
            width: 650,
            height: 420,
            fieldDefaults: {labelSeparator: ":"},
            bodyStyle: 'padding:5px 0px 20px 6px',
            buttons: [
                {xtype: "button", text: "确定", handler: function () {
                    mWindow.close();
                }}
            ],
            items: [
                {
                    xtype: "form",
                    border: false,
                    bodyPadding: 5,
                    id: "detailForm",
                    defaultType: "textfield",
                    bodyStyle: "background:#DFE9F6",
                    fieldDefaults: {labelWidth: 80},
                    items: [
                        {xtype: "textareafield", fieldLabel: "内容",value:data["action"],  width: 600, height: 300}
                    ]
                }
            ]
        });
        mWindow.show();
    }

    var listStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["issueId", "data", "status"],
        data: []
    });
    var comboBoxNameStore = new Ext.data.SimpleStore({
        fields : ['value', 'text'],
        data : [['groupPurchase', '团购活动'],['groupPurchase2', '团购活动2'], ['tabletsCompete', '神位争夺战'],
            ['rechargeRanking', '充值排行榜'],['consumeRanking', '消费排行榜'],['cosmosEvaluation', '宇宙第一排行榜'],['cosmosLeague', '宇宙联盟排行榜']]
    });

    var applyRowData = null;
    comboBoxStatus = new Ext.form.ComboBox({
        id:'namelist',
        name:'namelist',//name只是改下拉的名称
        hiddenName:'namelist',//提交到后台的input的name
        width : 120,
        store : comboBoxNameStore,//填充数据
        emptyText : '团购活动',
        mode : 'local',//数据模式，local代表本地数据
        readOnly : false,//是否只读
        value : 'groupPurchase',
        triggerAction : 'all',// 显示所有下列数据，一定要设置属性triggerAction为all
        valueField : 'value',//值
        displayField : 'text',//显示文本
        editable: false,//是否允许输入
        forceSelection: true//必须选择一个选项
    });

    var listApplyGrid = Ext.create("Ext.grid.Panel", {
        store: listStore,
        tbar: [
            comboBoxStatus,
            '-',
            {xtype: 'button', text: LipiUtil.t('搜索'), id: "searchButton", iconCls: "settings", handler: searchButtonClick}
        ],
        border: false,
        columns: [
            {text: LipiUtil.t("期号"), dataIndex: "issueId", width:150, align:"center"},
            {text: LipiUtil.t("数据"), dataIndex: "data",flex:1},
            {text: LipiUtil.t("状态"), dataIndex: "status", width:200},
            {xtype: "actioncolumn", "text": "", align: "center", fixed : true, width: 80,items: [
                {
                    iconCls: "edit",
                    handler: function (view, row, col, item, e) {
                        var cData = view.store.getAt(row).data;
                        cData["action"] = cData["data"];
                        showDetail("数据",cData);
                    }
                }
            ]}
        ]
    });

    var viewPanel = Ext.create("Ext.panel.Panel", {
        title: LipiUtil.t("跨服活动数据统计"),
        frame: true,//是否渲染表单
        layout: {type: 'fit'},
        items: [listApplyGrid]
    });


    function searchButtonClick() {
        LipiUtil.showLoading();
        var name = (Ext.getCmp("namelist").getValue()=="")? '':Ext.getCmp("namelist").getValue();
        LHttp.post("gsData.getList", {"name":name}, function (data) {
            LipiUtil.hideLoading();

            if (LipiUtil.errorCheck(data) == false) return;
            var returnData = data["gsData.getList"];
            if (returnData["ERROR"]!=null) {
                Ext.Msg.alert("提示", JSON.stringify(returnData["info"]));
            } else {
                listStore.loadData(returnData);
            }
        });
    }

    searchButtonClick();
    this.view = viewPanel;
}