import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/React/Components/BooleanFieldComponent";

import * as React from "react";
import { Toggle } from "OfficeFabric/Toggle";
import { autobind } from "OfficeFabric/Utilities";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { IWorkItemControlProps } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemControlComponent";

export class BooleanFieldComponent extends WorkItemBindableComponent<IWorkItemControlProps, void> {
    
    public render(): JSX.Element {
        if (this._formContext && this._formContext.workItem) {
            const field = this._formContext.workItem.getField(this.props.controlOptions.fieldName);
            const fieldValue = field.getValue();
            const isDisabled = field.isReadOnly() || !field.isEditable();

            return <Toggle
                className="toggle-control"
                checked={fieldValue}
                disabled={isDisabled}
                onChanged={this._onChanged}
                onText={WorkItemTrackingResources.BooleanFieldTrueValue}
                offText={WorkItemTrackingResources.BooleanFieldFalseValue}
                />;
        }

        return null;
    }

    @autobind
    private _onChanged(checked: boolean) {
        this._formContext.workItem.setFieldValue(this.props.controlOptions.fieldName, checked);
    }
}
