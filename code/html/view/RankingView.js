/**
 * 排行榜
 * User: liyuluan
 * Date: 14-4-23
 * Time: 下午3:20
 */

function RankingView() {
    var cityComboboxStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["value", "text"],
        data: gData["serverList"]
    });

    var typeStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["value", "text"],
        data: [
            ["level", "等级排行"],
            ["pvp", "激战排行"],
            ["top5", "封印5人阵排行"],
            ["top6", "封印6人阵排行"],
            ["top7", "封印7人阵排行"],
            ["top8", "封印8人阵排行"],
            ["rechargeRanking","充值排行榜"],
            ["consumeRanking","消费排行榜"],
            ["cosmosEvaluation","宇宙第一排行榜"],
            ["cosmosLeague","宇宙联盟排行榜"],
            ["leagueStarInfo","联盟战信息"]
        ]
    });

    var dayStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["value", "text"],
        data: [
            [0, 0],
            [1, 1],
            [2, 2],
            [3, 3],
            [4, 4],
            [5, 5]
        ]
    });


    var tableStore = Ext.create("Ext.data.ArrayStore", {
        fields: ["top", "userUid", "value"],
        data: [
        ]
    });


    var RankingTable = Ext.create("Ext.grid.Panel", {
        store: tableStore,
//        title:"商品 列表",
        y: 0,
//        selModel:selModel,
        tbar: [
            {xtype: 'combobox', fieldLabel: '分区', name: "city", labelWidth: 40, id: "city", width: 160, valueField: "value",
                store: cityComboboxStore, value: "1", editable: false,
                listeners: {select: function () {
                    getRanking();
                }}
            },
            "-",
            {xtype: 'combobox', fieldLabel: '类别', name: "type", labelWidth: 40, id: "type", width: 160, valueField: "value",
                store: typeStore, value: "level", editable: false,
                listeners: {select: function () {
                    getRanking();
                }}
            },
            "-",
            {xtype: 'combobox', fieldLabel: '几天前', name: "day", labelWidth: 40, id: "day", width: 160, valueField: "value",
                store: dayStore, value: "0",
                listeners: {select: function () {
                    getRanking();
                }}
            },
            "-",
            {xtype: 'textfield', fieldLabel: 'key', name: "key", labelWidth: 40, id: "key", width: 160,value:""},
            "-",
            {xtype: 'button', text:LipiUtil.t('搜索'), handler: function(){
                getRanking();
            }},
            " ",
            " ",
            {xtype: 'button', text:LipiUtil.t('拷贝'), handler:function() {
                var mText = "";
                for (var i = 0; i < _mList.length; i++) {
                    mText += _mList[i]["top"];
                    mText += ":";
                    mText += _mList[i]["userUid"];
                    mText += "; ";
                }

                Ext.Msg.alert("文本", mText);
            }
            }
        ],
        anchor: "100% -355", //shopUid type buyPrice originPrice priceType sTime eTime vip count itemId close
        columns: [
            {text: LipiUtil.t("排名"), dataIndex: "top", flex: 1},
            {text: LipiUtil.t("userUid"), dataIndex: "userUid", flex: 1},
            {text: LipiUtil.t("VALUE"), dataIndex: "value", flex: 1}
        ]
    });


    var RankingView = Ext.create("Ext.panel.Panel", {
        title: LipiUtil.t("排行榜"),
        frame: true,//是否渲染表单
        layout: {type: 'fit'},
        items: [RankingTable]
    });
    var _mList = [];

    function getRanking() {

        var mType = Ext.getCmp("type").value;
        var key = Ext.getCmp("key").value;
        var mCity = Ext.getCmp("city").value;
        var mDay = Ext.getCmp("day").value;
        LipiUtil.showLoading();
        LHttp.post("user.ranking", {"city": mCity, "day": mDay, "type": mType, "key":key}, function (res) {
            LipiUtil.hideLoading();
            if (LipiUtil.errorCheck(res, "user.ranking") == false) return;
            if (res != null) {
                var rankingList = res["user.ranking"];
                var mList = [];
                if (mType == "level") {
                    for (var i = 0; i < rankingList.length; i += 2) {
                        var obj = {};
                        obj["top"] = Math.floor(i / 2) + 1;
                        obj["userUid"] = rankingList[i];
                        obj["value"] = rankingList[i + 1];
                        mList.push(obj);
                    }
                } else if (mType == "pvp") {
                    for (var i = 0; i < rankingList.length; i++) {
                        var obj = {};
                        obj["top"] = rankingList[i]["top"];
                        obj["userUid"] = rankingList[i]["userUid"];
                        obj["value"] = rankingList[i]["robot"];
                        mList.push(obj);
                    }
                }else if (mType == "rechargeRanking") {
                    //充值排行
                    for (var i = 0; i < rankingList.length; i++) {
                        var obj = {};
                        obj["top"] = rankingList[i]["top"];
                        obj["userUid"] = rankingList[i]["userUid"];
                        obj["value"] = rankingList[i]["value"];
                        mList.push(obj);
                    }
                } else if (mType == "consumeRanking") {
                    //消费排行
                    for (var i = 0; i < rankingList.length; i++) {
                        var obj = {};
                        obj["top"] = rankingList[i]["top"];
                        obj["userUid"] = rankingList[i]["userUid"];
                        obj["value"] = rankingList[i]["value"];
                        mList.push(obj);
                    }
                }else if (mType == "cosmosEvaluation") {
                    //宇宙第一排行
                    for (var i = 0; i < rankingList.length; i++) {
                        var obj = {};
                        obj["top"] = rankingList[i]["top"];
                        obj["userUid"] = rankingList[i]["userUid"];
                        obj["value"] = rankingList[i]["value"];
                        mList.push(obj);
                    }
                } else if (mType == "cosmosLeague") {
                    //宇宙第一联盟排行
                    for (var i = 0; i < rankingList.length; i++) {
                        var obj = {};
                        obj["top"] = rankingList[i]["top"];
                        obj["userUid"] = rankingList[i]["userUid"];
                        obj["value"] = rankingList[i]["value"];
                        mList.push(obj);
                    }
                } else if (mType == "leagueStarInfo") {
                    //联盟星球战信息
                    for (var i = 0; i < rankingList.length; i++) {
                        var obj = {};
                        obj["top"] = rankingList[i]["starId"];
                        obj["userUid"] = rankingList[i]["leagueUid"];
                        obj["value"] = rankingList[i]["hasTime"];
//                        console.log(obj,"view..");
                        mList.push(obj);
                    }
                } else {
                    for (var i = 0; i < rankingList.length; i++) {
                        var obj = {};
                        obj["top"] = rankingList[i]["top"];
                        obj["userUid"] = rankingList[i]["userId"];
                        obj["value"] = rankingList[i]["value"];
                        mList.push(obj);
                    }
                }
                _mList = mList;
                tableStore.loadData(mList);
            }
        });

    }
    getRanking();

    this.view = RankingView;
}
