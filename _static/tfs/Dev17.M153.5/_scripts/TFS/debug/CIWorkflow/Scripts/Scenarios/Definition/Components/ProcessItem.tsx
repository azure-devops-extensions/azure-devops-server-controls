/// <reference types="react" />

import * as React from "react";

import { RepositoryProperties } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { AgentsConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import * as YamlProcessAsync from "CIWorkflow/Scripts/Scenarios/Definition/Components/YamlProcess";
import { CorePropertiesView } from "CIWorkflow/Scripts/Scenarios/Definition/ControllerViews/CorePropertiesView";
import { BuildDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildDefinitionStore";
import { CoreDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/CoreDefinitionStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { YamlDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlDefinitionStore";

import * as Common from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import { Item, ItemOverviewAriaProps, ItemOverviewProps, ItemOverviewState } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as YamlUtilities from "DistributedTaskControls/Common/YamlHelper";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import { ProcessParameter } from "DistributedTaskControls/Components/ProcessParameter";
import { StateIndicator, StateIndicatorType } from "DistributedTaskControls/Components/StateIndicator";
import { TaskItem } from "DistributedTaskControls/Components/Task/TaskItem";
import { TaskStore } from "DistributedTaskControls/Components/Task/TaskStore";
import { ITwoPanelOverviewProps, TwoPanelOverviewComponent } from "DistributedTaskControls/Components/TwoPanelOverviewComponent";
import { AgentsView } from "DistributedTaskControls/ControllerViews/AgentsView";
import { AddPhaseContextualMenu } from "DistributedTaskControls/Phase/Components/AddPhaseContextualMenu";
import { DeployPhaseUtilities } from "DistributedTaskControls/Phase/DeployPhaseUtilities";
import { ExecutionPlanStore } from "DistributedTaskControls/Phase/Stores/ExecutionPlanStore"
import { DependenciesStore } from "DistributedTaskControls/Phase/Stores/DependenciesStore";
import { DeployPhaseListStore } from "DistributedTaskControls/Phase/Stores/DeployPhaseListStore";
import { PhaseStoreBase } from "DistributedTaskControls/Phase/Stores/PhaseStoreBase";
import { RunOnAgentPhaseStore } from "DistributedTaskControls/Phase/Stores/RunOnAgentPhaseStore";
import { DeployPhaseTypes } from "DistributedTaskControls/Phase/Types";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { AgentsStore } from "DistributedTaskControls/Stores/AgentsStore";
import { ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import { ProcessParameterStore } from "DistributedTaskControls/Stores/ProcessParameterStore";
import { IDefinitionVariable, IDefinitionVariableReference } from "DistributedTaskControls/Variables/Common/Types";
import { ProcessVariablesStore } from "DistributedTaskControls/Variables/ProcessVariables/DataStore";

import { CommandButton } from "OfficeFabric/Button";
import { css } from "OfficeFabric/Utilities";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/ProcessItem";

const YamlProcess = getAsyncLoadedComponent(
    ["CIWorkflow/Scripts/Scenarios/Definition/Components/YamlProcess"],
    (m: typeof YamlProcessAsync) => m.YamlProcess,
    () => <LoadingComponent />);

export interface IProcessItemOverviewState extends ItemOverviewState {
    isYaml?: boolean;
}

export class ProcessItemOverview extends ComponentBase.Component<ItemOverviewProps, IProcessItemOverviewState> {
    private _agentsStore: AgentsStore;
    private _coreDefinitionStore: CoreDefinitionStore;
    private _processParameterStore: ProcessParameterStore;
    private _yamlDefinitionStore: YamlDefinitionStore;

    constructor(props: ItemOverviewProps) {
        super(props);

        this._agentsStore = StoreManager.GetStore<AgentsStore>(AgentsStore, AgentsConstants.instance);
        this._coreDefinitionStore = StoreManager.GetStore<CoreDefinitionStore>(CoreDefinitionStore);
        this._processParameterStore = StoreManager.GetStore<ProcessParameterStore>(ProcessParameterStore, props.instanceId);
        this._yamlDefinitionStore = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);
        this.state = this._getState();
    }

    public componentDidMount(): void {
        this._agentsStore.addChangedListener(this._onChange);
        this._coreDefinitionStore.addChangedListener(this._onChange);
        this._processParameterStore.addChangedListener(this._onChange);
        this._yamlDefinitionStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        this._agentsStore.removeChangedListener(this._onChange);
        this._coreDefinitionStore.removeChangedListener(this._onChange);
        this._processParameterStore.removeChangedListener(this._onChange);
        this._yamlDefinitionStore.removeChangedListener(this._onChange);
    }

    public render(): JSX.Element {
        let overviewProps = {
            title: Resources.ProcessText,
            view: this._getView(),
            item: this.props.item,
            instanceId: this.props.instanceId,
            overviewClassName: "process-item-overview-body",
            ariaDescription: Resources.BuildProcessDescription,
            controlSection: this._getControlSection(),
            ariaProps: this.props.ariaProps
        } as ITwoPanelOverviewProps;

        return (
            <div className="process-item-overview">
                <TwoPanelOverviewComponent {...overviewProps} />
            </div>);
    }

    private _getView(): JSX.Element {
        if (this.state.hasWarnings) {
            return <StateIndicator type={StateIndicatorType.Warning} text={DTCResources.SettingsRequiredMessage} />;
        }
        else if (!this.state.isValid) {
            return <StateIndicator type={StateIndicatorType.Error} text={DTCResources.SettingsRequiredMessage} />;
        }
        else {
            return <div>{Resources.BuildProcessText}</div>;
        }
    }

    private _onChange = () => {
        this.setState(this._getState());
    }

    private _getState(): IProcessItemOverviewState {
        return {
            isValid: this._processParameterStore.isValid()
                && this._coreDefinitionStore.isValid()
                && this._agentsStore.isValid()
                && this._yamlDefinitionStore.isValid(),
            hasWarnings: this._yamlDefinitionStore.hasWarnings(),
            isYaml: this._yamlDefinitionStore.isYaml()
        };
    }

    private _getControlSection(): JSX.Element {
        let supportedTypes: DeployPhaseTypes[] = [DeployPhaseTypes.AgentBasedDeployment];

        if (!this.state.isYaml) {
            supportedTypes.push(DeployPhaseTypes.RunOnServer);

            return (
                <div className="add-phase">
                    <AddPhaseContextualMenu instanceId={this.props.instanceId} supportedTypes={supportedTypes} />
                </div>
            );
        }
    }
}

export class ProcessItem implements Item {
    private _isDraftDefinition: boolean;
    private _isYaml: boolean;
    private _overView: JSX.Element;
    private _details: JSX.Element;
    private _storeInstanceId: string;
    private _treeLevel?: number;
    private _initialIndex?: number;
    private _processManagementStore: ProcessManagementStore;
    private _yamlDefinitionStore: YamlDefinitionStore;
    private _buildDefinitionStore: BuildDefinitionStore;

    constructor(storeInstanceId: string, isDraftDefinition: boolean, isYaml: boolean, treeLevel?: number, initialIndex?: number) {
        this._storeInstanceId = storeInstanceId;
        this._isDraftDefinition = isDraftDefinition;
        this._isYaml = isYaml;
        this._treeLevel = treeLevel;
        this._initialIndex = initialIndex;

        this._processManagementStore = StoreManager.GetStore<ProcessManagementStore>(ProcessManagementStore, storeInstanceId);
        this._yamlDefinitionStore = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);
        this._buildDefinitionStore = StoreManager.GetStore<BuildDefinitionStore>(BuildDefinitionStore);
    }

    public getOverview(viewInstanceId?: string): JSX.Element {
        if (!this._overView) {
            this._overView = <ProcessItemOverview
                item={this}
                instanceId={viewInstanceId}
                ariaProps={{
                    level: this._treeLevel,
                    expanded: true,
                    setSize: this._initialIndex + 1,
                    positionInSet: this._initialIndex + 1,
                    role: "treeitem"
                } as ItemOverviewAriaProps} />;
        }

        return this._overView;
    }

    public getDetails(instanceId?: string): JSX.Element {
        const isYamlFeatureAvailable = this._yamlDefinitionStore.isYamlFeatureAvailable();
        const isValid = this._buildDefinitionStore.isValid();
        if (!this._details || isYamlFeatureAvailable) {
            const isReadOnly = !this._processManagementStore.canEditProcess();

            this._details = (
                <div className="constrained-width">
                    <div className="process-details-heading-row">
                        <div className="process-title" />
                        <div className="process-controls">
                            {isYamlFeatureAvailable && !this._isYaml &&
                                (<CommandButton
                                    className={css("remove-linkSettings-button", "fabric-style-overrides")}
                                    ariaLabel={Resources.Process_MenuViewAsYaml}
                                    iconProps={{ iconName: "Paste" }}
                                    disabled={!!isReadOnly || !isValid}
                                    ariaDescription={Resources.ViewAsYamlDescription}
                                    onClick={this._onViewYAMLClicked} >
                                    {Resources.Process_MenuViewAsYaml}
                                </CommandButton>)
                            }
                        </div>
                    </div>
                    <CorePropertiesView isDraftDefinition={this._isDraftDefinition} isReadOnly={!!isReadOnly} />
                    {
                        <div className="process-agents-view-container">
                            <AgentsView
                                label={DTCResources.DefaultAgentQueue}
                                instanceId={AgentsConstants.instance}
                                required={this.isYaml ? false : true} />
                        </div>
                    }
                    {
                        // ProcessParameter checks canEditProcess on its own...
                        !this._isYaml
                        && <ProcessParameter instanceId={instanceId} />
                    }
                    {
                        this._isYaml
                        && <YamlProcess isReadOnly={!!isReadOnly} />
                    }
                </div>);
        }

        return this._details;
    }

    public getKey(): string {
        // This is acting as default item
        // SO, It is important to have unique keys based on certain properties that could change because of state updates of some other components, until #1028700 is addressed
        // eg: TasksTabControllerView could create a ProcessItem with _isYaml false, and later on based on some state update, may create a new item with _isYaml to true
        // we would have to differentiate between these two items so that we can later on update default Item at TwoPanelSelectorComponent
        return "ci.processitem" + (this._isYaml ? ".yaml" : "");
    }

    public get isYaml(): boolean {
        return this._isYaml;
    }

    public set isYaml(value: boolean) {
        this._isYaml = value;
        this._details = null;
    }

    private _onViewYAMLClicked = () => {
        const sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        const buildRepository = sourcesSelectionStore.getBuildRepository();
        let phaseListStore = StoreManager.GetStore<DeployPhaseListStore>(DeployPhaseListStore, this._storeInstanceId);
        let phaseStores = phaseListStore.getPhaseStores();
        let yamlPhases: YamlUtilities.YamlPhase[] = [];
        phaseStores.forEach(phase => {
            yamlPhases.push(this._getYamlPhase(phase, phaseStores.length > 1));
        });

        YamlUtilities.handleViewProcessAsYaml(yamlPhases, buildRepository.properties[RepositoryProperties.SkipSyncSource], buildRepository.clean, buildRepository.properties[RepositoryProperties.GitLfsSupport], buildRepository.properties[RepositoryProperties.FetchDepth]);
    }

    private _getYamlPhase(phaseStore: PhaseStoreBase, multiplePhases: boolean): YamlUtilities.YamlPhase {
        let executionPlanStore = StoreManager.GetStore<ExecutionPlanStore>(ExecutionPlanStore, phaseStore.getInstanceId());
        let dependenciesStore = StoreManager.GetStore<DependenciesStore>(DependenciesStore, phaseStore.getInstanceId());
        let refName = phaseStore.getState().refName;
        let name = phaseStore.getState().name;
        let tasks = this._getYamlTasks(phaseStore, multiplePhases);
        let demands: any[] = this._getPhaseDemands(phaseStore);
        let queueName: string = "";
        let currentDependencies = dependenciesStore.getCurrentDependencies();
        let dependencies = currentDependencies ? currentDependencies.map(d => d.scope) : [];
        let condition = DeployPhaseUtilities.getPhaseCondition(phaseStore.getState());
        if (phaseStore.getState().phaseType !== DeployPhaseTypes.RunOnServer) {
            queueName = this._getPhaseQueueName(phaseStore);
        }

        return new YamlUtilities.YamlPhase(refName, name, phaseStore.getState().phaseType, tasks, demands, queueName, executionPlanStore.getTimeout(), dependencies, condition, executionPlanStore.getParallelExecution().parallelExecutionType);
    }

    private _getPhaseDemands(phaseStore: PhaseStoreBase): any[] {
        let demands: any[] = [];
        let agentPhaseStore: RunOnAgentPhaseStore = phaseStore as RunOnAgentPhaseStore;
        let deploymentInput = agentPhaseStore.getState().deploymentInput;
        let phaseDemands = deploymentInput ? deploymentInput.demands : [];
        if (phaseDemands) {
            phaseDemands.forEach((demand: string) => { demands.push(demand); });
        }
        let tasksDemands = phaseStore.getReadOnlyDemands();
        if (tasksDemands) {
            tasksDemands.forEach((demand: string) => { demands.push(demand); });
        }

        return demands;
    }

    private _getPhaseQueueName(phaseStore: PhaseStoreBase): string {
        let queueName: string = "";
        let phaseAgentsStore: AgentsStore = StoreManager.GetStore<AgentsStore>(AgentsStore, phaseStore.getInstanceId());
        let selectedQueue = phaseAgentsStore ? phaseAgentsStore.getSelectedQueue() : null;
        if (selectedQueue && selectedQueue.id === 0) {
            let agentsStore: AgentsStore = StoreManager.GetStore<AgentsStore>(AgentsStore, Common.AGENTS_STORE_INSTANCE_ID);
            selectedQueue = agentsStore ? agentsStore.getSelectedQueue() : null;
            queueName = selectedQueue ? selectedQueue.name : "";
        }
        else {
            queueName = selectedQueue ? selectedQueue.name : "";
        }
        return queueName;
    }

    private _getYamlTasks(phaseStore: PhaseStoreBase, multiplePhases: boolean): YamlUtilities.YamlTask[] {
        const yamlTasks: YamlUtilities.YamlTask[] = [];
        const tasks = phaseStore.getTaskItems().taskItemList;
        let index: number = 0;
        const processVariablesStore = StoreManager.GetStore<ProcessVariablesStore>(ProcessVariablesStore);
        const variables = processVariablesStore.getVariableList();
        let variablesLookup: IDictionaryStringTo<IDefinitionVariable> = {};
        variables.forEach((variable: IDefinitionVariableReference) => {
            variablesLookup[variable.name] = variable.variable;
        });

        tasks.forEach((task: TaskItem) => {
            const taskStore = StoreManager.GetStore<TaskStore>(TaskStore, task.getKey());
            const inputs = taskStore.getInputToValueMap();
            const taskDefinition = taskStore.getTaskDefinition();
            const taskRefName = taskStore.getTaskRefName();
            const taskDisplayName = taskStore.getTaskDisplayName();
            const taskVersion = taskStore.getTaskVersion();
            const isTaskEnabled = !taskStore.isDisabled();
            const taskInstance = taskStore.getTaskInstance();
            const doesTaskContinueOnError = taskInstance.continueOnError;
            const taskCondition = taskInstance.condition;
            const taskTimeout = taskStore.getTaskTimeoutInMinutes();
            const taskInputsStates: IDictionaryStringTo<boolean> = {};
            const processParameters = taskStore.getProcessParameterToValueMap();
            const environmentVariables = taskInstance.environment;
            Object.keys(inputs).forEach((key) => {
                taskInputsStates[key] = taskStore.getTaskInputState(key).isHidden();
            });
            let yamlTask: YamlUtilities.YamlTask = new YamlUtilities.YamlTask(inputs, taskDefinition, taskRefName, taskDisplayName, taskVersion, isTaskEnabled, doesTaskContinueOnError, taskCondition, taskTimeout, taskInputsStates, variablesLookup, processParameters, environmentVariables, multiplePhases, index);
            yamlTasks.push(yamlTask);
            index++;
        });
        return yamlTasks;
    }
}
