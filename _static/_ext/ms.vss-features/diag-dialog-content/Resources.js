// Copyright (C) Microsoft Corporation. All rights reserved.
define("VSS/Diagnostics/Dialog/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FaultInjectionHeaderTitle = "Request Scoped Fault Injection";
    exports.FaultInjectionFaultListCardTitle = "Active Faults";
    exports.FaultInjectionFaultListCardDescription = "Use \u0027Save\u0027 button to save the changes made to the list";
    exports.FaultInjectionAddFaultCardTitle = "Add Fault";
    exports.SaveFaultListButtonText = "Save";
    exports.SaveFaultListButtonTipText = "Save the list";
    exports.DeleteFaultListButtonText = "Delete";
    exports.DeleteFaultListButtonTipText = "Delete selected faults";
    exports.AddFaultListButtonText = "Add";
    exports.AddFaultListButtonTipText = "Add fault to the list";
    exports.FaultInputFaultPointLabel = "Fault point: ";
    exports.FaultInputFaultTypeLabel = "Fault type: ";
    exports.FaultInputTargetHostLabel = "Fault target: ";
    exports.FaultInputTargetHostPlaceHolder = "vsrm.codedev.ms";
    exports.FaultInputTargetHostValidationText = "Please input a non-empty string";
    exports.FaultInputDelayLabel = "Delay to add in ms: ";
    exports.FaultInputDelayPlaceHolder = "1000";
    exports.FaultInputDelayValidationText = "Please input a number";
});