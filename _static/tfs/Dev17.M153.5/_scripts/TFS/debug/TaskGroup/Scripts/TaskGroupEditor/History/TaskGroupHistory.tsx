import * as React from "react";
import * as ReactDOM from "react-dom";

import { IColumn, ColumnActionsMode } from "OfficeFabric/DetailsList";

import { DiffEditor } from "CodeEditor/Components/DiffEditor";

import { Component, IProps } from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { History } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/History";
import { IRevisionsDiffData } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActions";
import { Component as InformationBar } from "DistributedTaskControls/Components/InformationBar";

import { TabContentContainer } from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabContentContainer";
import { TaskGroupHistorySource } from "TaskGroup/Scripts/TaskGroupEditor/History/TaskGroupHistorySource";
import { TaskGroupHistoryViewStore, ITaskGroupHistoryViewState } from "TaskGroup/Scripts/TaskGroupEditor/History/TaskGroupHistoryViewStore";
import { TabInstanceIds, TaskGroupRevisionsListColumnKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

import "VSS/LoaderPlugins/Css!TaskGroup/Scripts/TaskGroupEditor/History/TaskGroupHistory";

export interface ITaskGroupHistoryProps extends IProps {
    taskGroupId: string;
    fromExtension: boolean;
}

export class TaskGroupHistory extends Component<ITaskGroupHistoryProps, ITaskGroupHistoryViewState>{
    constructor(props: ITaskGroupHistoryProps) {
        super(props);
        this._taskGroupHistoryStore = StoreManager.GetStore<TaskGroupHistoryViewStore>(TaskGroupHistoryViewStore, props.instanceId);
    }

    public render() {

        const { revisionsDiffData = {} as IRevisionsDiffData } = this.state;

        return (
            <TabContentContainer
                cssClass={"task-group-history"}
                fromExtension={this.props.fromExtension}
                tabInstanceId={TabInstanceIds.History}>

                <History
                    definitionId={this.props.taskGroupId}
                    sourceInstance={TaskGroupHistorySource.instance()}
                    isRevertSupported={false}
                    isRevertToRevisionAllowed={() => false}
                    displayHistory={this.state.displayHistory}
                    revisions={this.state.revisions}
                    additionalColumns={this._getAdditionalColumns()}
                    useNewDiffEditor={true}
                    revisionsDiffData={revisionsDiffData}
                />
            </TabContentContainer>
        );
    }

    public componentWillMount(): void {
        this.setState(this._taskGroupHistoryStore.getState());
        this._taskGroupHistoryStore.addChangedListener(this._onStoreChange);
    }

    public componentWillUnmount(): void {
        this._taskGroupHistoryStore.removeChangedListener(this._onStoreChange);
    }

    private _onStoreChange = () => {
        this.setState(this._taskGroupHistoryStore.getState());
    }

    private _getAdditionalColumns(): IColumn[] {
        return [
            {
                name: Resources.TaskGroupHistoryVersionColumnHeader,
                key: TaskGroupRevisionsListColumnKeys.Version,
                minWidth: 200,
                maxWidth: 300,
                fieldName: "version",
                columnActionsMode: ColumnActionsMode.disabled,
                isResizable: true
            }
        ];
    }

    private _taskGroupHistoryStore: TaskGroupHistoryViewStore;
}