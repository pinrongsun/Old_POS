import {ConvertItems} from '../../imports/api/collections/convertItem.js';

// Lib
import './_init.js';

ConvertItems.permit(['insert'])
    .Pos_ifDataInsert()
    .allowInClientCode();
ConvertItems.permit(['update'])
    .Pos_ifDataUpdate()
    .allowInClientCode();
ConvertItems.permit(['remove'])
    .Pos_ifDataRemove()
    .allowInClientCode();
