import { Field } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";


/**
 * Given a base css class name, adds 'readonly' and/or 'invalid' to the returned string based on the field
 * state and control options.
 */
export function getControlClasses(baseClass: string, field: Field, options?: IWorkItemControlOptions): string {
    var classes = baseClass;

    if (field) {
        if (!field.isValid()) {
            classes += " invalid";
        }

        if (field.isReadOnly() || (options && options.readOnly === "True")) {
            classes += " readonly";
        }
    }

    return classes;
}