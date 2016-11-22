/**
 * Created with JetBrains WebStorm.
 * User: apple
 * Date: 13-7-18
 * Time: 下午1:46
 * To change this template use File | Settings | File Templates.
 */


function TestView() {
    var j = {
        "suit": [
            {
                "members": [
                    "3000101",
                    "3000102",
                    "3000103",
                    "3000104",
                    "3000105"
                ],
                "useDesc": "2星进化3星",
                "suitName": "精良套装",
                "lootPlace": "",
                "suitId": "7001"
            },
            {
                "members": [
                    "3000201",
                    "3000202",
                    "3000203",
                    "3000204",
                    "3000258"
                ],
                "useDesc": "3星进化金边",
                "suitName": "稀有套装",
                "lootPlace": "",
                "suitId": "7002"
            },
            {
                "members": [
                    "3000301",
                    "3000302",
                    "3000303",
                    "3000304",
                    "3000305"
                ],
                "useDesc": "3星进化4星",
                "suitName": "稀有武器",
                "lootPlace": "",
                "suitId": "7003"
            },
            {
                "members": [
                    "3000401",
                    "3000402",
                    "3000403",
                    "3000404",
                    "3000405"
                ],
                "useDesc": "4星进化金边",
                "suitName": "精良秘籍",
                "lootPlace": "",
                "suitId": "7004"
            },
            {
                "members": [
                    "3000501",
                    "3000502",
                    "3000503",
                    "3000504",
                    "3000505"
                ],
                "useDesc": "5星进化金边",
                "suitName": "史诗首饰",
                "lootPlace": "",
                "suitId": "7005"
            }
        ]
    };



    function jsonToTreeJSON(json,parent) {
        var mType = Ext.typeOf(json);
        switch (mType) {
            case "object":
            case "array":
                for(var key in json) {
                    var item = json[key];
                    var cObj = {text:key};
                    parent["expanded"] = true;
                    if(parent["children"] == null) parent["children"] = [cObj];
                    else parent["children"].push(cObj);
                    jsonToTreeJSON(item,cObj);
                }
                break;
            case "string":
            case "number":
                parent["text"] = parent["text"] + ":" + json;
                parent["leaf"] = true;
                break;
        }

        return parent;
    }

    var s = jsonToTreeJSON(j,{
        text:"JSON",
        expanded: true,
        children: []
    });
    console.log(s);

    var store = Ext.create('Ext.data.TreeStore', {
        root: {
            text:"JSON",
            expanded: true,
            children: [
                { text: "detention", leaf: true }
            ]
        }
    });


    var herosPanel = Ext.create('Ext.tree.Panel', {
        title: 'Simple Tree',
        width: 200,
        height: 150,
        store: store,
        lines:false,
        rootVisible: true
    });

    this.view = herosPanel;
    console.log(store);
    setTimeout(function(){
        store.setRootNode(s);

    },6000);


}