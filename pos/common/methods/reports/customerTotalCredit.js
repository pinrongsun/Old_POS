import {Meteor} from 'meteor/meteor';
import {ValidatedMethod} from 'meteor/mdg:validated-method';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {CallPromiseMixin} from 'meteor/didericis:callpromise-mixin';
import {_} from 'meteor/erasaur:meteor-lodash';
import {moment} from  'meteor/momentjs:moment';

// Collection
import {Company} from '../../../../core/imports/api/collections/company.js';
import {Invoices} from '../../../imports/api/collections/invoice';
import {Exchange} from '../../../../core/imports/api/collections/exchange';
// lib func
import {correctFieldLabel} from '../../../imports/api/libs/correctFieldLabel';
import {exchangeCoefficient} from '../../../imports/api/libs/exchangeCoefficient';
import ReportFn from "../../../imports/api/libs/report";
export const customerTotalCreditReport = new ValidatedMethod({
    name: 'pos.customerTotalCreditReport',
    mixins: [CallPromiseMixin],
    validate: null,
    run(params) {
        if (!this.isSimulation) {
            Meteor._sleepForMs(200);
            let selector = {};
            let project = {};
            let data = {
                title: {},
                fields: [],
                displayFields: [],
                content: [{index: 'No Result'}],
                footer: {}
            };
            let branchId = [];
            if (params.branchId) {
                branchId = params.branchId.split(',');
                selector.branchId = {
                    $in: branchId
                };
                selector = ReportFn.checkIfUserHasRights({currentUser: Meteor.userId(), selector});
            }
            let user = Meteor.users.findOne(Meteor.userId());
            let exchange = Exchange.findOne({}, {sort: {_id: -1}});
            let coefficient = exchangeCoefficient({exchange, fieldToCalculate: '$total'})
            let filterItems = {'items.itemId': {$ne: ''}};
            // console.log(user);
            // let date = _.trim(_.words(params.date, /[^To]+/g));
            selector.invoiceType = {$eq: 'term'};
            let toDate;
            if (params.date) {
                toDate = moment(params.date).endOf('days').toDate();
                data.title.date = moment(toDate).format('DD/MM/YYYY');
                data.title.exchange = `USD = ${coefficient.usd.$multiply[1]} $, KHR = ${coefficient.khr.$multiply[1]}<small> ៛</small>, THB = ${coefficient.thb.$multiply[1]} B`;
                selector.$or = [
                    {status: {$in: ['active', 'partial']}, invoiceDate: {$lte: toDate}},
                    {invoiceDate: {$lte: toDate}, status: 'closed', closedAt: {$gt: toDate}},
                ];
            }
            if (params.customer && params.customer != '') {
                selector.customerId = params.customer;
            }

            // project['$invoice'] = 'Invoice';
            /****** Title *****/
            data.title.company = Company.findOne();
            /****** Content *****/
            let invoices = Invoices.aggregate([
                {
                    $match: selector
                },
                {
                    $lookup: {
                        from: 'pos_receivePayment',
                        localField: '_id',
                        foreignField: 'invoiceId',
                        as: 'receivePaymentDoc'
                    }
                },
                {
                    $project: {
                        _id: 1,
                        customerId: 1,
                        invoiceId: 1,
                        total: 1,
                        receivePaymentDoc: {
                            $filter: {
                                input: '$receivePaymentDoc',
                                as: 'payment',
                                cond: { $lte: ['$$payment.paymentDate', toDate] }
                            }
                        },
                    }
                },
                {
                    $unwind: { path: '$receivePaymentDoc', preserveNullAndEmptyArrays: true }
                },
                { $sort: { 'receivePaymentDoc._id': 1 } },
                {
                    $group: {
                        _id: '$_id',
                        customerId: { $last: '$customerId' },
                        status: { $last: '$status' },
                        dueAmount: {
                            $last: '$receivePaymentDoc.dueAmount'
                        },
                        paidAmount: {
                            $last: '$receivePaymentDoc.paidAmount'
                        },
                        total: { $last: '$total' },
                    }
                },
                {
                    $project: {
                        _id: 1,
                        customerId: 1,
                        dueAmount: {
                            $ifNull: ["$dueAmount", "$total"]
                        },
                        paidAmount: {
                            $ifNull: ["$paidAmount", 0]
                        },
                        invoiceDate: 1,
                        dueDate: 1,
                        lastPaymentDate: {
                            $ifNull: ["$lastPaymentDate", "None"]
                        },
                        status: 1,
                        total: '$total'
                    }
                },
                {
                    $group: {
                        _id: '$_id',
                        customerId: {$last: '$customerId'},
                        dueAmount: { $last: '$dueAmount' },
                        paidAmount: { $last: '$paidAmount' },
                        balance: { $last: { $subtract: ["$dueAmount", "$paidAmount"] } },
                        total: { $last: '$total' }
                    }
                },
                {
                    $group: {
                        _id: '$customerId',
                        dueDate: { $last: '$dueDate' },
                        invoiceDate: { $last: '$invoiceDate' },
                        lastPaymentDate: { $last: '$lastPaymentDate' },
                        dueAmountSubTotal: { $sum: '$dueAmount' },
                        paidAmount: { $sum: '$paidAmount' },
                        total: { $sum: '$balance' }
                    }
                },
                {
                    $lookup: {
                        from: 'pos_customers',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'customerDoc'
                    }
                },
                {$unwind: {path: '$customerDoc', preserveNullAndEmptyArrays: true}},
                {$sort: {'customerDoc.name': 1}},
                {
                    $group: {
                        _id: null,
                        data: {
                            $push: '$$ROOT'
                        },
                        total: {$sum: '$total'}
                    }
                }
            ]);
            if (invoices.length > 0) {
                data.content = invoices[0].data;
                data.footer = {
                    grandTotal: invoices[0].total,
                }
            }
            return data
        }
    }
});
