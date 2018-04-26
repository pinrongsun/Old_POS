import {ReactiveDict} from 'meteor/reactive-dict';
import {Template} from 'meteor/templating';
import {AutoForm} from 'meteor/aldeed:autoform';
import {Roles} from 'meteor/alanning:roles';
import {alertify} from 'meteor/ovcharik:alertifyjs';
import {sAlert} from 'meteor/juliancwirko:s-alert';
import {fa} from 'meteor/theara:fa-helpers';
import {lightbox} from 'meteor/theara:lightbox-helpers';
import {_} from 'meteor/erasaur:meteor-lodash';
import {$} from 'meteor/jquery';
import {TAPi18n} from 'meteor/tap:i18n';
import {ReactiveTable} from 'meteor/aslagle:reactive-table';
import 'meteor/theara:template-states';

// Lib
import {createNewAlertify} from '../../../../core/client/libs/create-new-alertify.js';
import {renderTemplate} from '../../../../core/client/libs/render-template.js';
import {destroyAction} from '../../../../core/client/libs/destroy-action.js';
import {displaySuccess, displayError} from '../../../../core/client/libs/display-alert.js';
import {reactiveTableSettings} from '../../../../core/client/libs/reactive-table-settings.js';
import {__} from '../../../../core/common/libs/tapi18n-callback-helper.js';

// Component
import '../../../../core/client/components/loading.js';
import '../../../../core/client/components/column-action.js';
import '../../../../core/client/components/form-footer.js';

// Collection
import {ConvertItemItemsSchema} from '../../api/collections/order-items.js';
import {ConvertItems} from '../../api/collections/convertItem.js';
import {Order} from '../../api/collections/order';
// Declare template
// Page
import './convertItem-items.html';
let itemsTmpl = Template.Pos_convertItemItems,
    actionItemsTmpl = Template.Pos_convertItemItemsAction,
    editItemsTmpl = Template.Pos_convertItemItemsEdit;

//methods
// Local collection
let itemsCollection;

export const deletedItem = new Mongo.Collection(null); //export collection deletedItem to convertItem js

itemsTmpl.onCreated(function () {
    // Create new  alertify
    createNewAlertify('item');

    // Data context
    let data = Template.currentData();
    itemsCollection = data.itemsCollection;
    // State
    this.state('amount', 0);

});

itemsTmpl.onRendered(function () {

});

itemsTmpl.helpers({
    notActivatedSaleOrder() {
        if (FlowRouter.query.get('customerId')) {
            return false;
        }
        return true;
    },
    tableSettings: function () {
        let i18nPrefix = 'pos.convertItem.schema';

        reactiveTableSettings.showFilter = false;
        reactiveTableSettings.showNavigation = 'never';
        reactiveTableSettings.showColumnToggles = false;
        reactiveTableSettings.collection = itemsCollection;
        reactiveTableSettings.fields = [{
            key: 'fromItemId',
            label: __(`${i18nPrefix}.fromItemId.label`)
        }, {
            key: 'fromName',
            label: 'From Item'
        }, {
            key: 'toItemId',
            label: __(`${i18nPrefix}.toItemId.label`)
        }, {
            key: 'toName',
            label: 'To Item'
        }, {
            key: 'qty',
            label: __(`${i18nPrefix}.qty.label`),
            fn(value, obj, key) {
                return FlowRouter.query.get('customerId') ? value : Spacebars.SafeString(`<input type="text" value=${value} class="item-qty">`);
            }
        }, {
            key: 'getQty',
            label: __(`${i18nPrefix}.getQty.label`),
            fn(value, obj, key) {
                return FlowRouter.query.get('customerId') ? value : Spacebars.SafeString(`<input type="text" value=${value} class="item-qty">`);
            }
        }, /*{
         key: 'price',
         label: __(`${i18nPrefix}.price.label`),
         fn(value, object, key) {
         return numeral(value).format('0,0.00');
         }
         }, {
         key: 'amount',
         label: __(`${i18nPrefix}.amount.label`),
         fn(value, object, key) {
         return numeral(value).format('0,0.00');
         }
         },*/ {
            key: '_id',
            label() {
                return fa('bars', '', true);
            },
            headerClass: function () {
                let css = 'text-center col-action-convertItem-item';
                return css;
            },
            tmpl: actionItemsTmpl,
            sortable: false
        }];

        return reactiveTableSettings;
    },
    schema() {
        return ConvertItemItemsSchema;
    },
    disabledAddItemBtn: function () {
        const instance = Template.instance();
        if (instance.state('tmpAmount') <= 0) {
            return {
                disabled: true
            };
        }

        return {};
    },
    total: function () {
        let total = 0;
        let getItems = itemsCollection.find();
        getItems.forEach((obj) => {
            total += obj.amount;
        });
        total = FlowRouter.query.get('customerId') ? 0 : total;
        if (Session.get('getCustomerId')) {
            Session.set('creditLimitAmount', total);
        }
        return total;
    }
});

itemsTmpl.events({
    'change [name="item-filter"]'(event, instance) {
        //filter item in order-item collection
        let currentValue = event.currentTarget.value;
        switch (currentValue) {
            case 'none-scheme':
                Session.set('itemFilterState', {scheme: {$exists: false}});
                break;
            case 'scheme':
                Session.set('itemFilterState', {scheme: {$exists: true}});
                break;
            case 'all':
                Session.set('itemFilterState', {});
                break;
        }

    },
    'change [name="fromItemId"]': function (event, instance) {
        instance.name = event.currentTarget.selectedOptions[0].text;
        instance.$('[name="qty"]').val('');
        // instance.$('[name="price"]').val('');
        instance.$('[name="amount"]').val('');
    },
    'keyup [name="qty"],[name="price"]': function (event, instance) {
        let qty = instance.$('[name="qty"]').val();
        let price = instance.$('[name="price"]').val();
        qty = _.isEmpty(qty) ? 1 : parseInt(qty);
        price = _.isEmpty(price) ? 0 : parseFloat(price);
        let amount = qty * price;
        instance.state('amount', amount);
    },
    'click .js-add-item': function (event, instance) {
        debugger;
        let fromItemId = instance.$('[name="fromItemId"]').val();
        let toItemId = instance.$('[name="toItemId"]').val();
        if (fromItemId == "" || toItemId == "") {
            alertify.warning('Please choose item.');
            return;
        }
        if (fromItemId == toItemId) {
            alertify.warning('Can not convert Item to the same Item.');
            return;
        }
        let qty = instance.$('[name="qty"]').val();
        qty = qty == '' ? 1 : parseInt(qty);
        let stockLocationId = $('[name="stockLocationId"]').val();
        if (stockLocationId == "") {
            alertify.warning("Please choose stock location.");
            return;
        }
        let invoice = instance.view.parentView.parentView._templateInstance.data;
        if (invoice) {
            let soldQty = 0;
            if (stockLocationId == invoice.stockLocationId) {
                invoice.items.forEach(function (inv) {
                    if (inv.fromItemId == fromItemId) {
                        soldQty += inv.qty;
                    }
                });
            }
            Meteor.call('findItemsAndConvertSetting', fromItemId, toItemId, function (error, itemResult) {
                if (itemResult) {
                    let fromItem = itemResult.fromItem;
                    let toItem = itemResult.toItem;
                    let itemOfCollectionNull = itemsCollection.find({
                        fromItemId: fromItemId
                    });
                    let checkQty = qty;
                    itemOfCollectionNull.forEach(function (itemNull) {
                        checkQty += itemNull.qty;
                    });
                    let inventoryQty = !fromItem.qtyOnHand || (fromItem && fromItem.qtyOnHand[stockLocationId]) == null ? 0 : fromItem.qtyOnHand[stockLocationId];
                    inventoryQty += soldQty;
                    if (checkQty <= inventoryQty) {
                        let exist = itemsCollection.findOne({
                            fromItemId: fromItemId,
                            toItemId: toItemId
                        });
                        if (exist) {
                            qty += parseInt(exist.qty);
                            itemsCollection.update({_id: exist._id}, {
                                $set: {
                                    qty: qty,
                                    getQty: qty * itemResult.getQty,
                                }
                            });
                        } else {
                            itemsCollection.insert({
                                fromItemId: fromItemId,
                                toItemId: toItemId,
                                qty: qty,
                                getQty: qty * itemResult.getQty,
                                fromName: fromItem.name,
                                toName: toItem.name
                            });
                        }
                    }
                    else {
                        alertify.warning('Qty not enough for Convert Item. QtyOnHand is ' + inventoryQty);
                    }
                } else {
                    alertify.warning("Can't get Information of these Item!");
                }
            });
        } else {
            Meteor.call('findItemsAndConvertSetting', fromItemId, toItemId, function (error, itemResult) {
                if (itemResult) {
                    let fromItem = itemResult.fromItem;
                    let toItem = itemResult.toItem;
                    let itemOfCollectionNull = itemsCollection.find({
                        fromItemId: fromItemId,
                    });
                    let checkQty = qty;
                    itemOfCollectionNull.forEach(function (itemNull) {
                        checkQty += itemNull.qty;
                    });

                    let inventoryQty = !fromItem.qtyOnHand || (fromItem && fromItem.qtyOnHand[stockLocationId]) == null ? 0 : fromItem.qtyOnHand[stockLocationId];
                    if (checkQty <= inventoryQty) {
                        let exist = itemsCollection.findOne({
                            fromItemId: fromItemId,
                            toItemId: toItemId
                        });
                        if (exist) {
                            qty += parseInt(exist.qty);
                            itemsCollection.update({
                                _id: exist._id
                            }, {
                                $set: {
                                    qty: qty,
                                    getQty: qty * itemResult.getQty
                                }
                            });
                        } else {
                            itemsCollection.insert({
                                fromItemId: fromItemId,
                                toItemId: toItemId,
                                qty: qty,
                                getQty: qty * itemResult.getQty,
                                fromName: fromItem.name,
                                toName: toItem.name
                            });
                        }
                    }
                    else {
                        alertify.warning('Qty not enough for Convert Item. QtyOnHand is ' + inventoryQty);
                    }
                } else {
                    alertify.warning("Can't get Information of these Item!");
                }

            });
        }
    },
    // Reactive table for item
    'click .js-update-item': function (event, instance) {
        alertify.item(fa('pencil', TAPi18n.__('pos.convertItem.schema.fromItemId.label')), renderTemplate(editItemsTmpl, this));
    },
    'click .js-destroy-item': function (event, instance) {
        event.preventDefault();
        let itemDoc = this;
        if (AutoForm.getFormId() == "Pos_convertItemUpdate") { //check if update form
            swal({
                    title: "Are you sure?",
                    text: "លុបទំនិញមួយនេះ?",
                    type: "warning", showCancelButton: true,
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Yes, delete it!",
                    closeOnConfirm: false
                },
                function () {
                    if (!deletedItem.findOne({fromItemId: itemDoc.fromItemId})) {
                        deletedItem.insert(itemDoc);
                    }
                    itemsCollection.remove({fromItemId: itemDoc.fromItemId});
                    swal.close();
                });
        } else {
            destroyAction(
                itemsCollection, {
                    _id: this._id
                }, {
                    title: TAPi18n.__('pos.convertItem.schema.fromItemId.label'),
                    itemTitle: this.fromItemId
                }
            );
        }

    },
    'change .item-qty'(event, instance) {
        debugger;
        let thisObj = $(event.currentTarget);
        let currentQty = parseInt(event.currentTarget.value);
        let fromItemId = $(event.currentTarget).parents('tr').find('.fromItemId').text();
        let toItemId = $(event.currentTarget).parents('tr').find('.toItemId').text();
        let currentItem = itemsCollection.findOne({fromItemId: fromItemId, toItemId: toItemId});
        let selector = {};
        let checkQty = 0;
        let itemOfCollectionNull = itemsCollection.find({
            fromItemId: fromItemId
        });
        if (itemOfCollectionNull.count() > 0) {
            let addedQty = 0;
            itemOfCollectionNull.forEach(function (itemNull) {
                addedQty += itemNull.qty;
            });
            checkQty = addedQty - currentItem.qty + currentQty;
        } else {
            checkQty = currentQty;
        }
        let invoice = instance.view.parentView.parentView._templateInstance.data;
        let stockLocationId = $('[name="stockLocationId"]').val();
        if (invoice) {
            let soldQty = 0;
            if (stockLocationId == invoice.stockLocationId) {
                invoice.items.forEach(function (oldItem) {
                    if (oldItem.fromItemId == fromItemId) {
                        soldQty += oldItem.qty
                    }
                });
            }
            Meteor.call('findItemsAndConvertSetting', fromItemId, toItemId, function (error, itemResult) {
                if (itemResult) {
                    let fromItem = itemResult.fromItem;
                    let toItem = itemResult.toItem;
                    let inventoryQty = !fromItem.qtyOnHand || (fromItem && fromItem.qtyOnHand[stockLocationId]) == null ? 0 : fromItem.qtyOnHand[stockLocationId]
                    inventoryQty += soldQty;
                    if (checkQty <= inventoryQty) {
                        let selector = {
                            $set: {
                                qty: currentQty,
                                getQty: currentQty * itemResult.getQty
                            }
                        };
                        itemsCollection.update({fromItemId: fromItemId, toItemId: toItemId}, selector);
                    }
                    else {
                        let selector = {
                            $set: {
                                qty: currentItem.qty,
                                getQty: currentItem.getQty
                            }
                        };
                        itemsCollection.update({fromItemId: fromItemId, toItemId: toItemId}, selector);
                        thisObj.val(currentItem.qty);
                        alertify.warning('Qty not enough for Convert Item. QtyOnHand is ' + inventoryQty);
                    }
                }
                else {
                    alertify.warning("Can't get Information of these Item!");
                }
            });
        }
        else {
            Meteor.call('findItemsAndConvertSetting', fromItemId, toItemId, function (error, itemResult) {
                    if (itemResult) {
                        let fromItem = itemResult.fromItem;
                        let toItem = itemResult.toItem;
                        let inventoryQty = !fromItem.qtyOnHand || (fromItem && fromItem.qtyOnHand[stockLocationId]) == null ? 0 : fromItem.qtyOnHand[stockLocationId]
                        if (checkQty <= inventoryQty) {
                            let selector = {
                                $set: {
                                    qty: currentQty,
                                    getQty: currentQty * itemResult.getQty
                                }
                            };
                            itemsCollection.update({fromItemId: fromItemId, toItemId: toItemId}, selector);
                        }
                        else {
                            let selector = {
                                $set: {
                                    qty: currentItem.qty,
                                    getQty: currentItem.getQty
                                }
                            };
                            itemsCollection.update({fromItemId: fromItemId, toItemId: toItemId}, selector);
                            thisObj.val(currentItem.qty);
                            alertify.warning('Qty not enough for Convert Item. QtyOnHand is ' + inventoryQty);
                        }
                    }
                    else {
                        alertify.warning("Can't get Information of these Item!");
                    }
                }
            );
        }
    },
    "keypress .item-qty"(evt) {
        let charCode = (evt.which) ? evt.which : evt.keyCode;
        return !(charCode > 31 && (charCode < 48 || charCode > 57));
    }
});
//destroy
itemsTmpl.onDestroyed(function () {
    Session.set('itemFilterState', {});
});

// Edit
editItemsTmpl.onCreated(function () {
    this.state('amount', 0);

    this.autorun(() => {
        let data = Template.currentData();
        this.state('amount', data.amount);
    });
});

editItemsTmpl.helpers({
    schema() {
        return ConvertItemItemsSchema;
    },
    data: function () {
        let data = Template.currentData();
        return data;
    }
});

editItemsTmpl.events({
    'change [name="fromItemId"]': function (event, instance) {
        instance.$('[name="qty"]').val('');
        //instance.$('[name="price"]').val('');
        //instance.$('[name="amount"]').val('');
    },
    'keyup [name="qty"],[name="price"]': function (event, instance) {
        let qty = instance.$('[name="qty"]').val();
        let price = instance.$('[name="price"]').val();
        qty = _.isEmpty(qty) ? 0 : parseInt(qty);
        price = _.isEmpty(price) ? 0 : parseFloat(price);
        let amount = qty * price;

        instance.state('amount', amount);
    }
});

let hooksObject = {
    onSubmit: function (insertDoc, updateDoc, currentDoc) {
        this.event.preventDefault();

        // Check old item
        if (insertDoc.fromItemId == currentDoc.fromItemId) {
            itemsCollection.update({
                    _id: currentDoc._id
                },
                updateDoc
            );
        } else {
            // Check exist item
            let exist = itemsCollection.findOne({
                _id: insertDoc._id
            });
            if (exist) {
                let newQty = exist.qty + insertDoc.qty;
                let newPrice = insertDoc.price;
                let newAmount = math.round(newQty * newPrice, 2);

                itemsCollection.update({
                    _id: insertDoc._id
                }, {
                    $set: {
                        qty: newQty,
                        price: newPrice,
                        amount: newAmount
                    }
                });
            } else {
                itemsCollection.remove({
                    _id: currentDoc._id
                });
                itemsCollection.insert(insertDoc);
            }
        }

        this.done();
    },
    onSuccess: function (formType, result) {
        alertify.item().close();
        displaySuccess();
    },
    onError: function (formType, error) {
        displayError(error.message);
    }
};
AutoForm.addHooks(['Pos_convertItemItemsEdit'], hooksObject);
