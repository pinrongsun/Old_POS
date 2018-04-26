import 'meteor/theara:collection-cache';

// Collection
import {ConvertItemSettings} from '../../imports/api/collections/convertItemSetting.js';
import {Item} from '../../imports/api/collections/item.js';


ConvertItemSettings.cacheTimestamp();
ConvertItemSettings.cacheDoc('fromItem',Item,['name'],'fromItemId');
ConvertItemSettings.cacheDoc('toItem',Item,['name'],'toItemId');
