/// <reference types="react" />

import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ITaskTabBaseProps, TaskTabBase } from "DistributedTaskControls/SharedViews/ContainerTabs/TaskTab/TaskTabBase";
import { TasksTabSharedView } from "DistributedTaskControls/SharedViews/ContainerTabs/TaskTab/TaskTabSharedView";
import { PermissionIndicatorSource } from "DistributedTaskControls/Common/Telemetry";

import { TaskTabStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/TaskTab/TaskTabStore";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { PermissionIndicator } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionIndicator";
import { ReleaseManagementSecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";

export interface ITaskTabProps extends ITaskTabBaseProps {
    releaseDefinitionFolderPath?: string;

    releaseDefinitionId?: number;
}

export class TaskTab extends TaskTabBase<ITaskTabProps> {

    constructor(props: ITaskTabBaseProps) {
        super(props);
        this._taskTabStore = StoreManager.GetStore<TaskTabStore>(TaskTabStore);
    }

    public componentWillMount(): void {
        this._taskTabStore.addChangedListener(this._handleTaskTabStoreChange);
        this._setState();
    }

    public componentWillUnmount(): void {
        this._taskTabStore.removeChangedListener(this._handleTaskTabStoreChange);
    }

    public render(): JSX.Element {
        let selectedEnvironmentStore: DeployEnvironmentStore = this._taskTabStore.getSelectedEnvironmentStore();
        const noEnvironmentContainer = (
            <div className="task-tab-no-env">
                <MessageBar
                    className="no-environment-infobar"
                    messageBarType={MessageBarType.info} >
                    {Resources.NoEnvironmentsText}
                </MessageBar>
            </div>);

        return (!!selectedEnvironmentStore) ? this._getEnvironmentContent(selectedEnvironmentStore.getInstanceId(), selectedEnvironmentStore.getEnvironmentId()) : noEnvironmentContainer;
    }

    protected getDefaultItems(environmentInstanceId: string): Item[] {
        return this._taskTabStore.getItemList(environmentInstanceId);
    }

    private _getEnvironmentContent(instanceId: string, environmentId: number): JSX.Element {
        return (
            <PermissionIndicator
                securityProps={PermissionHelper.createEditEnvironmentSecurityProps(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId, environmentId)}
                overridingSecurityProps={PermissionHelper.createEditEnvironmentOverrideSecurityProps(this.props.releaseDefinitionFolderPath, this.props.releaseDefinitionId)}
                key={instanceId}
                message={Resources.EditEnvironmentPermissionMessage}
                telemetrySource={PermissionIndicatorSource.tasksTab}>

                <TasksTabSharedView
                    key={instanceId}
                    itemSelectionInstanceId={instanceId}
                    items={this.state.defaultItems} />

            </PermissionIndicator>);
    }

    private _handleTaskTabStoreChange = () => {
        this._setState();
    }

    private _setState = () => {
        let selectedEnvironmentStore = this._taskTabStore.getSelectedEnvironmentStore();
        if (!!selectedEnvironmentStore){
            this.setState({
                defaultItems: this.getDefaultItems(this._taskTabStore.getSelectedEnvironmentStore().getInstanceId())
            });
        }else {
            this.setState({
                defaultItems: []
            });
        }
    }

    private _taskTabStore: TaskTabStore;
}


