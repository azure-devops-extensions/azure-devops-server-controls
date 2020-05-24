/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { PlanGroupsListActionsCreator } from "DistributedTaskControls/PlanGroupsQueue/Actions/PlanGroupsListActionsCreator";
import { PlanGroupsListStore } from "DistributedTaskControls/PlanGroupsQueue/Stores/PlanGroupsListStore";
import * as PlanGroupsTypes from "DistributedTaskControls/PlanGroupsQueue/Types";
import { SafeLink } from "DistributedTaskControls/Components/SafeLink";

import { ConstrainMode, DetailsList, DetailsListLayoutMode, IColumn } from "OfficeFabric/DetailsList";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { CheckboxVisibility } from "OfficeFabric/DetailsList";
import { Label } from "OfficeFabric/Label";

import { PlanGroupStatus } from "TFS/DistributedTask/Contracts";

import * as StringUtils from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/PlanGroupsQueue/Styles";

export class PlanGroupsList extends Base.Component<PlanGroupsTypes.IPlanGroupsListProps, PlanGroupsTypes.IPlanGroupsListState> {
    constructor(props: PlanGroupsTypes.IPlanGroupsListProps) {
        super(props);

        this._store = StoreManager.CreateStore<PlanGroupsListStore, PlanGroupsTypes.IPlanGroupsListState>(PlanGroupsListStore, this.props.instanceId, {
            ...this.props,
            planGroupItems: []
        });

        this._actionsCreator = ActionCreatorManager.CreateActionCreator<PlanGroupsListActionsCreator, PlanGroupsTypes.IPlanGroupsListProps>(
            PlanGroupsListActionsCreator,
            this.props.instanceId,
            {
                ...this._store.getState()
            } as PlanGroupsTypes.IPlanGroupsListProps);
    }

    public componentWillMount() {
        this._store = StoreManager.GetStore<PlanGroupsListStore>(PlanGroupsListStore, this.props.instanceId);
        this._actionsCreator = ActionCreatorManager.GetActionCreator<PlanGroupsListActionsCreator>(PlanGroupsListActionsCreator, this.props.instanceId);
        this._store.addChangedListener(this._handleStoreChange);
        this.setState(this._store.getState());
    }

    public componentWillUnmount() {
        this._store.removeChangedListener(this._handleStoreChange);
        ActionCreatorManager.DeleteActionCreator<PlanGroupsListActionsCreator>(PlanGroupsListActionsCreator, this.props.instanceId);
        StoreManager.DeleteStore<PlanGroupsListStore>(PlanGroupsListStore, this.props.instanceId);
    }

    public render(): JSX.Element {
        return (
            <div>

                {
                    !!this.state.errorMessage &&
                    <MessageBar
                        className="message-bar"
                        onDismiss={this._onErrorBarDismiss}
                        messageBarType={MessageBarType.error}
                        dismissButtonAriaLabel={Resources.CloseButtonText}>
                        {this.state.errorMessage}
                    </MessageBar>
                }

                <Label className="list-description-header">
                    {this.state.rightPanelHeaderDetailsText}
                </Label>

                {
                    (!!this.state.planGroupItems && this.state.planGroupItems.length >= 0) &&
                    <DetailsList
                        setKey="set"
                        className="plan-groups-list"
                        layoutMode={DetailsListLayoutMode.fixedColumns}
                        constrainMode={ConstrainMode.unconstrained}
                        data-is-scrollable={true}
                        items={(!!this.state.planGroupItems && this.state.planGroupItems.length >= 0) ? this.state.planGroupItems : []}
                        columns={PlanGroupsListColumnsHelper.getColumnList(this.state.status)}
                        onRenderItemColumn={this._renderColumnCell}
                        isHeaderVisible={true}
                        checkboxVisibility={CheckboxVisibility.hidden} />
                }
            </div>
        );
    }

    private _renderColumnCell(item: PlanGroupsTypes.IQueuedPlanGroupItem, index: number, column: any) {
        if (item.queuePosition == null || item.project == null) {
            return StringUtils.empty;
        }

        switch (column.key) {
            case PlanGroupsListColumnsHelper.columnKeys.name:
                return (
                    <SafeLink href={item.owner._links.web.href} target="_blank">{item.owner.name}</SafeLink>
                );

            case PlanGroupsListColumnsHelper.columnKeys.definition:
                return (
                    <SafeLink href={item.definition._links.web.href} target="_blank">{item.definition.name}</SafeLink>
                );

            case PlanGroupsListColumnsHelper.columnKeys.project:
                return item.project.name;

            case PlanGroupsListColumnsHelper.columnKeys.position:
                return item.queuePosition || StringUtils.empty;

            case PlanGroupsListColumnsHelper.columnKeys.queued:
                return item.queueTimeText || StringUtils.empty;

            case PlanGroupsListColumnsHelper.columnKeys.started:
                return item.startedTimeText || StringUtils.empty;

            case PlanGroupsListColumnsHelper.columnKeys.duration:
                return item.durationText || StringUtils.empty;

            default:
                return StringUtils.empty;
        }
    }

    private _handleStoreChange = (): void => {
        this.setState(this._store.getState());
    }

    private _onErrorBarDismiss = (): void => {
        this._actionsCreator.dismissErrorMessage();
    }

    private _store: PlanGroupsListStore;
    private _actionsCreator: PlanGroupsListActionsCreator;
}

// Only used in PlanGroupsList class, so not exporting the same.
class PlanGroupsListColumnsHelper {
    columns: IColumn[];

    public static getColumnList(status: PlanGroupStatus): IColumn[] {
        switch (status) {
            case PlanGroupStatus.Queued:
                if (!PlanGroupsListColumnsHelper._inQueueFullColumnList) {
                    PlanGroupsListColumnsHelper._inQueueFullColumnList = PlanGroupsListColumnsHelper._commonColumnList.map((column) => { return column; });
                    PlanGroupsListColumnsHelper._inQueueColumnList.map((column) => { PlanGroupsListColumnsHelper._inQueueFullColumnList.push(column); });
                }

                return PlanGroupsListColumnsHelper._inQueueFullColumnList;

            case PlanGroupStatus.Running:
                if (!PlanGroupsListColumnsHelper._inProgressFullColumnList) {
                    PlanGroupsListColumnsHelper._inProgressFullColumnList = PlanGroupsListColumnsHelper._commonColumnList.map((column) => { return column; });
                    PlanGroupsListColumnsHelper._inProgressColumnList.map((column) => { PlanGroupsListColumnsHelper._inProgressFullColumnList.push(column); });
                }

                return PlanGroupsListColumnsHelper._inProgressFullColumnList;

            default:
                return [];
        }
    }

    public static columnKeys: any = { name: "name", definition: "definition", project: "project", position: "position", queued: "queued", started: "started", duration: "duration" };

    private static _inProgressColumnList: IColumn[] = [
        {
            key: PlanGroupsListColumnsHelper.columnKeys.started,
            name: Resources.PlanStartedText,
            fieldName: Resources.PlanStartedText,
            isResizable: true,
            minWidth: 100
        },
        {
            key: PlanGroupsListColumnsHelper.columnKeys.duration,
            name: Resources.PlanDurationInQueueText,
            fieldName: Resources.PlanDurationInQueueText,
            isResizable: true,
            minWidth: 100
        }
    ];
    private static _inQueueColumnList: IColumn[] = [
        {
            key: PlanGroupsListColumnsHelper.columnKeys.queued,
            name: Resources.QueuedStatusLabel,
            fieldName: Resources.QueuedStatusLabel,
            isResizable: true,
            minWidth: 100
        },
        {
            key: PlanGroupsListColumnsHelper.columnKeys.position,
            name: Resources.QueuePositionLabel,
            fieldName: Resources.QueuePositionLabel,
            isResizable: true,
            minWidth: 50
        }
    ];
    private static _commonColumnList: IColumn[] = [
        {
            key: PlanGroupsListColumnsHelper.columnKeys.name,
            name: Resources.NameLabel,
            fieldName: Resources.NameLabel,
            isResizable: true,
            minWidth: 120
        },
        {
            key: PlanGroupsListColumnsHelper.columnKeys.definition,
            name: Resources.DefinitionLabel,
            fieldName: Resources.DefinitionLabel,
            isResizable: true,
            minWidth: 100
        },
        {
            key: PlanGroupsListColumnsHelper.columnKeys.project,
            name: Resources.ProjectLabel,
            fieldName: Resources.ProjectLabel,
            isResizable: true,
            minWidth: 90
        }
    ];

    private static _inProgressFullColumnList: IColumn[];
    private static _inQueueFullColumnList: IColumn[];
}