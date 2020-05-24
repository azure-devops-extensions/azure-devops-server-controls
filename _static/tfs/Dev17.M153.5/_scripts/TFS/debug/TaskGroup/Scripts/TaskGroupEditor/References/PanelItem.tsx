import * as React from "react";

import { ITaskGroupReferenceGroup } from "DistributedTask/TaskGroups/ExtensionContracts";

import { Item } from "DistributedTaskControls/Common/Item";

import { PanelItemDetails } from "TaskGroup/Scripts/TaskGroupEditor/References/PanelItemDetails";
import { PanelItemOverview } from "TaskGroup/Scripts/TaskGroupEditor/References/PanelItemOverview";

export class PanelItem implements Item {

    constructor(id: number | string, referenceGroup: ITaskGroupReferenceGroup) {
        this._id = id;
        this._referenceGroup = referenceGroup;
    }

    public getOverview(instanceId?: string): JSX.Element {

        if (!this._overview) {
            this._overview = (
                <PanelItemOverview
                    item={this}
                    instanceId={instanceId}
                    title={this._referenceGroup.displayName}
                    iconCss={this._referenceGroup.referenceIcon}
                />);
        }

        return this._overview;
    }

    public getDetails(instanceId?: string): JSX.Element {

        if (!this._details) {
            this._details = (
                <PanelItemDetails
                    referenceGroup={this._referenceGroup}
                />);
        }

        return this._details;
    }

    public getKey(): string {
        return "task-group-references-panel-item-" + this._id;
    }

    private _id: number | string;
    private _referenceGroup: ITaskGroupReferenceGroup;
    private _overview: JSX.Element;
    private _details: JSX.Element;
}