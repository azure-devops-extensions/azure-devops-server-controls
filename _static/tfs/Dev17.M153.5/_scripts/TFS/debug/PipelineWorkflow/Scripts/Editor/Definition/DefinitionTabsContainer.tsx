/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { StoreBase as Store } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { HistoryStore } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryStore";
import { ContainerTabPanel } from "DistributedTaskControls/SharedControls/TabPanel/ContainerTabPanel";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";

import * as HistoryTabAsync from "PipelineWorkflow/Scripts/Editor/ContainerTabs/HistoryTab/HistoryTab";
import * as RetentionTabAsync from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionTab";
import * as OptionsTabAsync from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/OptionsTab";
import { OptionsTabStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/OptionsTabStore";
import { VariablesTabStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/VariablesTab/VariablesTabStore";
import { RetentionPolicyListStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyListStore";
import * as TaskTabAsync from "PipelineWorkflow/Scripts/Editor/ContainerTabs/TaskTab/TaskTab";
import { TaskTabCustomRenderer } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/TaskTab/TaskTabCustomRenderer";
import { TaskTabStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/TaskTab/TaskTabStore";
import { CanvasTab } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/CanvasTab/CanvasTab";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EditorActions } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { ArtifactsCanvasViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/ArtifactsCanvasViewStore";
import { EnvironmentsCanvasViewStore } from "PipelineWorkflow/Scripts/Editor/Canvas/EnvironmentsCanvasViewStore";
import { EditorVariablesListStore } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/VariablesTab/EditorVariablesListStore";
import * as VariablesTabAsync from "PipelineWorkflow/Scripts/Shared/ContainerTabs/VariablesTab/VariablesTab";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as VSS from "VSS/VSS";
import * as StringUtils from "VSS/Utils/String";
import * as NavigationService from "VSS/Navigation/Services";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import "VSS/LoaderPlugins/Css!RM:PipelineWorkflow/Scripts/Editor/Definition/DefinitionTabsContainer";

const TasksTabItem = getAsyncLoadedComponent<TaskTabAsync.ITaskTabProps>(
    ["PipelineWorkflow/Scripts/Editor/ContainerTabs/TaskTab/TaskTab"],
    (m: typeof TaskTabAsync) => m.TaskTab,
    () => <LoadingComponent className="tab-loading-component" />);

const HistoryTabItem = getAsyncLoadedComponent(
    ["PipelineWorkflow/Scripts/Editor/ContainerTabs/HistoryTab/HistoryTab"],
    (m: typeof HistoryTabAsync) => m.HistoryTab,
    () => <LoadingComponent className="tab-loading-component" />);

const RetentionTabItem = getAsyncLoadedComponent(
    ["PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionTab"],
    (m: typeof RetentionTabAsync) => m.RetentionTab,
    () => <LoadingComponent className="tab-loading-component" />);

const OptionsTabItem = getAsyncLoadedComponent(
    ["PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/OptionsTab"],
    (m: typeof OptionsTabAsync) => m.OptionsTab,
    () => <LoadingComponent className="tab-loading-component" />);

const VariablesTabItem = getAsyncLoadedComponent(
    ["PipelineWorkflow/Scripts/Shared/ContainerTabs/VariablesTab/VariablesTab"],
    (m: typeof VariablesTabAsync) => m.VariablesTab,
    () => <LoadingComponent className="tab-loading-component" />);

export interface IDefinitionTabsContainerProps extends Base.IProps {
    definitionFolderPath?: string;
    definitionId?: number;
    environmentId?: number;
    action?: string;
    onTabChange?: (action: string) => void;
}

export interface IDefinitionTabsContainerState extends Base.IState, IDefinitionTabsContainerProps {
    taskTabIsValid: boolean;
    variablesTabIsValid: boolean;
    retentionTabIsValid: boolean;
    optionsTabIsValid: boolean;
    pipelineTabIsValid: boolean;
}

export class DefinitionTabsContainer extends Base.Component<IDefinitionTabsContainerProps, IDefinitionTabsContainerState> {

    constructor(props: IDefinitionTabsContainerProps) {
        super(props);

        this._prefetchViews();
        this._tabStoreList = [];

        this._tabStoreList.push(this._taskTabStore = StoreManager.GetStore<TaskTabStore>(TaskTabStore));
        this._tabStoreList.push(this._variablesTabStore = StoreManager.GetStore<VariablesTabStore>(VariablesTabStore));

        this._optionsTabStore = StoreManager.GetStore<OptionsTabStore>(OptionsTabStore);
        this._tabStoreList.push(this._optionsTabStore);

        this._environmentStoreList = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._variablesListStore = StoreManager.GetStore<EditorVariablesListStore>(EditorVariablesListStore);
        this._retentionPolicyListStore = StoreManager.GetStore<RetentionPolicyListStore>(RetentionPolicyListStore);
        this._artifactCanvasViewStore = StoreManager.GetStore<ArtifactsCanvasViewStore>(ArtifactsCanvasViewStore);
        this._environmentsCanvasViewStore = StoreManager.GetStore<EnvironmentsCanvasViewStore>(EnvironmentsCanvasViewStore);
    }

    public componentWillMount() {
        this._currentAction = this.props.action;

        this.setState({
            definitionFolderPath: this.props.definitionFolderPath,
            definitionId: this.props.definitionId,
            environmentId: this.props.environmentId,
            action: this._currentAction,
            taskTabIsValid: this._taskTabStore.isValid(),
            variablesTabIsValid: this._variablesListStore.isValid(),
            optionsTabIsValid: this._optionsTabStore.isValid(),
            retentionTabIsValid: this._retentionPolicyListStore.isValid(),
            pipelineTabIsValid: this._isPipelineTabValid()
        });

        this._environmentStoreList.addChangedListener(this._storeChanged);
        this._variablesListStore.addChangedListener(this._storeChanged);
        this._optionsTabStore.addChangedListener(this._storeChanged);
        this._artifactCanvasViewStore.addChangedListener(this._storeChanged);
    }

    public componentWillUnmount(): void {
        this._environmentStoreList.removeChangedListener(this._storeChanged);
        this._variablesListStore.removeChangedListener(this._storeChanged);
        this._optionsTabStore.removeChangedListener(this._storeChanged);
        this._artifactCanvasViewStore.removeChangedListener(this._storeChanged);
    }

    public componentWillReceiveProps(nextProps: IDefinitionTabsContainerProps) {
        if (this.props.definitionId !== nextProps.definitionId ||
            this.props.environmentId !== nextProps.environmentId ||
            this._currentAction !== nextProps.action) {
            this._currentAction = nextProps.action;

            this.setState({
                definitionFolderPath: nextProps.definitionFolderPath,
                definitionId: nextProps.definitionId,
                environmentId: nextProps.environmentId,
                action: nextProps.action,
                taskTabIsValid: this._taskTabStore.isValid(),
                variablesTabIsValid: this._variablesListStore.isValid(),
                optionsTabIsValid: this._optionsTabStore.isValid(),
                retentionTabIsValid: this._retentionPolicyListStore.isValid(),
                pipelineTabIsValid: this._isPipelineTabValid()
            });
        }
    }

    public render(): JSX.Element {
        return (
            <ContainerTabPanel
                tabItems={this._getTabItems()}
                tabStoreList={this._tabStoreList}
                defaultTabKey={this._getDefaultTabKey()}
                onTabClick={this._handleTabClick} />
        );
    }

    private _getDefaultTabKey(): string {
        if (!this.state.action ||
            StringUtils.equals(this.state.action, EditorActions.ACTION_PIPELINE_TAB, true) ||
            StringUtils.equals(this.state.action, EditorActions.ACTION_EDIT_DEFINITION, true)) {

            return DeployPipelineStoreKeys.StoreKey_DeployPipelineCanvasTabStoreKey;
        }
        else if (StringUtils.equals(this.state.action, EditorActions.ACTION_TASKS_TAB)) {
            return TaskTabStore.getKey();
        }
        else if (StringUtils.equals(this.state.action, EditorActions.ACTION_HISTORY_TAB)) {
            return HistoryStore.getKey();
        }
        else if (StringUtils.equals(this.state.action, EditorActions.ACTION_VARIABLES_TAB)) {
            return VariablesTabStore.getKey();
        } else if (StringUtils.equals(this.state.action, EditorActions.ACTION_OPTIONS_TAB)) {
            return OptionsTabStore.getKey();
        }
        else if (StringUtils.equals(this.state.action, EditorActions.ACTION_RETENTIONS_TAB)) {
            return RetentionPolicyListStore.getKey();
        }
        else {
            return DeployPipelineStoreKeys.StoreKey_DeployPipelineCanvasTabStoreKey;
        }
    }

    private _handleTabClick = (key: string): void => {
        let action: string;

        if (StringUtils.equals(key, DeployPipelineStoreKeys.StoreKey_DeployPipelineCanvasTabStoreKey, true)) {
            action = EditorActions.ACTION_PIPELINE_TAB;

            NavigationService.getHistoryService().addHistoryPoint(
                EditorActions.ACTION_PIPELINE_TAB,
                {
                    definitionId: this.state.definitionId
                },
                null,
                true,
                false);
        }
        else if (StringUtils.equals(key, TaskTabStore.getKey(), true)) {
            let selectedEnvironmentId = this._taskTabStore.getSelectedEnvironmentId();
            action = EditorActions.ACTION_TASKS_TAB;

            NavigationService.getHistoryService().addHistoryPoint(
                EditorActions.ACTION_TASKS_TAB,
                {
                    definitionId: this.state.definitionId,
                    environmentId: selectedEnvironmentId
                },
                null,
                true,
                true);
        }
        else if (StringUtils.equals(key, HistoryStore.getKey(), true)) {
            action = EditorActions.ACTION_HISTORY_TAB;

            NavigationService.getHistoryService().addHistoryPoint(
                EditorActions.ACTION_HISTORY_TAB,
                {
                    definitionId: this.state.definitionId
                },
                null,
                true,
                false);
        }
        else if (StringUtils.equals(key, VariablesTabStore.getKey(), true)) {
            action = EditorActions.ACTION_VARIABLES_TAB;

            NavigationService.getHistoryService().addHistoryPoint(
                EditorActions.ACTION_VARIABLES_TAB,
                {
                    definitionId: this.state.definitionId
                },
                null,
                true,
                false);
        }
        else if (StringUtils.equals(key, RetentionPolicyListStore.getKey(), true)) {
            action = EditorActions.ACTION_RETENTIONS_TAB;

            NavigationService.getHistoryService().addHistoryPoint(
                EditorActions.ACTION_RETENTIONS_TAB,
                {
                    definitionId: this.state.definitionId
                },
                null,
                true,
                false);
        }
        else if (StringUtils.equals(key, DeployPipelineStoreKeys.StoreKey_DeployPipelineOptionsStoreKey, true)) {
            action = EditorActions.ACTION_OPTIONS_TAB;

            NavigationService.getHistoryService().addHistoryPoint(
                EditorActions.ACTION_OPTIONS_TAB,
                {
                    definitionId: this.state.definitionId
                },
                null,
                true,
                false);
        }

        this.props.onTabChange(action);
    }

    private _getTabItems(): JSX.Element[] {

        let tabItems: JSX.Element[] = [];

        tabItems.push(
            (<CanvasTab
                key={DeployPipelineStoreKeys.StoreKey_DeployPipelineCanvasTabStoreKey}
                cssClass="definition-tab-container"
                tabKey={DeployPipelineStoreKeys.StoreKey_DeployPipelineCanvasTabStoreKey}
                title={Resources.CanvasTabTitle}
                icon={(!this.state.pipelineTabIsValid) ? "bowtie-icon bowtie-status-error" : null} />)
        );

        tabItems.push(
            (<TasksTabItem
                key={TaskTabStore.getKey()}
                cssClass="definition-tab-container"
                tabKey={TaskTabStore.getKey()}
                title={Resources.TasksTabItemTitle}
                releaseDefinitionFolderPath={this.state.definitionFolderPath}
                releaseDefinitionId={this.state.definitionId}
                icon={(!this.state.taskTabIsValid) ? "bowtie-icon bowtie-status-error" : null}
                customRenderer={this._getCustomTaskTabRenderer} />));

        tabItems.push(
            (<VariablesTabItem
                key={VariablesTabStore.getKey()}
                cssClass="definition-tab-container"
                tabKey={VariablesTabStore.getKey()}
                title={Resources.VariablesTabItemTitle}
                icon={(!this.state.variablesTabIsValid) ? "bowtie-icon bowtie-status-error" : null} />));

        tabItems.push(
            (<RetentionTabItem
                key={RetentionPolicyListStore.getKey()}
                cssClass="definition-tab-container"
                tabKey={RetentionPolicyListStore.getKey()}
                title={Resources.RetentionTabItemTitle}
                icon={(!this.state.retentionTabIsValid) ? "bowtie-icon bowtie-status-error" : null} />));

        tabItems.push(
            (<OptionsTabItem
                key={OptionsTabStore.getKey()}
                cssClass="definition-tab-container"
                tabKey={OptionsTabStore.getKey()}
                title={Resources.OptionsTabItemTitle}
                icon={(!this.state.optionsTabIsValid) ? "bowtie-icon bowtie-status-error" : null} />));

        tabItems.push(
            (<HistoryTabItem
                key={HistoryStore.getKey()}
                cssClass="definition-tab-container"
                tabKey={HistoryStore.getKey()}
                title={Resources.HistoryTabItemTitle}
                icon={null} />));

        return tabItems;
    }

    private _storeChanged = () => {
        let isTaskTabStoreValid: boolean = this._taskTabStore.isValid();
        let isVariableTabStoreValid: boolean = this._variablesListStore.isValid();
        let isRetentionListStoreValid: boolean = this._retentionPolicyListStore.isValid();
        let isOptionsTabStoreValid: boolean = this._optionsTabStore.isValid();
        let isPipeLineTabValid: boolean = this._isPipelineTabValid();

        if (this.state.taskTabIsValid !== isTaskTabStoreValid ||
            this.state.variablesTabIsValid !== isVariableTabStoreValid ||
            this.state.optionsTabIsValid !== isOptionsTabStoreValid ||
            this.state.retentionTabIsValid !== isRetentionListStoreValid ||
            this.state.pipelineTabIsValid !== isPipeLineTabValid) {

            this.setState({
                definitionFolderPath: this.props.definitionFolderPath,
                definitionId: this.props.definitionId,
                environmentId: this._taskTabStore.getSelectedEnvironmentId(),
                action: this._currentAction,
                taskTabIsValid: isTaskTabStoreValid,
                variablesTabIsValid: isVariableTabStoreValid,
                retentionTabIsValid: isRetentionListStoreValid,
                optionsTabIsValid: isOptionsTabStoreValid,
                pipelineTabIsValid: isPipeLineTabValid
            });
        }
    }

    private _getCustomTaskTabRenderer = (props: Base.IProps, defaultRenderer: (props: Base.IProps) => JSX.Element) => {
        return (
            <TaskTabCustomRenderer>
                {defaultRenderer(props)}
            </TaskTabCustomRenderer>
        );
    }

    private _prefetchViews(): void {
        VSS.using(
            [
                "PipelineWorkflow/Scripts/Editor/ContainerTabs/TaskTab/TaskTab",
                "PipelineWorkflow/Scripts/Shared/ContainerTabs/VariablesTab/VariablesTab",
                "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionTab",
                "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/OptionsTab",
                "PipelineWorkflow/Scripts/Editor/ContainerTabs/HistoryTab/HistoryTab"
            ], () => { });
    }

    private _isPipelineTabValid(): boolean {
        let isValid: boolean = true;

        if (this._artifactCanvasViewStore) {
            isValid = isValid && this._artifactCanvasViewStore.isValid();
        }

        if (this._environmentsCanvasViewStore) {
            isValid = isValid && this._environmentsCanvasViewStore.isValid();
        }

        return isValid;
    }

    private _currentAction: string;
    private _tabStoreList: Store[];
    private _taskTabStore: TaskTabStore;
    private _variablesTabStore: VariablesTabStore;
    private _variablesListStore: EditorVariablesListStore;
    private _optionsTabStore: OptionsTabStore;
    private _environmentStoreList: EnvironmentListStore;
    private _retentionPolicyListStore: RetentionPolicyListStore;
    private _artifactCanvasViewStore: ArtifactsCanvasViewStore;
    private _environmentsCanvasViewStore: EnvironmentsCanvasViewStore;
}