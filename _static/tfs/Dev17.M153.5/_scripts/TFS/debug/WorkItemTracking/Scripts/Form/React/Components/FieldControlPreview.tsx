import * as React from "react";
import * as Diag from "VSS/Diag";
import Culture = require("VSS/Utils/Culture");
import { format } from "VSS/Utils/Date";
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { IWorkItemControlPreview } from "WorkItemTracking/Scripts/ControlRegistration";
import { FieldType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { getControlClasses } from "WorkItemTracking/Scripts/Form/ControlUtils";
import { LeftTruncatedTextComponent } from "WorkItemTracking/Scripts/Form/React/Components/LeftTruncatedTextComponent";
import { JQueryWrapperComponent } from "WorkItemTracking/Scripts/Form/React/Components/JQueryWrapperComponent";
import * as WitFormMode from "WorkItemTracking/Scripts/Utils/WitControlMode";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import WITHelpers = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers");
import Controls = require("VSS/Controls");

export const FieldControlPreview: IWorkItemControlPreview = {
    canPreview: (workItemType: WITOM.WorkItemType, fieldRefName: string, workItem?: WITOM.WorkItem): boolean => {
        const fieldDefinition = workItemType.getFieldDefinition(fieldRefName);

        if (!fieldDefinition) {
            return false;
        }

        if (WITOM.isIdentityPickerSupportedForField(fieldDefinition)) {
            return true;
        }

        if (fieldDefinition.type === WITConstants.FieldType.Boolean) {
            return false;
        }

        if (fieldDefinition.type === WITConstants.FieldType.TreePath) {
            return true;
        }

        return true;
    },
    getPreview: (workItemType: WITOM.WorkItemType, workItem: WITOM.WorkItem, options: IWorkItemControlOptions): JSX.Element => {
        const fieldRefName = options.fieldName;
        const fieldDefinition = workItemType.getFieldDefinition(fieldRefName);

        if (!fieldDefinition) {
            Diag.Debug.fail("fieldDefinition must not be null when getting a preview value!");
            return <div />;
        }

        const field = workItem ? workItem.getField(fieldRefName) : null;

        if (field && WITOM.isIdentityPickerSupportedForField(fieldDefinition)) {
            const enableAad = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(
                ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingAADSupport);

            let $container = $("<div></div>");
            if (WITHelpers.WITIdentityControlHelpers.getIdentityDisplayControl(field.getValue(), $container, enableAad)) {
                return <JQueryWrapperComponent element={$container} />;
            }

            // fall thru to get default behavior of a text field.
        }

        const fieldValue: string = field ? field.getDisplayText() : "";
        let content: string | JSX.Element | JSX.Element[];

        // TreePath with truncation
        if (field && field.fieldDefinition && field.fieldDefinition.type === WITConstants.FieldType.TreePath) {
            content = <LeftTruncatedTextComponent text={fieldValue} />;
        }

        // System.State with color circle
        if (workItem && fieldRefName === WITConstants.CoreFieldRefNames.State) {
            const { backgroundColor, borderColor } = WITHelpers.WITStateCircleColors.getStateColors(workItem.getState(), workItemType);

            content = [<span key="circle" className="state-circle" style={{
                backgroundColor,
                borderColor
            }}></span>, <span key="text">{fieldValue}</span>];
        }

        // Default, text preview
        if (!content) {
            content = fieldValue;
        }

        const classes: string = getControlClasses("field-control-combo-preview", field, options);
        return <div className={classes}>
            <div className="field-control-combo-preview-value">
                {content}
            </div>
        </div>;
    }
};
