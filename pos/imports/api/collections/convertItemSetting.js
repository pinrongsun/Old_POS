import {Mongo} from 'meteor/mongo';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {AutoForm} from 'meteor/aldeed:autoform';

// Lib
import {__} from '../../../../core/common/libs/tapi18n-callback-helper.js';
import {SelectOpts} from '../../ui/libs/select-opts.js';

export const ConvertItemSettings = new Mongo.Collection("pos_convertItemSettings");
ConvertItemSettings.schema = new SimpleSchema({
    fromItemId: {
        type: String,
        autoform: {
            type: "select2"
        }
    },
    toItemId: {
        type: String,
        autoform: {
            type: "select2"
        },
        custom: function () {
            if (this.value == this.field('fromItemId').value) {
                return "sameItem";
            }
        }
    },
    qty: {
        type: Number,
    },
    _fromItem: {
        type: Object,
        optional: true,
        blackbox: true
    },
    _toItem: {
        type: Object,
        blackbox: true,
        optional: true,

    }
});

Meteor.startup(function () {
    ConvertItemSettings.schema.i18n("pos.convertItemSetting.schema");
    ConvertItemSettings.attachSchema(ConvertItemSettings.schema);
});


SimpleSchema.messages({
    "sameItem": "Must not select the same Item!"
});
