import {Meteor} from 'meteor/meteor';
import {Session} from 'meteor/session';
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
import {ConvertItemSettings} from '../../imports/api/collections/convertItemSetting.js';

// Page
Meteor.isClient && require('../../imports/ui/pages/convertItemSetting.html');

tabularOpts.name = 'pos.convertItemSetting';
tabularOpts.collection = ConvertItemSettings;
tabularOpts.columns = [
    {title: '<i class="fa fa-bars"></i>', tmpl: Meteor.isClient && Template.Pos_convertItemSettingAction},
    {data: "_id", title: "ID"},
    {data:"_fromItem.name",title:"From Item"},
    {data:"_toItem.name",title:"To Item"},
    {data:"qty",title:"Quantity"}
   // {data: "description", title: "Description"}
];
tabularOpts.extraFields=['fromItemId','toItemId'];
export const ConvertItemSettingTabular = new Tabular.Table(tabularOpts);
