import {AverageInventories} from '../../imports/api/collections/inventory.js';
import {ExchangeRingPulls} from '../../imports/api/collections/exchangeRingPull.js'
import {EnterBills} from '../../imports/api/collections/enterBill.js'
import {ReceiveItems} from '../../imports/api/collections/receiveItem.js'
import {ReceivePayment} from '../../imports/api/collections/receivePayment.js'
import {ConvertItems} from '../../imports/api/collections/convertItem.js'
import {PayBills} from '../../imports/api/collections/payBill.js'
import {LendingStocks} from '../../imports/api/collections/lendingStock.js'
import {Invoices} from '../../imports/api/collections/invoice.js'
import {LocationTransfers} from '../../imports/api/collections/locationTransfer.js'
import {Item} from '../../imports/api/collections/item.js'
import {RingPullInventories} from '../../imports/api/collections/ringPullInventory.js'
import {RingPullTransfers} from '../../imports/api/collections/ringPullTransfer.js'
import {AccountIntegrationSetting} from '../../imports/api/collections/accountIntegrationSetting.js'
import {AccountMapping} from '../../imports/api/collections/accountMapping'
import {Branch} from '../../../core/imports/api/collections/branch.js'
import {TransferMoney} from '../../imports/api/collections/transferMoney.js'
import {StockLocations} from '../../imports/api/collections/stockLocation.js'
import {InventoryDates} from '../../imports/api/collections/inventoryDate.js'
import {ClosingStockBalance} from '../../imports/api/collections/closingStock.js'
import {idGenerator} from 'meteor/theara:id-generator';
import 'meteor/matb33:collection-hooks';
import StockFunction from '../../imports/api/libs/stock';

Meteor.methods({
    enterBillManageStock: function (enterBillId) {
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        Meteor.defer(function () {
            Meteor._sleepForMs(200);
            //---Open Inventory type block "Average Inventory"---
            let enterBill = EnterBills.findOne(enterBillId);
            enterBill.items.forEach(function (item) {
                averageInventoryInsert(enterBill.branchId, item, enterBill.stockLocationId, 'enterBill', enterBill._id);
            });
            //--- End Inventory type block "Average Inventory"---
        });
    },
    invoiceManageStock: function (invoiceId) {
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        Meteor.defer(function () {
            //---Open Inventory type block "Average Inventory"---
            let totalCost = 0;
            let invoice = Invoices.findOne(invoiceId);
            let prefix = invoice.stockLocationId + "-";
            let newItems = [];
            invoice.items.forEach(function (item) {
                let inventory = AverageInventories.findOne({
                    branchId: invoice.branchId,
                    itemId: item.itemId,
                    stockLocationId: invoice.stockLocationId
                }, {sort: {_id: -1}});
                if (inventory) {
                    item.cost = inventory.price;
                    item.amountCost = inventory.price * item.qty;
                    item.profit = item.amount - item.amountCost;
                    totalCost += item.amountCost;
                    newItems.push(item);
                    let newInventory = {
                        _id: idGenerator.genWithPrefix(AverageInventories, prefix, 13),
                        branchId: invoice.branchId,
                        stockLocationId: invoice.stockLocationId,
                        itemId: item.itemId,
                        qty: item.qty,
                        price: inventory.price,
                        remainQty: inventory.remainQty - item.qty,
                        coefficient: -1,
                        type: 'invoice',
                        refId: invoice._id
                    };
                    AverageInventories.insert(newInventory);
                }
                else {
                    var thisItem = Item.findOne(item.itemId);
                    item.cost = thisItem.purchasePrice;
                    item.amountCost = thisItem.purchasePrice * item.qty;
                    item.profit = item.amount - item.amountCost;
                    totalCost += item.amountCost;
                    newItems.push(item);
                    let newInventory = {
                        _id: idGenerator.genWithPrefix(AverageInventories, prefix, 13),
                        branchId: invoice.branchId,
                        stockLocationId: invoice.stockLocationId,
                        itemId: item.itemId,
                        qty: item.qty,
                        price: thisItem.purchasePrice,
                        remainQty: 0 - item.qty,
                        coefficient: -1,
                        type: 'invoice',
                        refId: invoice._id
                    };
                    AverageInventories.insert(newInventory);
                }
            });
            let totalProfit = invoice.total - totalCost;
            Invoices.direct.update(
                invoice._id,
                {$set: {items: newItems, totalCost: totalCost, profit: totalProfit}}
            );
            //--- End Inventory type block "Average Inventory"---
        });

    },
    locationTransferManageStock: function (lDoc) {
        let locationTransferId = lDoc.id;
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        let userId = Meteor.userId();
        let locationTransfer = LocationTransfers.findOne(locationTransferId);

        let fromInventoryDate = StockFunction.getLastInventoryDate(locationTransfer.fromBranchId, locationTransfer.fromStockLocationId);
        if (lDoc.date < fromInventoryDate) {
            throw new Meteor.Error('Date cannot be less than last Transaction Date: "' +
                moment(fromInventoryDate).format('YYYY-MM-DD') + '"');
        }

        let toInventoryDate = StockFunction.getLastInventoryDate(locationTransfer.toBranchId, locationTransfer.toStockLocationId);
        if (lDoc.date < toInventoryDate) {
            throw new Meteor.Error('Date cannot be less than last Transaction Date: "' +
                moment(toInventoryDate).format('YYYY-MM-DD') + '"');
        }
        let result = StockFunction.checkStockByLocation(locationTransfer.fromStockLocationId, locationTransfer.items);
        if (!result.isEnoughStock) {
            throw new Meteor.Error(result.message);
        }

        Meteor.defer(function () {
            Meteor._sleepForMs(200);
            //---Open Inventory type block "FIFO Inventory"---
            let locationTransferTotalCost = 0;

            let prefix = locationTransfer.fromStockLocationId + "-";
            let newItems = [];
            let total = 0;


            locationTransfer.items.forEach(function (item) {
                let inventory = AverageInventories.findOne({
                    branchId: locationTransfer.fromBranchId,
                    itemId: item.itemId,
                    stockLocationId: locationTransfer.fromStockLocationId
                }, {sort: {_id: -1}});

                if (inventory) {
                    item.price = inventory.averagePrice;
                    item.amount = inventory.averagePrice * item.qty;
                    total += item.amount;
                    newItems.push(item);
                    StockFunction.minusAverageInventoryInsert(
                        locationTransfer.fromBranchId,
                        item,
                        locationTransfer.fromStockLocationId,
                        'transfer-from',
                        locationTransferId,
                        //locationTransfer.locationTransferDate
                        lDoc.date
                    );
                    StockFunction.averageInventoryInsert(
                        locationTransfer.toBranchId,
                        item,
                        locationTransfer.toStockLocationId,
                        'transfer-to',
                        locationTransferId,
                        lDoc.date
                        //locationTransfer.locationTransferDate
                    );
                } else {
                    throw new Meteor.Error('Not Found Inventory. @locationTransfer-manage-stock. refId:' + locationTransferId);
                }

                //inventories=sortArrayByKey()
            });
            let setObj = {};
            setObj.items = newItems;
            setObj.total = total;
            setObj.pending = false;
            setObj.status = "closed";
            setObj.toUserId = userId;
            setObj.journalDate = lDoc.date;
            LocationTransfers.update(
                locationTransferId,
                {$set: setObj}
            );
            //--- End Inventory type block "FIFO Inventory"---

            if (locationTransfer.fromStockLocationId != locationTransfer.toStockLocationId) {
                //Account Integration
                let doc = locationTransfer;
                let fromBranchName = Branch.findOne(doc.fromBranchId).khName;
                let toBranchName = Branch.findOne(doc.toBranchId).khName;
                let des = "ផ្ទេរស្តុកពីសាខាៈ " + fromBranchName + " ទៅ " + toBranchName;
                doc.des = doc.des == "" || doc.des == null ? des : doc.des;
                doc.total = total;
                let setting = AccountIntegrationSetting.findOne();
                if (setting && setting.integrate) {
                    let inventoryChartAccount = AccountMapping.findOne({name: 'Inventory'});
                    let data1 = doc;
                    data1.transaction = [];
                    data1.branchId = doc.fromBranchId;
                    data1.type = "LocationTransferFrom";
                    data1.journalDate = lDoc.date;
                    data1.transaction.push({
                        account: inventoryChartAccount.account,
                        dr: 0,
                        cr: data1.total,
                        drcr: -data1.total
                    });
                    Meteor.call('insertAccountJournal', data1);

                    let data2 = doc;
                    data2.transaction = [];
                    data2.branchId = doc.toBranchId;
                    data2.journalDate = lDoc.date;
                    data2.type = "LocationTransferTo";
                    data2.transaction.push({
                        account: inventoryChartAccount.account,
                        dr: data2.total,
                        cr: 0,
                        drcr: data2.total
                    });
                    Meteor.call('insertAccountJournal', data2);
                }
                //End Account Integration
            }

        });
    },
    returnToInventory: function (invoiceId) {
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }

        Meteor.defer(function () {
            //---Open Inventory type block "Average Inventory"---
            let invoice = Invoices.findOne(invoiceId);
            invoice.items.forEach(function (item) {
                item.price = item.cost;
                averageInventoryInsert(
                    invoice.branchId,
                    item,
                    invoice.stockLocationId,
                    'invoice-return',
                    invoice._id
                );
            });
            //--- End Inventory type block "Average Inventory"---
        });
    },
    isEnoughStock: function (enterBillId) {
        let enterBill = enterBill.findOne(enterBillId);
        let enough = true;
        enterBill.items.forEach(function (item) {
            let inventory = AverageInventories.findOne({
                branchId: enterBill.branchId,
                itemId: item.itemId,
                locationId: item.locationId,
                price: item.price
            }, {sort: {_id: -1}, fields: {_id: 1, remainQty: 1, quantity: 1}});
            if (inventory.remainQty < item.qty) {
                enough = false;
                return false;
            }
        });
        return enough;
    },
    reduceFromInventory: function (enterBillId) {
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        Meteor.defer(function () {
            let enterBill = EnterBills.findOne(enterBillId);
            enterBill.items.forEach(function (item) {
                let inventory = AverageInventories.findOne({
                    branchId: enterBill.branchId,
                    itemId: item.itemId,
                    stockLocationId: enterBill.stockLocationId
                }, {sort: {_id: -1}});
                if (inventory) {
                    let newInventory = {
                        _id: idGenerator.genWithPrefix(AverageInventories, prefix, 13),
                        branchId: enterBill.branchId,
                        stockLocationId: enterBill.stockLocationId,
                        itemId: item.itemId,
                        qty: item.qty,
                        price: inventory.price,
                        remainQty: inventory.remainQty - item.qty,
                        coefficient: -1,
                        type: 'enter-return',
                        refId: enterBill._id
                    };
                    AverageInventories.insert(newInventory);
                } else {
                    let thisItem = Item.findOne(item.itemId);
                    let newInventory = {
                        _id: idGenerator.genWithPrefix(AverageInventories, prefix, 13),
                        branchId: enterBill.branchId,
                        stockLocationId: enterBill.stockLocationId,
                        itemId: item.itemId,
                        qty: item.qty,
                        price: thisItem.purchasePrice,
                        remainQty: 0 - item.qty,
                        coefficient: -1,
                        type: 'enter-return',
                        refId: enterBill._id
                    };
                    AverageInventories.insert(newInventory);
                }

            });
        });
    },
    declineTransfer(locationTransferId){
        let userId = Meteor.userId();
        let setObj = {};
        setObj.status = "declined";
        setObj.pending = false;
        setObj.toUserId = userId;
        LocationTransfers.update(
            locationTransferId,
            {$set: setObj}
        );
    },
    ringPullTransferManageStock: function (ringPullTransferId) {
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        let ringPullTransfer = RingPullTransfers.findOne(ringPullTransferId);
        let result = StockFunction.checkRingPullByBranch(ringPullTransfer.fromBranchId, ringPullTransfer.items);
        if (!result.isEnoughStock) {
            throw new Meteor.Error(result.message);
        }
        let userId = Meteor.userId();
        Meteor.defer(function () {
            //---Open Inventory type block "FIFO Inventory"---
            let ringPullTransferTotalCost = 0;
            let prefix = ringPullTransfer.stockLocationId + "-";
            let newItems = [];
            let total = 0;

            ringPullTransfer.items.forEach(function (item) {
                //1. reduce stock from the current stock location Or Add to some Account?....
                /*  let inventory = AverageInventories.findOne({
                 branchId: ringPullTransfer.fromBranchId,
                 itemId: item.itemId,
                 stockLocationId: ringPullTransfer.stockLocationId
                 }, {sort: {_id: 1}});

                 if (inventory) {
                 let newInventory = {
                 _id: idGenerator.genWithPrefix(AverageInventories, prefix, 13),
                 branchId: ringPullTransfer.fromBranchId,
                 stockLocationId: ringPullTransfer.stockLocationId,
                 itemId: item.itemId,
                 qty: item.qty,
                 price: inventory.price,
                 remainQty: inventory.remainQty - item.qty,
                 coefficient: -1,
                 type: 'ringPullTransfer-from',
                 refId: ringPullTransferId
                 };
                 AverageInventories.insert(newInventory);
                 item.price = inventory.price;
                 item.amount = inventory.price * item.qty;
                 }
                 else {
                 let thisItem = Item.findOne(item.itemId);
                 let newInventory = {
                 _id: idGenerator.genWithPrefix(AverageInventories, prefix, 13),
                 branchId: ringPullTransfer.fromBranchId,
                 stockLocationId: ringPullTransfer.fromStockLocationId,
                 itemId: item.itemId,
                 qty: item.qty,
                 price: thisItem.purchasePrice,
                 remainQty: 0 - item.qty,
                 coefficient: -1,
                 type: 'ringPullTransfer-from',
                 refId: ringPullTransferId
                 };
                 AverageInventories.insert(newInventory);
                 item.price = thisItem.purchasePrice;
                 item.amount = thisItem.purchasePrice * item.qty;
                 }
                 //total += item.amount;
                 newItems.push(item);
                 averageInventoryInsert(
                 ringPullTransfer.toBranchId,
                 item,
                 ringPullTransfer.toStockLocationId,
                 'ringPullTransfer-to',
                 ringPullTransferId
                 );*/

                //inventories=sortArrayByKey()
                //2. reduce RingPullInventory from fromBranch
                //---Reduce from Ring Pull Stock---
                let ringPullInventory = RingPullInventories.findOne({
                    branchId: ringPullTransfer.fromBranchId,
                    itemId: item.itemId,
                });
                if (ringPullInventory) {
                    RingPullInventories.update(
                        ringPullInventory._id,
                        {
                            $inc: {qty: -item.qty}
                        });
                }
                else {
                    RingPullInventories.insert({
                        itemId: item.itemId,
                        branchId: ringPullTransfer.fromBranchId,
                        qty: 0 - item.qty
                    })
                }
                //3. increase RingPullInventory to toBranch
                //---insert to Ring Pull Stock---
                let toRingPullInventory = RingPullInventories.findOne({
                    branchId: ringPullTransfer.toBranchId,
                    itemId: item.itemId,
                });
                if (toRingPullInventory) {
                    RingPullInventories.update(
                        toRingPullInventory._id,
                        {
                            $inc: {qty: item.qty}
                        });
                }
                else {
                    RingPullInventories.insert({
                        itemId: item.itemId,
                        branchId: ringPullTransfer.toBranchId,
                        qty: item.qty
                    })
                }
            });
            let setObj = {};
            //setObj.items = newItems;
            //setObj.total = total;
            setObj.pending = false;
            setObj.status = "closed";
            setObj.toUserId = userId;
            RingPullTransfers.update(
                ringPullTransferId,
                {$set: setObj}
            );
            //--- End Inventory type block "FIFO Inventory"---

            //Account Integration
            let doc = ringPullTransfer;
            let fromBranchName = Branch.findOne(doc.fromBranchId).khName;
            let toBranchName = Branch.findOne(doc.toBranchId).khName;
            let des = "ផ្ទេរក្រវិលពីសាខាៈ " + fromBranchName + " ទៅ " + toBranchName;
            doc.des = doc.des == "" || doc.des == null ? des : doc.des;
            let setting = AccountIntegrationSetting.findOne();
            if (setting && setting.integrate) {

                let ringPullChartAccount = AccountMapping.findOne({name: 'Ring Pull'});
                let data1 = doc;
                data1.transaction = [];
                data1.branchId = doc.fromBranchId;
                data1.type = "RingPullTransferFrom";
                data1.journalDate = doc.ringPullTransferDate;
                data1.transaction.push({
                    account: ringPullChartAccount.account,
                    dr: 0,
                    cr: data1.total,
                    drcr: -data1.total
                });
                Meteor.call('insertAccountJournal', data1);

                let data2 = doc;
                data2.transaction = [];
                data2.branchId = doc.toBranchId;
                data2.type = "RingPullTransferTo";
                data2.journalDate = doc.ringPullTransferDate;
                data2.transaction.push({
                    account: ringPullChartAccount.account,
                    dr: data2.total,
                    cr: 0,
                    drcr: data2.total
                });
                Meteor.call('insertAccountJournal', data2);
            }
            //End Account Integration
        });


    },
    declineRingPullTransfer(ringPullTransferId){
        let userId = Meteor.userId();
        let setObj = {};
        setObj.status = "declined";
        setObj.pending = false;
        setObj.toUserId = userId;
        RingPullTransfers.update(
            ringPullTransferId,
            {$set: setObj}
        );
    },
    transferMoney: function (moneyTransferId) {
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        let userId = Meteor.userId();
        Meteor.defer(function () {
            Meteor._sleepForMs(200);
            let moneyTransfer = TransferMoney.findOne(moneyTransferId);
            let setObj = {};
            setObj.pending = false;
            setObj.status = "closed";
            setObj.toUserId = userId;
            TransferMoney.update(
                moneyTransferId,
                {$set: setObj}
            );
            //--- End Inventory type block "FIFO Inventory"---
            //Account Integration
            let setting = AccountIntegrationSetting.findOne();
            if (setting && setting.integrate) {
                let doc = moneyTransfer;
                let fromBranchName = Branch.findOne(doc.fromBranchId).khName;
                let toBranchName = Branch.findOne(doc.toBranchId).khName;
                let des = "ផ្ទេរប្រាក់ពីសាខាៈ " + fromBranchName + " ទៅ " + toBranchName;
                doc.des = doc.des == "" || doc.des == null ? des : doc.des;

                let ringPullChartAccount = AccountMapping.findOne({name: 'Cash on Hand'});
                let data1 = doc;
                data1.total = doc.transferAmount;
                data1.transaction = [];
                data1.branchId = doc.fromBranchId;
                data1.journalDate = doc.transferMoneyDate;
                data1.type = "MoneyTransferFrom";
                data1.transaction.push({
                    account: ringPullChartAccount.account,
                    dr: 0,
                    cr: data1.transferAmount,
                    drcr: -data1.transferAmount
                });
                Meteor.call('insertAccountJournal', data1);
                let data2 = doc;
                data2.transaction = [];
                data2.branchId = doc.toBranchId;
                data2.type = "MoneyTransferTo";
                data2.journalDate = doc.transferMoneyDate;
                data2.total = doc.transferAmount;
                data2.transaction.push({
                    account: ringPullChartAccount.account,
                    dr: data2.transferAmount,
                    cr: 0,
                    drcr: data2.transferAmount
                });
                Meteor.call('insertAccountJournal', data2);
            }
            //End Account Integration
        });


    },
    declineTransferMoney(moneyTransferId){
        let userId = Meteor.userId();
        let setObj = {};
        setObj.status = "declined";
        setObj.pending = false;
        setObj.toUserId = userId;
        TransferMoney.update(
            moneyTransferId,
            {$set: setObj}
        );
    },

    /*-----------------update account function----------------*/
    correctAccountLocationTransfer: function () {
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        let locationTransfers = LocationTransfers.find({status: "closed", pending: false});
        let i = 1;
        locationTransfers.forEach(function (locationTransfer) {
            console.log('LT: ' + i);
            i++;
            //Account Integration
            let setting = AccountIntegrationSetting.findOne();
            if (setting && setting.integrate) {
                let inventoryChartAccount = AccountMapping.findOne({name: 'Inventory'});
                let data1 = {};
                data1.refId = locationTransfer._id;
                data1.transaction = [];
                data1.branchId = locationTransfer.fromBranchId;
                data1.refFrom = "LocationTransferFrom";
                data1.journalDate = locationTransfer.journalDate;
                data1.currencyId = "USD";
                data1.transaction.push({
                    account: inventoryChartAccount.account,
                    dr: 0,
                    cr: locationTransfer.total,
                    drcr: -locationTransfer.total
                });
                Meteor.call('api_journalUpdate', data1);

                let data2 = {};
                data1.refId = locationTransfer._id;
                data2.transaction = [];
                data2.branchId = locationTransfer.toBranchId;
                data2.refFrom = "LocationTransferTo";
                data2.journalDate = locationTransfer.journalDate;
                data2.currencyId = "USD";
                data2.transaction.push({
                    account: inventoryChartAccount.account,
                    dr: locationTransfer.total,
                    cr: 0,
                    drcr: locationTransfer.total
                });
                Meteor.call('api_journalUpdate', data2);
            }
            //End Account Integration

        });

    },
    correctAccountRingPullTransfer(){
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        let ringPullTransfers = RingPullInventories.find({status: "closed", pending: false});
        let i = 1;
        ringPullTransfers.forEach(function (doc) {
            console.log('RPT: ' + i);
            i++;
            let fromBranchName = Branch.findOne(doc.fromBranchId).khName;
            let toBranchName = Branch.findOne(doc.toBranchId).khName;
            let des = "ផ្ទេរក្រវិលពីសាខាៈ " + fromBranchName + " ទៅ " + toBranchName;
            doc.des = doc.des == "" || doc.des == null ? des : doc.des;
            let setting = AccountIntegrationSetting.findOne();
            if (setting && setting.integrate) {

                let ringPullChartAccount = AccountMapping.findOne({name: 'Ring Pull'});
                let data1 = doc;
                data1.transaction = [];
                data1.branchId = doc.fromBranchId;
                data1.type = "RingPullTransferFrom";
                data1.journalDate = moment().toDate();
                data1.transaction.push({
                    account: ringPullChartAccount.account,
                    dr: 0,
                    cr: data1.total,
                    drcr: -data1.total
                });
                Meteor.call('insertAccountJournal', data1);

                let data2 = doc;
                data2.transaction = [];
                data2.branchId = doc.toBranchId;
                data2.type = "RingPullTransferTo";
                data2.journalDate = moment().toDate();
                data2.transaction.push({
                    account: ringPullChartAccount.account,
                    dr: data2.total,
                    cr: 0,
                    drcr: data2.total
                });
                Meteor.call('insertAccountJournal', data2);
            }
            //End Account Integration
        });
    },
    correctAccountTransferMoney(){
        if (!Meteor.userId()) {
            throw new Meteor.Error("not-authorized");
        }
        let moneyTransfers = TransferMoney.find({status: "closed", pending: false});
        let i = 1;
        moneyTransfers.forEach(function (doc) {
            console.log('MT: ' + i);
            i++;
            let setting = AccountIntegrationSetting.findOne();
            if (setting && setting.integrate) {
                let fromBranchName = Branch.findOne(doc.fromBranchId).khName;
                let toBranchName = Branch.findOne(doc.toBranchId).khName;
                let des = "ផ្ទេរប្រាក់ពីសាខាៈ " + fromBranchName + " ទៅ " + toBranchName;
                doc.des = doc.des == "" || doc.des == null ? des : doc.des;

                let ringPullChartAccount = AccountMapping.findOne({name: 'Cash on Hand'});
                let data1 = doc;
                data1.total = doc.transferAmount;
                data1.transaction = [];
                data1.branchId = doc.fromBranchId;
                data1.journalDate = doc.transferMoneyDate;
                data1.type = "MoneyTransferFrom";
                data1.transaction.push({
                    account: ringPullChartAccount.account,
                    dr: 0,
                    cr: data1.transferAmount,
                    drcr: -data1.transferAmount
                });
                Meteor.call('insertAccountJournal', data1);
                let data2 = doc;
                data2.transaction = [];
                data2.branchId = doc.toBranchId;
                data2.type = "MoneyTransferTo";
                data2.journalDate = doc.transferMoneyDate;
                data2.total = doc.transferAmount;
                data2.transaction.push({
                    account: ringPullChartAccount.account,
                    dr: data2.transferAmount,
                    cr: 0,
                    drcr: data2.transferAmount
                });
                Meteor.call('insertAccountJournal', data2);
            }
            //End Account Integration
        });


    },
    getTransactions(branchId, doc){

        let transaction = {};
        let branchIds = [branchId];
        let date = moment(doc.date).startOf('days').toDate();
        let locationTransfers = LocationTransfers.find({
            $or: [{journalDate: {$gte: date}, fromBranchId: branchId}, {
                journalDate: {$gte: date},
                toBranchId: branchId
            }]
        });

        if (locationTransfers.count() > 0) {
            locationTransfers.forEach(function (locationTransfer) {
                if (branchIds.indexOf(locationTransfer.fromBranchId) == -1) {
                    branchIds.push(locationTransfer.fromBranchId);
                }
                if (branchIds.indexOf(locationTransfer.toBranchId) == -1) {
                    branchIds.push(locationTransfer.toBranchId);
                }
            });
            transaction.locationTransfers = locationTransfers.fetch();
        }


        let invoices = Invoices.find({invoiceDate: {$gte: date}, branchId: {$in: branchIds}});
        if (invoices.count() > 0) {
            transaction.invoices = invoices.fetch();
        }
        let enterBills = EnterBills.find({enterBillDate: {$gte: date}, branchId: {$in: branchIds}});
        if (enterBills.count() > 0) {
            transaction.enterBills = enterBills.fetch();
        }
        let lendingStocks = LendingStocks.find({lendingStockDate: {$gte: date}, branchId: {$in: branchIds}});
        if (lendingStocks.count() > 0) {
            transaction.lendingStocks = lendingStocks.fetch();
        }
        let receiveItems = ReceiveItems.find({receiveItemDate: {$gte: date}, branchId: {$in: branchIds}});
        if (receiveItems.count() > 0) {
            transaction.receiveItems = receiveItems.fetch();
        }
        let exchangeRingPulls = ExchangeRingPulls.find({
            exchangeRingPullDate: {$gte: date},
            branchId: {$in: branchIds}
        });
        if (exchangeRingPulls.count() > 0) {
            transaction.exchangeRingPulls = exchangeRingPulls.fetch();
        }

        let convertItems = ConvertItems.find({convertItemDate: {$gte: date}, branchId: {$in: branchIds}});
        if (convertItems.count() > 0) {
            transaction.convertItems = convertItems.fetch();
        }
        let invoiceIds = [];
        invoices.forEach(function (inv) {
            invoiceIds.push(inv._id);
        });
        let billIds = [];
        enterBills.forEach(function (bill) {
            billIds.push(bill._id);
        });
        let receivePayments = ReceivePayment.find({invoiceId: {$in: invoiceIds}});
        if (receivePayments.count() > 0) {
            transaction.receivePayments = receivePayments.fetch();
        }
        let payBills = PayBills.find({billId: {$in: billIds}});
        if (payBills.count() > 0) {
            transaction.payBills = payBills.fetch();
        }
        return transaction;


    },
    removeTransactions(branchId, doc){
        //  Meteor.defer(function () {
        let transaction = {};
        let branchIds = [branchId];
        let date = moment(doc.date).startOf('days').toDate();
        let locationTransfers = LocationTransfers.find({
            $or: [{journalDate: {$gte: date}, fromBranchId: branchId},
                {journalDate: {$gte: date}, toBranchId: branchId}]
        });
        let locationTransactionIds = [];
        if (locationTransfers.count() > 0) {
            locationTransfers.forEach(function (locationTransfer) {
                locationTransactionIds.push(locationTransfer._id);
                if (branchIds.indexOf(locationTransfer.fromBranchId) == -1) {
                    branchIds.push(locationTransfer.fromBranchId);
                }
                if (branchIds.indexOf(locationTransfer.toBranchId) == -1) {
                    branchIds.push(locationTransfer.toBranchId);
                }
            });
            transaction.locationTransfers = locationTransfers.fetch();
        }
        let invoices = Invoices.find({invoiceDate: {$gte: date}, branchId: {$in: branchIds}});
        let enterBills = EnterBills.find({enterBillDate: {$gte: date}, branchId: {$in: branchIds}});
        let lendingStocks = LendingStocks.find({lendingStockDate: {$gte: date}, branchId: {$in: branchIds}});
        let receiveItems = ReceiveItems.find({receiveItemDate: {$gte: date}, branchId: {$in: branchIds}});
        let exchangeRingPulls = ExchangeRingPulls.find({
            exchangeRingPullDate: {$gte: date},
            branchId: {$in: branchIds}
        });

        let convertItems = ConvertItems.find({convertItemDate: {$gte: date}, branchId: {$in: branchIds}});
        let invoiceIds = [];
        invoices.forEach(function (inv) {
            invoiceIds.push(inv._id);
        });
        let billIds = [];
        enterBills.forEach(function (bill) {
            billIds.push(bill._id);
        });
        let receivePayments = ReceivePayment.find({invoiceId: {$in: invoiceIds}});
        let payBills = PayBills.find({billId: {$in: billIds}});


        let setting = AccountIntegrationSetting.findOne();
        if (setting && setting.integrate) {
            if (convertItems.count() > 0) {
                convertItems.forEach(function (obj) {
                    let data = {_id: obj._id, type: 'ConvertItem'};
                    Meteor.call('removeAccountJournal', data);
                })
            }
            if (receivePayments.count() > 0) {
                receivePayments.forEach(function (obj) {
                    let data = {_id: obj._id, type: 'ReceivePayment'};
                    Meteor.call('removeAccountJournal', data);
                })
            }
            if (payBills.count() > 0) {
                payBills.forEach(function (obj) {
                    let data = {_id: obj._id, type: "PayBill"};
                    Meteor.call('removeAccountJournal', data);
                })
            }

            if (locationTransfers.count() > 0) {
                locationTransfers.forEach(function (obj) {
                    let data = {_id: obj._id, type: 'LocationTransfer'};
                    Meteor.call('removeAccountJournal', data);
                });
            }
            if (invoices.count() > 0) {
                invoices.forEach(function (obj) {
                    let data = {_id: obj._id, type: 'Invoice'};
                    Meteor.call('removeAccountJournal', data);
                });
            }
            if (enterBills.count() > 0) {
                enterBills.forEach(function (obj) {
                    let data = {_id: obj._id, type: 'EnterBill'};
                    Meteor.call('removeAccountJournal', data);
                });
            }
            if (lendingStocks.count() > 0) {
                lendingStocks.forEach(function (obj) {
                    let data = {_id: obj._id, type: 'LendingStock'};
                    Meteor.call('removeAccountJournal', data);
                });
            }
            if (receiveItems.count() > 0) {
                receiveItems.forEach(function (obj) {
                    let type = obj.type == 'CompanyExchangeRingPull' ? "RingPull-RI" : obj.type + "-RI";
                    let data = {_id: obj._id, type: type};
                    Meteor.call('removeAccountJournal', data);
                });
            }
            if (exchangeRingPulls.count() > 0) {
                exchangeRingPulls.forEach(function (obj) {
                    let data = {_id: obj._id, type: 'ExchangeRingPull'};
                    Meteor.call('removeAccountJournal', data);
                });
            }
        }

        ConvertItems.direct.remove({convertItemDate: {$gte: date}, branchId: {$in: branchIds}});
        ReceivePayment.direct.remove({invoiceId: {$in: invoiceIds}});
        PayBills.direct.remove({billId: {$in: billIds}});
        LocationTransfers.direct.remove({
            $or: [{journalDate: {$gte: date}, fromBranchId: branchId},
                {journalDate: {$gte: date}, toBranchId: branchId}]
        });
        Invoices.direct.remove({invoiceDate: {$gte: date}, branchId: {$in: branchIds}});
        EnterBills.direct.remove({enterBillDate: {$gte: date}, branchId: {$in: branchIds}});
        LendingStocks.direct.remove({lendingStockDate: {$gte: date}, branchId: {$in: branchIds}});
        ReceiveItems.direct.remove({receiveItemDate: {$gte: date}, branchId: {$in: branchIds}});
        ExchangeRingPulls.direct.remove({
            exchangeRingPullDate: {$gte: date},
            branchId: {$in: branchIds}
        });
        AverageInventories.direct.remove({inventoryDate: {$gte: date}, branchId: {$in: branchIds}});
        let branches = Branch.find({}).fetch();
        let stockLocations = StockLocations.find({}).fetch();
        let items = Item.find({}).fetch();

        InventoryDates.direct.remove({});
        Item.direct.update({}, {$unset: {qtyOnHand: ''}});
        branches.forEach(function (branch) {
            stockLocations.forEach(function (stockLocation) {
                let inventoryForDate = AverageInventories.findOne({
                    branchId: branch._id,
                    stockLocationId: stockLocation._id
                }, {sort: {_id: -1}});
                if (inventoryForDate) {
                    InventoryDates.direct.update(
                        {branchId: branch._id, stockLocationId: stockLocation._id},
                        {$set: {inventoryDate: inventoryForDate.inventoryDate}},
                        {upsert: true}
                    );
                }
                items.forEach(function (item) {
                    let inventory = AverageInventories.findOne({
                        branchId: branch._id,
                        stockLocationId: stockLocation._id,
                        itemId: item._id
                    }, {sort: {_id: -1}});
                    if (inventory) {
                        let setModifier = {$set: {}};
                        setModifier.$set['qtyOnHand.' + stockLocation._id] = inventory.remainQty;
                        Item.direct.update(item._id, setModifier);
                    }
                })
            })
        });
        //remove closing stock balance
        Meteor.defer(function () {
            ClosingStockBalance.remove({branchId: {$in: branchIds}, closingDate: {$gte: date}});
        });
        return getTransactionsAfterRemove(branchId, doc);
        //});
    }

});

function getTransactionsAfterRemove(branchId, doc) {

    let transaction = {};
    let branchIds = [branchId];
    let date = moment(doc.date).startOf('days').toDate();
    let locationTransfers = LocationTransfers.find({
        $or: [{journalDate: {$gte: date}, fromBranchId: branchId}, {journalDate: {$gte: date}, toBranchId: branchId}]
    });

    if (locationTransfers.count() > 0) {
        locationTransfers.forEach(function (locationTransfer) {
            if (branchIds.indexOf(locationTransfer.fromBranchId) == -1) {
                branchIds.push(locationTransfer.fromBranchId);
            }
            if (branchIds.indexOf(locationTransfer.toBranchId) == -1) {
                branchIds.push(locationTransfer.toBranchId);
            }
        });
        transaction.locationTransfers = locationTransfers.fetch();
    }


    let invoices = Invoices.find({invoiceDate: {$gte: date}, branchId: {$in: branchIds}});
    if (invoices.count() > 0) {
        transaction.invoices = invoices.fetch();
    }
    let enterBills = EnterBills.find({enterBillDate: {$gte: date}, branchId: {$in: branchIds}});
    if (enterBills.count() > 0) {
        transaction.enterBills = enterBills.fetch();
    }
    let lendingStocks = LendingStocks.find({lendingStockDate: {$gte: date}, branchId: {$in: branchIds}});
    if (lendingStocks.count() > 0) {
        transaction.lendingStocks = lendingStocks.fetch();
    }
    let receiveItems = ReceiveItems.find({receiveItemDate: {$gte: date}, branchId: {$in: branchIds}});
    if (receiveItems.count() > 0) {
        transaction.receiveItems = receiveItems.fetch();
    }
    let exchangeRingPulls = ExchangeRingPulls.find({
        exchangeRingPullDate: {$gte: date},
        branchId: {$in: branchIds}
    });
    if (exchangeRingPulls.count() > 0) {
        transaction.exchangeRingPulls = exchangeRingPulls.fetch();
    }

    let convertItems = ConvertItems.find({convertItemDate: {$gte: date}, branchId: {$in: branchIds}});
    if (convertItems.count() > 0) {
        transaction.convertItems = convertItems.fetch();
    }
    let invoiceIds = invoices.map(function (inv) {
        return inv._id;
    });
    let billIds = enterBills.map(function (bill) {
        return bill._id;
    });
    let receivePayments = ReceivePayment.find({invoiceId: {$in: invoiceIds}});
    if (receivePayments.count() > 0) {
        transaction.receivePayments = receivePayments.fetch();
    }
    let payBills = PayBills.find({billId: {$in: billIds}});
    if (payBills.count() > 0) {
        transaction.payBills = payBills.fetch();
    }
    return transaction;
}

function averageInventoryInsert(branchId, item, stockLocationId, type, refId) {
    let lastPurchasePrice = 0;
    let remainQuantity = 0;
    let prefix = stockLocationId + '-';
    let inventory = AverageInventories.findOne({
        branchId: branchId,
        itemId: item.itemId,
        stockLocationId: stockLocationId
    }, {sort: {createdAt: -1}});
    if (inventory == null) {
        let inventoryObj = {};
        inventoryObj._id = idGenerator.genWithPrefix(AverageInventories, prefix, 13);
        inventoryObj.branchId = branchId;
        inventoryObj.stockLocationId = stockLocationId;
        inventoryObj.itemId = item.itemId;
        inventoryObj.qty = item.qty;
        inventoryObj.price = item.price;
        inventoryObj.remainQty = item.qty;
        inventoryObj.type = type;
        inventoryObj.coefficient = 1;
        inventoryObj.refId = refId;
        lastPurchasePrice = item.price;
        remainQuantity = inventoryObj.remainQty;
        AverageInventories.insert(inventoryObj);
    }
    else if (inventory.price == item.price) {
        let inventoryObj = {};
        inventoryObj._id = idGenerator.genWithPrefix(AverageInventories, prefix, 13);
        inventoryObj.branchId = branchId;
        inventoryObj.stockLocationId = stockLocationId;
        inventoryObj.itemId = item.itemId;
        inventoryObj.qty = item.qty;
        inventoryObj.price = item.price;
        inventoryObj.remainQty = item.qty + inventory.remainQty;
        inventoryObj.type = type;
        inventoryObj.coefficient = 1;
        inventoryObj.refId = refId;
        lastPurchasePrice = item.price;
        remainQuantity = inventoryObj.remainQty;
        AverageInventories.insert(inventoryObj);
        /*
         let
         inventorySet = {};
         inventorySet.qty = item.qty + inventory.qty;
         inventorySet.remainQty = inventory.remainQty + item.qty;
         AverageInventories.update(inventory._id, {$set: inventorySet});
         */
    }
    else {
        let totalQty = inventory.remainQty + item.qty;
        let price = 0;
        //should check totalQty or inventory.remainQty
        if (totalQty <= 0) {
            price = inventory.price;
        } else if (inventory.remainQty <= 0) {
            price = item.price;
        } else {
            price = ((inventory.remainQty * inventory.price) + (item.qty * item.price)) / totalQty;
        }
        let nextInventory = {};
        nextInventory._id = idGenerator.genWithPrefix(AverageInventories, prefix, 13);
        nextInventory.branchId = branchId;
        nextInventory.stockLocationId = stockLocationId;
        nextInventory.itemId = item.itemId;
        nextInventory.qty = item.qty;
        nextInventory.price = math.round(price, 2);
        nextInventory.remainQty = totalQty;
        nextInventory.type = type;
        nextInventory.coefficient = 1;
        nextInventory.refId = refId;
        lastPurchasePrice = price;
        remainQuantity = nextInventory.remainQty;
        AverageInventories.insert(nextInventory);
    }

    var setModifier = {$set: {purchasePrice: lastPurchasePrice}};
    setModifier.$set['qtyOnHand.' + stockLocationId] = remainQuantity;
    Item.direct.update(item.itemId, setModifier);
}

/*
 //Account Integration
 let setting = AccountIntegrationSetting.findOne();
 if (setting && setting.integrate) {
 let transaction = [];
 let data = doc;
 data.type = "PrepaidOrder";
 data.items.forEach(function (item) {
 let itemDoc = Item.findOne(item.itemId);
 if (itemDoc.accountMapping.accountReceivable && itemDoc.accountMapping.inventoryAsset) {
 transaction.push({
 account: itemDoc.accountMapping.accountReceivable,
 dr: item.amount,
 cr: 0,
 drcr: item.amount
 }, {
 account: itemDoc.accountMapping.inventoryAsset,
 dr: 0,
 cr: item.amount,
 drcr: -item.amount
 })
 }
 });
 data.transaction = transaction;
 Meteor.call('updateAccountJournal', data);
 }
 //End Account Integration


 */
/*
 //Account Integration
 let setting = AccountIntegrationSetting.findOne();
 if (setting && setting.integrate) {
 let data = {_id: doc._id, type: 'PrepaidOrder'};
 Meteor.call('removeAccountJournal', data)
 }
 //End Account Integration
 */
