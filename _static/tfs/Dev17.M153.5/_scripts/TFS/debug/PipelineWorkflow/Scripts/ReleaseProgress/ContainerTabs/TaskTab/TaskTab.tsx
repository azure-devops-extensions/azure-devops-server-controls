import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { DeployPhaseList, IDeployPhaseListItemDetails } from "DistributedTaskControls/Phase/DeployPhaseList";
import { TasksTabSharedView } from "DistributedTaskControls/SharedViews/ContainerTabs/TaskTab/TaskTabSharedView";

import { ITaskTabViewState, TaskTabViewStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/TaskTab/TaskTabViewStore";
import { ReleaseEnvironmentStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentStore";
import { ProcessItem } from "PipelineWorkflow/Scripts/Shared/Process/ProcessItem";
import { ReleaseDeployPhaseHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseDeployPhaseHelper";

import { autobind } from "OfficeFabric/Utilities";

export class TaskTab extends Base.Component<Base.IProps, ITaskTabViewState> {

    constructor(props: Base.IProps) {
        super(props);
        this._taskTabViewStore = StoreManager.GetStore<TaskTabViewStore>(TaskTabViewStore);
        this._taskTabViewStore.addChangedListener(this._handleViewStoreChanged);
        this.state = this._taskTabViewStore.getState();
    }

    public componentWillUnmount(): void {
        this._taskTabViewStore.removeChangedListener(this._handleViewStoreChanged);
    }

    public render(): JSX.Element {
        if (this.state.canShowTasks) {
            return <TasksTabSharedView
                    key={this.props.instanceId}
                    itemSelectionInstanceId={this.props.instanceId}
                    items={this._getDefaultItems()} />;
        }
        else {
            return <LoadingComponent />;
        }
    }

    @autobind
    private _handleViewStoreChanged(): void {
        this.setState(
            this._taskTabViewStore.getState()
        );
    }

    private _getDefaultItems(): Item[] {
        const environmentStore = StoreManager.GetStore<ReleaseEnvironmentStore>(ReleaseEnvironmentStore, this.props.instanceId);

        //TODO: handle artifact picker
        const deployProcessItem = new ProcessItem(this.props.instanceId, environmentStore.getEnvironment().name, environmentStore, 1, 0);
        const deployPhaseList = new DeployPhaseList({
            store: environmentStore.getPhaseListStore(),
            itemToSelectAfterDelete: deployProcessItem,
            treeLevel: 2,
            initialIndex: 0,
            createItemDelegateMap: ReleaseDeployPhaseHelper.getCreateItemDelegateMap()
        } as IDeployPhaseListItemDetails);
        return [deployProcessItem, deployPhaseList];
    }

    private _taskTabViewStore: TaskTabViewStore;
}


