import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {AutoForm} from 'meteor/aldeed:autoform';
import {moment} from 'meteor/momentjs:moment';
import {SelectOpts} from '../../../../../core/imports/ui/libs/select-opts.js';
export const closingStockSchema = new SimpleSchema({
    branchId: {
        type: String,
        optional: true,
        label: function () {
            return TAPi18n.__('core.welcome.branch');
        },
        autoform: {
            type: "universe-select",
            options: function () {
                return Meteor.isClient && SelectOpts.branchForCurrentUser(false);
            },
            afFieldInput: {
                value: function () {
                    return Meteor.isClient && Session.get('currentBranch');
                }
            }
        }
    },
    asDate: {
        type: Date,
        defaultValue: moment().toDate(),
        autoform: {
            afFieldInput: {
                type: "bootstrap-datetimepicker",
                dateTimePickerOptions: {
                    format: 'DD/MM/YYYY',

                }
            }
        }
    },
    items: {
        type: [String],
        optional: true,
        autoform: {
            type: 'universe-select',
            afFieldInput: {
                create: true,
                uniPlaceholder: 'All',
                multiple: true,
                optionsMethod: 'pos.selectOptMethods.item'
            }
        }
    }
});
