/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-7-18
 * Time: 下午5:26
 * To change this template use File | Settings | File Templates.
 */


function MainView() {

    var viewDic = {};

    function getView(viewName) {

        if(viewDic[viewName] == null) {
            viewDic[viewName] = new this[viewName]().view;
        }

        return viewDic[viewName];//new this[viewName]().view;
    }
    function open(view) {
        cCenter.removeAll();
        cCenter.add( view );
    }
    //主界面左侧列表
    var pUserAdminList = Ext.create('Ext.tree.Panel',{
        title: LipiUtil.t("运营管理"),
        width: 150,
        height: 150,
        rootVisible:false,
        root: {
            text: 'root',
            expanded: true,
            children: [
                {
                    text: LipiUtil.t("用户信息"),
                    id: "UserInfo",
                    leaf: true
                },
                {
                    text:LipiUtil.t('公告'),
                    id:"NoticeView",
                    leaf:true
                },
                {
                    text:LipiUtil.t('聊天'),
                    id:"ChatView",
                    leaf:true
                },
                {
                    text:LipiUtil.t('邮件'),
                    id:"MailView",
                    leaf:true
                },
                {
                    text:LipiUtil.t('奖励列表'),
                    id:"MailViewApplyList",
                    leaf:true
                },
                {
                    text:LipiUtil.t('奖励申请'),
                    id:"MailViewApply",
                    leaf:true
                },
                {
                    text:LipiUtil.t('CDKEY'),
                    id:"CDKeyView",
                    leaf:true
                },
                {
                    text:LipiUtil.t('商品管理'),
                    id:"ShopView",
                    leaf:true
                },
                {
                    text:LipiUtil.t('补偿管理'),
                    id:"CompensateView",
                    leaf:true
                },
                {
                    text:LipiUtil.t('活动管理'),
                    id:"ActivityView",
                    leaf:true
                },
                {
                    text:LipiUtil.t('跨服活动数据统计'),
                    id:"GSData",
                    leaf:true
                },
                {
                    text:LipiUtil.t('玩家排行'),
                    id:"RankingView",
                    leaf:true
                },
                {
                    text:LipiUtil.t('账号管理'),
                    id:"CreateUser",
                    leaf:true
                },
                {
                    text:LipiUtil.t('第三方账号管理'),
                    id:"LoginManager",
                    leaf:true
                },
                {
                    text:LipiUtil.t('日志中心'),
                    id:"AdminOperationLog",
                    leaf:true
                },
                {
                    text:LipiUtil.t('数据统计'),
                    id:"AnalyticView",
                    leaf:true
                },
                {
                    text:LipiUtil.t('服务器管理'),
                    id:"ServerView",
                    leaf:true
                },
                {
                    text:LipiUtil.t('缓存管理'),
                    id:"CacheView",
                    leaf:true
                }
            ]
        },
        listeners:{
            itemclick:function(node,record) {
                var viewName = record.data.id;
                open( getView(viewName) );
            }
        }
    });
    var cashServer = Ext.util.Cookies.get("country") == null ? "b" : Ext.util.Cookies.get("country");
    var ser = '';
    for(var i in platformData){
        if(platformData[i][0] == cashServer)
            ser = platformData[i][1];
    }
    document.title = ser+"-"+document.title;

    var platformComboboxStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["value", "text"],
        data: platformData
    });
    var pHead = Ext.create('Ext.Panel',{
        id:'pHead',
        autoWidth:true,
        heigth:80,
        frame:true,
        region:'north',
        tbar:[
            LipiUtil.t('龙珠Z神与神管理后台---------------'),
            {xtype: 'combobox', fieldLabel: '服务器', name: "platform", labelWidth: 50, id: "platform", width: 160, valueField: "value",
            store:platformComboboxStore, value: cashServer, editable: false,
            listeners: {select: function () {
                Ext.util.Cookies.set('country', this.value, new Date(new Date().getTime() + 1000*60*60*3));
                location="javascript:location.reload()";
            }}
        }]
        //html:'龙珠Z神与神管理后台---------------' + ser
    });

    var pLeft = Ext.create('Ext.Panel',{
        id:'pLeft',
        title:'功能项',
        width:200,
        heigth:'auto',
        split:true,//显示分隔条
        region:'west',
        layout:'accordion',
        layoutConfig:{
            animate:true
        },
        collapsible:true,
        items:[
            pUserAdminList
        ]
    });
    var cCenter = Ext.create("Ext.container.Container",{
        autoDestroy:false,
        region:'center',
        layout:{type:"fit"},
        items:[ getView("UserInfo")]
    });


    var pPage = Ext.create('Ext.Viewport',{
        layout:"border",
        items:[
            pHead,
            pLeft,
            cCenter
        ]
    });


}
