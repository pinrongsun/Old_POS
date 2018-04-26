import {ConvertItemSettings} from '../../imports/api/collections/convertItemSetting.js';

// Lib
import './_init.js';

ConvertItemSettings.permit(['insert'])
    .Pos_ifDataInsert()
    .allowInClientCode();
ConvertItemSettings.permit(['update'])
    .Pos_ifDataUpdate()
    .allowInClientCode();
ConvertItemSettings.permit(['remove'])
    .Pos_ifDataRemove()
    .allowInClientCode();
