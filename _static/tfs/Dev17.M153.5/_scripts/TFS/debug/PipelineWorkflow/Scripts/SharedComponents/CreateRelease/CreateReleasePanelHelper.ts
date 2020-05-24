import * as React from "react";
import * as ReactDOM from "react-dom";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ProcessVariablesV2Store } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";

import { ProgressIndicatorStore } from "PipelineWorkflow/Scripts/Common/Stores/ProgressIndicatorStore";
import { PipelineDefinitionEnvironment, PipelineRelease, PipelineEnvironment, PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListStore";
import { CreateReleasePanelInstances } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";
import {
    CreateReleaseActionsCreator,
} from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseActionsCreator";
import { CreateReleasePanel } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleasePanel";
import {
    CreateReleaseStore,
    ICreateReleaseStoreArgs,
} from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/CreateReleaseStore";

import * as Utils_String from "VSS/Utils/String";
import * as VSSContext from "VSS/Context";

import { registerLWPComponent } from "VSS/LWP";

import RMContracts = require("ReleaseManagement/Core/Contracts");

export interface ICreateReleaseOptions {
    definitionId?: number;
    onQueueRelease?: (pipelineRelease: PipelineRelease, projectName?: string) => void;
    startReleaseMode?: boolean;
    releaseId?: number;
    onClose?: () => void;
    linkedProjects?: RMContracts.ProjectReference[];
    buildDefinitionId?: string;
    buildId?: string;
}

export class CreateReleasePanelHelper<T extends PipelineDefinition | PipelineRelease, P extends PipelineDefinitionEnvironment | PipelineEnvironment>  {

    constructor(private _options?: ICreateReleaseOptions) {
    }

    public openCreateReleasePanel(): void {

        this.initializeCreateReleaseStore(CreateReleasePanelInstances.CreateReleasePanelInstanceId);

        this._createReleasePanelContainer = document.createElement("div");
        document.body.appendChild(this._createReleasePanelContainer);

        let component = React.createElement(
            CreateReleasePanel,
            {
                hasCloseButton: true,
                onClose: () => { this._onCreateReleasePanelClose(CreateReleasePanelInstances.CreateReleasePanelInstanceId); },
                createReleaseStore: this._createReleaseStore,
                progressStore: this._createReleaseProgressIndicatorStore,
                environmentListStore: this._createReleaseEnvironmentListStore,
                variablesListStore: this._createReleaseVariablesStore,
                onQueueRelease: this._onCreateRelease,
                startReleaseMode: !!this._options.startReleaseMode,
                buildDefinitionId: this._options.buildDefinitionId
            });
        ReactDOM.render(component, this._createReleasePanelContainer);
    }

    public initializeCreateReleaseStore(instanceId?: string): void {
        this._createReleaseStore = StoreManager.CreateStore<CreateReleaseStore<T, P>, ICreateReleaseStoreArgs>(
            CreateReleaseStore,
            instanceId,
            {
                showDialog: true,
                linkedProjects: this._options.linkedProjects,
                buildId: this._options.buildId,
                buildSource: Utils_String.format("{0}:{1}", VSSContext.getDefaultWebContext().project.id, this._options.buildDefinitionId)
            });

        // Initialize required stores
        this._createReleaseProgressIndicatorStore = StoreManager.GetStore<ProgressIndicatorStore>(ProgressIndicatorStore, instanceId);
        this._createReleaseEnvironmentListStore = StoreManager.GetStore<EnvironmentListStore<P>>(EnvironmentListStore, instanceId);
        this._createReleaseVariablesStore = StoreManager.GetStore<ProcessVariablesV2Store>(ProcessVariablesV2Store, instanceId);

        this._createReleaseActionCreator = ActionCreatorManager.GetActionCreator<CreateReleaseActionsCreator<T, P>>(CreateReleaseActionsCreator, instanceId);

        // Initialize data for create release.
        let id: number = this._options.startReleaseMode ? this._options.releaseId : this._options.definitionId;
        this._createReleaseActionCreator.initializeData(id, instanceId, instanceId, this._options.startReleaseMode, !!this._options.linkedProjects && this._options.linkedProjects.length > 0 ? this._options.linkedProjects[0] : null, this._options.buildDefinitionId);
    }

    public getCreateReleaseStore(): CreateReleaseStore<T, P> {
        return this._createReleaseStore;
    }

    public getCreateReleaseActionCreator(): CreateReleaseActionsCreator<T, P> {
        return this._createReleaseActionCreator;
    }

    private _onCreateReleasePanelClose = (instanceId: string): void => {
        ReactDOM.unmountComponentAtNode(this._createReleasePanelContainer);
        this._createReleasePanelContainer.remove();
        StoreManager.DeleteStore<CreateReleaseStore<T, P>>(CreateReleaseStore, instanceId);
        StoreManager.DeleteStore<ProgressIndicatorStore>(ProgressIndicatorStore, instanceId);
        StoreManager.DeleteStore<EnvironmentListStore<P>>(EnvironmentListStore, instanceId);

        if (this._options.onClose) {
            this._options.onClose();
        }
    }

    private _onCreateRelease = (pipelineRelease: PipelineRelease, projectName?: string): void => {
        if (this._options.onQueueRelease) {
            this._options.onQueueRelease(pipelineRelease, projectName);
        }
    }

    private _createReleaseStore: CreateReleaseStore<T, P>;
    private _createReleaseProgressIndicatorStore: ProgressIndicatorStore;
    private _createReleaseEnvironmentListStore: EnvironmentListStore<P>;
    private _createReleaseVariablesStore: ProcessVariablesV2Store;
    private _createReleaseActionCreator: CreateReleaseActionsCreator<T, P>;
    private _createReleasePanelContainer: HTMLElement;
}

class CreateReleasePanelProxy extends React.Component<ICreateReleaseOptions, {}>{
    public render(): React.ReactNode {
        return "";
    }

    public componentDidMount(): void {
        const helper = new CreateReleasePanelHelper(this.props);
        helper.openCreateReleasePanel();
    }
}

registerLWPComponent("createReleasePanelProxy", CreateReleasePanelProxy);