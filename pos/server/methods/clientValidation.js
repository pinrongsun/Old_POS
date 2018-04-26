import {Item} from '../../imports/api/collections/item.js'
import {RingPullInventories} from '../../imports/api/collections/ringPullInventory.js'
import {ConvertItemSettings} from '../../imports/api/collections/convertItemSetting.js'

Meteor.methods({
    findItem(itemId){
        return Item.findOne(itemId);
    },
    checkStockByLocation(stockLocationId, items){
        let result = {isEnoughStock: true, message: ''};
        let i = 1;
        items.forEach(function (item) {
            let thisItem = Item.findOne(item.itemId);
            let inventoryQty = thisItem.qtyOnHand[stockLocationId] == null ? 0 : thisItem.qtyOnHand[stockLocationId];
            if (item.qty > inventoryQty) {
                result.isEnoughStock = false;
                result.message = thisItem.name + " is not enough in stock. Qty on hand: " + inventoryQty;
                return false;
            }
        });
        return result;

    },
    findStockRingPull(itemId, branchId){
        let ringPullStock = RingPullInventories.findOne({itemId: itemId, branchId: branchId});
        if (ringPullStock) {
            return ringPullStock.qty;
        } else {
            return 0;
        }
    },
    getItems(){
        return Item.find({}).fetch();
    },
    findItemsAndConvertSetting(fromId, toId){
        let fromItem = Item.findOne(fromId);
        let toItem = Item.findOne(toId);
        let convertItemSetting = ConvertItemSettings.findOne({fromItemId: fromId, toItemId: toId});
        let getQty = convertItemSetting == null ? 1: convertItemSetting.qty;
        console.log(getQty);
        return {fromItem: fromItem, toItem: toItem, getQty: getQty};
    }

});