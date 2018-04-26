import ClosingStock from '../../imports/api/libs/closingStockBalance';
SyncedCron.add({
    name: 'Generate Closing Stock Balance',
    schedule: function (parser) {
        // parser is a later.parse object
        // return parser.text('every 2 hours');
        return parser.text('at 11:00 pm');
    },
    job: function () {
           ClosingStock.generateClosingStockBalance();
    }
});