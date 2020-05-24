import * as React from "react";

import { GetSourcesItem } from "CIWorkflow/Scripts/Scenarios/Definition/Components/GetSources";
import { ProcessItem } from "CIWorkflow/Scripts/Scenarios/Definition/Components/ProcessItem";
import { TasksTabStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TasksTabStore";

import * as DtcCommon from "DistributedTaskControls/Common/Common";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Item } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ITabItemProps } from "DistributedTaskControls/Common/Types";
import { DeployPhaseList, IDeployPhaseListItemDetails } from "DistributedTaskControls/Phase/DeployPhaseList";
import { TasksTabSharedView } from "DistributedTaskControls/SharedViews/ContainerTabs/TaskTab/TaskTabSharedView";

import { autobind } from "OfficeFabric/Utilities";

import { BuildDefinition } from "TFS/Build/Contracts";

export class TasksTabControllerView extends Base.Component<ITasksTabControllerViewProps, ITasksTabControllerViewState> {

    private _tasksTabStore: TasksTabStore;

    constructor(props: ITasksTabControllerViewProps) {
        super(props);
        this._tasksTabStore = StoreManager.GetStore<TasksTabStore>(TasksTabStore, DtcCommon.TaskListStoreInstanceId);
        this.state = this._getState();
    }

    public componentDidMount(): void {
        this._tasksTabStore.addChangedListener(this._tasksTabStoreChanged);
    }

    public componentWillUnmount(): void {
        this._tasksTabStore.removeChangedListener(this._tasksTabStoreChanged);
    }

    public render(): JSX.Element {
        let instanceId: string = DtcCommon.TaskListStoreInstanceId;

        return <TasksTabSharedView
                    key={instanceId}
                    itemSelectionInstanceId={instanceId}
                    items={this.state.items} />;
    }

    @autobind
    private _tasksTabStoreChanged(): void {
        this.setState(this._getState());
    }

    private _getState(): ITasksTabControllerViewState {
        return {
            items: this._getItems()
        };
    }

    private _getItems(): Item[] {
        const phaseListStore = this._tasksTabStore.getPhaseListStore();
        const isYaml = this._tasksTabStore.isYaml();

        const processItem = new ProcessItem(DtcCommon.TaskListStoreInstanceId, false, isYaml, 1, 0);
        const sourcesItem = new GetSourcesItem(false, 2, 0,
            () => {
                return (1 + phaseListStore.getPhaseCount());
            });

        const phaseList = new DeployPhaseList({
            store: phaseListStore,
            itemToSelectAfterDelete: processItem,
            treeLevel: 2,
            initialIndex: 1,
            minJobCancelTimeout: 0,
            showJobCancelTimeoutForServerPhase: true
        } as IDeployPhaseListItemDetails);

        let items: Item[] = [
            processItem,
            sourcesItem
        ];

        if (!isYaml) {
            items.push(phaseList);
        }

        return items;
    }
}

export interface ITasksTabControllerViewState extends Base.IState {
    items: Item[];
}

export interface ITasksTabControllerViewProps extends ITabItemProps {
    definition: BuildDefinition;
    isReadOnly: boolean;
}