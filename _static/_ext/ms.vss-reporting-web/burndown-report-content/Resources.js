// Copyright (C) Microsoft Corporation. All rights reserved.
define("Reporting/BurndownReport/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReportTitle = "Burndown Trend";
    exports.To = "to";
    exports.DatesNotConfiguredError = "Start and end dates are not configured on this iteration";
    exports.IterationNotFoundError = "This iteration could not be found on the analytics service";
});