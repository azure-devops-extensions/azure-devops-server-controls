import * as Q from "q";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { Actions as ItemSelectorActions } from "DistributedTaskControls/Actions/ItemSelectorActions";
import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { Favorite } from "Favorites/Contracts";

import { MessageBarType } from "OfficeFabric/MessageBar";

import { IReleaseDefinitionsResult, PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { ActiveDefinitionsActionsHub } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/ActiveDefinitionsActions";
import { SelectDefinitionItem } from "PipelineWorkflow/Scripts/Definitions/ActiveDefinitions/SelectDefinitionItem";
import { CommonDefinitionsActionsHub } from "PipelineWorkflow/Scripts/Definitions/CommonDefinitionsActions";
import { DefinitionsActionsCreatorKeys, MessageBarParentKeyConstants } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { DashboardsActionsCreator } from "PipelineWorkflow/Scripts/Definitions/Dashboards/DashboardsActionsCreator";
import { DefinitionsActionsHub } from "PipelineWorkflow/Scripts/Definitions/DefinitionsActions";
import { DefinitionsSource, IReleasesHubActiveDefinitionsData } from "PipelineWorkflow/Scripts/Definitions/DefinitionsSource";
import { FavoritesActionsHub } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoritesActions";
import { IActiveDefinitionReference } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { PerfTelemetryManager, PerfScenarios, DefinitionsHubTelemetry } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import { PermissionHelper, IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";

import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { PinArgs } from "TFSUI/Dashboards/AddToDashboard";

import { logError } from "VSS/Diag";
import { PermissionEvaluationBatch } from "VSS/Security/Contracts";
import * as Utils_String from "VSS/Utils/String";

export class ActiveDefinitionsActionsCreator extends ActionBase.ActionCreatorBase {
    public static getKey(): string {
        return DefinitionsActionsCreatorKeys.ActionCreatorKey_ActiveDefinitionsActionsCreator;
    }

    public initialize(instanceId?: string): void {
        this._activeDefinitionsActionsHub = ActionsHubManager.GetActionsHub<ActiveDefinitionsActionsHub>(ActiveDefinitionsActionsHub);
        this._favoritesActionsHub = ActionsHubManager.GetActionsHub<FavoritesActionsHub>(FavoritesActionsHub);
        this._messageHandlerActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        this._commonDefinitionsActionsHub = ActionsHubManager.GetActionsHub<CommonDefinitionsActionsHub>(CommonDefinitionsActionsHub);
        this._definitionsActionsHub = ActionsHubManager.GetActionsHub<DefinitionsActionsHub>(DefinitionsActionsHub);
        this._dashboardsActionsCreator = ActionCreatorManager.GetActionCreator<DashboardsActionsCreator>(DashboardsActionsCreator, instanceId);
    }

    public fetchActiveDefinitions(): void {
        this._activeDefinitionsActionsHub.updateLoadingStatus.invoke(true);

        this.fetchfavorites();

        (DefinitionsSource.instance().getActiveDefinitions().then((activeDefinitionsData: IReleasesHubActiveDefinitionsData) => {
            if (activeDefinitionsData) {
                this._updateDefinitionReferencesPermissions([...activeDefinitionsData.activeDefinitions, ...activeDefinitionsData.recentDefinitions]);
                this._activeDefinitionsActionsHub.setActiveDefinitions.invoke({
                    activeDefinitions: activeDefinitionsData.activeDefinitions,
                    recentDefinitions: activeDefinitionsData.recentDefinitions
                });
            }
        },
            (error) => {
                this._handleError(error);
            }) as Q.Promise<any>).fin(() => {
                this._activeDefinitionsActionsHub.updateLoadingStatus.invoke(false);

                // Ending perf scenario inside timeout to ensure that the time taken to complete response for other timer functions,
                // such as _handleSelectItem in left panel gets recorded in TTI
                setTimeout(() => {
                    PerfTelemetryManager.instance.endScenario(PerfScenarios.Mine);
                }, 0);
            });
    }

    public fetchfavorites(): void {
        let favoritesPromise: IPromise<Favorite[]> = Q.resolve(null);
        favoritesPromise = DefinitionsSource.instance().getFavorites();
        favoritesPromise.then((favorites: Favorite[]) => {
            this._favoritesActionsHub.fetchFavorites.invoke(favorites);
        });
    }

    public searchReleaseDefinitions(searchText: string, selectDefinitionItem: SelectDefinitionItem): void {
        PerfTelemetryManager.instance.startScenario(PerfScenarios.SearchResults);

        const itemSelectorActions = ActionsHubManager.GetActionsHub<ItemSelectorActions>(ItemSelectorActions);
        if (searchText) {
            // On search RD in left panel, clear the releases and filters in right panel 
            itemSelectorActions.clearSelection.invoke({});
            this.toggleActiveReleasesFilterBar(false);

            this._activeDefinitionsActionsHub.setSearchResults.invoke({
                isLoading: true,
                showSearchResults: true,
                releaseDefinitions: []
            });

            let definitionsPromise = <Q.Promise<IReleaseDefinitionsResult>>DefinitionsSource.instance().searchReleaseDefinitions(searchText, RMContracts.ReleaseDefinitionExpands.Environments);
            definitionsPromise
                .then((releaseDefinitionsResult: IReleaseDefinitionsResult) => {
                    if (releaseDefinitionsResult) {
                        DefinitionsHubTelemetry.SearchDefinitionsCalled(releaseDefinitionsResult.definitions.length);

                        this._updateDefinitionsPermissions(releaseDefinitionsResult.definitions);

                        let ids: number[] = [];
                        for (const definition of releaseDefinitionsResult.definitions) {
                            ids.push(definition.id);
                        }

                        this._commonDefinitionsActionsHub.setDefinitions.invoke({ releaseDefinitions: releaseDefinitionsResult.definitions });

                        // If search results are not empty, and no RD has been selected, show the 'select-definition-to-view-details-item' in right panel
                        if (releaseDefinitionsResult.definitions.length > 0) {
                            itemSelectorActions.selectItem.invoke({ data: selectDefinitionItem });
                        }

                        this._activeDefinitionsActionsHub.setSearchResults.invoke({
                            isLoading: false,
                            showSearchResults: true,
                            releaseDefinitions: releaseDefinitionsResult.definitions
                        });
                    }
                },
                (error) => {
                    this._handleError(error);
                    this._activeDefinitionsActionsHub.setSearchResults.invoke({
                        isLoading: false,
                        showSearchResults: true,
                        releaseDefinitions: []
                    });

                })
                .fin(() => {
                    PerfTelemetryManager.instance.endScenario(PerfScenarios.SearchResults);
                });
        }
        else {
            DefinitionsSource.instance().cancelActiveSearchRequests();
            this.toggleActiveReleasesFilterBar(true);
            this._activeDefinitionsActionsHub.setSearchResults.invoke({
                isLoading: false,
                showSearchResults: false,
                releaseDefinitions: []
            });
        }
    }

    public deleteDefinition(definitionId: number, definitionName: string, comment: string, forceDelete: boolean): void {
        DefinitionsSource.instance().deleteDefinition(definitionId, comment, forceDelete)
            .then(() => {
                DefinitionsHubTelemetry.DeleteDefinitionSucceeded();

                this._commonDefinitionsActionsHub.deleteDefinition.invoke(definitionId);
                this._activeDefinitionsActionsHub.deleteDefinition.invoke(definitionId);
                this._definitionsActionsHub.deleteDefinition.invoke(definitionId);
                this._definitionsActionsHub.updateDefinitionsView.invoke({});

                // Clear any existing delete error messages for this RD before rendering RD successfully deleted message
                if (this._deletionFailedDefinitionId === definitionId) {
                    this._deletionFailedDefinitionId = -1;
                    this._messageHandlerActionCreator.dismissMessage(MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey);
                }

                this._messageHandlerActionCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey,
                    Utils_String.localeFormat(Resources.ReleaseDefinitionHasBeenDeleted, definitionName),
                    MessageBarType.success);
            },
            (error) => {
                DefinitionsHubTelemetry.DeleteDefinitionFailed();
                this._deletionFailedDefinitionId = definitionId;
                this._handleError(error);
            });
    }

    public setInitialSelectedDefinition(id: number): void {
        this._activeDefinitionsActionsHub.setInitialSelectedDefinition.invoke(id);
    }

    public toggleActiveReleasesFilterBar(showFilter: boolean): void {
        this._activeDefinitionsActionsHub.toggleActiveReleasesFilterBar.invoke(showFilter);
    }

    public clearFavoriteInProgressId(): void {
        this._activeDefinitionsActionsHub.clearFavoriteInProgressId.invoke({});
    }

    public releaseEnvironmentUpdated(releaseEnvironment: RMContracts.ReleaseEnvironment): void {
        this._activeDefinitionsActionsHub.releaseEnvironmentUpdated.invoke(releaseEnvironment);
    }

    public environmentLastDeploymentUpdated(releaseEnvironment: RMContracts.ReleaseEnvironment): void {
        this._activeDefinitionsActionsHub.environmentLastDeploymentUpdated.invoke(releaseEnvironment);
    }

    public setAddToDashboardMessageState(args: PinArgs): void {
        this._activeDefinitionsActionsHub.setAddToDashboardMessageState.invoke(args);
    }

    private _updateDefinitionReferencesPermissions(definitions: IActiveDefinitionReference[]): void {
        let permissionsBatch: PermissionEvaluationBatch = DefinitionsUtils.getActiveRDPermissionsBatch(definitions);
        this._updatePermissions(permissionsBatch);
    }

    private _updateDefinitionsPermissions(definitions: PipelineDefinition[]): void {
        let permissionsBatch: PermissionEvaluationBatch = DefinitionsUtils.getRDPermissionsBatch(definitions);
        this._updatePermissions(permissionsBatch);
    }

    private _updatePermissions(permissionsBatch: PermissionEvaluationBatch): void {
        if (permissionsBatch) {
            DefinitionsUtils.addRMUIPermissionEvaluations(permissionsBatch.evaluations);
        }

        PermissionHelper.fetchPermissions(permissionsBatch).then((permissions: IPermissionCollection) => {
            this._commonDefinitionsActionsHub.updateDefinitionsPermissions.invoke(permissions);
            this._activeDefinitionsActionsHub.setDefaultSelectedDefinitionForDefinitionsHub.invoke({});
        });
    }

    private _handleError(error: string): void {
        let errorMessage: string = this._getErrorMessage(error);
        if (errorMessage) {
            logError(errorMessage);
            this._messageHandlerActionCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey, errorMessage, MessageBarType.error);
        }
    }

    private _getErrorMessage(error): string {
        if (!error) {
            return Utils_String.empty;
        }
        return error.message || error;
    }

    private _commonDefinitionsActionsHub: CommonDefinitionsActionsHub;
    private _activeDefinitionsActionsHub: ActiveDefinitionsActionsHub;
    private _messageHandlerActionCreator: MessageHandlerActionsCreator;
    private _favoritesActionsHub: FavoritesActionsHub;
    private _definitionsActionsHub: DefinitionsActionsHub;
    private _dashboardsActionsCreator: DashboardsActionsCreator;
    private _deletionFailedDefinitionId: number = -1;
}