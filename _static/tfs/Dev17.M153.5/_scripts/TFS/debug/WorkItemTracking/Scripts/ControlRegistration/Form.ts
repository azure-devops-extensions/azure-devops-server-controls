import {
    registerWorkItemControlTypeFactory, registerWorkItemFormControl, registerWorkItemControlAdvanced, RenderType,
    getWorkItemControlRegistration, IWorkItemControlRegistration
} from "WorkItemTracking/Scripts/ControlRegistration";
import { WellKnownControlNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import WitFormMode = require("WorkItemTracking/Scripts/Utils/WitControlMode");

export enum FormRegistrationMode {
    Default = 0,
    Mobile
}

/** Form registration mode, is used to prevent registrations for different form modes (Desktop, Mobile, ...) 
 * overriding one another, if both modules are included on a page. */
var formRegistrationMode: FormRegistrationMode = FormRegistrationMode.Default;

export function getFormRegistrationMode(): FormRegistrationMode {
    return formRegistrationMode;
} 

export function setFormRegistrationMode(mode: FormRegistrationMode): void {
    formRegistrationMode = mode;
}


// History
registerWorkItemFormControl(WellKnownControlNames.WorkItemHistoryControl, "WorkItemHistoryControl", "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/WorkItemHistoryControl");
registerWorkItemFormControl(WellKnownControlNames.WorkItemStateGraphControl, "WorkItemStateGraphControl", "WorkItemTracking/Scripts/Controls/WorkItemForm/StateTransitionGraphControl");

// PlainText
registerWorkItemFormControl(WellKnownControlNames.PlainTextControl, "PlainTextControl", "WorkItemTracking/Scripts/Controls/WorkItemForm/PlainTextControl");

// Html
registerWorkItemControlAdvanced(WellKnownControlNames.HtmlControl, {
    renderType: RenderType.JQuery,
    controlType: "HtmlFieldControl",
    requiredModule: "WorkItemTracking/Scripts/Controls/WorkItemForm/HtmlFieldControl",
    previewConfiguration: {
        requiredModule: "WorkItemTracking/Scripts/Form/React/Components/LongTextFieldPreview",
        previewType: "LongTextFieldPreview",
        renderType: RenderType.React
    }
});

// WebPage
registerWorkItemControlAdvanced(WellKnownControlNames.WebpageControl, {
    renderType: RenderType.JQuery,
    controlType: "WebpageControl",
    requiredModule: "WorkItemTracking/Scripts/Controls/WorkItemForm/WebpageControl"
});

// Date
registerWorkItemFormControl(WellKnownControlNames.DateControl, "DateTimeControl", "WorkItemTracking/Scripts/Controls/WorkItemForm/DateTimeControl");

// Classification
registerWorkItemControlAdvanced(WellKnownControlNames.ClassificationControl, {
    renderType: RenderType.JQuery,
    controlType: "WorkItemClassificationControl",
    requiredModule: "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemClassificationControl",
    previewConfiguration: {
        requiredModule: "WorkItemTracking/Scripts/Form/React/Components/LongTextFieldPreview",
        previewType: "LongTextFieldPreview",
        renderType: RenderType.React
    }
});

// Label
registerWorkItemFormControl(WellKnownControlNames.LabelControl, "LabelControl", "WorkItemTracking/Scripts/Controls/WorkItemForm/LabelControl");

// Field
registerWorkItemControlAdvanced(WellKnownControlNames.FieldControl, {
    renderType: RenderType.JQuery,
    controlType: "FieldControl",
    requiredModule: "WorkItemTracking/Scripts/Controls/WorkItemForm/FieldControl",
    previewConfiguration: {
        previewType: "FieldControlPreview",
        requiredModule: "WorkItemTracking/Scripts/Form/React/Components/FieldControlPreview",
        renderType: RenderType.React
    }
});

// Discussion
registerWorkItemFormControl(WellKnownControlNames.WorkItemDiscussionControl, "WorkItemDiscussionControl", "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemDiscussionControl");

// Register the built-in test management controls.
registerWorkItemFormControl(WellKnownControlNames.TestStepsControl, "TestStepsControl", "TestManagement/Scripts/TFS.TestManagement.Controls");
registerWorkItemFormControl(WellKnownControlNames.AssociatedAutomationControl, "AssociatedAutomationControl", "TestManagement/Scripts/Controls/TFS.TestManagement.AssociatedAutomationControl");

// Register the built-in release pipeline controls.
registerWorkItemFormControl(WellKnownControlNames.StageControl, "StageControl", "ReleasePipeline/Scripts/TFS.ReleasePipeline.Controls");
registerWorkItemFormControl(WellKnownControlNames.StageBuildControl, "StageBuildControl", "ReleasePipeline/Scripts/TFS.ReleasePipeline.Controls");
registerWorkItemFormControl(WellKnownControlNames.ReleaseBuildControl, "ReleaseBuildControl", "ReleasePipeline/Scripts/TFS.ReleasePipeline.Controls");
registerWorkItemFormControl(WellKnownControlNames.AcceptanceCriteriaControl, "AcceptanceCriteriaControl", "ReleasePipeline/Scripts/TFS.ReleasePipeline.Controls");

// Links Control
registerWorkItemFormControl(WellKnownControlNames.LinksControl, "LinksControl", "WorkItemTracking/Scripts/Controls/Links/Control");
registerWorkItemFormControl(WellKnownControlNames.AttachmentsControl, "AttachmentsControl", "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentsControl");