import * as Q from "q";

import { DeploymentGroupsActions } from "DistributedTaskControls/Actions/DeploymentGroupsActions";
import { OverlayPanelActionsCreator } from "DistributedTaskControls/Actions/OverlayPanelActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { Feature, Properties, Telemetry } from "DistributedTaskControls/Common/Telemetry";
import { IDeploymentGroupsResult, IErrorState } from "DistributedTaskControls/Common/Types";
import { UrlUtilities } from "DistributedTaskControls/Common/UrlUtilities";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";
import { ContributionSource } from "DistributedTaskControls/Sources/ContributionSource";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";
import { VariableGroupActionsCreator } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActionsCreator";

import { ProgressIndicatorActionsCreator } from "PipelineWorkflow/Scripts/Common/Actions/ProgressIndicatorActionsCreator";
import { NavigationStateUtils } from "PipelineWorkflow/Scripts/Common/NavigationStateUtils";
import { IEnvironmentVariablesData, IVariablesData } from "PipelineWorkflow/Scripts/Common/Types";
import { CanvasSelectorConstants, CommonConstants, OldReleaseViewNavigateStateActions, ReleaseProgressActionCreatorKeys, ReleaseSummaryPanelActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseVariablesActionsCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ContainerTabs/VariablesTab/ReleaseVariablesActionsCreator";
import { CachedReleaseSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/CachedReleaseSource";
import { IReleaseConfirmationDialogStatePayload, ReleaseActionsHub } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionsHub";
import { ReleaseEnvironmentActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentActionCreator";
import { ReleaseEnvironmentListActionCreator } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironmentList/ReleaseEnvironmentListActionCreator";
import { ReleaseSignalRManager } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseSignalRManager";
import { ReleaseApprovalSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseApprovalSource";
import { ReleaseDefinitionSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseDefinitionSource";
import { ContributionTelemetryUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ContributionTelemetryUtils";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import { ReleaseVariablesUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseVariablesUtils";
import { ReleaseSource } from "PipelineWorkflow/Scripts/Shared/Sources/ReleaseSource";
import { TagSource } from "PipelineWorkflow/Scripts/Shared/Sources/TagSource";
import { AgentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/AgentUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";
import { PermissionHelper } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { ArtifactListActionCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListActionCreator";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import { DeploymentGroupExpands } from "TFS/DistributedTask/Contracts";

import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

export class ReleaseActionCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.Release;
    }

    public initialize(): void {
        this._releaseActionsHub = ActionsHubManager.GetActionsHub<ReleaseActionsHub>(ReleaseActionsHub);
        this._variablesActionsCreator = ActionCreatorManager.GetActionCreator<ReleaseVariablesActionsCreator>(ReleaseVariablesActionsCreator);
        this._variableGroupsActionsCreator = ActionCreatorManager.GetActionCreator<VariableGroupActionsCreator>(VariableGroupActionsCreator);

        this._progressIndicatorActionsCreator = ActionCreatorManager.GetActionCreator<ProgressIndicatorActionsCreator>(ProgressIndicatorActionsCreator,
            CommonConstants.ReleaseSummaryProgressIndicatorInstanceId);
        this._overlayPanelActionsCreator = ActionCreatorManager.GetActionCreator<OverlayPanelActionsCreator>(OverlayPanelActionsCreator,
            CanvasSelectorConstants.ReleaseCanvasSelectorInstance);
    }

    public editRelease(releaseId: number): IPromise<void> {
        this._overlayPanelActionsCreator.hideOverlay();
        return CachedReleaseSource.instance().getRelease(releaseId, true, true).then((release) => {
            ReleaseSignalRManager.instance().stopLiveWatch();
            this._releaseActionsHub.toggleEditMode.invoke(true);
            this._releaseActionsHub.updateExistingRelease.invoke({
                release: release
            });
            this._updateReleaseEnvironmentsCapabilities(release);

            //  Update variables and scope permissions
            this._updateExistingVariables(release, false);
            this._variablesActionsCreator.invokeUpdateReleaseScopePermissionsActions(release);

            this._addEditReleaseTelemetry(Feature.EditReleaseAction);
            return Q.resolve(null);
        }, (error) => {
            this._handleError(error);
            return Q.reject(error);
        });
    }

    public saveRelease(release: ReleaseContracts.Release, comment: string, areVariablesEdited?: boolean): IPromise<void> {
        this.toggleSaveDialogState({
            isInProgress: true
        });
        release.comment = comment;
        this._overlayPanelActionsCreator.hideOverlay();
        return CachedReleaseSource.instance().updateRelease(release).then((release) => {
            this._resetStates(release);

            this.toggleSaveDialogState({
                isInProgress: false,
                showDialog: false
            });

            this._addEditReleaseTelemetry(Feature.SaveReleaseAction, !!comment);

            if (!!areVariablesEdited) {
                this._publishVariablesEditTelemetry();
            }

            return Q.resolve(null);
        }, (error) => {
            this._handleError(error);
            return Q.reject(error);
        });
    }

    public updateExistingRelease(release: ReleaseContracts.Release, forceUpdate: boolean = false, editMode: boolean = false): void {
        this.updateMyPendingApprovals(release);

        this._releaseActionsHub.updateExistingRelease.invoke({ release: release });

        const artifactListActionCreator = ActionCreatorManager.GetActionCreator<ArtifactListActionCreator>(ArtifactListActionCreator);
        artifactListActionCreator.updateArtifacts(release.artifacts, this._triggers, forceUpdate);

        const environmentListActionCreator = ActionCreatorManager.GetActionCreator<ReleaseEnvironmentListActionCreator>(ReleaseEnvironmentListActionCreator);
        environmentListActionCreator.updateExistingEnvironments(release.environments, forceUpdate);

        this._updateExistingVariables(release, !editMode);
    }

    public discardRelease(releaseId: number): IPromise<void> {
        this.toggleDiscardDialogState({
            isInProgress: true
        });
        this._overlayPanelActionsCreator.hideOverlay();
        return CachedReleaseSource.instance().getRelease(releaseId, true, false).then(
            (release: ReleaseContracts.Release) => {
                this._resetStates(release, true);
                this.toggleDiscardDialogState({
                    isInProgress: false,
                    showDialog: false
                });
                this._addEditReleaseTelemetry(Feature.DiscardReleaseAction);
                return Q.resolve(null);
            }, (error) => {
                this._handleError(error);
                return Q.reject(error);
            });
    }

    public toggleDiscardDialogState(payload: IReleaseConfirmationDialogStatePayload): void {
        this._releaseActionsHub.toggleDiscardDialogState.invoke(payload);
    }

    public toggleSaveDialogState(payload: IReleaseConfirmationDialogStatePayload): void {
        this._releaseActionsHub.toggleSaveDialogState.invoke(payload);
    }

    public mergeTasks(releaseTasksEvent: ReleaseContracts.ReleaseTasksUpdatedEvent): void {
        if (!releaseTasksEvent.environmentId) {
            return;
        }

        const environmentActionCreator = ActionCreatorManager.GetActionCreator<ReleaseEnvironmentActionCreator>(ReleaseEnvironmentActionCreator, releaseTasksEvent.environmentId.toString());
        environmentActionCreator.mergeTasks(releaseTasksEvent);
    }

    public mergeRelease(release: ReleaseContracts.Release): void {
        this.updateMyPendingApprovals(release);
        this._releaseActionsHub.updateReleaseFromService.invoke(release);

        const artifactListActionCreator = ActionCreatorManager.GetActionCreator<ArtifactListActionCreator>(ArtifactListActionCreator);
        artifactListActionCreator.updateArtifacts(release.artifacts, this._triggers, false);

        const environmentListActionCreator = ActionCreatorManager.GetActionCreator<ReleaseEnvironmentListActionCreator>(ReleaseEnvironmentListActionCreator);
        environmentListActionCreator.mergeEnvironments(release.environments);

        //  Update variables when signalR event comes, keeping the disabled mode enabled
        //  Disabled mode is ON here, as during edit scenario, there won't be any signalR event.
        const variablesData: IVariablesData = ReleaseVariablesUtils.mapReleaseToVariablesData(release);
        this._variablesActionsCreator.invokeUpdateDefinitionActions(variablesData, true);
    }

    public autoSaveDescription(release: ReleaseContracts.Release): IPromise<void> {
        return this._autoSaveRelease(release, ReleaseSummaryPanelActions.autoSaveDescription);
    }

    public initializeRelease(release: number | ReleaseContracts.Release, forceRefresh?: boolean): IPromise<void> {
        if (typeof (release) === "number" && release > 0) {

            // The release as well as release definition will be fetched from data provider. 
            return CachedReleaseSource.instance().getRelease(release, true, forceRefresh)
                .then((releaseObject: ReleaseContracts.Release) => {

                    // Navigate to old view if the release is a draft release
                    // This is done so that we don't need to make a REST call whenever old UI loads, we will redirect the view here
                    // and if the release is a draft release, we will navigate back
                    if (releaseObject.status === ReleaseContracts.ReleaseStatus.Draft && PermissionHelper.canNavigateToOldReleaseUI()) {
                        if (FeatureFlagUtils.isNewReleasesHubEnabled()) {
                            ReleaseUrlUtils.navigateToDraftReleaseViewInNewHub(releaseObject.id);
                        }
                        else {
                            let oldViewUrl: string = ReleaseUrlUtils.getOldReleaseViewUrl(releaseObject.id, OldReleaseViewNavigateStateActions.ReleaseEnvironments);
                            UrlUtilities.navigateTo(oldViewUrl, true);
                        }
                    }

                    return this._initializeRelease(releaseObject);
                }, (error) => {
                    return Q.reject(error);
                });
        }
        else if (release !== null) {

            return this._initializeRelease(release as ReleaseContracts.Release);
        }
        else {
            throw new Error("initializeRelease: Argument 'release' is invalid");
        }
    }

    /**
     * This function accepts release as an argument and then finds if any pre/post approval is a group approval.
     * If there is any group approval, this function will make a call to find @myPendingApprovals.
     * @param release 
     */
    public updateMyPendingApprovals(release: ReleaseContracts.Release): void {
        if (release && release.environments) {

            let groupApprovalExists: boolean = false;

            //  Check for all environments
            release.environments.forEach((env: ReleaseContracts.ReleaseEnvironment) => {
                let preDeployGroupApproval: ReleaseContracts.ReleaseApproval[];
                let postDeployGroupApproval: ReleaseContracts.ReleaseApproval[];

                //  Check if any pre-approval as group approval and the approval is manual
                preDeployGroupApproval = env.preDeployApprovals && env.preDeployApprovals.length > 0 ? env.preDeployApprovals.filter((approval: ReleaseContracts.ReleaseApproval) => {
                    return IdentityHelper.isThisGroup(approval.approver) && !approval.isAutomated;
                }) : null;

                //  Check if any post-approval as group approval and the approval is manual
                postDeployGroupApproval = env.postDeployApprovals && env.postDeployApprovals.length > 0 ? env.postDeployApprovals.filter((approval: ReleaseContracts.ReleaseApproval) => {
                    return IdentityHelper.isThisGroup(approval.approver) && !approval.isAutomated;
                }) : null;

                //  If pre/post approval has a group approval set groupApprovalExists as true
                if ((preDeployGroupApproval && preDeployGroupApproval.length > 0) || (postDeployGroupApproval && postDeployGroupApproval.length > 0)) {
                    groupApprovalExists = true;
                }
            });

            //  Make the myPendingApprovals call if there is a group approval
            if (groupApprovalExists) {
                ReleaseApprovalSource.instance().getMyPendingApprovals(release.id, true).then(() => {
                    this._releaseActionsHub.updateMyPendingApprovals.invoke({});
                });
            }
        }
    }

    public refreshRelease(releaseId: number, mergeWithExitingRelease: boolean = false): IPromise<void> {
        return CachedReleaseSource.instance().getRelease(releaseId, true, true).then((release: ReleaseContracts.Release) => {
            if (!mergeWithExitingRelease) {
                return this.updateExistingRelease(release);
            }
            else {
                this.mergeRelease(release);
                return Q(null);
            }
        },
            this._handleError);
    }

    public hardRefreshRelease(releaseId: number): void {
        this.refreshRelease(releaseId).then(() => {
            ReleaseSignalRManager.instance().restartSignalRConnectionIfNeeded();
        });
    }

    public fetchReleaseDefinition(release: ReleaseContracts.Release) {
        if (release && release.releaseDefinition) {
            // initiate the fetch for release definition but no need to wait for it
            ReleaseDefinitionSource.instance().getReleaseDefinition(release.releaseDefinition.id);
        }
    }

    public fetchSiblingReleases(release: ReleaseContracts.Release) {
        let releaseDefinitionId: number = release && release.releaseDefinition ? release.releaseDefinition.id : 0;
        this._releaseActionsHub.initializeSiblingReleases.invoke({
            siblingReleases: ReleaseSource.instance().getReleases(releaseDefinitionId)
        });
    }

    public updateDescription(description: string) {
        this._releaseActionsHub.updateDescription.invoke(description);
    }

    public updateTags(tags: string[]) {
        this._releaseActionsHub.updateTags.invoke(tags);
    }

    public addTag(releaseId: number, tag: string, currentTags: string[]): IPromise<void> {
        let promise = ReleaseSource.instance().addTag(releaseId, tag);
        return this._modifyTags(promise, currentTags);
    }

    public deleteTag(releaseId: number, tag: string, currentTags: string[]): IPromise<void> {
        let promise = ReleaseSource.instance().deleteTag(releaseId, tag);
        return this._modifyTags(promise, currentTags);
    }

    public updateContributions(targetId: string): IPromise<void> {
        return ContributionSource.instance().getContributions(targetId).then((contributions: Contribution[]) => {
            this._releaseActionsHub.updateContributions.invoke(contributions);
            ContributionTelemetryUtils.publishContributionsTelemetryFromContributions(targetId, contributions);
            return Q.resolve(null);
        });
    }

    public updateReleaseSummaryContributionCallBack(contributionId: string, callback: (release: ReleaseContracts.Release) => void) {
        this._releaseActionsHub.updateReleaseChangedContributionCallBack.invoke({ contributionId: contributionId, callBack: callback });
    }

    public updateToolbarContributionCallBack(contributionId: string, callback: (release: ReleaseContracts.Release) => void) {
        this._releaseActionsHub.updateReleaseToolbarContributionCallBack.invoke({ contributionId: contributionId, callBack: callback });
    }

    public cleanUpReleaseSummaryContributionsCallBack() {
        this._releaseActionsHub.cleanupReleaseSummaryContributionCallBack.invoke({});
    }

    public cleanUpToolbarContributionsCallBack() {
        this._releaseActionsHub.cleanupToolbarContributionCallBack.invoke({});
    }

    public updateSelectedPivotKey(selectedPivotKey: string): void {
        this._releaseActionsHub.updateSelectedPivotKey.invoke(selectedPivotKey);
    }

    public updateErrorMessage(error: IErrorState): void {
        this._releaseActionsHub.updateErrorMessage.invoke(error);
    }

    private _addEditReleaseTelemetry(feature: string, commentAdded?: boolean): void {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.view] = NavigationStateUtils.getAction().toLocaleLowerCase();
        if (feature === Feature.SaveReleaseAction) {
            eventProperties[Properties.IsCommentPresent] = commentAdded;
        }
        Telemetry.instance().publishEvent(feature, eventProperties);
    }

    private _publishVariablesEditTelemetry(): void {
        Telemetry.instance().publishEvent(Feature.ReleaseProgressVariablesEdit);
    }

    private _modifyTags(updatePromise: IPromise<string[]>, currentTags: string[]): IPromise<void> {
        this._logActionStart(ReleaseSummaryPanelActions.autoSaveTags);
        let q = Q.defer<void>();
        this.updateTags(currentTags);
        let callback = (error) => {
            this._logActionComplete(ReleaseSummaryPanelActions.autoSaveTags);
            this._updateAutoSaveErrorMessage(error, ReleaseSummaryPanelActions.autoSaveTags);
        };

        updatePromise.then(
            (tags: string[]) => {
                this._releaseActionsHub.updateServerTags.invoke(tags);
                callback(Utils_String.empty);
                q.resolve(null);
            },
            (error) => {
                let errorMessage: string = VSS.getErrorMessage(error);
                this._releaseActionsHub.resetTags.invoke({});
                callback(errorMessage);
                q.reject(error);
            }
        );
        return q.promise;
    }

    private _autoSaveRelease(release: ReleaseContracts.Release, action: string): IPromise<void> {
        this._logActionStart(action);
        let q = Q.defer<void>();
        let callback = (error) => {
            this._logActionComplete(action);
            this._updateAutoSaveErrorMessage(error, action);
        };

        this._saveRelease(release).then(
            (release: ReleaseContracts.Release) => {
                this.updateExistingRelease(release);
                callback(Utils_String.empty);
                q.resolve(null);
            },
            (error) => {
                let errorMessage: string = VSS.getErrorMessage(error);
                callback(errorMessage);
                q.reject(error);
            }
        );
        return q.promise;
    }

    private _updateAutoSaveErrorMessage(message: string, action: string): void {
        this._releaseActionsHub.updateAutoSaveErrorMessage.invoke({ action: action, errorMessage: message });
    }

    private _saveRelease(release: ReleaseContracts.Release): IPromise<ReleaseContracts.Release> {
        return CachedReleaseSource.instance().updateRelease(release);
    }

    private _logActionStart(name: string): void {
        if (this._progressIndicatorActionsCreator) {
            this._progressIndicatorActionsCreator.actionStarted(name);
        }
    }

    private _logActionComplete(name: string): void {
        if (this._progressIndicatorActionsCreator) {
            this._progressIndicatorActionsCreator.actionCompleted(name);
        }
    }

    private getTriggers(release: ReleaseContracts.Release) {
        if (release && release.releaseDefinition) {
            // initiate the fetch for release definition but no need to wait for it
            ReleaseDefinitionSource.instance().getReleaseDefinition(release.releaseDefinition.id).then((releaseDefinition: ReleaseContracts.ReleaseDefinition) => {
                this._triggers = releaseDefinition.triggers;
            }, (error) => {
            // Request failed, just ignore
            Diag.logWarning("Prefetching release definition failed with error" + error);
            });
        }
    }

    private _initializeRelease(release: ReleaseContracts.Release): IPromise<void> {

        this.getTriggers(release);
        const artifactListActionCreator = ActionCreatorManager.GetActionCreator<ArtifactListActionCreator>(ArtifactListActionCreator);
        artifactListActionCreator.initializeArtifacts(release.artifacts, this._triggers);
        //  Make a call to update my pending approvals cache
        this.updateMyPendingApprovals(release as ReleaseContracts.Release);

        this.fetchSiblingReleases(release);
        this._initializeAllTags();

        this._releaseActionsHub.initializeRelease.invoke({
            release: release
        });

        const environmentListActionCreator = ActionCreatorManager.GetActionCreator<ReleaseEnvironmentListActionCreator>(ReleaseEnvironmentListActionCreator);
        environmentListActionCreator.initializeEnvironmentList(release.environments, release.artifacts);

        const variablesData: IVariablesData = ReleaseVariablesUtils.mapReleaseToVariablesData(release);
        this._variablesActionsCreator.invokeCreateDefinitionActions(variablesData, false, true);

        this._initializeVariableGroups(release);

        this._variableGroupsActionsCreator.toggleEditMode({ editMode: false });

        if (PermissionHelper.hasViewReleaseTaskEditorPermission()) {
            this._initializeAgentsAndMachineGroups(release);
            TaskDefinitionSource.instance().getTaskDefinitionList(true).then(() => {
                environmentListActionCreator.initializePhasesWithTaskDefinition(release.environments);
            });
        }

        this.fetchReleaseDefinition(release);

        return Q(null);
    }


    private _initializeVariableGroups(release: ReleaseContracts.Release): void {
        let environments: IEnvironmentVariablesData[] = ReleaseVariablesUtils.getReleaseEnvironmentVariablesData(release.environments);

        this._variableGroupsActionsCreator.handleInitializeVariableGroups(
            ReleaseVariablesUtils.getVariableGroupReferences(release),
            ReleaseVariablesUtils.getDistinctVariableGroups(release),
            ReleaseVariablesUtils.getScopes(environments),
        );
    }

    private _initializeAgentsAndMachineGroups(release: ReleaseContracts.Release) {
        let shouldInitializeDeploymentGroups = false, shouldInitializeAgents = false;
        if (release.environments) {
            release.environments.some((environment: ReleaseContracts.ReleaseEnvironment) => {
                if (environment.deployPhasesSnapshot) {
                    environment.deployPhasesSnapshot.some((phase: ReleaseContracts.DeployPhase) => {
                        switch (phase.phaseType) {
                            case ReleaseContracts.DeployPhaseTypes.MachineGroupBasedDeployment:
                                shouldInitializeDeploymentGroups = true;
                                break;
                            case ReleaseContracts.DeployPhaseTypes.AgentBasedDeployment:
                                shouldInitializeAgents = true;
                                break;
                        }

                        return (shouldInitializeDeploymentGroups && shouldInitializeAgents);
                    });
                }

                return (shouldInitializeDeploymentGroups && shouldInitializeAgents);
            });
        }

        if (shouldInitializeDeploymentGroups) {
            this._getAllDeploymentGroups();
        }

        if (shouldInitializeAgents) {
            AgentUtils.loadAgentQueuesIntoAllAgentStores().then(null, (error: any) => {
                Diag.logWarning(error);
            });
        }
    }

    private _getAllDeploymentGroups(continuationToken?: string) {
        Q.all([
            AgentsSource.instance().getPermissibleDeploymentGroups(true, null, DeploymentGroupExpands.None, continuationToken)
        ]).spread((
            deploymentGroupsResult: IDeploymentGroupsResult
        ) => {
            ActionsHubManager.GetActionsHub<DeploymentGroupsActions>(DeploymentGroupsActions)
                .updatePermissibleDeploymentGroups.invoke(deploymentGroupsResult.deploymentGroups);
            if (deploymentGroupsResult.continuationToken) {
                this._getAllDeploymentGroups(deploymentGroupsResult.continuationToken);
            }
        }, (error) => {
            Diag.logWarning(error);
        });
    }

    private _updateReleaseEnvironmentsCapabilities(release: ReleaseContracts.Release, capabilities?: ProcessManagementCapabilities): void {
        const environmentListActionCreator = ActionCreatorManager.GetActionCreator<ReleaseEnvironmentListActionCreator>(ReleaseEnvironmentListActionCreator);
        environmentListActionCreator.updateProcessManagementCapabilities(release.environments, capabilities, release.releaseDefinition.path, release.releaseDefinition.id, release.projectReference.id);
    }

    private _initializeAllTags(): void {
        TagSource.instance().getProjectTags().then(
            (tags: string[]) => {
                this._releaseActionsHub.initializeAllTags.invoke(tags);
            },
            (error: any) => {
                // Request failed
                Diag.logError("All tags fetch failed with error" + error);
            }
        );
    }

    private _resetStates(release: ReleaseContracts.Release, forceUpdate?: boolean): void {

        const artifactListActionCreator = ActionCreatorManager.GetActionCreator<ArtifactListActionCreator>(ArtifactListActionCreator);
        artifactListActionCreator.updateArtifacts(release.artifacts, this._triggers, forceUpdate);

        this.updateExistingRelease(release, forceUpdate);
        this._updateReleaseEnvironmentsCapabilities(release, ProcessManagementCapabilities.None);
        this._releaseActionsHub.toggleEditMode.invoke(false);
        ReleaseSignalRManager.instance().startLiveWatchIfNeeded();
    }

    private _updateExistingVariables(release: ReleaseContracts.Release, disabledMode: boolean): void {
        const variablesData: IVariablesData = ReleaseVariablesUtils.mapReleaseToVariablesData(release);

        this._variablesActionsCreator.invokeUpdateDefinitionActions(variablesData, disabledMode);

        //  ToDo: mdakbar update variable groups here, when Edit scenario lights up.
    }

    private _handleError = (error: any): IPromise<any> => {
        this._releaseActionsHub.updateErrorMessage.invoke({ errorMessage: error.message || error, errorStatusCode: error.status });
        return Q.reject(error);
    }

    private _releaseActionsHub: ReleaseActionsHub;
    private _variablesActionsCreator: ReleaseVariablesActionsCreator;
    private _variableGroupsActionsCreator: VariableGroupActionsCreator;
    private _progressIndicatorActionsCreator: ProgressIndicatorActionsCreator;
    private _overlayPanelActionsCreator: OverlayPanelActionsCreator;
    private _triggers: ReleaseContracts.ReleaseTriggerBase[];
}