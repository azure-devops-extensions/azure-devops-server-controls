/**
 * Action creator for DeployPipeline definition
 */

import * as Q from "q";

import { DeploymentGroupsActions } from "DistributedTaskControls/Actions/DeploymentGroupsActions";
import { IAddMessagePayload, MessageHandlerActions } from "DistributedTaskControls/Actions/MessageHandlerActions";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { SaveStatus, SaveStatusActionsHub } from "DistributedTaskControls/Actions/SaveStatusActionsHub";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { DefinitionNameUtils } from "DistributedTaskControls/Common/DefinitionNameUtils";
import { ITemplateDefinition } from "DistributedTaskControls/Common/Types";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { PhaseCache } from "DistributedTaskControls/Phase/PhaseCache";
import { HistoryActions } from "DistributedTaskControls/SharedViews/ContainerTabs/HistoryTab/HistoryActions";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";
import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";
import { Status } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";

import { AllDefinitionsContentKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { AgentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/AgentUtils";
import { ArtifactListActionCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListActionCreator";
import { EditorActions } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { ErrorMessageParentKeyConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { TemplateConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { TelemetryHelper } from "PipelineWorkflow/Scripts/Common/TelemetryHelper";
import * as EditorModels from "PipelineWorkflow/Scripts/Editor/Common/EditorModels";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { PermissionTelemetryHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionTelemetryHelper";
import {
    IReleaseDefinitionsResult,
    PipelineArtifact,
    PipelineArtifactSourceTrigger,
    PipelineArtifactTypes,
    PipelineDefinition,
    PipelineDefinitionEnvironment,
    PipelineDefinitionRevision,
    PipelineExtensionAreas,
    PipelineRelease,
    PipelineReleaseEditorActions,
    PipelineReleaseStartMetadata,
    PipelineSettings,
    PipelineTriggerType,
    PipelineDefinitionContractMetadata,
    PipelineDeployPhase,
    PipelineDeployPhaseTypes,
    PipelineRunOnMachineGroupDeployPhase,
    PipelineEnvironmentApprovals,
    IEnvironmentVariablesData
} from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
// TODO- Move the draft release funciton out of below and keep it in a common place, so that this dependency is not there
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";

import { HistoryUtils } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/HistoryTab/HistoryUtils";
import { CreateReleaseStatus, DefinitionActionsHub, IChangeDefinitionNamePayload } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActions";
import { EnvironmentListActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListActionsCreator";
import { DeployPipelineDefinitionSource } from "PipelineWorkflow/Scripts/Editor/Sources/DeployPipelineDefinitionSource";
import { EnvironmentTemplateSource } from "PipelineWorkflow/Scripts/Editor/Sources/EnvironmentTemplateSource";
import { EnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/EnvironmentUtils";
import { ReleaseSource } from "PipelineWorkflow/Scripts/Shared/Sources/ReleaseSource";
import { OptionsActionsCreator } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/OptionsActionsCreator";
import { DefinitionSettingsActionsCreator } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionSettingsActionsCreator";
import { DefinitionStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionStore";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { DefinitionVariablesUtils } from "PipelineWorkflow/Scripts/Editor/Common/DefinitionVariablesUtils";
import { DefinitionVariablesActionsCreator } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/VariablesTab/DefinitionVariablesActionsCreator";
import { IVariablesData } from "PipelineWorkflow/Scripts/Common/Types";
import { VariableGroupActionsCreator } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActionsCreator";

import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { CanvasSelectorConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";

import { DeploymentGroupExpands } from "TFS/DistributedTask/Contracts";
import { IDeploymentGroupsResult } from "DistributedTaskControls/Common/Types";
import { WebUIConstants } from "ReleaseManagement/Core/WebUIConstants";
import { MessageBarType } from "OfficeFabric/MessageBar";

import * as Diag from "VSS/Diag";
import * as NavigationService from "VSS/Navigation/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Serialization from "VSS/Serialization";

import { VariableGroup } from "ReleaseManagement/Core/Contracts";

export class DefinitionActionsCreator extends ActionsBase.ActionCreatorBase {

    /**
     * @brief Key for Definition Action creator
     */
    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_DefinitionActionCreator;
    }

    public initialize(): void {

        this._artifactListActionCreator = ActionCreatorManager.GetActionCreator<ArtifactListActionCreator>(ArtifactListActionCreator);
        this._environmentListActionsCreator = ActionCreatorManager.GetActionCreator<EnvironmentListActionsCreator>(EnvironmentListActionsCreator);
        this._variablesActionsCreator = ActionCreatorManager.GetActionCreator<DefinitionVariablesActionsCreator>(DefinitionVariablesActionsCreator);
        this._variableGroupActionsCreator = ActionCreatorManager.GetActionCreator<VariableGroupActionsCreator>(VariableGroupActionsCreator);
        this._optionsActionsCreator = ActionCreatorManager.GetActionCreator<OptionsActionsCreator>(OptionsActionsCreator);
        this._overlayPanelActionsCreator = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator, CanvasSelectorConstants.CanvasSelectorInstance);

        this._definitionActionsHub = ActionsHubManager.GetActionsHub<DefinitionActionsHub>(DefinitionActionsHub);
        this._definitionSettingsActionsCreator = ActionCreatorManager.GetActionCreator<DefinitionSettingsActionsCreator>(DefinitionSettingsActionsCreator);
        this._historyActions = ActionsHubManager.GetActionsHub<HistoryActions>(HistoryActions);
        this._messageHandlerActions = ActionsHubManager.GetActionsHub<MessageHandlerActions>(MessageHandlerActions);
        this._deploymentGroupsActions = ActionsHubManager.GetActionsHub<DeploymentGroupsActions>(DeploymentGroupsActions);
        this._saveStatusActions = ActionsHubManager.GetActionsHub<SaveStatusActionsHub>(SaveStatusActionsHub);

        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
    }

    public createDefinition(path?: string, buildDefinitionId?: number, buildDefinitionName?: string, projectId?: string, projectName?: string, templateId?: string, properties?: IDictionaryStringTo<any>): IPromise<void[]> {
        let pipelineDefinition = new EditorModels.ReleaseDefinitionModel(this._getNewReleaseDefinitionName(buildDefinitionName));
        pipelineDefinition.path = path ? path : AllDefinitionsContentKeys.PathSeparator;
        pipelineDefinition.properties = properties;
        let assignUniqueNamePromise: IPromise<void> = this.assignUniqueName(pipelineDefinition.name);

        this._getAllDeploymentGroups();

        if (!!buildDefinitionId && !!buildDefinitionName) {
            // From the build summary page scenario
            let artifact: PipelineArtifact = null;
            if (!!projectId && !!projectName) {
                artifact = EditorModels.Artifact.createArtifact(
                    { id: buildDefinitionId.toString(), name: buildDefinitionName },
                    PipelineArtifactTypes.Build,
                    null,
                    { id: projectId, name: projectName }
                );
            }
            else {
                artifact = EditorModels.Artifact.createArtifact(
                    { id: buildDefinitionId.toString(), name: buildDefinitionName },
                    PipelineArtifactTypes.Build
                );
            }

            pipelineDefinition.artifacts.push(artifact);

            // We create the trigger by default if the BD is linked and RD creation source is not TEST
            if (properties && properties[Properties.DefinitionCreationSource] !== WebUIConstants.CreateDefinitionSourceTest) {
                let trigger: PipelineArtifactSourceTrigger = {
                    triggerType: PipelineTriggerType.ArtifactSource,
                    artifactAlias: buildDefinitionName,
                    createReleaseOnBuildTagging: true,
                    triggerConditions: []
                };
                pipelineDefinition.triggers.push(trigger);
            }
        }

        const createNewDefinitionsPromise = this._createNewDefinitionActions(pipelineDefinition);

        // Handling the scenario when templateId is also provided with create new definition action
        let createDefinitionFromTemplatePromise = this._createDefinitionWithTemplateId(templateId);

        // This has to be done after all the stores are created, that is why it is after the definition is loaded into the stores.
        this._loadAgentQueuesIntoAllAgentStores();

        return Q.all([assignUniqueNamePromise, createNewDefinitionsPromise, createDefinitionFromTemplatePromise]);
    }

    public cloneDefinition(definition: PipelineDefinition): IPromise<void[]> {
        let assignUniqueNamePromise: IPromise<void> = this.assignUniqueName(definition.name);

        const cloneDefinitionPromise = this._cloneOrImportDefinition(definition);

        Telemetry.instance().publishEvent(Feature.CloneReleaseDefinition);

        return Q.all([assignUniqueNamePromise, cloneDefinitionPromise]);
    }

    public importDefinition(definition: PipelineDefinition): IPromise<void> {
        let assignUniqueNamePromise: IPromise<void> = this.assignUniqueName(definition.name);

        const importDefinitionPromise = this._cloneOrImportDefinition(definition);

        Telemetry.instance().publishEvent(Feature.ImportReleaseDefinition);

        return Q.all([assignUniqueNamePromise, importDefinitionPromise]).then(() => {
            this._messageHandlerActions.addMessage.invoke({ parentKey: ErrorMessageParentKeyConstants.MainParentKey, message: Resources.ReleaseDefinitionImportedMessage, type: MessageBarType.warning } as IAddMessagePayload);
            return Q.resolve();
        });
    }

    public editDefinition(definition: PipelineDefinition): void {

        // fetching deployment groups which are configured
        this._getAllDeploymentGroups();

        this._getEnvironmentIdsRankMap(definition.environments);

        this._createNewDefinitionActions(definition);

        this._fetchDefinitionRevisions(definition.id);

        // This has to be done after all the stores are created, that is why it is after the definition is loaded into the stores.
        this._loadAgentQueuesIntoAllAgentStores();

        TelemetryHelper.publishEditDefinitionTelemetry(definition);

    }

    /**
     * saveDefinition
     * @param definition
     * @param apiVerison : The apiversion to use to make PUT call to save RD. This is required in case of revert RD.
                            RD revisions are saved as json and revision is not returned as latest RD object but the RD object when revision was created.
                            So if we want to update the RD with the revision json you need to use the same api-version to make put call and not the latest api-version
     * @param forceUpdate
     */
    public saveDefinition(definition: PipelineDefinition, apiVerison?: string, forceUpdate?: boolean): IPromise<{}> {

        // Save definition status : InProgress
        this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.InProgress);

        let isNewDefinition = (definition.id <= 0);

        let saveEventProperties = this._getSaveEventTelemetryProperties(definition.path, definition.comment);

        let saveDefinitionPromise: IPromise<PipelineDefinition>;

        if (!!isNewDefinition) {
            saveDefinitionPromise = DeployPipelineDefinitionSource.instance().create(definition);
        }
        else {
            if (apiVerison !== null && apiVerison !== undefined) {
                saveDefinitionPromise = DeployPipelineDefinitionSource.instance().saveWithApiVersion(definition, apiVerison);
            }
            else {
                saveDefinitionPromise = DeployPipelineDefinitionSource.instance().save(definition);
            }
        }

        return Q.all([
            saveDefinitionPromise,
            DeployPipelineDefinitionSource.instance().getSettings()
        ]).spread((
            definition: PipelineDefinition,
            settings: PipelineSettings
        ) => {
            // Removing message bar (if any) in success case, in error case, new error will override the existing one (if any)
            this._messageHandlerActions.dismissMessage.invoke(ErrorMessageParentKeyConstants.MainParentKey);

            // Sorting environment object in definition itself so that we don't need to explictely sort everywhere, for example retention/variable page
            EnvironmentUtils.sortEnvironmentsByRank(definition.environments);

            if (isNewDefinition) {
                this._updateHistoryPointOnSave(definition);
            }

            this._updateDefinitionActions(definition, !!forceUpdate);

            // Save definition status : Success
            this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.Success);

            this._publishSaveReleaseDefinitionTelemetry(isNewDefinition, saveEventProperties);

            this._environmentIdsRankMap = {};

            return Q.resolve(null);
        }, (error) => {

            if (!!forceUpdate) {

                // Sorting environment object in definition itself so that we don't need to explictely sort everywhere, for example retention/variable page
                EnvironmentUtils.sortEnvironmentsByRank(definition.environments);

                // if forced update make the RD editable
                this._updateDefinitionActions(definition, !!forceUpdate);
            }

            // Save definition status : Failure
            this._saveStatusActions.updateSaveStatus.invoke(SaveStatus.Failure);

            this._handleError(error);
            PermissionTelemetryHelper.publishPermissionError(error);
        });
    }

    public createDraftRelease(pipelineDefinitionId: number, projectName?: string): void {

        // Create release status : InProgress
        this._definitionActionsHub.updateCreateReleaseStatus.invoke(CreateReleaseStatus.InProgress);

        let pipelineReleaseParameters = {
            isDraft: true,
            definitionId: pipelineDefinitionId
        } as PipelineReleaseStartMetadata;

        ReleaseSource.instance().createRelease(pipelineReleaseParameters, projectName)
            .then((pipelineRelease: PipelineRelease) => {
                // Create release status : Success
                this._definitionActionsHub.updateCreateReleaseStatus.invoke(CreateReleaseStatus.Success);

                if (FeatureFlagUtils.isNewReleasesHubEnabled()) {
                    ReleaseUrlUtils.navigateToDraftReleaseViewInNewHub(pipelineRelease.id);
                }
                else {
                    // Redirect to the Release editor
                    this.navigateToPipelineRelease(pipelineRelease, PipelineReleaseEditorActions.environmentsEditorAction);
                }
            }, (error) => {
                // Create release status : Failure
                this._definitionActionsHub.updateCreateReleaseStatus.invoke(CreateReleaseStatus.Failure);
                this._handleError(error);
            });
    }

    public navigateToPipelineRelease(
        pipelineRelease: PipelineRelease,
        pipelineReleaseDefaultTab: string = PipelineReleaseEditorActions.summaryAction): void {

        if (pipelineRelease != null) {
            let pipelineReleaseUrl: string = DtcUtils.getUrlForExtension(
                PipelineExtensionAreas.ReleaseExplorer,
                pipelineReleaseDefaultTab,
                {
                    releaseId: pipelineRelease.id,
                    definitionId: pipelineRelease.releaseDefinition.id
                });

            UrlUtilities.navigateTo(pipelineReleaseUrl);
        }
    }

    public changeDefinitionName(name: string, defaultName?: string): void {
        let changeDefinitionNamePayload: IChangeDefinitionNamePayload = {
            name: name,
            defaultName: defaultName
        };
        this._definitionActionsHub.changeDefinitionName.invoke(changeDefinitionNamePayload);
    }

    public revertDefinition(definitionId: number, targetRevision: number, maxCurrentAvailableRevision: number, comment: string, apiVersion: string): IPromise<void> {

        return DeployPipelineDefinitionSource.instance().getDefinitionRevision(definitionId, targetRevision).then((revisionJson: string) => {
            let rawDefinitionObj = JSON.parse(revisionJson);
            let definitionObj = Serialization.ContractSerializer.deserialize(rawDefinitionObj, PipelineDefinitionContractMetadata);
            definitionObj = this._fixNewEnvironmentIds(definitionObj);
            //remove the step ids from the definitionObj. This is required as the step id for the new step should be zero.
            definitionObj = this.fixNewEnvironmentStepIds(definitionObj);
            definitionObj.revision = maxCurrentAvailableRevision;
            definitionObj.comment = comment;
            this.saveDefinition(definitionObj, apiVersion, true);
            Telemetry.instance().publishEvent(Feature.RevertReleaseDefinition);
        }, (error) => {
            this._handleError(error);
        });
    }

    public getOriginalEnvironmentIdsRankMapForEditDefinition(): IDictionaryNumberTo<number> {
        return JQueryWrapper.extendDeep({}, this._environmentIdsRankMap);
    }

    // public for UTs
    public fixNewEnvironmentStepIds(historyDefinition: PipelineDefinition): PipelineDefinition {
        let envs = historyDefinition.environments;

        for (let env of envs) {
            let envStore = this._environmentListStore.getEnvironmentStore(env.id);
            if (env.preDeployApprovals) {
                let validApprovalIds = envStore ? envStore.getPreDeploymentApprovalStore().getApprovalStepIds() : [];
                this.fixApprovalStepID(env.preDeployApprovals, validApprovalIds);
            }

            if (env.deployStep) {
                let validDeployStepId = envStore ? envStore.getCurrentState().deployStep.id : -1;
                if (env.deployStep.id !== validDeployStepId) {
                    env.deployStep.id = 0;
                }
            }

            if (env.postDeployApprovals) {
                let validApprovalIds = envStore ? envStore.getPostDeploymentApprovalStore().getApprovalStepIds() : [];
                this.fixApprovalStepID(env.postDeployApprovals, validApprovalIds);
            }

        }

        return historyDefinition;
    }

    // public for UTs
    public fixApprovalStepID(approvals: PipelineEnvironmentApprovals, validStepID: number[]): void {
        for (let step of approvals.approvals) {
            if (validStepID.indexOf(step.id) === -1) {
                step.id = 0;
            }
        }
    }

    private _getEnvironmentIdsRankMap(environments: PipelineDefinitionEnvironment[]) {
        if (environments) {
            environments.map((environment) => {
                this._environmentIdsRankMap[environment.id] = environment.rank;
            });
        }
    }

    private _updateHistoryPointOnSave(definition: PipelineDefinition): void {
        const action = NavigationStateUtils.getAction().toLowerCase();
        const title = Utils_String.format(Resources.WindowTitleFormat, definition.id, definition.name);
        if (!action ||
            action === EditorActions.ACTION_CREATE_DEFINITION ||
            action === EditorActions.ACTION_CLONE_DEFINITION ||
            action === EditorActions.ACTION_IMPORT_DEFINITION) {
            NavigationService.getHistoryService().addHistoryPoint(
                EditorActions.ACTION_EDIT_DEFINITION,
                { definitionId: definition.id },
                title,
                true, false);
        }
        else {
            NavigationService.getHistoryService().addHistoryPoint(
                action,
                { definitionId: definition.id },
                title,
                true, false);
        }
    }

    private _loadAgentQueuesIntoAllAgentStores(): void {
        AgentUtils.loadAgentQueuesIntoAllAgentStores().then(null,
            (error) => {
                this._handleError(error);
            });
    }

    private _getAllDeploymentGroups(continuationToken?: string) {
        Q.all([
            AgentsSource.instance().getPermissibleDeploymentGroups(true, null, DeploymentGroupExpands.None, continuationToken)
        ]).spread((
            deploymentGroupsResult: IDeploymentGroupsResult
        ) => {
            this._deploymentGroupsActions.updatePermissibleDeploymentGroups.invoke(deploymentGroupsResult.deploymentGroups);
            if (deploymentGroupsResult.continuationToken) {
                this._getAllDeploymentGroups(deploymentGroupsResult.continuationToken);
            }
        }, (error) => {
            this._handleError(error);
        });
    }

    private _getDeploymentGroupsById(deploymentGroupIds: number[]) {
        if (deploymentGroupIds.length > 0) {
            Q.all([
                AgentsSource.instance().getDeploymentGroupsByIds(true, deploymentGroupIds)
            ]).spread((
                deploymentGroupsResult: IDeploymentGroupsResult
            ) => {
                this._deploymentGroupsActions.updateNonPermissibleDeploymentGroups.invoke(deploymentGroupsResult.deploymentGroups);
            }, (error) => {
                this._handleError(error);
            });
        }
    }

    private _cloneOrImportDefinition(definition: PipelineDefinition): IPromise<void> {
        this._getAllDeploymentGroups();

        const createNewDefinitionPromise = this._createNewDefinitionActions(definition, true);

        // This has to be done after all the stores are created, that is why it is after the definition is loaded into the stores.
        this._loadAgentQueuesIntoAllAgentStores();

        return createNewDefinitionPromise;
    }

    private _handleError(error): void {
        this._messageHandlerActions.addMessage.invoke({ parentKey: ErrorMessageParentKeyConstants.MainParentKey, message: (error.message || error), statusCode: error.status } as IAddMessagePayload);
    }

    private _getNewReleaseDefinitionName(buildDefinitionName?: string): string {
        let definitionName: string;
        if (!!buildDefinitionName) {
            definitionName = Utils_String.localeFormat("{0} - {1}", buildDefinitionName, Resources.ContinuousDeliveryAcronym);
        }
        else {
            definitionName = Resources.NewReleaseDefinitionNameText;
        }

        return definitionName;
    }

    private _updateMaxAndDefaultRetentionPolicy(): void {
        DeployPipelineDefinitionSource.instance().getSettings().then((settings: PipelineSettings) => {
            this._definitionSettingsActionsCreator.updateMaxAndDefaultRetentionPolicy(settings);
        });
    }

    private _createNewDefinitionActions(definition: PipelineDefinition, cloneOrImportDefinition?: boolean): IPromise<void> {

        this._definitionActionsHub.createDefinition.invoke(definition);

        // Initialise Artifacts before Environments to initialise environment artifact triggers
        this._artifactListActionCreator.initializeArtifacts(definition.artifacts, definition.triggers);
        this._environmentListActionsCreator.createEnvironmentList(definition.environments);

        // New DeploymentGroups API
        this._getDeploymentGroupsComingFromSavedOrClonedOrImport(definition.environments);
        // Needed for clone and import rd scenarios
        // We expect definition object to have distinct environment ids, which serves as key for variables store.
        // Update rank in the environment object as per store data
        this._fixInvalidEnvironmentIdsAndUpdateRank(definition);

        // Sorting environment object in definition itself so that we don't need to explictely sort everywhere
        EnvironmentUtils.sortEnvironmentsByRank(definition.environments);

        let variablesData: IVariablesData = DefinitionVariablesUtils.mapDefinitionToVariablesData(definition);
        this._variablesActionsCreator.invokeCreateDefinitionActions(variablesData, !!cloneOrImportDefinition);
        const updateScopePermissionsPromise = this._variablesActionsCreator.invokeUpdateDefinitionScopePermissionsActions(variablesData);

        this.initializeVariableGroups(definition);

        this._updateMaxAndDefaultRetentionPolicy();

        this._optionsActionsCreator.updateOptions(definition);

        this._initializePhaseCache();

        // Update window title
        this._setWindowTitle(definition.name);

        // Pre-fetching modules which are loaded in async mode later when some action is triggered
        DtcUtils.prefetchModulesInAsyncMode(["Admin/Scripts/TFS.Admin.Security"]);

        return updateScopePermissionsPromise;
    }

    // public to unit tests
    public initializeVariableGroups(definition: PipelineDefinition): IPromise<void> {
        // Fire the action to fetch the linkable variable groups in anticipation that
        // user may add/update variable group
        this._variableGroupActionsCreator.fetchLinkableVariableGroups();

        this._variableGroupActionsCreator.updateInitializeVariableGroupsStatus({ status: Status.InProgress });

        return DefinitionVariablesUtils.beginGetVariableGroups(definition).then((variableGroups: VariableGroup[]) => {
            this._variableGroupActionsCreator.updateInitializeVariableGroupsStatus({ status: Status.Success });

            let environments: IEnvironmentVariablesData[] = DefinitionVariablesUtils.getEnvironmentVariablesData(definition.environments);

            this._variableGroupActionsCreator.handleInitializeVariableGroups(
                DefinitionVariablesUtils.getVariableGroupReferences(definition),
                variableGroups,
                DefinitionVariablesUtils.getScopes(environments),
            );
            return Q.resolve();

        }, (error: any) => {
            const message = error.message || error;
            this._variableGroupActionsCreator.updateInitializeVariableGroupsStatus({ status: Status.Failure, message: message });
            Diag.logError("[VariableGroupActionsCreator.initializeVariableGroups] Unable to get variableGroups :" + error);
            return Q.reject();
        });

    }

    private _getDeploymentGroupsComingFromSavedOrClonedOrImport(pipelineDefinitionEnvironments: PipelineDefinitionEnvironment[]) {
        const environments: PipelineDefinitionEnvironment[] = pipelineDefinitionEnvironments || [];
        let deploymentGroupIds: number[] = [];
        environments.forEach((environment: PipelineDefinitionEnvironment) => {
            if (environment && environment.deployPhases) {
                environment.deployPhases.forEach((deployPhase: PipelineDeployPhase) => {
                    if (deployPhase && deployPhase.phaseType === PipelineDeployPhaseTypes.MachineGroupBasedDeployment) {
                        const runOnMachineGroupDeployPhase: PipelineRunOnMachineGroupDeployPhase = deployPhase as PipelineRunOnMachineGroupDeployPhase;
                        if (runOnMachineGroupDeployPhase && runOnMachineGroupDeployPhase.deploymentInput && runOnMachineGroupDeployPhase.deploymentInput.queueId) {
                            // Add only unique deployement group queueId
                            if (deploymentGroupIds.indexOf(runOnMachineGroupDeployPhase.deploymentInput.queueId) === -1) {
                                deploymentGroupIds.push(runOnMachineGroupDeployPhase.deploymentInput.queueId);
                            }
                        }
                    }
                });
            }
        });

        const length = deploymentGroupIds.length;

        if (length > 0) {
            for (let i = 0; i < length; i += this._maxTopSupported) {
                this._getDeploymentGroupsById(deploymentGroupIds.slice(i, Math.min(length, i + this._maxTopSupported)));
            }
        }
    }

    private _fixInvalidEnvironmentIdsAndUpdateRank(definition: PipelineDefinition): void {
        const stores = this._environmentListStore.getDataStoreList();
        let envs = definition.environments;
        if (envs) {
            for (let i = 0; i < envs.length; i++) {
                let store = stores.filter(s => Utils_String.localeIgnoreCaseComparer(s.getEnvironmentName(), envs[i].name) === 0)[0];
                if (store) {
                    if (envs[i].id <= 0) {
                        envs[i].id = store.getEnvironmentId();
                    }
                    envs[i].rank = store.getEnvironmentRank();
                }
            }
        }
    }

    /**
  * A RD revision can have an environment with id which is deleted currently. When we try to revert to this revision a new env will be created for this env.
    Server requires that new env should have '-1' as id.
  * @param definition: revision definition
  */
    private _fixNewEnvironmentIds(historyDefinition: PipelineDefinition): PipelineDefinition {
        const stores = this._environmentListStore.getDataStoreList();
        let envs = historyDefinition.environments;
        let currentEnvIds = stores.map((envStore) => { return envStore.getEnvironmentId(); });
        for (let env of envs) {
            if (currentEnvIds.indexOf(env.id) === -1) {
                // clean the environment ID
                env.id = -1;

            }
        }

        return historyDefinition;
    }

    private _getEnvironmentApprovalStepIds(deployEnvStore: DeployEnvironmentStore): number[] {
        const preApprovalStepIDs = deployEnvStore.getPreDeploymentApprovalStore().getApprovalStepIds();
        const postApprovalStepIDs = deployEnvStore.getPostDeploymentApprovalStore().getApprovalStepIds();

        return preApprovalStepIDs.concat(postApprovalStepIDs);
    }

    private _updateDefinitionActions(definition: PipelineDefinition, forcedUpdate: boolean) {
        this._definitionActionsHub.updateDefinition.invoke({ definition: definition, forceUpdate: forcedUpdate });

        // Initialise Artifacts before Environments to initialise environment artifact triggers
        this._artifactListActionCreator.updateArtifacts(definition.artifacts, definition.triggers, forcedUpdate);
        this._environmentListActionsCreator.updateEnvironmentList(definition.environments, forcedUpdate);

        let variablesData: IVariablesData = DefinitionVariablesUtils.mapDefinitionToVariablesData(definition);
        this._variablesActionsCreator.invokeUpdateDefinitionActions(variablesData);
        this._variablesActionsCreator.invokeUpdateDefinitionScopePermissionsActions(variablesData);

        this.updateVariableGroups(definition);

        this._optionsActionsCreator.updateOptions(definition);

        this._updateMaxAndDefaultRetentionPolicy();
        this._fetchDefinitionRevisions(definition.id);

        if (forcedUpdate) {
            this._overlayPanelActionsCreator.hideOverlay();
        }

        // Update window title
        this._setWindowTitle(definition.name);
    }

    // public to unit tests
    public updateVariableGroups(definition: PipelineDefinition): IPromise<void> {

        return DefinitionVariablesUtils.beginGetVariableGroups(definition).then((variableGroups: VariableGroup[]) => {

            let environments: IEnvironmentVariablesData[] = DefinitionVariablesUtils.getEnvironmentVariablesData(definition.environments);

            this._variableGroupActionsCreator.handleUpdateVariableGroups(
                DefinitionVariablesUtils.getVariableGroupReferences(definition),
                variableGroups,
                DefinitionVariablesUtils.getScopes(environments)
            );
            return Q.resolve();
        }, (error: any) => {
            Diag.logError("[VariableGroupActionsCreator.updateVariableGroups] Unable to get variableGroups :" + error);
            return Q.reject();
        });
    }
    private _fetchDefinitionRevisions(definitionId: number) {
        DeployPipelineDefinitionSource.instance().getDefinitionRevisions(definitionId).then(
            (releaseDefinitionRevisions: PipelineDefinitionRevision[]) => {
                this._historyActions.UpdateRevisions.invoke(HistoryUtils.convertPipelineDefinitionRevisionToColumn((releaseDefinitionRevisions)));
            }
        );
    }

    private _getSaveEventTelemetryProperties(parentFolderPath: string, comment: string) {
        if (!this._definitionStore) {
            this._definitionStore = StoreManager.GetStore<DefinitionStore>(DefinitionStore);
        }

        let changes: IDictionaryStringTo<any> = {};
        this._definitionStore.getChangeTelemetryData(changes);
        changes[Properties.FolderPath] = parentFolderPath;
        changes[Properties.IsCommentPresent] = !!comment;
        return changes;
    }

    private _publishSaveReleaseDefinitionTelemetry(isNewDefinition: boolean, saveEventProperties: IDictionaryStringTo<any>) {
        let feature: string = Feature.SaveReleaseDefinition;
        if (isNewDefinition) {
            feature = Feature.NewReleaseDefinitionCreation;
        }

        Telemetry.instance().publishEvent(feature, saveEventProperties);
    }

    private _setWindowTitle(title: string): void {
        document.title = NavigationService.getDefaultPageTitle(title);
    }

    // public to unit test
    public assignUniqueName(defaultName: string): IPromise<void> {
        return DeployPipelineDefinitionSource.instance().getReleaseDefinitions(defaultName).then((releaseDefinitionResult: IReleaseDefinitionsResult) => {
            let fetchedDefinitionNames: string[] = [];
            releaseDefinitionResult.definitions.forEach((releaseDefinitions: PipelineDefinition) => {
                fetchedDefinitionNames.push(releaseDefinitions.name);
            });
            if (fetchedDefinitionNames.length !== 0 && !Utils_String.localeIgnoreCaseComparer(fetchedDefinitionNames[0].trim(), defaultName)) {
                let uniqueName = DefinitionNameUtils.getNonConflictingDefinitionName(defaultName, fetchedDefinitionNames);
                this.changeDefinitionName(uniqueName, defaultName);
            }
        });
    }

    private _initializePhaseCache(): void {
        EnvironmentTemplateSource.instance().getEmptyEnvironmentTemplateQueueId().then((defaultAgentQueueId: number) => {
            PhaseCache.instance().updateDefaultQueueIdIfUndefined(defaultAgentQueueId);
        });
    }

    private _createDefinitionWithValidTemplateId(templateId: string): IPromise<any> {
        return TaskDefinitionSource.instance().getTaskDefinitionList(true).then(() => {
            return this._environmentListActionsCreator.createNewEnvironment(templateId, null, false).then(() => {
                return Q.resolve();
            });
        }, () => {
            return Q.reject();
        });
    }

    private _createDefinitionWithProvidedTemplateId(templateId: string): IPromise<any> {

        return EnvironmentTemplateSource.instance().updateTemplateList().then((templateDefinitionList: ITemplateDefinition[]) => {
            let isTemplateIdValid: boolean = !!Utils_Array.first(templateDefinitionList, (templateDefinition: ITemplateDefinition): boolean => {
                return Utils_String.ignoreCaseComparer(templateDefinition.id, templateId) === 0;
            });

            // Check for templateId validity
            if (!isTemplateIdValid) {
                return this._environmentListActionsCreator.createNewEnvironment(TemplateConstants.EmptyTemplateGuid, null, true).then(() => {
                    return Q.resolve();
                });
            }
            else {
                return this._createDefinitionWithValidTemplateId(templateId);
            }
        }, () => {
            return Q.reject();
        });
    }

    private _createDefinitionWithTemplateId(templateId: string): IPromise<any> {

        /*  Scenarios:
                1. templateId is valid - automatically select that template
                2. templateId is invalid - just navigate to create definition page and do not apply that template
        */

        // If templateId is not present in parameter, no need to apply template
        if (!templateId) {
            return this._environmentListActionsCreator.createNewEnvironment(TemplateConstants.EmptyTemplateGuid, null, true).then(() => {
                return Q.resolve();
            });
        }

        // If templateId is provided, create definition from it
        return this._createDefinitionWithProvidedTemplateId(templateId);
    }

    private _artifactListActionCreator: ArtifactListActionCreator;
    private _definitionActionsHub: DefinitionActionsHub;
    private _definitionSettingsActionsCreator: DefinitionSettingsActionsCreator;
    private _environmentListActionsCreator: EnvironmentListActionsCreator;
    private _optionsActionsCreator: OptionsActionsCreator;
    private _variablesActionsCreator: DefinitionVariablesActionsCreator;
    private _variableGroupActionsCreator: VariableGroupActionsCreator;
    private _historyActions: HistoryActions;
    private _deploymentGroupsActions: DeploymentGroupsActions;
    private _messageHandlerActions: MessageHandlerActions;
    private _saveStatusActions: SaveStatusActionsHub;
    private _environmentListStore: EnvironmentListStore;
    private _definitionStore: DefinitionStore;
    private _overlayPanelActionsCreator: OverlayPanelActionsCreator;
    private _environmentIdsRankMap: IDictionaryNumberTo<number> = {};
    private _maxTopSupported: number = 25;
}