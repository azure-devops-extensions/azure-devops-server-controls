// Copyright (C) Microsoft Corporation. All rights reserved.
define("Wiki/WitQuery/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ViewWorkItemQuery = "View query";
    exports.OnlyFlatQuerySupported = "Only queries of type \"Flat list of work items\" are supported.";
    exports.OnlySharedQuerySupported = "Only shared queries can be inserted.";
    exports.QueryNotFound = "Couldn\u0027t recognize query id: {0}";
    exports.EmptyQueryId = "Query id is empty.";
    exports.ShowingNResults = "Showing {0} results.";
    exports.ShowingFirstNResults = "Showing the first {0} results.";
    exports.ShowingOneResult = "Showing 1 result.";
    exports.ErrorInFetchingQueryResults = "Error occurred in fetching query results";
    exports.NoResultsFoundMessage = "No work items found";
});