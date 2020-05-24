import * as Diag from "VSS/Diag";

import {
    registerWorkItemControlTypeFactory, registerWorkItemFormControl, registerWorkItemControlAdvanced, beginGetWorkItemControl,
    getWorkItemControlRegistration, IWorkItemControlPreview, IWorkItemControlType, RenderType, IWorkItemControlRegistration
} from "WorkItemTracking/Scripts/ControlRegistration";
import { WellKnownControlNames, FieldType, CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { WorkItemType, isIdentityPickerSupportedForField } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

// Base registration
import { setFormRegistrationMode, getFormRegistrationMode, FormRegistrationMode } from "WorkItemTracking/Scripts/ControlRegistration/Form";

// Controls
import { FieldControlPreview } from "WorkItemTracking/Scripts/Form/React/Components/FieldControlPreview";
import { LongTextFieldPreview } from "WorkItemTracking/Scripts/Form/React/Components/LongTextFieldPreview";
import { WorkItemClassificationComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/WorkItemClassificationComponent";
import { WorkItemStateComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/WorkItemStateComponent";
import { WorkItemFieldComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/WorkItemFieldComponent";

const formRegistrationMode = getFormRegistrationMode();
if (formRegistrationMode !== FormRegistrationMode.Mobile) {
    setFormRegistrationMode(FormRegistrationMode.Mobile);

    // DateTimeControl
    const dateTimeControlRegistration: IWorkItemControlRegistration = {
        renderType: RenderType.React,
        controlType: "DateTimeFieldComponent",
        requiredModule: "WorkItemTracking/Scripts/Form/React/Components/DateTimeFieldComponent",
        previewConfiguration: {
            renderType: RenderType.React,
            previewType: "DateTimeFieldControlPreview",
            requiredModule: "WorkItemTracking/Scripts/Form/React/Components/DateTimeFieldControlPreview",
        }
    };

    registerWorkItemControlAdvanced(WellKnownControlNames.DateControl, dateTimeControlRegistration);

    // History
    registerWorkItemControlAdvanced(WellKnownControlNames.WorkItemHistoryControl, {
        renderType: RenderType.React,
        controlType: "WorkItemHistoryComponent",
        requiredModule: "WorkItemTracking/Scripts/Form/Mobile/Components/WorkItemHistoryComponent",
        previewConfiguration: null
    });

    // Classification
    registerWorkItemControlAdvanced(WellKnownControlNames.ClassificationControl, {
        renderType: RenderType.React,
        controlType: WorkItemClassificationComponent,
        previewConfiguration: {
            renderType: RenderType.React,
            previewType: FieldControlPreview
        }
    });

    //
    // Html control overrides.
    // Override plaintext field editing with the react version of the control for mobile
    //
    const htmlControlWorkItemControlRegistration = getWorkItemControlRegistration(WellKnownControlNames.HtmlControl);
    Diag.Debug.assert(!!htmlControlWorkItemControlRegistration);

    registerWorkItemControlTypeFactory(
        WellKnownControlNames.HtmlControl,
        (controlOptions?: IWorkItemControlOptions, workItemType?: WorkItemType): IWorkItemControlRegistration => {
            if (controlOptions && controlOptions.fieldName && workItemType) {

                const fieldDefinition = workItemType.getFieldDefinition(controlOptions.fieldName);

                if (fieldDefinition && fieldDefinition.type === FieldType.PlainText) {
                    return {
                        renderType: RenderType.React,
                        controlType: "PlainTextEditComponent",
                        requiredModule: "WorkItemTracking/Scripts/Form/React/Components/PlainTextEditComponent",
                        previewConfiguration: {
                            previewType: LongTextFieldPreview,
                            renderType: RenderType.React
                        }
                    };
                }
            }

            // Default to existing registration
            return htmlControlWorkItemControlRegistration as IWorkItemControlRegistration;
        });

    //
    // Field Control factory
    //
    const fieldWorkItemControlRegistration = getWorkItemControlRegistration(WellKnownControlNames.FieldControl);

    registerWorkItemControlTypeFactory(
        WellKnownControlNames.FieldControl,
        (controlOptions?: IWorkItemControlOptions, workItemType?: WorkItemType): IWorkItemControlRegistration => {
            if (controlOptions) {
                switch (controlOptions.fieldName) {
                    case CoreFieldRefNames.State:
                        return {
                            renderType: RenderType.React,
                            controlType: WorkItemStateComponent,
                            previewConfiguration: {
                                renderType: RenderType.React,
                                previewType: FieldControlPreview
                            }
                        };
                }
            }

            if (workItemType) {
                // Use existing field control registration with a react preview for identity controls
                const fieldDefinition = workItemType.getFieldDefinition(controlOptions.fieldName);
                if (isIdentityPickerSupportedForField(fieldDefinition)) {
                    return {
                        ...fieldWorkItemControlRegistration as IWorkItemControlRegistration,
                        previewConfiguration: {
                            renderType: RenderType.React,
                            previewType: FieldControlPreview
                        }
                    };
                }

                // There is no preview for boolean field, so return without preview configuration
                if (fieldDefinition && fieldDefinition.type === FieldType.Boolean) {
                    return {
                        renderType: RenderType.React,
                        controlType: "BooleanFieldComponent",
                        requiredModule: "WorkItemTracking/Scripts/Form/React/Components/BooleanFieldComponent",
                        previewConfiguration: null
                    };
                }

                // Use DateTime control for FieldControl type when field type is DateTime
                if (fieldDefinition && fieldDefinition.type === FieldType.DateTime) {
                    return dateTimeControlRegistration;
                }
            }

            // Default to existing registration
            return {
                renderType: RenderType.React,
                controlType: WorkItemFieldComponent,
                previewConfiguration: {
                    renderType: RenderType.React,
                    previewType: FieldControlPreview
                }
            };
        });
}
