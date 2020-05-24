import * as React from "react";

import { localeFormat as localeStringFormat } from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";

import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { Item } from "DistributedTaskControls/Common/Item";

import { CommandButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost } from "VSSUI/Tooltip";

import { TaskGroupPropertiesItemStore, ITaskGroupPropertiesItemState } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemStore";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/TaskGroupEditor/Tasks/TaskGroupProperties/TaskGroupPropertiesItemOverview";

export interface ITaskGroupPropertiesItemOverviewProps extends IProps {
    item: Item;
    addTaskItem: Item;
    iconCss?: string;
}

export class TaskGroupPropertiesItemOverview extends Component<ITaskGroupPropertiesItemOverviewProps, ITaskGroupPropertiesItemState>{
    constructor(props: ITaskGroupPropertiesItemOverviewProps) {
        super(props);
        this._taskGroupPropertiesItemStore = StoreManager.GetStore<TaskGroupPropertiesItemStore>(TaskGroupPropertiesItemStore, props.instanceId);
        this._itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions, props.instanceId);
    }

    public render(): JSX.Element {
        return (
            <div className="overview-container">
                <TwoPanelOverviewComponent
                    instanceId={this.props.instanceId}
                    cssClass={"task-group-item-overview"}
                    ariaDescription={this.state.name}
                    canParticipateInMultiSelect={false}
                    iconClassName={css("bowtie-icon", this.props.iconCss)}
                    isDraggable={false}
                    item={this.props.item}
                    title={this.state.name}
                    view={this._getOverviewSubView()}
                    overviewClassName={this.props.cssClass}
                    controlSection={this._getControlSection()}
                />
            </div>);
    }

    public componentWillMount(): void {
        this.setState(this._taskGroupPropertiesItemStore.getState());
        this._taskGroupPropertiesItemStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._taskGroupPropertiesItemStore.removeChangedListener(this._onStoreChange);
    }

    private _getOverviewSubView(): JSX.Element {
        return (
            <div>
                {localeStringFormat("{0} {1}", Resources.TaskVersionText, this.state.versionString)}
            </div>
        );
    }

    private _onStoreChange = () => {
        const state = this._taskGroupPropertiesItemStore.getState();
        this.setState(state);
    }

    private _getControlSection(): JSX.Element {
        return (
            <TooltipHost content={Resources.AddTaskButtonText} directionalHint={DirectionalHint.bottomRightEdge}>
                <CommandButton
                    className="add-task-button"
                    iconProps={{ iconName: "Add" }}
                    onClick={this._onAddTaskClick}
                    ariaLabel={Resources.AddTaskButtonText} />
            </TooltipHost>
        );
    }

    private _onAddTaskClick = (): void => {
        this._itemSelectorActions.selectItem.invoke({
            data: this.props.addTaskItem
        });
    }

    private _taskGroupPropertiesItemStore: TaskGroupPropertiesItemStore;
    private _itemSelectorActions: ItemSelectorActions;
}