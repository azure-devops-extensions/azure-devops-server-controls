import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkItemTracking/Form/Mobile/Components/WorkItemStateComponent";

import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";
import { WITStateCircleColors } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers";
import { WorkItemControlComponent, IWorkItemControlProps } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemControlComponent";
import { WorkItemFieldComponent, IFieldValueItem } from "WorkItemTracking/Scripts/Form/Mobile/Components/WorkItemFieldComponent";
import { PartialHighlightComponent } from "VSSPreview/Controls/PartialHighlightComponent";

export interface IWorkItemStateComponentProps extends IWorkItemControlProps {
}

export class WorkItemStateComponent extends WorkItemControlComponent<IWorkItemStateComponentProps, {}> {
    public render() {
        return <WorkItemFieldComponent
            {...this.props}
            onRenderItem={this._onRenderItem}
        />;
    }

    @autobind
    private _onRenderItem(item: IFieldValueItem, filter?: string) {
        const { backgroundColor, borderColor } = WITStateCircleColors.getStateColors(item.value, this._formContext.workItemType);

        return <span>
            <span className="state-circle" style={{
                backgroundColor: backgroundColor,
                borderColor: borderColor
            }} />
            <PartialHighlightComponent text={item.value} highlight={filter} />
        </span>;
    };
}
