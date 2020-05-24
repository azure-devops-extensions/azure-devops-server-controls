import { MessageBarType } from "OfficeFabric/MessageBar";

import * as Utils_String from "VSS/Utils/String";
import { logError as VssDiag_logError } from "VSS/Diag";
import { getErrorMessage as Vss_getErrorMessage } from "VSS/VSS";

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";

import { DefinitionsActionsCreatorKeys, MessageBarParentKeyConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { ActiveReleasesActionsHub, IActiveReleasesPayload } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesActionsHub";
import { PipelineRelease, IReleasesResult, ReleaseDeployment } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleasesSource } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ReleasesSource";
import { ArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactSource";
import { ArtifactTypeListActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeListActions";
import { ReleaseSource } from "PipelineWorkflow/Scripts/Shared/Sources/ReleaseSource";
import { ActiveReleasesFilterStore, IActiveReleasesFilterState } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveReleasesFilterStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { DefinitionsSource } from "PipelineWorkflow/Scripts/Definitions/DefinitionsSource";
import { PerfTelemetryManager, PerfScenarios, DefinitionsHubTelemetry } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import { ReleaseEnvironmentStatusUpdatedEvent, ReleaseStatus } from "ReleaseManagement/Core/Contracts";
import { TagSource } from "PipelineWorkflow/Scripts/Shared/Sources/TagSource";
import { PipelineEnvironment } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { ReleasesHubServiceDataHelper } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";

export class ActiveReleasesActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DefinitionsActionsCreatorKeys.ActionCreatorKey_ActiveReleasesActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<ActiveReleasesActionsHub>(ActiveReleasesActionsHub, instanceId);
        this._artifactTypeListActionsHub = ActionsHubManager.GetActionsHub<ArtifactTypeListActions>(ArtifactTypeListActions);
        this._messageHandlerActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        this._activeReleasesFilterStore = StoreManager.GetStore<ActiveReleasesFilterStore>(ActiveReleasesFilterStore, instanceId);
    }

    public fetchReleases(definitionId: number, folderPath: string): void {
        this._currentQueriedDefinitionId = definitionId;

        const raiseAction = (releases: PipelineRelease[], continuationToken: number) => {
            if (definitionId === this._currentQueriedDefinitionId) {
                let payload: IActiveReleasesPayload = {
                    definitionId: definitionId,
                    folderPath: folderPath,
                    releases: releases,
                    continuationToken: continuationToken
                };

                this._actionsHub.releasesUpdated.invoke(payload);
            }
        };

        const releasesFromData = ReleasesHubServiceDataHelper.getReleases(definitionId);
        if (releasesFromData) {
            raiseAction(releasesFromData.releases, releasesFromData.continuationToken);
            return;
        }

        ReleasesSource.instance().listReleases(definitionId)
            .then((releasesResult: IReleasesResult) => {
                raiseAction(releasesResult.releases, releasesResult.continuationToken);
            },
            (error) => {
                this._handleError(error);
            });
    }

    public fetchActiveReleases(definitionId: number, folderPath: string): void {
        this._currentQueriedDefinitionId = definitionId;

        const raiseAction = (releases: PipelineRelease[], continuationToken: number) => {

            if (definitionId === this._currentQueriedDefinitionId) {
                let payload: IActiveReleasesPayload = {
                    definitionId: definitionId,
                    folderPath: folderPath,
                    releases: releases,
                    continuationToken: continuationToken
                };

                this._actionsHub.releasesUpdated.invoke(payload);
            }
        };

        const releasesFromData = ReleasesHubServiceDataHelper.getReleases(definitionId);
        if (releasesFromData) {
            raiseAction(releasesFromData.releases, releasesFromData.continuationToken);
            return;
        }

        ReleasesSource.instance().listActiveReleases(definitionId)
            .then((releasesResult: IReleasesResult) => {
                raiseAction(releasesResult.releases, releasesResult.continuationToken);
            },
            (error) => {
                this._handleError(error);
            });
    }

    public fetchMoreReleases(definitionId: number, folderPath: string, filterState: IActiveReleasesFilterState, continuationToken: number = 0): void {
        let { searchText, status, branch, isDeleted, tags, createdBy } = filterState;
        this._currentQueriedDefinitionId = definitionId;

        // 0, negative, null or undefined
        if (!continuationToken || continuationToken <= 0) {
            return;
        }

        let promise: IPromise<IReleasesResult>;
        if (filterState.currentlyDeployed) {
            promise = ReleasesSource.instance().listActiveReleases(definitionId, continuationToken);
        }
        else {
            promise = ReleasesSource.instance().listReleases(definitionId, searchText, status, branch, isDeleted, tags, createdBy, continuationToken);
        }

        promise
            .then((releasesResult: IReleasesResult) => {

                if (definitionId === this._currentQueriedDefinitionId) {
                    let payload: IActiveReleasesPayload = {
                        definitionId: definitionId,
                        folderPath: folderPath,
                        releases: releasesResult.releases,
                        continuationToken: releasesResult.continuationToken
                    };

                    this._actionsHub.releasesUpdatedWithMore.invoke(payload);
                }
            },
            (error) => {
                this._handleError(error);
            });
    }

    public searchReleases(definitionId: number, folderPath: string, filterState: IActiveReleasesFilterState): void {
        let { currentlyDeployed, searchText, status, branch, isDeleted, tags, createdBy } = filterState;

        this._currentQueriedDefinitionId = definitionId;

        let searchReleasesPromise: IPromise<IReleasesResult>;
        // We want to treat Undefined as a status state which will not return any releases
        // This will be in line with the paradigm, that we will return only what is selected. If nothing is selected, nothing is returned
        // This will also be needed to maitain mutual exclusiveness of deleted and status, and other groups
        if (isDeleted || currentlyDeployed) {
            searchReleasesPromise = ReleasesSource.instance().searchReleases(definitionId, currentlyDeployed, searchText, ReleaseStatus.Undefined, branch as string, tags, isDeleted, createdBy);
        }
        else {
            searchReleasesPromise = ReleasesSource.instance().searchReleases(definitionId, false, searchText, status, branch as string, tags, false, createdBy);
        }

        // Record the filters selected
        DefinitionsHubTelemetry.RecordActiveReleasesFilters(currentlyDeployed, searchText, status, isDeleted, branch, tags, createdBy);

        searchReleasesPromise.then(
            (releasesResult: IReleasesResult) => {

                // TODO: Remove action creator calls in component lifecycle functions
                // Then we can have this logic in store as well. 
                if (definitionId === this._currentQueriedDefinitionId) {
                    let payload: IActiveReleasesPayload = {
                        definitionId: definitionId,
                        folderPath: folderPath,
                        releases: releasesResult.releases,
                        continuationToken: releasesResult.continuationToken
                    };

                    this._actionsHub.releasesUpdated.invoke(payload);
                }
            },
            (error) => {
                this._handleError(error);
            });
    }

    public fetchAllTags(): void {
        TagSource.instance().getProjectTags().then(
            (tags: string[]) => {
                this._actionsHub.setAllTags.invoke(tags);
            },
            (error: any) => {
                this._handleError(error);
            }
        );
    }

    public fetchArtifactSourceBranches(definitionId: number): void {
        DefinitionsSource.instance().getArtifactSourceBranches(definitionId)
            .then((branches: string[]) => {
                this._actionsHub.artifactSourceBranchesUpdated.invoke(branches);
            });
    }

    public getArtifactTypeDefinitions(): void {
        ArtifactSource.instance().getArtifactTypesDefinition()
            .then((artifactTypeDefinitions) => {
                this._artifactTypeListActionsHub.updateArtifactTypes.invoke(artifactTypeDefinitions);
            });
    }

    public filterUpdated(updatedFilter: IActiveReleasesFilterState): void {
        this._actionsHub.filterUpdated.invoke(updatedFilter);
    }

    public setCurrentlyDeployedState(showCurrentlyDeployed: boolean): void {
        this._actionsHub.setCurrentlyDeployedState.invoke(showCurrentlyDeployed);
    }

    public resetFilterState(): void {
        this._actionsHub.resetFilterState.invoke({});
    }

    public changeRetention(releaseId: number, keepForever: boolean, successCallback?: (message: React.ReactNode) => void, errorCallback?: (message: React.ReactNode) => void): void {
        ReleaseSource.instance().retainRelease(releaseId, keepForever, null)
            .then((release) => {
                const format = keepForever ? Resources.ReleaseRetainedMessageFormat : Resources.ReleaseNotRetainedMessageFormat;
                const message = Utils_String.localeFormat(format, release.name);
                if (successCallback) {
                    successCallback(message);
                }
                this.updateRelease(release, message);
            },
            (error) => {
                if (errorCallback) {
                    let errorMessage: string = Vss_getErrorMessage(error);
                    errorCallback(errorMessage);
                }
                this._handleError(error);
            });
    }

    public updateRelease(release: PipelineRelease, message: string | JSX.Element): void {
        this._messageHandlerActionCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey, message, MessageBarType.success);
        this._actionsHub.updateRelease.invoke({ release: release });
    }

    public onCreateRelease(release: PipelineRelease): void {
        this._actionsHub.releaseCreated.invoke({ release: release });
    }

    public updateReleaseEnvironment(releaseEnvironment: PipelineEnvironment): void {
        this._actionsHub.releaseEnvironmentUpdated.invoke(releaseEnvironment);
    }

    public updateReleaseEnvironmentStatus(releaseEnvironmentStatusUpdatedEvent: ReleaseEnvironmentStatusUpdatedEvent): void {
        this._actionsHub.releaseEnvironmentStatusUpdated.invoke(releaseEnvironmentStatusUpdatedEvent);
    }

    public removeRelease(releaseId: number, message: string | JSX.Element): void {
        this._messageHandlerActionCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey, message, MessageBarType.success);
        this._actionsHub.removeRelease.invoke({
            releaseId: releaseId
        });
    }

    public fetchLastDeploymentForSearchedRd(definitionId: number): void {
        this.fetchLastDeployment(definitionId, false);
    }

    public fetchLastDeploymentForFavoritedRd(definitionId: number): void {
        this.fetchLastDeployment(definitionId, true);
    }

    public fetchLastDeployment(definitionId: number, isFavorite: boolean): void {
        DefinitionsSource.instance().getLastDeployment(definitionId)
            .then((deployment: ReleaseDeployment) => {
                if (!isFavorite) {
                    this._actionsHub.setLastDeploymentForSearchedRd.invoke(deployment);
                }
                else {
                    this._actionsHub.setLastDeploymentForFavoritedRd.invoke(deployment);
                }
            },
            (error) => {
                this._handleError(error);
            });
    }

    public completeReleaseAddition(): void {
        this._actionsHub.completeReleaseAddition.invoke(null);
    }

    public updateDefinitionIdInFilter(definitionId: number): void {
        this._actionsHub.updateDefinitionId.invoke({ definitionId: definitionId });
    }

    public onEnvironmentColumnResize(definitionId: number, width: number): void {
        this._actionsHub.onEnvironmentColumnResize.invoke({
            definitionId: definitionId,
            newWidth: width
        });
    }

    public onReleaseColumnResize(definitionId: number, width: number): void {
        this._actionsHub.onReleaseColumnResize.invoke({
            definitionId: definitionId,
            newWidth: width
        });
    }

    public onReleaseExpand(definitionId: number, width: number): void {
        this._actionsHub.onReleaseExpand.invoke({
            definitionId: definitionId,
            newWidth: width
        });
    }

    private _handleError(error: string): void {
        let errorMessage: string = Vss_getErrorMessage(error);

        VssDiag_logError(errorMessage);
        this._messageHandlerActionCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey, errorMessage, MessageBarType.error);
    }

    private _actionsHub: ActiveReleasesActionsHub;
    private _artifactTypeListActionsHub: ArtifactTypeListActions;
    private _activeReleasesFilterStore: ActiveReleasesFilterStore;
    private _messageHandlerActionCreator: MessageHandlerActionsCreator;
    private _currentQueriedDefinitionId: number;
}