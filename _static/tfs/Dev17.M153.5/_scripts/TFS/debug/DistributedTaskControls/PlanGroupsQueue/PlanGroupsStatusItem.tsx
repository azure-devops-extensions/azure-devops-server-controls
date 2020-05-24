/// <reference types="react" />

import * as React from "react";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item, ItemOverviewAriaProps, ItemOverviewProps } from "DistributedTaskControls/Common/Item";
import { Selectable } from "DistributedTaskControls/Components/Selectable";

import { PlanGroupsList } from "DistributedTaskControls/PlanGroupsQueue/PlanGroupsList";
import { PlanGroupsListActionsCreator } from "DistributedTaskControls/PlanGroupsQueue/Actions/PlanGroupsListActionsCreator";
import * as PlanGroupsTypes from "DistributedTaskControls/PlanGroupsQueue/Types";

import { Label } from "OfficeFabric/Label";

import { PlanGroupStatus } from "TFS/DistributedTask/Contracts";

import * as StringUtils from "VSS/Utils/String";

export class PlanGroupsStatusItem implements Item {

    public static computeItemKey(parentName: string, status: PlanGroupStatus): string {
        return `${parentName || StringUtils.empty}.${status == null ? PlanGroupStatus.All.toString() : status.toString()}`.replace(" ", "");
    }

    constructor(props: PlanGroupsTypes.IPlanGroupsStatusItemProps) {
        this._props = { ...props };
        this._props.parentHubName = props.parentHubName || props.displayText;
    }

    public getOverview(instanceId?: string): JSX.Element {

        if (!this._overView) {
            let view: JSX.Element;
            if (!!this._props && !!this._props.isHeader) {
                view = (
                    <Label className="hub-header">{this._props.displayText}</Label>
                );
            }
            else {
                view = (
                    <Selectable
                        item={this}
                        canParticipateInMultiSelect={false}
                        instanceId={this._props.instanceId}
                        isDraggable={false}
                        ariaProps={{
                            role: "tab"
                        } as ItemOverviewAriaProps}>
                        <Label className="queue-status">{this._props.displayText}</Label>
                    </Selectable>
                );
            }

            this._overView = view;
        }

        return this._overView;
    }

    public getDetails(instanceId?: string): JSX.Element {

        let props: PlanGroupsTypes.IPlanGroupsListProps = { ...this._props, hubName: this._props.parentHubName, instanceId: this._props.instanceId };
        if (!this._details) {
            this._details = (
                <PlanGroupsList {...props} key={props.instanceId} />
            );
        }

        // is creator at right place?
        if (!this._listActionsCreators) {
            this._listActionsCreators = ActionCreatorManager.CreateActionCreator<PlanGroupsListActionsCreator, PlanGroupsTypes.IPlanGroupsListProps>(
                PlanGroupsListActionsCreator,
                props.instanceId,
                { ...props });
        }

        this._listActionsCreators.updatePlanGroupsList(props);

        return this._details;
    }

    public getKey(): string {
        return PlanGroupsStatusItem.computeItemKey(this._props.parentHubName || this._props.displayText, this._props.status);
    }

    private _overView: JSX.Element;
    private _details: JSX.Element;

    private _props: PlanGroupsTypes.IPlanGroupsStatusItemProps;
    private _listActionsCreators: PlanGroupsListActionsCreator;
}
