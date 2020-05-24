// Copyright (C) Microsoft Corporation. All rights reserved.
define("Test/TestFlaky/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OkButtonText = "OK";
    exports.CancelButtonText = "Cancel";
    exports.Unspecified = "Unspecified";
    exports.ResultOutcomeAndMachineNameInfo = "{0} {1} on {2}";
    exports.ResultOutcomeInfo = "{0} {1}";
    exports.MarkTestCaseFlaky = "Mark test as flaky";
    exports.UnmarkTestCaseFlaky = "Mark test as unflaky";
    exports.Container = "Test File";
    exports.SourceBranch = "Branch";
    exports.TargetBranch = "Target Branch";
    exports.TestName = "Test name";
    exports.Outcome = "Outcome";
    exports.NoBranchInfoAvailable = "No branch information available.";
    exports.UnflakyMessageBar = "This test will no longer be marked as flaky for all subsequent pipeline runs from the branch.";
    exports.FlakyMessageBar = "This will mark the test as flaky for all subsequent pipeline runs from the branch and will not change the current test pass percentage.";
});