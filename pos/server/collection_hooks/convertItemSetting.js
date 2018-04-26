import 'meteor/matb33:collection-hooks';
import {idGenerator} from 'meteor/theara:id-generator';

// Collection
import {ConvertItemSettings} from '../../imports/api/collections/convertItemSetting.js';

ConvertItemSettings.before.insert(function (userId, doc) {
    let prefix = doc.fromItemId;
    doc._id = idGenerator.genWithPrefix(ConvertItemSettings, prefix, 7);
});
