import * as Q from "q";

import { getAllSteps, isDesignerDefinition, getPhases } from "Build.Common/Scripts/BuildDefinition";
import { GetDefinitionsOptions, GetDefinitionsResult } from "Build.Common/Scripts/ClientContracts";
import {
    BuildSecurity, BuildPermissions, PhaseTargetType, ServerTargetExecutionType, AgentTargetExecutionType,
    RepositoryTypes, ProcessType, SettingsSourceType } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { getDefinitionSecurityToken } from "Build.Common/Scripts/Security";

import * as Constants from "CIWorkflow/Scripts/Common/Constants";
import { IDefinitionInfo, DefinitionUtils } from "CIWorkflow/Scripts/Common/DefinitionUtils";
import { DefaultPath } from "CIWorkflow/Scripts/Common/PathUtils";
import { ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";
import { TelemetryUtils } from "CIWorkflow/Scripts/Common/TelemetryUtils";
import { VariableUtils } from "CIWorkflow/Scripts/Common/VariableUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { permissionsRetrieved } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/Permissions";
import { SourcesSelectionActionsCreator } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/SourcesSelectionActionsCreator";
import { VersionControlActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/VersionControlActions";
import { ActionCreatorKeys, RetentionInstanceId } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { YamlProcess } from "CIWorkflow/Scripts/Scenarios/Definition/Components/YamlProcess";
import { BuildDefinitionSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildDefinitionSource";
import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";
import { Utilities } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/Utilities";
import * as WebPageData from "CIWorkflow/Scripts/Scenarios/Definition/Sources/WebPageData";
import { getPermissionsStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Permissions";
import { RetentionPolicyListStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/RetentionPolicyListStore";
import { SourcesSelectionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SourcesSelectionStore";
import { VersionControlStore, IVersionControlState } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStore";
import { YamlDefinitionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlDefinitionStore";
import { YamlStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/YamlStore";
import { BuildJobStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/BuildJobStore";

import { AgentsActions } from "DistributedTaskControls/Actions/AgentsActions";
import { ConnectedServiceActionsCreator } from "DistributedTaskControls/Actions/ConnectedServiceEndpointActionsCreator";
import { DemandsActions } from "DistributedTaskControls/Actions/DemandsActions";
import * as ItemSelectorAction from "DistributedTaskControls/Actions/ItemSelectorActions";
import { MessageHandlerActions, IAddMessagePayload } from "DistributedTaskControls/Actions/MessageHandlerActions";
import { ProcessManagementActions } from "DistributedTaskControls/ProcessManagement/ProcessManagementActions";
import { ProcessParameterActions } from "DistributedTaskControls/Actions/ProcessParameterActions";
import { SaveStatusActionsHub, SaveStatus } from "DistributedTaskControls/Actions/SaveStatusActionsHub";
import * as TaskActions from "DistributedTaskControls/Actions/TaskListActions";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import * as DtcCommon from "DistributedTaskControls/Common/Common";
import { DefinitionNameUtils } from "DistributedTaskControls/Common/DefinitionNameUtils";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { PerfUtils } from "DistributedTaskControls/Common/PerfUtils";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { IInitializeProcessParametersPayload } from "DistributedTaskControls/Common/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { DeployPhaseListActionsCreator } from "DistributedTaskControls/Phase/Actions/DeployPhaseListActionsCreator";
import { PhaseStoreBase } from "DistributedTaskControls/Phase/Stores/PhaseStoreBase";
import { DeployPhaseListStore as PhaseListStore } from "DistributedTaskControls/Phase/Stores/DeployPhaseListStore";
import { HistoryActions } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActions";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";
import { IVariableGroupReference } from "DistributedTaskControls/Variables/Common/Types";
import { CounterVariableActionsCreator } from "DistributedTaskControls/Variables/CounterVariables/Actions/CounterVariableActionsCreator";
import { ProcessVariablesActionCreator } from "DistributedTaskControls/Variables/ProcessVariables/Actions/ProcessVariablesActionCreator";
import { VariableGroupActions } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { RefNames } from "DistributedTaskControls/Phase/RefNames";
import {
    IDeployPhase, DeployPhaseTypes, IAgentBasedDeployPhase, IRunOnServerDeployPhase, IExecutionInput, ParallelExecutionTypes,
    IMultiConfigInput, IMultiMachineInput, PhaseConditionTypeKeys, PhaseDependencyEventTypes
} from "DistributedTaskControls/Phase/Types";

import * as BuildContracts from "TFS/Build/Contracts";
import { TeamProjectReference } from "TFS/Core/Contracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { TaskDefinition, TaskAgentQueue, VariableGroup as DTVariableGroup, VariableValue as DTVariableValue } from "TFS/DistributedTask/Contracts";

import * as VssContext from "VSS/Context";
import * as Diag from "VSS/Diag";
import * as ReactPerf from "VSS/Flux/ReactPerf";
import * as NavigationService from "VSS/Navigation/Services";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import { PermissionEvaluationBatch, PermissionEvaluation } from "VSS/Security/Contracts";
import { getClient as getSecurityClient, SecurityHttpClient } from "VSS/Security/RestClient";
import * as Utils_String from "VSS/Utils/String";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";

export interface IBuildDefinitionModel extends BuildContracts.BuildDefinition {
    retentionSettings: BuildContracts.BuildSettings;
}

/**
 * @brief Action creator for Build definition scenario
 */
export class BuildDefinitionActionsCreator extends ActionsBase.ActionCreatorBase {
    private _phaseListActionsCreator: DeployPhaseListActionsCreator;
    private _phaseListStore: PhaseListStore;
    private _buildDefinitionActions: Actions.BuildDefinitionActions;
    private _saveStatusActions: SaveStatusActionsHub;
    private _historyActions: HistoryActions;
    private _taskListActions: TaskActions.TaskListActions;
    private _processParameterActions: ProcessParameterActions;
    private _processVariablesActionCreator: ProcessVariablesActionCreator;
    private _variableGroupActions: VariableGroupActions;
    private _counterVariablesActionCreator: CounterVariableActionsCreator;
    private _demandsActions: DemandsActions;
    private _agentsActions: AgentsActions;
    private _messageHandlerActions: MessageHandlerActions;
    private _itemSelectorAction: ItemSelectorAction.Actions;
    private _retentionItemSelectorAction: ItemSelectorAction.Actions;

    constructor() {
        super();
    }

    public static getKey(): string {
        return ActionCreatorKeys.BuildDefintion_ActionCreator;
    }

    public initialize(): void {
        this._buildDefinitionActions = ActionsHubManager.GetActionsHub<Actions.BuildDefinitionActions>(Actions.BuildDefinitionActions);
        this._processParameterActions = ActionsHubManager.GetActionsHub<ProcessParameterActions>(ProcessParameterActions, DtcCommon.TaskListStoreInstanceId);
        this._variableGroupActions = ActionsHubManager.GetActionsHub<VariableGroupActions>(VariableGroupActions);
        this._taskListActions = ActionsHubManager.GetActionsHub<TaskActions.TaskListActions>(TaskActions.TaskListActions, DtcCommon.TaskListStoreInstanceId);
        this._processVariablesActionCreator = ActionCreatorManager.GetActionCreator<ProcessVariablesActionCreator>(ProcessVariablesActionCreator);
        this._counterVariablesActionCreator = ActionCreatorManager.GetActionCreator<CounterVariableActionsCreator>(CounterVariableActionsCreator);
        this._demandsActions = ActionsHubManager.GetActionsHub<DemandsActions>(DemandsActions, Constants.DemandInstances.DefinitionInstance);
        this._messageHandlerActions = ActionsHubManager.GetActionsHub<MessageHandlerActions>(MessageHandlerActions);
        this._agentsActions = ActionsHubManager.GetActionsHub<AgentsActions>(AgentsActions, Constants.AgentsConstants.instance);
        this._itemSelectorAction = ActionsHubManager.GetActionsHub<ItemSelectorAction.Actions>(ItemSelectorAction.Actions, DtcCommon.TaskListStoreInstanceId);
        this._retentionItemSelectorAction = ActionsHubManager.GetActionsHub<ItemSelectorAction.Actions>(ItemSelectorAction.Actions, RetentionInstanceId);
        this._historyActions = ActionsHubManager.GetActionsHub<HistoryActions>(HistoryActions);
        this._saveStatusActions = ActionsHubManager.GetActionsHub<SaveStatusActionsHub>(SaveStatusActionsHub);

        this._phaseListActionsCreator = ActionCreatorManager.GetActionCreator<DeployPhaseListActionsCreator>(DeployPhaseListActionsCreator, DtcCommon.TaskListStoreInstanceId);
    }

    /**
     * @brief Creates a new Build definition
     */
    public createBuildDefinition(templateId: string, path?: string, repositoryName?: string, repositoryType?: string, triggers?: string): IPromise<void> {
        PerfUtils.instance().startNewScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.CreateNewDefinition);

        const sourcesSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        return Q.all([
            TaskDefinitionSource.instance().getTaskDefinitionList(false, Constants.BuildTasksVisibilityFilter),
            BuildDefinitionSource.instance().create(templateId, repositoryName, repositoryType, sourcesSelectionStore),
            BuildDefinitionSource.instance().getBuildOptionDefinitions(),
            BuildDefinitionSource.instance().getRetentionSettings()]).spread<any>(
                (taskDefinition: TaskDefinition[],
                buildDefinition: BuildContracts.BuildDefinition,
                buildOptionDefinitionList: BuildContracts.BuildOptionDefinition[],
                retentionSettings: BuildContracts.BuildSettings) => {

                PerfUtils.instance().splitScenario(Constants.PerfScenarios.Split_ServerInteractionComplete);

                WebPageData.WebPageDataHelper.updateBuildOptionDefinitions(buildOptionDefinitionList);

                // Update window title
                this._setDocumentTitle(buildDefinition.name);

                // Assign default unique name to build definition
                this.assignUniqueName(buildDefinition.name);

                getAllSteps(buildDefinition).forEach((step, index) => {
                    if (!step.refName || step.refName.length === 0) {
                        let matchTasks = taskDefinition.filter((task) => {
                            if (Utils_String.equals(task.id, step.task.id)) {
                                return task;
                            }
                        });
                    }
                });

                if (buildDefinition) {
                    (buildDefinition as IBuildDefinitionModel).retentionSettings = retentionSettings;
                }

                buildDefinition.path = path || DefaultPath;

                if (triggers && buildDefinition.repository) {
                    const definitionTriggers = [];
                    const ciTriggerType = BuildContracts.DefinitionTriggerType[BuildContracts.DefinitionTriggerType.ContinuousIntegration].toLowerCase();
                    const prTriggerType = BuildContracts.DefinitionTriggerType[BuildContracts.DefinitionTriggerType.PullRequest].toLowerCase();
                    const branchFilters = buildDefinition.repository.defaultBranch ? ['+' + buildDefinition.repository.defaultBranch] : [];
                    const includedTriggers: string[] = triggers.split(',').map(s => s.toLowerCase())
                    for (const triggerName of includedTriggers) {
                        if (triggerName === ciTriggerType) {
                            const ciTrigger: BuildContracts.ContinuousIntegrationTrigger = {
                                batchChanges: false,
                                maxConcurrentBuildsPerBranch: 1,
                                pollingJobId: null,
                                pollingInterval: 0,
                                pathFilters: [],
                                branchFilters: branchFilters,
                                settingsSourceType: SettingsSourceType.Definition,
                                triggerType: BuildContracts.DefinitionTriggerType.ContinuousIntegration,
                            }
                            definitionTriggers.push(ciTrigger);
                        }
                        else if (triggerName === prTriggerType) {
                            const prTrigger: BuildContracts.PullRequestTrigger = {
                                triggerType: BuildContracts.DefinitionTriggerType.PullRequest,
                                branchFilters: branchFilters,
                                pathFilters: [],
                                settingsSourceType: SettingsSourceType.Definition,
                                forks:  {
                                    enabled: true,
                                    allowSecrets: false
                                },
                                isCommentRequiredForPullRequest: false,
                                autoCancel: true
                            };
                            definitionTriggers.push(prTrigger);
                        }
                    }
                    if (definitionTriggers.length > 0) {
                        buildDefinition.triggers = definitionTriggers;
                    }
                }

                // Setting default Build job timeout as 60
                buildDefinition.jobTimeoutInMinutes = 60;

                this.invokeCreateActions(buildDefinition);

                // After retrieving agent queues, select the one from the build definition if it isn't null
                Q.all([AgentsSource.instance().getTaskAgentQueues(), AgentsSource.instance().getTaskAgentPools()]).spread((queues, pools) => {
                    this._agentsActions.createAgentsQueueSection.invoke(
                        {
                            queues: queues,
                            agentQueueFromBuild: !buildDefinition.queue ? null : Utilities.convertFromBuildQueue(buildDefinition.queue)
                        });
                });

                /*
                    Update prefetched settings. This is not required when we land directly on create page. But when landing from GettingStarted
                    we have to update the settings so that at time of save re-fetching(by REST call) is not required.
                */
                WebPageData.WebPageDataHelper.updateRetentionSettings(retentionSettings);

                // Prefetching modules which are loaded in async mode later when some action is triggered
                DtcUtils.prefetchModulesInAsyncMode(["Admin/Scripts/TFS.Admin.Security"]);

                PerfUtils.instance().recordPageLoadScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.CreateNewDefinition);
            },
            (error) => {
                this._handleError(error);
                PerfUtils.instance().abortScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.CreateNewDefinition);
                throw error;
            });
    }

    /**
     * Creates a build definition from a YAML filepath in the given repository, then navigates to edit it.
     */
    public createYamlBuildDefinitionFromRepositoryFile(repository: BuildContracts.BuildRepository, filename: string): IPromise<void> {
        this._buildDefinitionActions.creatingYamlBuildDefinitionFromRepositoryFile.invoke({});

        return Q
            .all([
                TaskDefinitionSource.instance().getTaskDefinitionList(false, Constants.BuildTasksVisibilityFilter),
                BuildDefinitionSource.instance().create("blank", repository.name, repository.type),
                BuildDefinitionSource.instance().getBuildOptionDefinitions(),
                BuildDefinitionSource.instance().getRetentionSettings()])
            .spread<any>(
                (taskDefinition: TaskDefinition[],
                 buildDefinition: BuildContracts.BuildDefinition,
                 buildOptionDefinitionList: BuildContracts.BuildOptionDefinition[],
                 retentionSettings: BuildContracts.BuildSettings) => {

                    buildDefinition.repository = repository;
                    buildDefinition.path = DefaultPath;
                    buildDefinition.jobTimeoutInMinutes = 60;
                    (buildDefinition as IBuildDefinitionModel).retentionSettings = retentionSettings;
                    buildDefinition.process = <BuildContracts.YamlProcess>{
                        yamlFilename: filename,
                        type: ProcessType.Yaml
                    };

                    return this.assignUniqueName(buildDefinition.name).then(name => {
                        buildDefinition.name = name;
                        return BuildDefinitionSource.instance().save(buildDefinition)
                            .then(savedDefinition => {
                                    // go get permissions for newly-saved definitions. nothing needs to wait for this, just let it invoke the action when it's done
                                    this._updatePermissionsForDefinition(savedDefinition, false, true);

                                    NavigationService.getHistoryService().addHistoryPoint(
                                        Constants.ContributionConstants.ACTION_EDIT_BUILD_DEFINITION,
                                        { id: savedDefinition.id },
                                        this._getWindowTitle(savedDefinition.name),
                                        false);
                                },
                                error => {
                                    this._handleError(error);
                                    throw new Error(error);
                                }
                            );
                    });
                },
                (error) => {
                    this._handleError(error);
                    throw new Error(error);
                }
            );
    }

    /**
     * @brief Edits an existing Build definition
     */
    public editBuildDefinition(buildDefinitionId: number, forceUpdate: boolean = false): IPromise<void> {
        PerfUtils.instance().startNewScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.EditDefinition);

        return Q.all([
            TaskDefinitionSource.instance().getTaskDefinitionList(true, Constants.BuildTasksVisibilityFilter),
            BuildDefinitionSource.instance().get(buildDefinitionId),
            BuildDefinitionSource.instance().getBuildOptionDefinitions(),
            BuildDefinitionSource.instance().getRetentionSettings()]).spread<any>(
                (taskDefinition: TaskDefinition[],
                buildDefinition: BuildContracts.BuildDefinition,
                buildOptionDefinition: BuildContracts.BuildOptionDefinition[],
                retentionSettings: BuildContracts.BuildSettings) => {

                // Correct the repositoryType if needed, because repositoryType is just a string so it is prone to error
                this._correctRepositoryType(buildDefinition);

                this._setDocumentTitle(buildDefinition.name);

                PerfUtils.instance().splitScenario(Constants.PerfScenarios.Split_ServerInteractionComplete);

                this._handleEditBuildDefinitionTask(buildDefinition, buildOptionDefinition, retentionSettings, forceUpdate);

                // Prefetching modules which are loaded in async mode later when some action is triggered
                DtcUtils.prefetchModulesInAsyncMode(["Admin/Scripts/TFS.Admin.Security"]);

                PerfUtils.instance().recordPageLoadScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.EditDefinition);

                this._publishEditBuildDefinitionTelemetry(buildDefinition);
            },
                (error) => {
                this._handleError(error);
                PerfUtils.instance().abortScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.EditDefinition);
                throw error;
            });
    }

    /**
    * @brief Clone an existing Build definition
    */
    public cloneBuildDefinition(buildDefinitionId: number): IPromise<void> {
        PerfUtils.instance().startNewScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.CloneDefinition);

        return Q.all([
            TaskDefinitionSource.instance().getTaskDefinitionList(true, Constants.BuildTasksVisibilityFilter),
            BuildDefinitionSource.instance().get(buildDefinitionId),
            BuildDefinitionSource.instance().getBuildOptionDefinitions(),
            BuildDefinitionSource.instance().getRetentionSettings()]).spread<any>(
                (taskDefinition: TaskDefinition[],
                buildDefinition: BuildContracts.BuildDefinition,
                buildOptionDefinition: BuildContracts.BuildOptionDefinition[],
                retentionSettings: BuildContracts.BuildSettings) => {

                this._setDocumentTitle(buildDefinition.name);

                PerfUtils.instance().splitScenario(Constants.PerfScenarios.Split_ServerInteractionComplete);

                this._handleCloneBuildDefinitionTask(buildDefinition, buildOptionDefinition, retentionSettings, false);

                // Prefetching modules which are loaded in async mode later when some action is triggered
                DtcUtils.prefetchModulesInAsyncMode(["Admin/Scripts/TFS.Admin.Security"]);

                PerfUtils.instance().recordPageLoadScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.CloneDefinition);

                Telemetry.instance().publishEvent(Feature.CloneBuildDefinition);
            },
            (error) => {
                this._handleError(error);
                PerfUtils.instance().abortScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.CloneDefinition);
                throw error;
            });
    }

    /**
    * @brief Import an existing Build definition
    */
    public importBuildDefinition(buildDefinition: BuildContracts.BuildDefinition): IPromise<void> {
        PerfUtils.instance().startNewScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.ImportDefinition);

        this._modernizeOAuthBuildOption(buildDefinition);

        return Q.all<any>([
            TaskDefinitionSource.instance().getTaskDefinitionList(true, Constants.BuildTasksVisibilityFilter),
            BuildDefinitionSource.instance().getRetentionSettings(),
            BuildDefinitionSource.instance().getBuildOptionDefinitions()]).spread<void>(
            (
                taskDefinition: TaskDefinition[],
                retentionSettings: BuildContracts.BuildSettings,
                buildOptionDefinition: BuildContracts.BuildOptionDefinition[]) => {
                // Correct the repositoryType if needed, because repositoryType is just a string so it is prone to error
                this._correctRepositoryType(buildDefinition);

                // Update window title
                this._setDocumentTitle(buildDefinition.name);

                PerfUtils.instance().splitScenario(Constants.PerfScenarios.Split_ServerInteractionComplete);

                this._handleImportBuildDefinitionTask(buildDefinition, buildOptionDefinition, retentionSettings, false);

                // Prefetching modules which are loaded in async mode later when some action is triggered
                DtcUtils.prefetchModulesInAsyncMode(["Admin/Scripts/TFS.Admin.Security"]);

                PerfUtils.instance().recordPageLoadScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.ImportDefinition);

            },
            (error) => {
                this._handleError(error);
                PerfUtils.instance().abortScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.ImportDefinition);
                throw error;
            });
    }

    /**
     * @brief Saves the build definition
     */
    public saveBuildDefinition(buildDefinition: BuildContracts.BuildDefinition, definitionToCloneId?: number, definitionToCloneRevision?: number): IPromise<void> {
        PerfUtils.instance().startNewScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.SaveDefinition);

        // validate scope
        if (buildDefinition.jobAuthorizationScope === BuildContracts.BuildAuthorizationScope.Project)
        {
            const sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
            sourceSelectionStore.getRepositoryProject(buildDefinition.repository).then((projectId: string) => {
                if (projectId !== buildDefinition.project.id)
                {
                    const buildJobStore = StoreManager.GetStore<BuildJobStore>(BuildJobStore);
                    buildJobStore.setRequiredScope(BuildContracts.BuildAuthorizationScope.ProjectCollection);
                    this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.Failure);
                    this._handleError(Resources.InvalidAuthScopeErrorMessage);
                    PerfUtils.instance().abortScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.SaveDefinition);
                    throw Resources.InvalidAuthScopeErrorMessage;
                }
                else
                {
                    return this._performSaveBuildDefinition(buildDefinition, definitionToCloneId, definitionToCloneRevision);
                }
            });
        }
        else
        {
            return this._performSaveBuildDefinition(buildDefinition, definitionToCloneId, definitionToCloneRevision);
        }
    }

     /**
     * @brief Validates the build definition
     */
    public validateBuildDefinition(buildDefinition: BuildContracts.BuildDefinition): IPromise<void> {
        PerfUtils.instance().startNewScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.ValidateDefinition);

        return this._performSaveBuildDefinition(buildDefinition, null, null, true);
    }

    private _performSaveBuildDefinition(buildDefinition: BuildContracts.BuildDefinition, definitionToCloneId?: number, definitionToCloneRevision?: number, validateOnly?: boolean): IPromise<void> {
        const isNewBuildDefinition = buildDefinition.id <= 0;
        this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.InProgress);

        return Q.all([
            BuildDefinitionSource.instance().save(buildDefinition, definitionToCloneId, definitionToCloneRevision, validateOnly),
            BuildDefinitionSource.instance().getRetentionSettings()]).spread(
            (definition: BuildContracts.BuildDefinition, retentionSettings: BuildContracts.BuildSettings) => {
                PerfUtils.instance().splitScenario(Constants.PerfScenarios.Split_ServerInteractionComplete);

                // go get permissions for newly-saved definitions. nothing needs to wait for this, just let it invoke the action when it's done
                this._updatePermissionsForDefinition(definition);

                if (!validateOnly)
                {
                    this._refreshBuildDefinitionAfterSave(definition, isNewBuildDefinition, retentionSettings);
                }

                else
                {
                    const yamlDefinitionStore = StoreManager.GetStore<YamlDefinitionStore>(YamlDefinitionStore);
                    const yamlProcess = definition.process as BuildContracts.YamlProcess;
                    this.refreshYamlContent(yamlProcess);
                }

                this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.Success);
                // Resolving the promise ensuring Save task is complete
                PerfUtils.instance().endScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.SaveDefinition);
                return null;
            },
            (error) => {
                this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.Failure);
                this._handleError(error);
                PerfUtils.instance().abortScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.SaveDefinition);
                throw error;
            });
    }

    private _updatePermissionsForDefinition(definition: BuildContracts.BuildDefinition, isClone?: boolean, forceUpdate?: boolean): void {
        const token = getDefinitionSecurityToken(definition.project.id, definition.path, definition.id);
        const permissionsStore = getPermissionsStore();
        if (!permissionsStore.hasToken(token)) {
            const permissionsBatch: PermissionEvaluationBatch = {
                alwaysAllowAdministrators: false,
                evaluations: []
            };
            addEvaluations(permissionsBatch.evaluations, token);
            getSecurityClient().hasPermissionsBatch(permissionsBatch).then((evaluatedPermissions: PermissionEvaluationBatch) => {
                permissionsRetrieved.invoke(evaluatedPermissions.evaluations);
                if (!isClone) {
                    // definition name would be changed for clone, there's no need to propagate any updates here
                    this.invokeUpdateActions(definition, null, forceUpdate);
                }
                else {
                    // if it's clone, just make it non-readonly
                    const processManagementActions = ActionsHubManager.GetActionsHub<ProcessManagementActions>(ProcessManagementActions, DtcCommon.TaskListStoreInstanceId);
                    processManagementActions.updateCapabilities.invoke(ProcessManagementCapabilities.All);
                }
            });
        }
    }

    private _correctRepositoryType(buildDefinition: BuildContracts.BuildDefinition)
    {
        if (buildDefinition.repository)
        {
            buildDefinition.repository.type = ScmUtils.convertRepoTypeToWellKnownRepoType(buildDefinition.repository.type);
        }
    }

    /**
     * @brief refreshes the build definition after save
     */
    public refreshBuildDefinitionOnSave(buildDefinition: BuildContracts.BuildDefinition, isNewBuildDefinition: boolean): IPromise<void> {
        this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.InProgress);

        return BuildDefinitionSource.instance().getRetentionSettings().then(
            (retentionSettings: BuildContracts.BuildSettings) => {

                this._refreshBuildDefinitionAfterSave(buildDefinition, isNewBuildDefinition, retentionSettings);
                this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.Success);
                // Resolving the promise ensuring Save task is complete
                return null;
            },
            (error) => {
                this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.Failure);
                this._handleError(error);
                throw error;
            });
    }

    /**
     * @brief Saves as draft the build definition
     */
    public saveBuildDefinitionAsDraft(buildDefinition: BuildContracts.BuildDefinition, info: IDefinitionInfo, replace: boolean = false): IPromise<IDefinitionInfo> {
        PerfUtils.instance().startNewScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.SaveAsDraft);
        buildDefinition.id = info.id;
        buildDefinition.revision = info.rev;

        //Original comment "Draft created" in History logs while saving as draft
        let comment = Resources.SaveAsDraftComment;

        //Removing triggers and retention as they cannot be edited in draft workflow
        buildDefinition.triggers = [];
        buildDefinition.retentionRules = [];

        if (replace) {
            // Changing comment to "Draft replaced" in History logs when replacing draft
            comment = Resources.SaveAsDraftReplaceComment;
        }

        this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.InProgress);

        let buildDefinitionDupe: BuildContracts.BuildDefinition = JQueryWrapper.extendDeep({}, buildDefinition);

        return BuildDefinitionSource.instance().saveDefinitionAsDraft(buildDefinitionDupe, comment, replace)
            .then((savedDefinition: BuildContracts.BuildDefinition) => {

                PerfUtils.instance().splitScenario(Constants.PerfScenarios.Split_SaveAsDraftServerInteractionComplete);

                // go get permissions for newly-saved draft. nothing needs to wait for this, just let it invoke the action when it's done
                this._updatePermissionsForDefinition(savedDefinition);

                // Discarding changes for the current parent Build definition
                return this.discardBuildDefinitionChanges(buildDefinition.id).then(() => {
                    PerfUtils.instance().splitScenario(Constants.PerfScenarios.Split_DiscardParentDefinitionInteractionComplete);

                    // Navigating to the Draft definition with Navigation not supressed.
                    NavigationService.getHistoryService().addHistoryPoint(
                        Constants.ContributionConstants.ACTION_EDIT_BUILD_DEFINITION,
                        { id: savedDefinition.id },
                        this._getWindowTitle(savedDefinition.name),
                        false);

                    let draftInfo: IDefinitionInfo = { id: savedDefinition.id, rev: savedDefinition.revision };
                    PerfUtils.instance().endScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.SaveAsDraft);
                    this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.Success);
                    return draftInfo;
                },
                (error) => {
                    this._handleError(error);
                    this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.Failure);
                    PerfUtils.instance().abortScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.SaveAsDraft);
                    throw error;
                });
            },
            (error) => {
                this._handleError(error);
                PerfUtils.instance().abortScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.SaveAsDraft);
                throw error;
            });
    }

    /**
     * Publishes a draft from the current definition
     * @param buildDefinition The definition to Publish
     */
    public publishDraft(definition: BuildContracts.BuildDefinition, comment: string) {
        PerfUtils.instance().startNewScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.PublishDraft);
        let parentDefinitionId: number = !!definition.draftOf ? definition.draftOf.id : -1;

        BuildDefinitionSource.instance().get(parentDefinitionId).then((parentDefinition: BuildContracts.BuildDefinition) => {
            PerfUtils.instance().splitScenario(Constants.PerfScenarios.Split_GetParentDefinitionInteractionComplete);

            this.publishDraftData(parentDefinition, definition, comment).then(() => {
                PerfUtils.instance().splitScenario(Constants.PerfScenarios.Split_PublishDraftDefinitionInteractionComplete);

                PerfUtils.instance().endScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.PublishDraft);
            });
        },
            (error) => {
                this._handleError(error);
                PerfUtils.instance().abortScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.PublishDraft);
            });
    }

    // Take the data out of draft and apply it to parentDefinition, update the parentDefinition, then delete the draft definition
    public publishDraftData(parentDefinition: BuildContracts.BuildDefinition, draft: BuildContracts.BuildDefinition, comment: string): IPromise<void> {
        let draftId: number = draft.id;

        /* Replace the
        1.)options 2.)variables 3.)build 4.)process parameters
        values on the Parent Build definition with those from the draft definition*/
        parentDefinition.options = draft.options;
        parentDefinition.variables = draft.variables;
        parentDefinition.process = draft.process;
        parentDefinition.processParameters = draft.processParameters;
        parentDefinition.queue = draft.queue;
        parentDefinition.repository = draft.repository;

        //Telemtry code for Publish with source changed
        if (!!parentDefinition.repository && !!draft.repository) {
            this._sourceChangedLogTelemetryData(parentDefinition.repository, draft.repository);
        }

        return BuildDefinitionSource.instance().publishDefinition(parentDefinition, draftId, comment)
            .then((savedDefinition: BuildContracts.BuildDefinition) => {

                // Update pre-fetched build definition.
                WebPageData.WebPageDataHelper.updateBuildDefinition(savedDefinition);

                // Navigating to the newly saved Parent definition with Navigation not supressed.
                NavigationService.getHistoryService().addHistoryPoint(
                    Constants.ContributionConstants.ACTION_EDIT_BUILD_DEFINITION,
                    { id: savedDefinition.id },
                    this._getWindowTitle(savedDefinition.name),
                    false);
            },
            (error) => {
                this._handleError(error);
                PerfUtils.instance().abortScenario(Constants.CommonConstants.FeatureArea, Constants.PerfScenarios.PublishDraft);
            });
    }

    public discardBuildDefinitionChanges(buildDefinitionId: number): IPromise<void> {
        if (buildDefinitionId > 0) {
            return this.editBuildDefinition(buildDefinitionId, true);
        }
    }

    public changeName(name: string, isCalledFromCreateClone?: boolean, defaultDefinitionName?: string): void {
        const yamlStore = StoreManager.GetStore<YamlStore>(YamlStore);
        if (!yamlStore.getState().isYaml || name)
        {
            let buildDefinitionNamePayload: Actions.IBuildDefinitionNameActionPayload = {
                name: name,
                isCalledFromCreateClone: isCalledFromCreateClone,
                defaultDefinitionName: defaultDefinitionName
            };
            this._buildDefinitionActions.changeName.invoke(buildDefinitionNamePayload);
        }
    }

    public changeDescription(description: string): void {
        this._buildDefinitionActions.changeDescription.invoke(description);
    }

    public changeBuildNumberFormat(buildNumberFormat: string): void {
        this._buildDefinitionActions.changeBuildNumberFormat.invoke(buildNumberFormat);
    }

    public changeBadgeEnabled(badgeEnabled: boolean): void {
        this._buildDefinitionActions.changeBadgeEnabled.invoke(badgeEnabled);
    }

    public changeYamlPath(yamlPath: string): void {
        this._buildDefinitionActions.changeYamlPath.invoke(yamlPath);
    }

    public refreshYamlContent(process: BuildContracts.YamlProcess): void {
        this._buildDefinitionActions.refreshYamlContent.invoke(process);
    }

    public changeQueueStatus(queueStatus: BuildContracts.DefinitionQueueStatus): void {
        this._buildDefinitionActions.changeQueueStatus.invoke(queueStatus);
    }

    public showSaveDialog(): void {
        this._buildDefinitionActions.showSaveDialog.invoke({});
    }

    public closeSaveDialog(): void {
        this._buildDefinitionActions.closeSaveDialog.invoke({});
    }

    public fetchRevisionData(id: number): void {
        BuildDefinitionSource.instance().fetchRevisionData(id).then((revisions: BuildContracts.BuildDefinitionRevision[]) => {
            this._buildDefinitionActions.updateRevisions.invoke(revisions);
        });
    }

    public toggleBuildOption(key: string, newValue: boolean): void {
        this._buildDefinitionActions.toggleBuildOption.invoke({ key: key, value: newValue } as Actions.IToggleBuildOptionActionPayload);
    }

    public updateScope(scopeId: number) {
        return this._buildDefinitionActions.updateScope.invoke(scopeId);
    }

    public updateBuildJobTimeout(timeoutVal: string) {
        return this._buildDefinitionActions.updateBuildJobTimeout.invoke(timeoutVal);
    }

    public updateBuildJobCancelTimeout(timeoutVal: string) {
        return this._buildDefinitionActions.updateBuildJobCancelTimeout.invoke(timeoutVal);
    }

    public revertBuildDefinition(definitionId: number, currentRevision: number, targetRevision: number, comment: string) {
        BuildDefinitionSource.instance().getBuildDefinitionRevision(definitionId, targetRevision).then(
            (buildDefinition: BuildContracts.BuildDefinition) => {
                buildDefinition.revision = currentRevision;
                buildDefinition.comment = comment;
                this.saveBuildDefinition(buildDefinition);
                this.invokeUpdateActions(buildDefinition, [], true);
                this._historyActions.CloseRevertConfirmationDialog.invoke(null);
            });
    }

    private _handleError(error): void {
        this._messageHandlerActions.addMessage.invoke({ parentKey: Constants.ErrorMessageParentKeyConstants.Main, message: (error.message || error), statusCode: error.status } as IAddMessagePayload);
    }

    // public to unit test
    public invokeCreateActions(buildDefinition: BuildContracts.BuildDefinition, queues: TaskAgentQueue[] = []): void {
        ReactPerf.start();

        this._buildDefinitionActions.createBuildDefinition.invoke(buildDefinition);

        this._phaseListStore = StoreManager.GetStore<PhaseListStore>(PhaseListStore, DtcCommon.TaskListStoreInstanceId);
        let phases = getPhases(buildDefinition);

        const projectId = VssContext.getDefaultWebContext().project.id;
        let token: string = projectId;

        const isExistingDefinition: boolean = buildDefinition.id > 0;

        if (isExistingDefinition || (buildDefinition.path && buildDefinition.path !== DefaultPath)) {
            token = getDefinitionSecurityToken(projectId, buildDefinition.path, buildDefinition.id);
        }

        const isReadOnly = !getPermissionsStore().hasPermission(token, BuildPermissions.EditBuildDefinition);

        const processManagementActions = ActionsHubManager.GetActionsHub<ProcessManagementActions>(ProcessManagementActions, DtcCommon.TaskListStoreInstanceId);
        processManagementActions.updateCapabilities.invoke(isReadOnly ? ProcessManagementCapabilities.None : ProcessManagementCapabilities.All);

        this._initializeProcessParameters(buildDefinition, phases);
        this._updatePhases(phases);

        this._processVariablesActionCreator.createProcessVariables({
            definitionId: buildDefinition.id,
            variableList: VariableUtils.convertVariablesDictionaryToArray(buildDefinition.variables),
            disabledMode: isReadOnly
        });

        this._counterVariablesActionCreator.createCounterVariables({});

        this._demandsActions.createDemands.invoke({ demands: DtcUtils.convertSerializedDemandToDemandData(buildDefinition.demands) });

        // If the queue is there, initialize the agent stores with right queue id
        if (!!buildDefinition.queue) {
            this._agentsActions.updateAgentQueue.invoke(buildDefinition.queue.id);
        }

        this._updateVariableGroups(buildDefinition);

        ReactPerf.stop();
        ReactPerf.printWasted(ReactPerf.getLastMeasurements());
    }

    // public to unit test
    public invokeUpdateActions(buildDefinition: BuildContracts.BuildDefinition, queues: TaskAgentQueue[] = [], forceUpdate: boolean = false, updateProject: boolean = false): void {
        ReactPerf.start();

        this._buildDefinitionActions.updateBuildDefinition.invoke(buildDefinition);

        this._phaseListStore = StoreManager.GetStore<PhaseListStore>(PhaseListStore, DtcCommon.TaskListStoreInstanceId);
        let phases = getPhases(buildDefinition);

        const projectId = VssContext.getDefaultWebContext().project.id;
        let token: string = projectId;

        const isExistingDefinition: boolean = buildDefinition.id > 0;

        if (isExistingDefinition || (buildDefinition.path && buildDefinition.path !== DefaultPath)) {
            token = getDefinitionSecurityToken(projectId, buildDefinition.path, buildDefinition.id);
        }
        
        const isReadOnly = !getPermissionsStore().hasPermission(token, BuildPermissions.EditBuildDefinition);

        const processManagementActions = ActionsHubManager.GetActionsHub<ProcessManagementActions>(ProcessManagementActions, DtcCommon.TaskListStoreInstanceId);
        processManagementActions.updateCapabilities.invoke(isReadOnly ? ProcessManagementCapabilities.None : ProcessManagementCapabilities.All);

        this._initializeProcessParameters(buildDefinition, phases);
        this._updatePhases(phases, forceUpdate);

        this._processVariablesActionCreator.updateProcessVariables({
            definitionId: buildDefinition.id,
            variableList: VariableUtils.convertVariablesDictionaryToArray(buildDefinition.variables),
            forceUpdate: forceUpdate,
            disabledMode: isReadOnly
        });

        this._demandsActions.updateDemands.invoke({ demands: DtcUtils.convertSerializedDemandToDemandData(buildDefinition.demands), forceUpdate: forceUpdate });

        // If the queue is there, initialize the agent stores with right queue id
        if (!!buildDefinition.queue) {
            this._agentsActions.updateAgentQueue.invoke(buildDefinition.queue.id);
        }

        if (forceUpdate) {
            this._itemSelectorAction.updateSelection.invoke([]);
        }

        // Check if a project update is needed(when loading a build definition), then check if a private repo is used in a public project
        if (updateProject)
        {
            const currentProjectId = TfsContext.getDefault().contextData.project.id;
            const sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
            sourceSelectionStore.getRepositoryProject(buildDefinition.repository).then((projectId: string) => {
                if (DefinitionUtils.IsThereVisibilityConflict(currentProjectId, projectId))
                {
                    const actionCreator = ActionCreatorManager.GetActionCreator<SourcesSelectionActionsCreator>(SourcesSelectionActionsCreator);
                    actionCreator.changeTfProject(currentProjectId, true);
                }
            });
        }

        this._updateVariableGroups(buildDefinition);

        ReactPerf.stop();
        ReactPerf.printWasted(ReactPerf.getLastMeasurements());
    }

    /**
     * @brief Saves the build definition
     */
    public _refreshBuildDefinitionAfterSave(definition: BuildContracts.BuildDefinition, isNewBuildDefinition: boolean, retentionSettings: BuildContracts.BuildSettings): void {
        this._messageHandlerActions.dismissMessage.invoke(Constants.ErrorMessageParentKeyConstants.Main);
        this._clearSourcesError();

        if (definition) {
            (definition as IBuildDefinitionModel).retentionSettings = retentionSettings;
        }

        BuildDefinitionSource.instance().fetchRevisionData(definition.id).then((definitionRevisions: BuildContracts.BuildDefinitionRevision[]) => {
            this._historyActions.UpdateRevisions.invoke(Utilities.convertBuildDefinitionRevisionToColumn(definitionRevisions));
        });

        this.invokeUpdateActions(definition);

        // Fetching Agents which are configured
        AgentsSource.instance().getTaskAgentQueues().then((queues: TaskAgentQueue[]) => {
            this._agentsActions.updateAgentsQueueSection.invoke({ queues: queues, agentQueueFromBuild: Utilities.convertFromBuildQueue(definition.queue) });
        });

        if (isNewBuildDefinition) {
            NavigationService.getHistoryService().addHistoryPoint(
                Constants.ContributionConstants.ACTION_EDIT_BUILD_DEFINITION,
                { id: definition.id },
                this._getWindowTitle(definition.name),
                true);
        }
        else {
            this._setDocumentTitle(definition.name);
        }

        // Update pre-fetched build definition.
        WebPageData.WebPageDataHelper.updateBuildDefinition(definition);

        // Publishing telemetry on Save
        this._getReadOnlyDemands().then((demands) => {
            let readOnlyDemandsCount: number = demands ? demands.length : 0;
            TelemetryUtils.publishBuildDefinitionTelemetryOnSave(definition, isNewBuildDefinition, readOnlyDemandsCount);
        });
    }

    private _initializeExternalGitRepository(buildDefinition: BuildContracts.BuildDefinition) {
        if (buildDefinition && buildDefinition.repository) {
            const versionControlStore = StoreManager.GetStore<VersionControlStore>(VersionControlStore);
            const state: IVersionControlState = versionControlStore.getState();
            if (state.selectedConnectionId && state.endpointType) {
                const connectedServiceEndpointActionsCreator = ActionCreatorManager.GetActionCreator<ConnectedServiceActionsCreator>(ConnectedServiceActionsCreator);
                connectedServiceEndpointActionsCreator.getServiceEndpoints(state.endpointType, state.selectedConnectionId, state.selectedRepository.name);
            }
        }
    }

    private _initializeProcessParameters(buildDefinition: BuildContracts.BuildDefinition, phases: BuildContracts.Phase[]): void {
        // the ProcessParameters store requires phases at initialize time, or it will prune the process parameters and they won't be "resolved"
        // the phases here are otherwise unused
        this._processParameterActions.initializeProcessParameters.invoke(this._getUpdateProcessParametersPayload(buildDefinition.processParameters, phases.map((phase: BuildContracts.Phase, index: number) => {
            return <IDeployPhase>{
                name: phase.name,
                refName: phase.refName,
                phaseType: DeployPhaseTypes.Undefined,
                rank: index,
                tasks: phase.steps
            };
        })));
    }

    private _clearSourcesError() {
        const vcActions: VersionControlActions = ActionsHubManager.GetActionsHub<VersionControlActions>(VersionControlActions);
        vcActions.clearError.invoke({});
    }

    private _getReadOnlyDemands(): IPromise<any> {
        if (!!this._phaseListStore) {
            let firstPhase = this._phaseListStore.getPhaseStores()[0];
            if (!!firstPhase) {
                return Q.resolve(firstPhase.getReadOnlyDemands());
            }
        }

        return Q.resolve([]);
    }

    private _updateVariableGroups(buildDefinition: BuildContracts.BuildDefinition) {
        let variableGroupReferences: IVariableGroupReference[] = [];
        let variableGroups: DTVariableGroup[] = [];

        // We resolve back variable groups from server, so just send them directly instead of using action creator to just send ids which will make a call to get variable groups
        //  we only set name, description, list of variables, id - This should be what the UI needs to display
        //  if we ever need to display more, we should add it to definition's variable group contract
        (buildDefinition.variableGroups || []).forEach((variableGroup) => {
            variableGroupReferences.push({ groupId: variableGroup.id });

            let dtVariables: IDictionaryStringTo<DTVariableValue> = {};
            // If the group isn't available, then we won't get any variables, only Id is guaranteed
            Object.keys(variableGroup.variables || {}).forEach((key) => {
                let variableValue = variableGroup.variables[key];
                dtVariables[key] = {
                    isSecret: variableValue.isSecret,
                    value: variableValue.value
                };
            });

            variableGroups.push(<DTVariableGroup>{
                id: variableGroup.id,
                name: variableGroup.name,
                description: variableGroup.description,
                variables: dtVariables
            });
        });

        this._variableGroupActions.initializeVariableGroups.invoke({
            groupReferences: variableGroupReferences,
            result: variableGroups
        });
    }

    private _handleEditBuildDefinitionTask(buildDefinition: BuildContracts.BuildDefinition,
        buildOptionDefinition: BuildContracts.BuildOptionDefinition[],
        retentionSettings: BuildContracts.BuildSettings,
        forceUpdate: boolean = false): void {

        if (buildDefinition) {
            (buildDefinition as IBuildDefinitionModel).retentionSettings = retentionSettings;
        }

        this.invokeUpdateActions(buildDefinition, [], forceUpdate, true);

        // Fetching Agents which are configured
        AgentsSource.instance().getTaskAgentQueues().then((queues: TaskAgentQueue[]) => {
            this._agentsActions.updateAgentsQueueSection.invoke({ queues: queues, agentQueueFromBuild: Utilities.convertFromBuildQueue(buildDefinition.queue), forceUpdate: true });
        });

        // Fetch revisions for the build definition
        BuildDefinitionSource.instance().fetchRevisionData(buildDefinition.id).then((definitionRevisions: BuildContracts.BuildDefinitionRevision[]) => {
            this._historyActions.UpdateRevisions.invoke(Utilities.convertBuildDefinitionRevisionToColumn(definitionRevisions));
        });

        // Fetch repository info for gitHub and Bitbucket. This is needed to populate branches in options
        // tab even when user have not clicked on sources
        this._initializeExternalGitRepository(buildDefinition);
    }

    private _handleImportBuildDefinitionTask(buildDefinition: BuildContracts.BuildDefinition,
        buildOptionDefinition: BuildContracts.BuildOptionDefinition[],
        retentionSettings: BuildContracts.BuildSettings,
        forceUpdate: boolean = false): void {

        WebPageData.WebPageDataHelper.updateBuildOptionDefinitions(buildOptionDefinition);

        if (buildDefinition) {
            buildDefinition.id = 0;
            buildDefinition.revision = 0;
            (buildDefinition as IBuildDefinitionModel).retentionSettings = retentionSettings;
        }

        // Remove the queue and let the user pick a queue because the user may not have access to the queue
        // or the queue may not exist in case of import from  a different project
        buildDefinition.queue = undefined;

        // update the name to add "-import"
        buildDefinition.name = buildDefinition.name + Resources.ImportDefaultNameSuffix;

         // Remove the repository and let the user pick source because that repository may not exist in case of import from  a different project
        if (buildDefinition.repository && (buildDefinition.repository.type === RepositoryTypes.TfsGit || buildDefinition.repository.type === RepositoryTypes.TfsVersionControl)) {
            const sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
            sourceSelectionStore.getRepositoryProject(buildDefinition.repository).then((projectId: string) => {
                if (DefaultRepositorySource.instance().getProjectInfos().find(p => p.project.id === projectId))
                {
                    this.invokeUpdateActions(buildDefinition, [], forceUpdate);
                }
                else
                {
                    this._setDefaultRepostiory(buildDefinition, forceUpdate);
                }
            }, () => {
                // in case the repository was not found in the current project then clear it out
                this._setDefaultRepostiory(buildDefinition, forceUpdate);
            });
        }
        else {
            this.invokeUpdateActions(buildDefinition, [], forceUpdate);
        }

        // update team project to the current project
        buildDefinition.project = {
            id: TfsContext.getDefault().contextData.project.id,
            name: TfsContext.getDefault().contextData.project.name
        } as TeamProjectReference;

        // Fetching Agents which are configured
        AgentsSource.instance().getTaskAgentQueues().then((queues: TaskAgentQueue[]) => {
            this._agentsActions.updateAgentsQueueSection.invoke({ queues: queues, agentQueueFromBuild: Utilities.convertFromBuildQueue(buildDefinition.queue), forceUpdate: true });
        });

        this.changeName(buildDefinition.name);
    }

    private _setDefaultRepostiory(buildDefinition: BuildContracts.BuildDefinition, forceUpdate: boolean = false)
    {
        const sourceSelectionStore = StoreManager.GetStore<SourcesSelectionStore>(SourcesSelectionStore);
        DefaultRepositorySource.instance().getDefaultRepositoryType().then((repositoryType: string) => {
            let repository = { type: repositoryType } as BuildContracts.BuildRepository;
            buildDefinition.repository = sourceSelectionStore.getBuildRepository(repositoryType);
            this.invokeUpdateActions(buildDefinition, [], forceUpdate);
        });
    }

    private _handleCloneBuildDefinitionTask(buildDefinition: BuildContracts.BuildDefinition,
        buildOptionDefinition: BuildContracts.BuildOptionDefinition[],
        retentionSettings: BuildContracts.BuildSettings,
        forceUpdate: boolean = false): void {

        WebPageData.WebPageDataHelper.updateBuildOptionDefinitions(buildOptionDefinition);

        if (buildDefinition) {
            this._buildDefinitionActions.cloneBuildDefinition.invoke(buildDefinition);
            buildDefinition.id = 0;
            buildDefinition.revision = 0;
            (buildDefinition as IBuildDefinitionModel).retentionSettings = retentionSettings;
        }

        // go get permissions for cloned definition. nothing needs to wait for this, just let it invoke the action when it's done
        this._updatePermissionsForDefinition(buildDefinition, true);

        this.invokeUpdateActions(buildDefinition, [], forceUpdate);

        // Fetching Agents which are configured
        AgentsSource.instance().getTaskAgentQueues().then((queues: TaskAgentQueue[]) => {
            this._agentsActions.updateAgentsQueueSection.invoke({ queues: queues, agentQueueFromBuild: Utilities.convertFromBuildQueue(buildDefinition.queue), forceUpdate: true });
        });

        this.changeName(buildDefinition.name + Constants.CloneConstants.defaultNameSuffix);

        this.assignUniqueName(buildDefinition.name + Constants.CloneConstants.defaultNameSuffix);
    }

    private _getUpdateTaskPayload(updatedTasks: BuildContracts.BuildDefinitionStep[], forceUpdate: boolean = false) {
        let tasks = updatedTasks || [];
        let updateTaskPayload: TaskActions.IUpdateTaskPayload = {
            tasks: tasks,
            forceUpdate: forceUpdate
        };
        return updateTaskPayload;
    }

    // public to unit test
    public assignUniqueName(buildDefinitionName: string): IPromise<string> {
        const options: GetDefinitionsOptions = {
            name: buildDefinitionName + "*",
            queryOrder: BuildContracts.DefinitionQueryOrder.DefinitionNameAscending
        };
        return BuildDefinitionSource.instance().getDefinitions(options).then(
            (definitionsResult: GetDefinitionsResult) => {
                const definitionNames = definitionsResult.definitions.map(d => d.name);

                let uniqueName: string = buildDefinitionName;
                if (definitionNames.length !== 0 && DefinitionNameUtils.isNameAlreadyTaken(buildDefinitionName, definitionNames)) {
                    uniqueName = DefinitionNameUtils.getNonConflictingDefinitionName(buildDefinitionName, definitionNames);
                    this.changeName(uniqueName, true, buildDefinitionName);
                }

                return uniqueName;
            },
            (error: any) => {
                Diag.logError(error);
                return null;
            }
        );
    }

    private _getUpdateProcessParametersPayload(procParams, phases: IDeployPhase[]) {
        let phaseList = phases || [];
        let updateProcessParametersPayload: IInitializeProcessParametersPayload = {
            processParameters: procParams,
            phaseList: phaseList
        };
        return updateProcessParametersPayload;
    }

    private _sourceChangedLogTelemetryData(parentRepo: BuildContracts.BuildRepository, draftRepo: BuildContracts.BuildRepository) {
        let sourceChangedTelemetryProp: IDictionaryStringTo<boolean> = {};
        let sourceChanged: boolean = false;

        //If the Source type is different OR branch OR repo is changed then source changed
        if (parentRepo.type !== draftRepo.type || parentRepo.defaultBranch !== draftRepo.defaultBranch || parentRepo.name !== draftRepo.name) {
            sourceChanged = true;
        }
        sourceChangedTelemetryProp[Properties.SourceDataChangedForDraft] = sourceChanged;
        Telemetry.instance().publishEvent(Feature.PublishDraftBuildDefinition, sourceChangedTelemetryProp);
    }

    private _publishEditBuildDefinitionTelemetry(buildDefinition: BuildContracts.BuildDefinition) {
        let editBuildDefinitionTelemetryProperties: IDictionaryStringTo<any> = {};
        if (buildDefinition && isDesignerDefinition(buildDefinition)) {
            let tasksCount: number = getAllSteps(buildDefinition).length;
            editBuildDefinitionTelemetryProperties[Properties.TasksCount] = tasksCount;
        }

        Telemetry.instance().publishEvent(Feature.EditBuildDefinition, editBuildDefinitionTelemetryProperties);
    }

    private _updatePhases = (phases: BuildContracts.Phase[], forceUpdate: boolean = false) => {
        let existingPhaseRefNames = [];
        phases.forEach(p => existingPhaseRefNames.push(p.refName));

        let phaseModels: IDeployPhase[] = phases.map((phase, index) => {
            // name the phase if it doesn't already have a name
            let name: string = phase.name || Utils_String.format(Resources.DefaultPhaseNameFormat, index + 1);

            let refName: string = phase.refName || RefNames.GenerateUniqueRefNameForPhase(existingPhaseRefNames);
            existingPhaseRefNames.push(refName);

            let dependencies = phase.dependencies || [];

            // if there is no phase target, the UI will default to Agent
            let phaseType: DeployPhaseTypes = DeployPhaseTypes.DefaultPhase;
            switch (phase.target ? phase.target.type : PhaseTargetType.Agent) {
                case PhaseTargetType.Server: {
                    let serverTarget = phase.target as BuildContracts.ServerTarget;
                    if (!serverTarget) {
                        serverTarget = <BuildContracts.ServerTarget>{};
                    }

                    let executionModel: IExecutionInput = null;
                    const executionType = !!serverTarget.executionOptions ? serverTarget.executionOptions.type : ServerTargetExecutionType.Normal;
                    switch (executionType) {
                        case ServerTargetExecutionType.VariableMultipliers: {
                            const parallelExecutionOptions = serverTarget.executionOptions as BuildContracts.VariableMultipliersServerExecutionOptions;
                            executionModel = <IMultiConfigInput>{
                                parallelExecutionType: ParallelExecutionTypes.MultiConfiguration,
                                maxNumberOfAgents: parallelExecutionOptions.maxConcurrency,
                                multipliers: (parallelExecutionOptions.multipliers || []).join(","),
                                continueOnError: parallelExecutionOptions.continueOnError
                            };
                            break;
                        }
                        case ServerTargetExecutionType.Normal:
                        default: {
                            executionModel = {
                                parallelExecutionType: ParallelExecutionTypes.None
                            };
                            break;
                        }
                    }

                    return <IRunOnServerDeployPhase>{
                        name: name,
                        refName: refName,
                        rank: index,
                        tasks: phase.steps,
                        phaseType: DeployPhaseTypes.RunOnServer,
                        deploymentInput: {
                            parallelExecution: executionModel,
                            condition: phase.condition || PhaseConditionTypeKeys.Succeeded,
                            jobCancelTimeoutInMinutes: phase.jobCancelTimeoutInMinutes,
                            timeoutInMinutes: phase.jobTimeoutInMinutes,
                            shareOutputVariables: false,
                            overrideInputs: {},
                            dependencies: dependencies
                        }
                    };
                }

                case PhaseTargetType.Agent:
                default: {
                    let agentTarget = phase.target as BuildContracts.AgentPoolQueueTarget;
                    if (!agentTarget) {
                        agentTarget = <BuildContracts.AgentPoolQueueTarget>{};
                    }
                    if (!agentTarget.queue || !agentTarget.queue.id) {
                        agentTarget.queue = <BuildContracts.AgentPoolQueue>{
                            id: 0
                        };
                    }

                    let executionModel: IExecutionInput = null;
                    const executionType = !!agentTarget.executionOptions ? agentTarget.executionOptions.type : AgentTargetExecutionType.Normal;
                    switch (executionType) {
                        case AgentTargetExecutionType.VariableMultipliers: {
                            const parallelExecutionOptions = agentTarget.executionOptions as BuildContracts.VariableMultipliersAgentExecutionOptions;
                            executionModel = <IMultiConfigInput>{
                                parallelExecutionType: ParallelExecutionTypes.MultiConfiguration,
                                maxNumberOfAgents: parallelExecutionOptions.maxConcurrency,
                                multipliers: (parallelExecutionOptions.multipliers || []).join(","),
                                continueOnError: parallelExecutionOptions.continueOnError,
                            };
                            break;
                        }
                        case AgentTargetExecutionType.MultipleAgents: {
                            const parallelExecutionOptions = agentTarget.executionOptions as BuildContracts.MultipleAgentExecutionOptions;
                            executionModel = <IMultiMachineInput>{
                                parallelExecutionType: ParallelExecutionTypes.MultiMachine,
                                maxNumberOfAgents: parallelExecutionOptions.maxConcurrency,
                                continueOnError: parallelExecutionOptions.continueOnError
                            };
                            break;
                        }
                        case AgentTargetExecutionType.Normal:
                        default: {
                            executionModel = {
                                parallelExecutionType: ParallelExecutionTypes.None
                            };
                            break;
                        }
                    }

                    return <IAgentBasedDeployPhase>{
                        name: name,
                        refName: refName,
                        rank: index,
                        tasks: phase.steps,
                        phaseType: DeployPhaseTypes.AgentBasedDeployment,
                        deploymentInput: {
                            imageId: null,
                            condition: phase.condition || PhaseConditionTypeKeys.Succeeded,
                            jobCancelTimeoutInMinutes: phase.jobCancelTimeoutInMinutes,
                            timeoutInMinutes: phase.jobTimeoutInMinutes,
                            parallelExecution: executionModel,
                            demands: agentTarget.demands,
                            enableAccessToken: agentTarget.allowScriptsAuthAccessOption,
                            queueId: agentTarget.queue.id,
                            skipArtifactsDownload: true, // this line should not be necessary
                            shareOutputVariables: true,
                            dependencies: dependencies
                        }
                    };
                }
            }
        });

        this._phaseListActionsCreator.updatePhases(phaseModels, forceUpdate);
    }

    private _modernizeOAuthBuildOption(definition: BuildContracts.BuildDefinition): void {
        let OAuthOptionIndex = -1;
        for (let i = 0; i < definition.options.length; i++) {
            if (Utils_String.equals(definition.options[i].definition.id, Constants.BuildOptionsConstants.oauthTokenBuildOptionId, true)) {
                OAuthOptionIndex = i;
                break;
            }
        }

        if (OAuthOptionIndex >= 0) {
            // Move AllowScriptsAuthAccessBuildOption to phase level and delete it from definition level at the end.
            getPhases(definition).forEach((phase: BuildContracts.Phase) => {

                // If target is not set for phase, assume agent type target
                if (!phase.target) {
                    phase.target = <BuildContracts.AgentPoolQueueTarget>{
                        type: PhaseTargetType.Agent
                    };
                }

                if (!phase.target.type || phase.target.type === PhaseTargetType.Agent) {
                    (phase.target as BuildContracts.AgentPoolQueueTarget).allowScriptsAuthAccessOption = definition.options[OAuthOptionIndex].enabled;
                }
            });

            definition.options.splice(OAuthOptionIndex);
        }
    }

    private _setDocumentTitle(title: string): void {
        document.title = this._getWindowTitle(title);
    }

    private _getWindowTitle(title: string): string {
        let titleFormat = VssContext.getPageContext().webAccessConfiguration.isHosted ? VSS_Resources_Platform.PageTitleWithContent_Hosted : VSS_Resources_Platform.PageTitleWithContent;
        return Utils_String.format(titleFormat, title || Utils_String.empty);
    }
}

function addEvaluations(target: PermissionEvaluation[], token: string): void {
    // there is no QueryEffectivePermissions on the security API, so we need to explicitly request each bit
    PermissionBits.forEach((permission: number) => {
        target.push({
            securityNamespaceId: BuildSecurity.BuildNamespaceId,
            token: token,
            permissions: permission,
            value: false
        });
    });
}

// all of the permissions our UI might check
const PermissionBits: number[] = [
    BuildPermissions.ViewBuilds,
    BuildPermissions.RetainIndefinitely,
    BuildPermissions.DeleteBuilds,
    BuildPermissions.UpdateBuildInformation,
    BuildPermissions.QueueBuilds,
    BuildPermissions.ManageBuildQueue,
    BuildPermissions.StopBuilds,
    BuildPermissions.ViewBuildDefinition,
    BuildPermissions.EditBuildDefinition,
    BuildPermissions.DeleteBuildDefinition,
    BuildPermissions.AdministerBuildPermissions,
    BuildPermissions.EditBuildQuality
];
