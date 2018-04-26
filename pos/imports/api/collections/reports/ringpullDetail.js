import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {AutoForm} from 'meteor/aldeed:autoform';
import {moment} from 'meteor/momentjs:moment';
import {SelectOpts} from "../../../../../core/imports/ui/libs/select-opts";

export const ringpullDetail = new SimpleSchema({
    viewDate: {
        type: Date,
        optional: true,
        autoform: {
            afFieldInput: {
                type: "bootstrap-datetimepicker",
                dateTimePickerOptions: {
                    format: 'DD/MM/YYYY',

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
    itemId: {
        type: String,
        label: 'Item',
        autoform: {
            type: 'universe-select',
            afFieldInput: {
                create: true,
                uniPlaceholder: 'Select One',
                optionsMethod: 'pos.selectOptMethods.item',
                optionsMethodParams: function () {
                    if (Meteor.isClient) {
                        return {scheme: {$exists: false}};
                    }
                }
            }
        }
    },
    branchId: {
        type: String,
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
});