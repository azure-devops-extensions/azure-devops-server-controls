import * as React from "react";
import * as Diag from "VSS/Diag";
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { IWorkItemControlPreview } from "WorkItemTracking/Scripts/ControlRegistration";
import { getControlClasses } from "WorkItemTracking/Scripts/Form/ControlUtils";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Controls = require("VSS/Controls");

export const DateTimeFieldControlPreview: IWorkItemControlPreview = {
    canPreview: (workItemType: WITOM.WorkItemType, fieldRefName: string, workItem?: WITOM.WorkItem): boolean => {
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
        const fieldValue: string = field ? field.getDisplayText() : "";
        let content: string | JSX.Element;

        // DateTime field type
        if (field && field.fieldDefinition && field.fieldDefinition.type === WITConstants.FieldType.DateTime) {
            content = <span key="text">{fieldValue}</span>;
        }
        else {
            Diag.Debug.fail("DateTimeFieldControlPreview control should be used for DateTime field type!");
            content = fieldValue;
        }

        const classes: string = getControlClasses("field-control-combo-preview", field, options);
        return <div className={classes}>
            <div className="field-control-combo-preview-value date-time-field-preview">
                {content}
            </div>
        </div>;
    }
};
