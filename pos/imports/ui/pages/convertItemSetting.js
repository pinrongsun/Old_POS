import {Template} from 'meteor/templating';
import {AutoForm} from 'meteor/aldeed:autoform';
import {Roles} from  'meteor/alanning:roles';
import {alertify} from 'meteor/ovcharik:alertifyjs';
import {sAlert} from 'meteor/juliancwirko:s-alert';
import {fa} from 'meteor/theara:fa-helpers';
import {lightbox} from 'meteor/theara:lightbox-helpers';
import {TAPi18n} from 'meteor/tap:i18n';
import {ReactiveTable} from 'meteor/aslagle:reactive-table';
import {ReactiveMethod} from 'meteor/simple:reactive-method';

// Lib
import {createNewAlertify} from '../../../../core/client/libs/create-new-alertify.js';
import {reactiveTableSettings} from '../../../../core/client/libs/reactive-table-settings.js';
import {renderTemplate} from '../../../../core/client/libs/render-template.js';
import {destroyAction} from '../../../../core/client/libs/destroy-action.js';
import {displaySuccess, displayError} from '../../../../core/client/libs/display-alert.js';
import {__} from '../../../../core/common/libs/tapi18n-callback-helper.js';

// Component
import '../../../../core/client/components/loading.js';
import '../../../../core/client/components/column-action.js';
import '../../../../core/client/components/form-footer.js';

// Collection
import {ConvertItemSettings} from '../../api/collections/convertItemSetting.js';

// Tabular
import {ConvertItemSettingTabular} from '../../../common/tabulars/convertItemSetting.js';

// Page
import './convertItemSetting.html';

// Declare template
let indexTmpl = Template.Pos_convertItemSetting,
    actionTmpl = Template.Pos_convertItemSettingAction,
    newTmpl = Template.Pos_convertItemSettingNew,
    editTmpl = Template.Pos_convertItemSettingEdit,
    showTmpl = Template.Pos_convertItemSettingShow;


// Index
indexTmpl.onCreated(function () {
    // Create new  alertify
    createNewAlertify('convertItemSetting');
    createNewAlertify('convertItemSettingShow');

});

indexTmpl.helpers({
    tabularTable(){
        return ConvertItemSettingTabular;
    },
    selector() {
        return {};
    }

});

indexTmpl.events({
    'click .js-create' (event, instance) {
        alertify.convertItemSetting(fa('plus', TAPi18n.__('pos.convertItemSetting.title')), renderTemplate(newTmpl));
    },
    'click .js-update' (event, instance) {
        alertify.convertItemSetting(fa('pencil', TAPi18n.__('pos.convertItemSetting.title')), renderTemplate(editTmpl, this));
    },
    'click .js-destroy' (event, instance) {
        let id = this._id;
        destroyAction(
            ConvertItemSettings,
            {_id: id},
            {title: TAPi18n.__('pos.convertItemSetting.title'), itemTitle: id}
        );
    },
    'click .js-display' (event, instance) {
        alertify.convertItemSettingShow(fa('eye', TAPi18n.__('pos.convertItemSetting.title')), renderTemplate(showTmpl, this));
    }
});

newTmpl.onCreated(function () {
    // Reactive table filter
    this.itemList = new ReactiveVar();
    Meteor.call('getItems', (err, result) => {
        this.itemList.set(result);
    });
});
// New
newTmpl.helpers({
    collection(){
        return ConvertItemSettings;
    },
    formItemList(){
        let list = [];
        let itemList = Template.instance().itemList.get();
        if (itemList) {
            itemList.forEach(function (item) {
                list.push({
                    label: item.name,
                    value: item._id
                });
            });
        }
        return list;
    },
    toItemList(){
        let list = [];
        let itemList = Template.instance().itemList.get();
        if (itemList) {
            itemList.forEach(function (item) {
                list.push({
                    label: item.name,
                    value: item._id
                })
            })
        }
        return list;
    }
});

// Edit
editTmpl.onCreated(function () {
    // Reactive table filter
    this.itemList = new ReactiveVar();
    Meteor.call('getItems', (err, result) => {
        this.itemList.set(result);
    });
});

editTmpl.helpers({

    collection(){
        return ConvertItemSettings;
    },
    data () {
        return ConvertItemSettings.findOne(this._id);
    },
    formItemList(){
        let list = [];
        let itemList = Template.instance().itemList.get();
        if (itemList) {
            itemList.forEach(function (item) {
                list.push({
                    label: item.name,
                    value: item._id
                });
            });
        }
        return list;
    },
    toItemList(){
        let list = [];
        let itemList = Template.instance().itemList.get();
        if (itemList) {
            itemList.forEach(function (item) {
                list.push({
                    label: item.name,
                    value: item._id
                })
            })
        }
        return list;
    }
});

// Show
showTmpl.onCreated(function () {
    this.autorun(() => {
        this.subscribe('pos.convertItemSetting', {_id: this.data._id});
    });
});

showTmpl.helpers({
    i18nLabel(label){
        let i18nLabel = `pos.convertItemSetting.schema.${label}.label`;
        return i18nLabel;
    },
    data () {
        let data = ConvertItemSettings.findOne(this._id);
        return data;
    }
});

// Hook
let hooksObject = {
    onSuccess (formType, result) {
        if (formType == 'update') {
            alertify.convertItemSetting().close();
        }
        displaySuccess();
    },
    onError (formType, error) {
        debugger;
        displayError(error.message);
    }
};

AutoForm.addHooks([
    'Pos_convertItemSettingNew',
    'Pos_convertItemSettingEdit'
], hooksObject);
