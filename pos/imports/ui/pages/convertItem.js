import {Template} from 'meteor/templating';
import {AutoForm} from 'meteor/aldeed:autoform';
import {Roles} from  'meteor/alanning:roles';
import {alertify} from 'meteor/ovcharik:alertifyjs';
import {sAlert} from 'meteor/juliancwirko:s-alert';
import {fa} from 'meteor/theara:fa-helpers';
import {lightbox} from 'meteor/theara:lightbox-helpers';
import {_} from 'meteor/erasaur:meteor-lodash';
import 'meteor/theara:jsonview';
import {TAPi18n} from 'meteor/tap:i18n';
import 'meteor/tap:i18n-ui';


// Lib
import {createNewAlertify} from '../../../../core/client/libs/create-new-alertify.js';
import {renderTemplate} from '../../../../core/client/libs/render-template.js';
import {destroyAction} from '../../../../core/client/libs/destroy-action.js';
import {displaySuccess, displayError} from '../../../../core/client/libs/display-alert.js';
import {__} from '../../../../core/common/libs/tapi18n-callback-helper.js';

// Component
import '../../../../core/client/components/loading.js';
import '../../../../core/client/components/column-action.js';
import '../../../../core/client/components/form-footer.js';

// Collection
import {InventoryDates} from '../../api/collections/inventoryDate.js';
import {ConvertItems} from '../../api/collections/convertItem.js';
import {Order} from '../../api/collections/order';
import {Item} from '../../api/collections/item';
import {deletedItem} from './convertItem-items';
import {CustomerNullCollection, nullCollection} from '../../api/collections/tmpCollection';
// Tabular
import {ConvertItemTabular} from '../../../common/tabulars/convertItem.js';

// Page
import './convertItem.html';
import './convertItem-items.js';
import './info-tab.html';
import './customer.html';
//methods
//import {convertItemInfo} from '../../../common/methods/convertItem.js'
//import {customerInfo} from '../../../common/methods/customer.js';

Tracker.autorun(function () {
    /* if (Session.get("getCustomerId")) {
     customerInfo.callPromise({_id: Session.get("getCustomerId")})
     .then(function (result) {
     Session.set('customerInfo', result);
     });
     }*/
});

// Declare template
let indexTmpl = Template.Pos_convertItem,
    actionTmpl = Template.Pos_convertItemAction,
    newTmpl = Template.Pos_convertItemNew,
    editTmpl = Template.Pos_convertItemEdit,
    showTmpl = Template.Pos_convertItemShow;
// Local collection
let itemsCollection = nullCollection;

// Index
indexTmpl.onCreated(function () {
    // Create new  alertify
    createNewAlertify('convertItem', {size: 'lg'});
    createNewAlertify('convertItemShow', {size: 'lg'});
    createNewAlertify('customer');
});

indexTmpl.helpers({
    tabularTable(){
        return ConvertItemTabular;
    },
    selector() {
        return {status: {$ne: 'removed'}, branchId: Session.get('currentBranch')};
    }
});
indexTmpl.onDestroyed(function () {
    CustomerNullCollection.remove({});
});
indexTmpl.events({
    'click .js-create' (event, instance) {
        alertify.convertItem(fa('cart-arrow-down', TAPi18n.__('pos.convertItem.title')), renderTemplate(newTmpl)).maximize();
    },
    'click .js-update' (event, instance) {
        // if (this.saleId || (this.convertItemType == 'term' && this.status != 'closed')) {
        //     excuteEditForm(this);
        // }
        // else if (this.convertItemType == 'term' && this.status == 'closed') {
        //     // swal("បញ្ជាក់!", `សូមធ្វើការលុបការបង់ប្រាក់សម្រាប់វិក័យប័ត្រលេខ ${this._id} ជាមុនសិន`, "error")
        //     excuteEditForm(this);
        //
        // }
        // else if (this.paymentGroupId) {
        //     Meteor.call('pos.isGroupConvertItemClosed', {_id: this.paymentGroupId}, (err, result)=> {
        //         if (result.paid) {
        //             swal("បញ្ជាក់!", `សូមធ្វើការលុបការបង់ប្រាក់សម្រាប់វិក័យប័ត្រក្រុមលេខ ${this.paymentGroupId} ជាមុនសិន`, "error")
        //         } else {
        //             excuteEditForm(this);
        //         }
        //     });
        // }
        excuteEditForm(this);
    },
    'click .js-destroy' (event, instance) {
        let data = this;
        let inventoryDate = InventoryDates.findOne({branchId: data.branchId, stockLocationId: data.stockLocationId});
        let convertItemDate = moment(data.convertItemDate).startOf('days').toDate();
        if (inventoryDate && (convertItemDate < inventoryDate.inventoryDate)) {
            alertify.warning("Can't Remove. ConvertItem's Date: " + moment(convertItemDate).format("DD-MM-YYYY")
                + ". Current Transaction Date: " + moment(inventoryDate.inventoryDate).format("DD-MM-YYYY"));
        }
        else {
            destroyAction(
                ConvertItems,
                {_id: data._id},
                {title: TAPi18n.__('pos.convertItem.title'), itemTitle: data._id}
            );
        }

    },
    'click .js-display' (event, instance) {
        swal({
            title: "Pleas Wait",
            text: "Getting ConvertItems....", showConfirmButton: false
        });

        Meteor.call('convertItemShow', {_id: this._id}, function (err, result) {
            if (result) {
                swal.close();
                alertify.convertItemShow(fa('eye', TAPi18n.__('pos.convertItem.title')), renderTemplate(showTmpl, result)).maximize();
            } else {
                swal.close();
                alertify.error("Can't find info")
            }
        });
    },
    'click .js-convertItem' (event, instance) {
        let params = {};
        let queryParams = {convertItemId: this._id};
        let path = FlowRouter.path("pos.convertItemReportGen", params, queryParams);

        window.open(path, '_blank');
    }
});
//on rendered
newTmpl.onCreated(function () {
    this.repOptions = new ReactiveVar();
    Meteor.call('getRepList', (err, result) => {
        this.repOptions.set(result);
    });
});
// New
newTmpl.events({
    'click .save-exchange-ring-pull'(){
        let branchId = Session.get('currentBranch');
        let stockLocationId = $('[name="stockLocationId"]').val();
        let inventoryDate = InventoryDates.findOne({branchId: branchId, stockLocationId: stockLocationId});
        let convertItemDate = AutoForm.getFieldValue('convertItemDate', 'Pos_convertItemNew');
        convertItemDate = moment(convertItemDate).startOf('days').toDate();
        if (inventoryDate && (convertItemDate > inventoryDate.inventoryDate)) {
            swal({
                title: "Date is greater then current Date!",
                text: "Do You want to continue to process to " + moment(convertItemDate).format('DD-MM-YYYY')
                + "?\n" + "Current Transaction Date is: '" + moment(inventoryDate.inventoryDate).format("DD-MM-YYYY") + "'",
                type: "warning", showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Yes, Do it!",
                closeOnConfirm: false
            }).then(function () {
                $('#Pos_convertItemNew').submit();
                swal.close();
            }, function (dismiss) {
                if (dismiss === 'cancel') {
                    return false;
                }
            });
        } else if (inventoryDate && (convertItemDate < inventoryDate.inventoryDate)) {
            displayError("Date cannot be less than current Transaction Date: " + moment(inventoryDate.inventoryDate).format("DD-MM-YYYY"));
            return false;
        } else {
            $('#Pos_convertItemNew').submit();
        }
        return false;
    },
    'change [name="stockLocationId"]'(event, instance){
        debugger;
        let stockLocationId = $(event.currentTarget).val();
        let items = itemsCollection.find().fetch();
        if (items && items.length > 0) {
            Meteor.call('checkStockByLocation', stockLocationId, items, function (error, result) {
                if (!result.isEnoughStock) {
                    itemsCollection.remove({});
                    alertify.warning(result.message);
                }
            });
        }

    },
    'click .add-new-customer'(event, instance){
        alertify.customer(fa('plus', 'New Customer'), renderTemplate(Template.Pos_customerNew));
    },
    'click .go-to-receive-payment'(event, instance){
        alertify.convertItem().close();
    },
    'change [name=customerId]'(event, instance){
        if (event.currentTarget.value != '') {
            Session.set('getCustomerId', event.currentTarget.value);
            if (FlowRouter.query.get('customerId')) {
                FlowRouter.query.set('customerId', event.currentTarget.value);
            }
        }
        Session.set('totalOrder', undefined);
    },
});
newTmpl.helpers({
    /*  repId(){
     if (Session.get('customerInfo')) {
     try {
     return Session.get('customerInfo').repId;
     } catch (e) {

     }
     }
     },*/
    options(){
        let instance = Template.instance();
        if (instance.repOptions.get() && instance.repOptions.get().repList) {
            return instance.repOptions.get().repList
        }
        return [];
    },
    totalOrder(){
        let total = 0;
        if (!FlowRouter.query.get('customerId')) {
            itemsCollection.find().forEach(function (item) {
                total += item.amount;
            });
        }
        if (Session.get('totalOrder')) {
            let totalOrder = Session.get('totalOrder');
            return totalOrder;
        }
        return {total};
    },
    /*   customerInfo() {
     let customerInfo = Session.get('customerInfo');
     if (!customerInfo) {
     return {empty: true, message: 'No data available'}
     }

     return {
     fields: `<li>Phone: <b>${customerInfo.telephone ? customerInfo.telephone : ''}</b></li>
     <li>Opening Balance: <span class="label label-success">0</span></li>
     <li >Credit Limit: <span class="label label-warning">${customerInfo.creditLimit ? numeral(customerInfo.creditLimit).format('0,0.00') : 0}</span></li>
     <li>Sale Order to be convertItem: <span class="label label-primary">0</span>`
     };
     },*/
    collection(){
        return ConvertItems;
    },
    itemsCollection(){
        return itemsCollection;
    },
    disabledSubmitBtn: function () {
        let cont = itemsCollection.find().count();
        if (cont == 0) {
            return {disabled: true};
        }

        return {};
    },
});

newTmpl.onDestroyed(function () {
    // Remove items collection
    itemsCollection.remove({});
    // Session.set('customerInfo', undefined);
    Session.set('getCustomerId', undefined);
    FlowRouter.query.unset();
    Session.set('totalOrder', undefined);
    deletedItem.remove({});
});

// Edit
editTmpl.onCreated(function () {
    this.repOptions = new ReactiveVar();
    Meteor.call('getRepList', (err, result) => {
        this.repOptions.set(result);
    });
});


editTmpl.events({
    'change [name="stockLocationId"]'(event, instance){
        let invoice = instance.data;
        let stockLocationId = $(event.currentTarget).val();
        let items = itemsCollection.find().fetch();

        let newItems = [];
        if (invoice.stockLocationId == stockLocationId) {
            items.forEach(function (item) {
                let oldItem = invoice.items.find(x => x.fromItemId == item.fromItemId);
                item.qty -= oldItem == null || oldItem.qty == null ? 0 : oldItem.qty;
                newItems.push(item);
            });
        } else {
            newItems = items;
        }
        if (items && items.length > 0) {
            Meteor.call('checkStockByLocation', stockLocationId, newItems, function (error, result) {
                if (!result.isEnoughStock) {
                    itemsCollection.remove({});
                    alertify.warning(result.message);
                }
            });
        }
    },
    'click .add-new-customer'(event, instance){
        alertify.customer(fa('plus', 'New Customer'), renderTemplate(Template.Pos_customerNew));
    },
    'click .go-to-receive-payment'(event, instance){
        alertify.convertItem().close();
    }
});
editTmpl.helpers({
    closeSwal(){
        setTimeout(function () {
            swal.close();
        }, 500);
    },
    collection(){
        return ConvertItems;
    },
    data () {
        let data = this;
        // Add items to local collection
        _.forEach(data.items, (value) => {
            Meteor.call('getItem', value.fromItemId, (err, result) => {
                value.name = result.name;
                value.saleId = this.saleId;
                itemsCollection.insert(value);
            })
        });
        return data;
    },
    convertItemDate(){
        return this.convertItemDate;
    },
    itemsCollection(){
        return itemsCollection;
    },
    disabledSubmitBtn: function () {
        let cont = itemsCollection.find().count();
        if (cont == 0) {
            return {disabled: true};
        }

        return {};
    },
    /* repId(){
     if (Session.get('customerInfo')) {
     try {
     return Session.get('customerInfo').repId;
     } catch (e) {

     }
     }
     return '';
     },*/
    options(){
        let instance = Template.instance();
        if (instance.repOptions.get() && instance.repOptions.get().repList) {
            return instance.repOptions.get().repList
        }
        return '';
    },
    totalOrder(){
        let total = 0;
        if (!FlowRouter.query.get('customerId')) {
            itemsCollection.find().forEach(function (item) {
                total += item.amount;
            });
        }
        if (Session.get('totalOrder')) {
            let totalOrder = Session.get('totalOrder');
            return totalOrder;
        }
        return {total};
    },
    customerInfo() {
        let customerInfo = Session.get('customerInfo');
        if (!customerInfo) {
            return {empty: true, message: 'No data available'}
        }

        return {
            fields: `<li>Phone: <b>${customerInfo.telephone ? customerInfo.telephone : ''}</b></li>
              <li>Opening Balance: <span class="label label-success">0</span></li>
              <li >Credit Limit: <span class="label label-warning">${customerInfo.creditLimit ? numeral(customerInfo.creditLimit).format('0,0.00') : 0}</span></li>
              <li>Sale Order to be convertItem: <span class="label label-primary">0</span>`
        };
    },
    collection(){
        return ConvertItems;
    },
    itemsCollection(){
        return itemsCollection;
    },
});

editTmpl.onDestroyed(function () {
    // Remove items collection
    itemsCollection.remove({});
    Session.set('customerInfo', undefined);
    Session.set('getCustomerId', undefined);
    FlowRouter.query.unset();
    Session.set('totalOrder', undefined);
    deletedItem.remove({});
});

// Show
showTmpl.onCreated(function () {
    // this.convertItem = new ReactiveVar();
    // this.autorun(()=> {
    //     convertItemInfo.callPromise({_id: this.data._id})
    //         .then((result) => {
    //             this.convertItem.set(result);
    //         }).catch(function (err) {
    //         }
    //     );
    // });
});

showTmpl.helpers({
    company(){
        let doc = Session.get('currentUserStockAndAccountMappingDoc');
        return doc.company;
    },
    i18nLabel(label){
        let key = `pos.convertItem.schema.${label}.label`;
        return TAPi18n.__(key);
    },
    colorizeType(type) {
        if (type == 'term') {
            return `<label class="label label-info">T</label>`
        }
        return `<label class="label label-success">G</label>`
    },
    colorizeStatus(status){
        if (status == 'active') {
            return `<label class="label label-info">A</label>`
        } else if (status == 'partial') {
            return `<label class="label label-danger">P</label>`
        }
        return `<label class="label label-success">C</label>`
    }
});
showTmpl.events({
    'click .print-convertItem-show'(event, instance){
        $('#to-print').printThis();
    }
});


function excuteEditForm(doc) {
    swal({
        title: "Pleas Wait",
        text: "Getting ConvertItems....", showConfirmButton: false
    });
    alertify.convertItem(fa('pencil', TAPi18n.__('pos.convertItem.title')), renderTemplate(editTmpl, doc)).maximize();
}
// Hook
let hooksObject = {
    before: {
        insert: function (doc) {
            let items = [];

            itemsCollection.find().forEach((obj) => {
                delete obj._id;
                items.push(obj);
            });
            doc.items = items;

            return doc;
        },
        update: function (doc) {
            let items = [];
            itemsCollection.find().forEach((obj) => {
                delete obj._id;
                items.push(obj);
            });
            doc.$set.items = items;
            delete doc.$unset;
            return doc;
        }
    },
    onSuccess (formType, id) {
        //get convertItemId, total, customerId
        if (formType != 'update') {
            if (!FlowRouter.query.get('customerId')) {
                Meteor.call('getConvertItemId', id, function (err, result) {
                    if (result) {
                        Session.set('totalOrder', result);
                    }
                });
            } else {
                alertify.convertItem().close();
            }
        } else {
            alertify.convertItem().close();
        }
        // if (formType == 'update') {
        // Remove items collection
        itemsCollection.remove({});
        deletedItem.remove({});
        // }
        displaySuccess();
    },
    onError (formType, error) {
        displayError(error.message);
    }
};

AutoForm.addHooks([
    'Pos_convertItemNew',
    'Pos_convertItemUpdate'
], hooksObject);
