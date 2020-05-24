// Copyright (C) Microsoft Corporation. All rights reserved.
define("Widgets/SprintBurndownWidget/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Title = "Burndown for {0}";
    exports.GenericTitle = "Sprint Burndown";
    exports.NoIterationsSetForTeamMessage = "TF401315: An error occurred when rendering the chart. It might be because no iterations have been configured for your current team. Please check with your Team Administrator to configure iterations.";
    exports.SetupIterationsMessage = "Set iteration dates to use the sprint burndown widget";
    exports.IterationDateRange = "{0} - {1}";
});