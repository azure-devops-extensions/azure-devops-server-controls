import { AgentTargetExecutionType, PhaseTargetType, ServerTargetExecutionType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { AgentsConstants, BuildTasksVisibilityFilter, DemandInstances } from "CIWorkflow/Scripts/Common/Constants";
import { BuildDefinitionStoreKeys, TabKeyConstants } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { initializeDesignerProcess, isPhaseDependenciesFeatureEnabled } from "CIWorkflow/Scripts/Scenarios/Definition/DefinitionProcess";
import { Utilities } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/Utilities";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { VariablesListStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VariablesListStore";
import { YamlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlStore";

import { ProcessParameterActionsCreator } from "DistributedTaskControls/Actions/ProcessParameterActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { TaskListStoreInstanceId } from "DistributedTaskControls/Common/Common";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { IApplicationLayerContext } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { DeployPhaseListStore, IDeployPhaseListStoreArgs } from "DistributedTaskControls/Phase/Stores/DeployPhaseListStore";
import {
    DeployPhaseTypes, ExecutionPlanConstants, IAgentBasedDeployPhase, IMultiConfigInput, IMultiMachineInput, IPhaseListContainer,
    IRunOnServerDeployPhase, ParallelExecutionTypes, PhaseDependencyEventTypes
} from "DistributedTaskControls/Phase/Types";
import { IProcessManagementStoreArgs, ProcessManagementStore } from "DistributedTaskControls/ProcessManagement/ProcessManagementStore";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";
import { AgentsStore, IAgentsStoreArgs } from "DistributedTaskControls/Stores/AgentsStore";
import { DemandsStore, IDemandsStoreArgs } from "DistributedTaskControls/Stores/DemandsStore";
import { IOptions, ProcessParameterStore } from "DistributedTaskControls/Stores/ProcessParameterStore";

import {
    AgentPoolQueue, AgentPoolQueueTarget, BuildDefinition, BuildDefinitionStep, DesignerProcess, MultipleAgentExecutionOptions,
    Phase, ServerTarget, VariableMultipliersAgentExecutionOptions, VariableMultipliersServerExecutionOptions
} from "TFS/Build/Contracts";

export interface IDtcAdapterStoreArgs {
    defaultQueueId?: number;
}

/**
 * @brief Wrapper store for stores in DTC
 */
export class DtcAdapterStore extends Store {
    private _defaultQueueId: number;
    private _appContext: IApplicationLayerContext;
    private _phaseListStore: DeployPhaseListStore;
    private _processParameterStore: ProcessParameterStore;
    private _sourcesSelectionStore: SourcesSelectionStore;
    private _variablesListStore: VariablesListStore;
    private _demandsStore: DemandsStore;
    private _agentsStore: AgentsStore;
    private _yamlStore: YamlStore;

    constructor(args: IDtcAdapterStoreArgs) {
        super();

        if (!!args && args.defaultQueueId >= 0) {
            this._defaultQueueId = args.defaultQueueId;
        }
        else {
            this._defaultQueueId = -1;
        }
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_DtcAdapterStore;
    }

    public initialize(): void {
        this._sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        this._appContext = {
            isFileSystemBrowsable: this._sourcesSelectionStore.isFileSystemBrowsable.bind(this._sourcesSelectionStore),
            processInstanceId: TaskListStoreInstanceId,
            taskDelegates: {
                filePathPickerDelegate: this._sourcesSelectionStore.showPathDialog.bind(this._sourcesSelectionStore),
                fileContentProviderDelegate: this._sourcesSelectionStore.fetchRepositoryFileContent.bind(this._sourcesSelectionStore)
            }
        } as IApplicationLayerContext;

        // initialize the process management store
        StoreManager.CreateStore<ProcessManagementStore, IProcessManagementStoreArgs>(ProcessManagementStore, TaskListStoreInstanceId,
            {
                processManagementCapabilities: ProcessManagementCapabilities.All
            } as IProcessManagementStoreArgs
        );

        // Initialize ProcessParameter actions creator and store.
        ActionCreatorManager.GetActionCreator<ProcessParameterActionsCreator>(ProcessParameterActionsCreator);
        this._processParameterStore = StoreManager.CreateStore<ProcessParameterStore, IOptions>(ProcessParameterStore, TaskListStoreInstanceId, { appContext: this._appContext });
        this._processParameterStore.addChangedListener(this._emitChanged);

        const showPhaseDependencies = isPhaseDependenciesFeatureEnabled();
        this._phaseListStore = StoreManager.CreateStore<DeployPhaseListStore, IDeployPhaseListStoreArgs>(
            DeployPhaseListStore,
            TaskListStoreInstanceId,
            {
                phaseList: [],
                itemSelectionInstanceId: TaskListStoreInstanceId,
                taskDelegates: this._appContext.taskDelegates,
                addTaskVisibilityFilter: BuildTasksVisibilityFilter,
                processParametersNotSupported: false,
                isFileSystemBrowsable: this._appContext.isFileSystemBrowsable,
                allowInheritAgentQueues: true,
                isPipelineOrchestration: true,
                showPhaseDependencies: showPhaseDependencies,
                hideSkipArtifactDownload: true,
                minJobCancelTimeout: 0
            });
        this._phaseListStore.addChangedListener(this._handlePhaseListChange);

        // Initialize Variables Store
        this._variablesListStore = StoreManager.GetStore<VariablesListStore>(VariablesListStore);
        this._variablesListStore.addChangedListener(this._emitChanged);

        // Initialize Demands Store
        this._demandsStore = StoreManager.CreateStore<DemandsStore, IDemandsStoreArgs>(DemandsStore, DemandInstances.DefinitionInstance, {
            demands: []
        });

        this._demandsStore.addChangedListener(this._emitChanged);

        // Initialize Agents Store
        this._agentsStore = StoreManager.CreateStore<AgentsStore, IAgentsStoreArgs>(AgentsStore, AgentsConstants.instance, {
            defaultQueueId: this._defaultQueueId
        });

        this._agentsStore.addChangedListener(this._emitChanged);

        this._yamlStore = StoreManager.GetStore<YamlStore>(YamlStore);
        this._yamlStore.addChangedListener(this._emitChanged);
    }

    public getTabIsValid(tabKey: string): boolean {
        switch (tabKey) {
            case TabKeyConstants.Tasks:
                return this._processParameterStore.isValid()
                    // if it's yaml, agent queue is optional
                    && (this.isYamlDefinition() || this._agentsStore.isValid())
                    && this._sourcesSelectionStore.isValid()
                    // if it's yaml, don't check the phaseListStore
                    && (this.isYamlDefinition() || ((this._phaseListStore) ? this._phaseListStore.isValid() : true));

            case TabKeyConstants.Variables:
                return this._variablesListStore.isValid();

            case TabKeyConstants.Options:
                return this._demandsStore.isValid();

            default:
                return true;
        }
    }

    public getPhaseInstanceIds(): string[] {
        return this._phaseListStore.getPhaseStores().map((phaseStore) => {
            return phaseStore.getInstanceId();
        });
    }

    protected disposeInternal(): void {
        this._processParameterStore.removeChangedListener(this._emitChanged);
        this._variablesListStore.removeChangedListener(this._emitChanged);
        this._demandsStore.removeChangedListener(this._emitChanged);
        this._agentsStore.removeChangedListener(this._emitChanged);
        this._yamlStore.removeChangedListener(this._emitChanged);
        this._phaseListStore.removeChangedListener(this._handlePhaseListChange);

        StoreManager.DeleteStore<ProcessParameterStore>(ProcessParameterStore);
        StoreManager.DeleteStore<VariablesListStore>(VariablesListStore);
        StoreManager.DeleteStore<DemandsStore>(DemandsStore, DemandInstances.DefinitionInstance);
        StoreManager.DeleteStore<AgentsStore>(AgentsStore, AgentsConstants.instance);
        StoreManager.DeleteStore<DeployPhaseListStore>(DeployPhaseListStore, TaskListStoreInstanceId);
        StoreManager.DeleteStore<ProcessManagementStore>(ProcessManagementStore, TaskListStoreInstanceId);
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        if (!this.isYamlDefinition()) {
            let deployPhaseList: IPhaseListContainer = { deployPhases: [] };
            this._phaseListStore.updateVisitor(deployPhaseList);

            let process = initializeDesignerProcess(buildDefinition);
            process.phases = deployPhaseList.deployPhases.map((phaseModel) => {
                let phase: Phase = null;

                switch (phaseModel.phaseType) {
                    case DeployPhaseTypes.RunOnServer: {
                        const serverPhaseModel = phaseModel as IRunOnServerDeployPhase;
                        const target: ServerTarget = <ServerTarget>{
                            type: PhaseTargetType.Server
                        };

                        switch (serverPhaseModel.deploymentInput.parallelExecution.parallelExecutionType) {
                            case ParallelExecutionTypes.MultiConfiguration: {
                                const multiplierModel = serverPhaseModel.deploymentInput.parallelExecution as IMultiConfigInput;

                                target.executionOptions = <VariableMultipliersServerExecutionOptions>{
                                    type: ServerTargetExecutionType.VariableMultipliers,
                                    maxConcurrency: multiplierModel.maxNumberOfAgents || ExecutionPlanConstants.MaxValidAgentsCount,
                                    multipliers: multiplierModel.multipliers.split(","),
                                    continueOnError: multiplierModel.continueOnError
                                };
                                break;
                            }

                            default:
                            case ParallelExecutionTypes.None: {
                                target.executionOptions = {
                                    type: ServerTargetExecutionType.Normal
                                };
                                break;
                            }
                        }

                        phase = {
                            condition: serverPhaseModel.deploymentInput.condition,
                            dependencies: serverPhaseModel.deploymentInput.dependencies,
                            jobAuthorizationScope: buildDefinition.jobAuthorizationScope,
                            jobCancelTimeoutInMinutes: serverPhaseModel.deploymentInput.jobCancelTimeoutInMinutes,
                            jobTimeoutInMinutes: serverPhaseModel.deploymentInput.timeoutInMinutes,
                            name: serverPhaseModel.name,
                            refName: serverPhaseModel.refName,
                            steps: <BuildDefinitionStep[]>serverPhaseModel.tasks,
                            target: target,
                            variables: {}
                        };

                        break;
                    }
                    case DeployPhaseTypes.AgentBasedDeployment:
                    default: {
                        const agentPhaseModel = phaseModel as IAgentBasedDeployPhase;
                        const target: AgentPoolQueueTarget = <AgentPoolQueueTarget>{
                            type: PhaseTargetType.Agent,
                            demands: agentPhaseModel.deploymentInput.demands,
                            allowScriptsAuthAccessOption: agentPhaseModel.deploymentInput.enableAccessToken
                        };

                        switch (agentPhaseModel.deploymentInput.parallelExecution.parallelExecutionType) {
                            case ParallelExecutionTypes.MultiConfiguration: {
                                const multiplierModel = agentPhaseModel.deploymentInput.parallelExecution as IMultiConfigInput;

                                target.executionOptions = <VariableMultipliersAgentExecutionOptions>{
                                    type: AgentTargetExecutionType.VariableMultipliers,
                                    maxConcurrency: multiplierModel.maxNumberOfAgents || ExecutionPlanConstants.MaxValidAgentsCount,
                                    multipliers: multiplierModel.multipliers.split(","),
                                    continueOnError: multiplierModel.continueOnError
                                };
                                break;
                            }

                            case ParallelExecutionTypes.MultiMachine: {
                                const multipleAgentModel = agentPhaseModel.deploymentInput.parallelExecution as IMultiMachineInput;

                                target.executionOptions = <MultipleAgentExecutionOptions>{
                                    type: AgentTargetExecutionType.MultipleAgents,
                                    maxConcurrency: multipleAgentModel.maxNumberOfAgents || ExecutionPlanConstants.MaxValidAgentsCount,
                                    continueOnError: multipleAgentModel.continueOnError
                                };
                                break;
                            }

                            default:
                            case ParallelExecutionTypes.None: {
                                target.executionOptions = {
                                    type: ServerTargetExecutionType.Normal
                                };
                                break;
                            }
                        }

                        phase = {
                            condition: agentPhaseModel.deploymentInput.condition,
                            dependencies: agentPhaseModel.deploymentInput.dependencies,
                            jobAuthorizationScope: buildDefinition.jobAuthorizationScope,
                            jobCancelTimeoutInMinutes: agentPhaseModel.deploymentInput.jobCancelTimeoutInMinutes,
                            jobTimeoutInMinutes: agentPhaseModel.deploymentInput.timeoutInMinutes,
                            name: agentPhaseModel.name,
                            refName: agentPhaseModel.refName,
                            steps: <BuildDefinitionStep[]>agentPhaseModel.tasks,
                            target: target,
                            variables: {}
                        };

                        if (agentPhaseModel.deploymentInput.queueId) {
                            target.queue = <AgentPoolQueue>{
                                id: agentPhaseModel.deploymentInput.queueId
                            };
                        }

                        break;
                    }
                }

                return phase;
            });

            // Maintain sequential dependencies, if we are using new orchestration but dependencies are not enabled in UI
            let designerProcess = buildDefinition.process as DesignerProcess;
            if (!isPhaseDependenciesFeatureEnabled() && designerProcess != null) {
                for (let index = 0; index < designerProcess.phases.length; index++) {
                    designerProcess.phases[index].dependencies = [];

                    if (index > 0) {
                        designerProcess.phases[index].dependencies.push({
                            scope: designerProcess.phases[index - 1].refName,
                            event: PhaseDependencyEventTypes.Completed
                        });
                    }
                }
            }

            // Update Process Parameters
            buildDefinition.processParameters = this._processParameterStore.getProcessParameters();
        }

        // Update Variables
        this._variablesListStore.updateVisitor(buildDefinition);

        // Update Demands
        buildDefinition.demands = DtcUtils.convertDemandDataToSerializedDemand(this._demandsStore.getCurrentDemands());

        // Update queue
        buildDefinition.queue = Utilities.convertToBuildQueue(this._agentsStore.getSelectedQueue());

        return buildDefinition;
    }

    public isDirty(): boolean {
        return (this._processParameterStore.isDirty() ||
            this._variablesListStore.isDirty() ||
            ((this._phaseListStore) ? this._phaseListStore.isDirty() : false) ||
            this._demandsStore.isDirty() ||
            this._agentsStore.isDirty());
    }

    public isProcessParameterStoreDirty(): boolean {
        return this._processParameterStore.isDirty();
    }

    public isValid(): boolean {
        return (this._processParameterStore.isValid() &&
            this._variablesListStore.isValid() &&
            // if this is a YAML definition, we don't care whether the phase list is dirty
            (this.isYamlDefinition() || ((this._phaseListStore) ? this._phaseListStore.isValid() : false)) &&
            this._demandsStore.isValid() &&
            // if this is a YAML definition, agent queue is optional
            (this.isYamlDefinition() || this._agentsStore.isValid()));
    }

    public isYamlDefinition(): boolean {
        return this._yamlStore.getState().isYaml;
    }

    private _emitChanged = () => {
        this.emitChanged();
    }

    private _handlePhaseListChange = () => {
        this.emitChanged();
    }
}
