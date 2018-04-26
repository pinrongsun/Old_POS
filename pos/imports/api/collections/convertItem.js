import {Meteor} from 'meteor/meteor';
import {Mongo} from 'meteor/mongo';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {AutoForm} from 'meteor/aldeed:autoform';
import {moment} from 'meteor/momentjs:moment';

// Lib
import {__} from '../../../../core/common/libs/tapi18n-callback-helper.js';
import {SelectOpts} from '../../ui/libs/select-opts.js';

export const ConvertItems = new Mongo.Collection("pos_convertItems");
// Items sub schema
ConvertItems.itemsSchema = new SimpleSchema({
    fromItemId: {
        type: String,
        label: "From Item"
    },
    toItemId: {
        type: String,
        label: "To Item"
    },
    qty: {
        type: Number,
        min: 1
    },
    getQty: {
        type: Number
    },
    fromItemPrice: {
        type: Number,
        decimal: true,
        optional: true,
    },
    toItemPrice: {
        type: Number,
        decimal: true,
        optional: true
    },
    fromItemAmount: {
        type: Number,
        decimal: true,
        optional: true
    },
    toItemAmount: {
        type: Number,
        decimal: true,
        optional: true
    }
    /*price: {
     type: Number,
     decimal: true,
     autoform: {
     type: 'inputmask',
     inputmaskOptions: function () {
     return inputmaskOptions.currency();
     }
     }
     },
     amount: {
     type: Number,
     decimal: true,
     autoform: {
     type: 'inputmask',
     inputmaskOptions: function () {
     return inputmaskOptions.currency();
     }
     }
     }*/
});

// ConvertItems schema
ConvertItems.schema = new SimpleSchema({
    convertItemDate: {
        type: Date,
        defaultValue: moment().toDate(),
        autoform: {
            afFieldInput: {
                type: "bootstrap-datetimepicker",
                dateTimePickerOptions: {
                    format: 'DD/MM/YYYY HH:mm:ss',
                }
            }

        }
    },
    staffId: {
        type: String,
        autoValue(){
            if (this.isInsert) {
                return Meteor.user()._id;
            }
        }
    },
    des: {
        type: String,
        optional: true,
        autoform: {
            afFieldInput: {
                type: 'summernote',
                class: 'editor', // optional
                settings: {
                    height: 150,                 // set editor height
                    minHeight: null,             // set minimum height of editor
                    maxHeight: null,             // set maximum height of editor
                    toolbar: [
                        ['font', ['bold', 'italic', 'underline', 'clear']], //['font', ['bold', 'italic', 'underline', 'clear']],
                        ['para', ['ul', 'ol']] //['para', ['ul', 'ol', 'paragraph']],
                        //['insert', ['link', 'picture']], //['insert', ['link', 'picture', 'hr']],
                    ]
                } // summernote options goes here
            }
        }
    },
    items: {
        type: [ConvertItems.itemsSchema]
    },
    fromItemTotal: {
        type: Number,
        decimal: true,
        autoform: {
            type: 'inputmask',
            inputmaskOptions: function () {
                return inputmaskOptions.currency();
            }
        },
        optional: true
    },
    toItemTotal: {
        type: Number,
        decimal: true,
        autoform: {
            type: 'inputmask',
            inputmaskOptions: function () {
                return inputmaskOptions.currency();
            }
        },
        optional: true
    },
    branchId: {
        type: String
    },
    status: {
        type: String,
        optional: true
    },
    stockLocationId: {
        type: String,
        autoform: {
            type: 'universe-select',
            afFieldInput: {
                uniPlaceholder: 'Select One',
                optionsMethod: 'pos.selectOptMethods.stockLocation',
                optionsMethodParams: function () {
                    if (Meteor.isClient) {
                        let currentBranch = Session.get('currentBranch');
                        return {branchId: currentBranch};
                    }
                }
            }
        }
    },
    cash: {
        type: Number,
        decimal: true,
        min:0
    }
});

Meteor.startup(function () {
    ConvertItems.itemsSchema.i18n("pos.convertItem.schema");
    ConvertItems.schema.i18n("pos.convertItem.schema");
    ConvertItems.attachSchema(ConvertItems.schema);
});
