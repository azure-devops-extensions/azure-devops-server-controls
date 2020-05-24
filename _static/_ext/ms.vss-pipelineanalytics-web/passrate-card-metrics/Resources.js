// Copyright (C) Microsoft Corporation. All rights reserved.
define("Pipeline/Analytics/PassRateCardMetrics/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PipelinePassRate = "Pipeline failures";
    exports.PipelinePassRateFooter = "Last 14 days";
    exports.TopFailingStageAndTaskLabel = "{0} stage has the highest failure rate with {1} of its failures caused by task - {2}";
    exports.TopFailingTaskLabel = "{0} of pipeline failures are due to failures in task - {1}";
    exports.Percentage = "%";
    exports.BuildsNotAvailable = "No runs completed in the last 14 days";
    exports.DataNotReady = "Pipeline failures report will be ready in few minutes, click to know more.";
    exports.NoTaskFailuresText = "There are no task failures that caused failed pipelines";
    exports.PassRate = "Pass rate:";
    exports.Runs = "Runs:";
});