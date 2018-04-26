import {Meteor} from 'meteor/meteor';
import {Template} from 'meteor/templating';
import {Tabular} from 'meteor/aldeed:tabular';
import {EJSON} from 'meteor/ejson';
import {moment} from 'meteor/momentjs:moment';
import {_} from 'meteor/erasaur:meteor-lodash';
import {numeral} from 'meteor/numeral:numeral';
import {lightbox} from 'meteor/theara:lightbox-helpers';

// Lib
import {tabularOpts} from '../../../core/common/libs/tabular-opts.js';

// Collection
import {ConvertItems} from '../../imports/api/collections/convertItem.js';
import {CustomerNullCollection} from '../../imports/api/collections/tmpCollection';
// Page
Meteor.isClient && require('../../imports/ui/pages/convertItem.html');

tabularOpts.name = 'pos.convertItem';
tabularOpts.collection = ConvertItems;
tabularOpts.columns = [
    {title: '<i class="fa fa-bars"></i>', tmpl: Meteor.isClient && Template.Pos_convertItemAction},
    {data: "_id", title: "ID"},
    {
        data: "convertItemDate",
        title: "Date",
        render: function (val, type, doc) {
            return moment(val).format('YYYY-MM-DD');
        }
    },
    {
        data: "total", title: "Total",
        render: function (val) {
            return numeral(val).format('0,0.00');
        }
    },
    {data: "des", title: "Description"},
    {data: "status", title: "Status"},
    //{
    //    data: "_customer",
    //    title: "Customer Info",
    //    render: function (val, type, doc) {
    //        return JSON.stringify(val, null, ' ');
    //    }
    //}
];
tabularOpts.extraFields = ['items', 'repId', 'stockLocationId','branchId'];
export const ConvertItemTabular = new Tabular.Table(tabularOpts);
