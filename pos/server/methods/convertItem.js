import {ConvertItems} from '../../imports/api/collections/convertItem';
Meteor.methods({
    convertItemShow({_id}){
        let convertItem = ConvertItems.aggregate([
            {$match: {_id: _id}},
            {$unwind: {path: '$items', preserveNullAndEmptyArrays: true}},
            {
                $lookup: {
                    from: "pos_item",
                    localField: "items.fromItemId",
                    foreignField: "_id",
                    as: "fromItemDoc"
                }
            },
            {
                $lookup: {
                    from: 'pos_item',
                    localField: "items.toItemId",
                    foreignField: "_id",
                    as: "toItemDoc",
                }
            },
            {$unwind: {path: '$fromItemDoc', preserveNullAndEmptyArrays: true}},
            {$unwind: {path: '$toItemDoc', preserveNullAndEmptyArrays: true}},
            {
                $group: {
                    _id: '$_id',
                    items: {
                        $addToSet: {
                            fromItemName: '$fromItemDoc.name',
                            toItemName: '$toItemDoc.name',
                            qty: '$items.qty',
                            getQty:"$items.getQty",
                            fromItemAmount: '$items.fromItemAmount',
                            toItemAmount: '$items.toItemAmount',
                            fromItemPrice:"$items.fromItemPrice",
                            toItemPrice:"$items.toItemPrice",

                        }
                    },
                    branchId: {$last: '$branchId'},
                    convertItemDate: {$last: '$convertItemDate'},
                    status: {$last: '$status'},
                    total: {$last: '$total'},
                    cash:{$last:'$cash'},
                    fromItemTotal:{$last:'$fromItemTotal'},
                    toItemTotal:{$last:'$toItemTotal'}
                }
            }
        ]);
        if (convertItem.length > 0) {
            return convertItem[0];
        }
        return {};
    }
});