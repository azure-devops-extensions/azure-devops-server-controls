// Copyright (C) Microsoft Corporation. All rights reserved.
define("RMWidgets/ReleasePipelineWidget/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RDWidgetEnvironmentTileTooltip = "Stage: {0} Status: {1} Build: {2} Branch: {3}";
    exports.RDWidgetViewSummaryLinkText = "View all releases for the {0} release pipeline";
    exports.NoDeploymentsYetMessage = "No deployments yet";
    exports.EnvironmentControlAriaLabelFormat = "Stage {0} ; Status is {1} in release {2}";
    exports.EnvironmentStatus_NotStarted = "Not started";
    exports.EnvironmentStatus_Scheduled = "Scheduled";
    exports.EnvironmentStatus_Queued = "Queued";
    exports.EnvironmentStatus_InProgress = "In progress";
    exports.EnvironmentStatus_Succeeded = "Succeeded";
    exports.EnvironmentStatus_Canceled = "Canceled";
    exports.EnvironmentStatus_Rejected = "Rejected";
    exports.EnvironmentStatus_PartiallySucceeded = "Partially succeeded";
});