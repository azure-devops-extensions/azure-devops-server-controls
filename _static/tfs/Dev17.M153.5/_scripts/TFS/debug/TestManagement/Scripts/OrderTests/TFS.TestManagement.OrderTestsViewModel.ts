// Copyright (c) Microsoft Corporation.  All rights reserved.

import q = require("q");
import Events_Services = require("VSS/Events/Services");

import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import OrderTestsCommon = require("TestManagement/Scripts/OrderTests/TFS.TestManagement.OrderTests.Common");

let eventSvc = Events_Services.getService();

export class OrderTestsViewModel {
    private _rawTestdata: TestsOM.TestCase[] = [];

    /**
     * Get the page test cases
     * @param testCaseIds
     */
    public getPageTestCases(testCaseIds: number[], fields: string[]): IPromise<void> {
        let deferred: Q.Deferred<void> = q.defer<void>();
        TMUtils.TestCaseUtils.beginGetTestCases(testCaseIds, fields, (testCases: TestsOM.TestCase[]) => {
            Array.prototype.push.apply(this._rawTestdata, testCases);
            deferred.resolve(null);
        },
            (error) => {
            deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
     * Get the raw data source
     * @returns raw data source
     */
    public getDataSource(): TestsOM.TestCase[] {
        return this._rawTestdata;
    }

    /**
     * Move the given set of test cases in the raw data source to new index
     * After moving items in the datasource, fire the event to repopulate the grid with updated source
     * @param testCases Test cases to move
     * @param newIndex Index where testcases to insert, this index is with the actual source without any item removal
     */
    public moveItems(testCases: any[], newIndex: number) {
        let source = this.getDataSource();

        if (newIndex < 0 || newIndex > source.length) {
            return;
        }

        // Count the number of selected testcases which is above the newIndex
        let count = 0;
        for (let i = 0, length = testCases.length; i < length; i++) {
            let index = source.indexOf(testCases[i]);
            if (index > -1 && index < newIndex) {
                count = count + 1;
            }
        }

        // Remove the selected testcases from the source
        for (let i = 0, length = testCases.length; i < length; i++) {
            let index = source.indexOf(testCases[i]);
            let testCase = source.splice(index, 1);
        }

        // Now Append the dragged test cases into the source at the new index, given that few items got deleted
        // we can't use passed index, so index for appending test cases would be newIndex minus count of test case above the newIndex
        source.splice.apply(source, [newIndex - count, 0].concat(testCases));

        eventSvc.fire(OrderTestsCommon.OrderTestsEvent.ItemUpdated, this, testCases);
    }
}