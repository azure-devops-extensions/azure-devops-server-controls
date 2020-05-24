// Copyright (C) Microsoft Corporation. All rights reserved.
define("Pipeline/Analytics/PipelineDurationRegressionCard/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PipelineDurationRegressionCardTitle = "Pipeline duration";
    exports.PipelineDurationRegressionCardSubTitle = "{0}th percentile";
    exports.PipelineDurationFormat = "{0} | {1} succeeded runs";
    exports.NoPipelineText = "There are no runs in the selected period";
    exports.NoSuccessfulPipelineText = "There are no succeeded runs in the selected period";
    exports.NoFailedPipelineText = "There are no failed runs in the selected period";
    exports.AllPipelinesText = "All runs";
    exports.SuccessfulPipelinesText = "Succeeded runs";
    exports.FailedPipelinesText = "Failed runs";
    exports.PipelineTrendInsight = "{0}% in the last {1} days";
    exports.TaskTrendInsightIncreased = "Task \u0027{0}\u0027 duration has increased by {1} ({2}%) in the last {3} days";
    exports.TaskTrendInsightDecreased = "Task \u0027{0}\u0027 duration has decreased by {1} ({2}%) in the last {3} days";
});