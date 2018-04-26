import {Meteor} from 'meteor/meteor';
import {Templet} from 'meteor/templating';
import {Tabular} from 'meteor/aldeed:tabular';
import {EJSON} from 'meteor/ejson';
import {moment} from 'meteor/momentjs:moment';
import {_} from 'meteor/erasaur:meteor-lodash';
import {numeral} from 'meteor/numeral:numeral';
import {lightbox} from 'meteor/theara:lightbox-helpers';

// Lib
import {tabularOpts} from '../../../core/common/libs/tabular-opts.js';

// Collection
import {Order} from '../../imports/api/collections/order.js';

// Page
Meteor.isClient && require('../../imports/ui/pages/order.html');

tabularOpts.name = 'pos.order';
tabularOpts.collection = Order;
tabularOpts.columns = [
    {title: '<i class="fa fa-bars"></i>', tmpl: Meteor.isClient && Template.Pos_orderAction},
    {data: "_id", title: "ID"},
    {
        data: "orderDate",
        title: "Date",
        render: function (val, type, doc) {
            return moment(val).format('YYYY-MM-DD');
        }
    },
    {data: "_customer.name", title: "Customer"},
    {data: "total", title: "Total"},
    {data: "sumRemainQty", title: "Remain QTY"},
    {data: "isPurchased", title: "Purchased"},
    {data: "des", title: "Description"}
    //{
    //    data: "_customer",
    //    title: "Customer Info",
    //    render: function (val, type, doc) {
    //        return JSON.stringify(val, null, ' ');
    //    }
    //}
];
tabularOpts.extraFields = ['items', 'customerId'];
export const OrderTabular = new Tabular.Table(tabularOpts);
