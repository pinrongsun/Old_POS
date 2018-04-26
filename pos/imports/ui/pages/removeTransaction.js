import {alertify} from 'meteor/ovcharik:alertifyjs';
import {sAlert} from 'meteor/juliancwirko:s-alert';
import {createNewAlertify} from '../../../../core/client/libs/create-new-alertify.js';
import {renderTemplate} from '../../../../core/client/libs/render-template.js';
import {Template} from 'meteor/templating';
import {__} from '../../../../core/common/libs/tapi18n-callback-helper.js';
import {AutoForm} from 'meteor/aldeed:autoform';
import {displaySuccess, displayError} from '../../../../core/client/libs/display-alert.js';
import {destroyAction} from '../../../../core/client/libs/destroy-action.js';
import {RemoveTransactionSchema} from '../../../imports/api/collections/removeTransaction.js'

import {RemoveTransactionCollection} from '../../api/collections/tmpCollection';

import './removeTransaction.html';
let indexTmpl = Template.Pos_removeTransaction;
indexTmpl.onCreated(function () {
});
let TransactionCollection = RemoveTransactionCollection;
indexTmpl.onDestroyed(function () {
    TransactionCollection.remove({});
});
indexTmpl.onRendered(function () {
    $('.transaction-date').datepicker({
        format: 'yyyy-mm-dd'
    });
});
indexTmpl.helpers({
    schemaName(){
        return RemoveTransactionSchema;
    },
    transaction(){
        return TransactionCollection.findOne({});
    }
});
indexTmpl.events({
    'click .btn-get-transaction'(){

        let branchId = Session.get('currentBranch');
        let doc = {};
        doc.date = AutoForm.getFieldValue('date', 'remove-transaction-form');
        let removeDate = $('[name="date"]').val();
        if (doc.date == null || removeDate == "") {
            alertify.warning('Please input date');
            return;
        }
        $.blockUI();
        Meteor.call('getTransactions', branchId, doc, function (err, res) {
            if (res) {
                TransactionCollection.remove({});
                TransactionCollection.insert(res);
                $.unblockUI();
            }
            if (err) {
                alertify.error(err.message);
            }
        });
        // AutoForm.resetForm("remove-transaction-form");
    },
    'click .remove-all-transaction'(){
        let branchId = Session.get('currentBranch');
        let doc = {};
        doc.date = AutoForm.getFieldValue('date', 'remove-transaction-form');
        let removeDate = $('[name="date"]').val();
        if (doc.date == null || removeDate == "") {
            alertify.warning('Please input date');
            return;
        }
        swal({
            title: 'Delete Transactions!',
            text: `Are you sure to Delete all Transaction from  <span class="text-red">[${moment(doc.date).format('DD-MM-YYYY')}]</span>?`,
            type: 'warning',
            allowEscapeKey: false,
            allowOutsideClick: true,
            showCloseButton: true,
            showConfirmButton: true,
            confirmButtonColor: "#dd4b39",
            confirmButtonText: 'Yes, delete all.',
            showCancelButton: true
        }).then(function () {
            $.blockUI();
            Meteor.call('removeTransactions', branchId, doc, function (err, res) {
                if (res) {
                    console.log(res);
                    TransactionCollection.remove({});
                    TransactionCollection.insert(res);
                    $.unblockUI();
                }
                if (err) {
                    alertify.error(err.message);
                }
            });
        }).done();


    }
});
// actionTmpl
let hooksObject = {
    onSuccess (formType, result) {
        displaySuccess();
    },
    onError (formType, error) {
        displayError(error.message);
    }
};
AutoForm.addHooks([
    'remove-transaction-form'
], hooksObject);
