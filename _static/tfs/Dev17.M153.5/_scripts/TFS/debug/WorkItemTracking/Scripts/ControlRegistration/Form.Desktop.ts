import * as Diag from "VSS/Diag";

import {
    registerWorkItemControlTypeFactory, registerWorkItemFormControl, registerWorkItemControlAdvanced, beginGetWorkItemControl,
    getWorkItemControlRegistration, IWorkItemControlPreview, IWorkItemControlType, RenderType, IWorkItemControlRegistration
} from "WorkItemTracking/Scripts/ControlRegistration";
import { WellKnownControlNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import WitFormMode = require("WorkItemTracking/Scripts/Utils/WitControlMode");

// Base registration
import { getFormRegistrationMode, FormRegistrationMode } from "WorkItemTracking/Scripts/ControlRegistration/Form";

// Controls
import { FieldControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/FieldControl";
import { TagFieldControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/TagFieldControl";
import { FreshnessIndicatorControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/FreshnessIndicatorControl";
import { LinksControl } from "WorkItemTracking/Scripts/Controls/Links/Control";
import { PlainTextControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/PlainTextControl";
import { HtmlFieldControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HtmlFieldControl";
import { DateTimeControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/DateTimeControl";
import { LabelControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/LabelControl";
import { WorkItemClassificationControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemClassificationControl";
import { WorkItemDiscussionControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemDiscussionControl";

const formRegistrationMode = getFormRegistrationMode();
if (formRegistrationMode === FormRegistrationMode.Default) {
    // PlainText
    registerWorkItemFormControl(WellKnownControlNames.PlainTextControl, PlainTextControl);

    // Html
    registerWorkItemControlAdvanced(WellKnownControlNames.HtmlControl, {
        renderType: RenderType.JQuery,
        controlType: HtmlFieldControl,
        previewConfiguration: {
            requiredModule: "WorkItemTracking/Scripts/Form/React/Components/LongTextFieldPreview",
            previewType: "LongTextFieldPreview",
            renderType: RenderType.React
        }
    });


    // Date
    registerWorkItemFormControl(WellKnownControlNames.DateControl, DateTimeControl);

    // Classification
    registerWorkItemControlAdvanced(WellKnownControlNames.ClassificationControl, {
        renderType: RenderType.JQuery,
        controlType: WorkItemClassificationControl
    });

    // Label
    registerWorkItemFormControl(WellKnownControlNames.LabelControl, LabelControl);

    // Field
    registerWorkItemControlAdvanced(WellKnownControlNames.FieldControl, {
        renderType: RenderType.JQuery,
        controlType: FieldControl,
        previewConfiguration: {
            previewType: "FieldControlPreview",
            requiredModule: "WorkItemTracking/Scripts/Form/React/Components/FieldControlPreview",
            renderType: RenderType.React
        }
    });

    // Discussion
    registerWorkItemFormControl(WellKnownControlNames.WorkItemDiscussionControl, WorkItemDiscussionControl);

    // Links control
    registerWorkItemFormControl(WellKnownControlNames.LinksControl, LinksControl);
    
    // Attachments control
    registerWorkItemFormControl(WellKnownControlNames.AttachmentsControl, "AttachmentsControl", "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentsControl");

    // Desktop form specific controls
    registerWorkItemFormControl(WellKnownControlNames.FreshnessIndicatorControl, FreshnessIndicatorControl);
    registerWorkItemFormControl(WellKnownControlNames.TagFieldControl, TagFieldControl);
    registerWorkItemFormControl(WellKnownControlNames.FieldControl, FieldControl);
}