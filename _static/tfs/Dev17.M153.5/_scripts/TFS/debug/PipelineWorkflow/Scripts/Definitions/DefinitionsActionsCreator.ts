import * as Q from "q";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { LoadableComponentActionsCreator } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsCreator";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { MessageBarType } from "OfficeFabric/MessageBar";

import { Favorite } from "Favorites/Contracts";

import { CommonDefinitionsActionsHub } from "PipelineWorkflow/Scripts/Definitions/CommonDefinitionsActions";
import { DashboardsActionsCreator } from "PipelineWorkflow/Scripts/Definitions/Dashboards/DashboardsActionsCreator";
import { FavoritesActionsHub } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoritesActions";
import { DefinitionsActionsCreatorKeys, MessageBarParentKeyConstants, AllDefinitionsContentKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { DefinitionsActionsHub } from "PipelineWorkflow/Scripts/Definitions/DefinitionsActions";
import { DefinitionsSource } from "PipelineWorkflow/Scripts/Definitions/DefinitionsSource";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { PerfTelemetryManager, PerfScenarios, DefinitionsHubTelemetry } from "PipelineWorkflow/Scripts/Definitions/Utils/TelemetryUtils";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { PermissionHelper, IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { ReleaseSource } from "PipelineWorkflow/Scripts/Shared/Sources/ReleaseSource";
import { SecurityUtils } from "PipelineWorkflow/Scripts/Editor/Common/SecurityUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { IWidgetData } from "PipelineWorkflow/Scripts/Widgets/Common/WidgetsHelper";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { SaveToFile } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Utils.Core";
import * as Context from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Context";
import { ReleaseManagementSecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import * as DashboardContracts from "TFS/Dashboards/Contracts";
import { PinArgs } from "TFSUI/Dashboards/AddToDashboard";

import * as VSSContext from "VSS/Context";
import * as Diag from "VSS/Diag";
import { PermissionEvaluationBatch, PermissionEvaluation } from "VSS/Security/Contracts";
import * as Utils_String from "VSS/Utils/String";

export class DefinitionsActionsCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DefinitionsActionsCreatorKeys.ActionCreatorKey_DefinitionsActionsCreator;
    }

    public initialize(instanceId?: string): void {
        this._commonDefinitionsActionsHub = ActionsHubManager.GetActionsHub<CommonDefinitionsActionsHub>(CommonDefinitionsActionsHub);
        this._definitionsActionsHub = ActionsHubManager.GetActionsHub<DefinitionsActionsHub>(DefinitionsActionsHub);
        this._favoritesActionsHub = ActionsHubManager.GetActionsHub<FavoritesActionsHub>(FavoritesActionsHub);
        this._messageHandlerActionsCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
        this._loadableComponentActionsCreator = ActionCreatorManager.GetActionCreator<LoadableComponentActionsCreator>(LoadableComponentActionsCreator, instanceId);
        this._dashboardsActionsCreator = ActionCreatorManager.GetActionCreator<DashboardsActionsCreator>(DashboardsActionsCreator, instanceId);
    }

    public fetchAllDefinitionsInitialData(): void {
        this._loadableComponentActionsCreator.hideLoadingExperience();
        let favoritesPromise: IPromise<Favorite[]> = Q.resolve(null);

        favoritesPromise = DefinitionsSource.instance().getFavorites();
        favoritesPromise.then((favorites: Favorite[]) => {
            this._favoritesActionsHub.fetchFavorites.invoke(favorites);
        });

        let foldersPromise = DefinitionsSource.instance().getReleaseDefinitionsFolders().then((folders: PipelineTypes.PipelineDefinitionFolder[]) => {
            this._definitionsActionsHub.foldersInitialized.invoke({ folders: folders });
            this._updateFolderPermissions(folders);
        });

        let defintionsPromise = DefinitionsSource.instance().getRootFolderReleaseDefinitions(false).then((releaseDefinitionsResult: PipelineTypes.IReleaseDefinitionsResult) => {
            if (releaseDefinitionsResult) {
                let ids: number[] = [];
                for (const definition of releaseDefinitionsResult.definitions) {
                    ids.push(definition.id);
                }

                this._commonDefinitionsActionsHub.setDefinitions.invoke({ releaseDefinitions: releaseDefinitionsResult.definitions });
                this._definitionsActionsHub.setDefinitions.invoke({ releaseDefinitionsIds: ids });
                this._updateDefinitionsPermissions(releaseDefinitionsResult.definitions);
            }
        });

        Q.all([foldersPromise, defintionsPromise, favoritesPromise]).then(() => {
        },
            (error) => {
                this._handleError(error);
            }).fin(() => {
                this._definitionsActionsHub.updateLoadingStatus.invoke(false);
                this._definitionsActionsHub.updateDefinitionsView.invoke({});

                // Ending perf scenario inside timeout to ensure that the time taken to complete response for other timer functions,
                // such as _fetchMoreRootFolderReleasesDefinitionsIfNeeded gets recorded in TTI
                setTimeout(() => {
                    PerfTelemetryManager.instance.endScenario(PerfScenarios.AllDefinitions);
                }, 0);
            });
    }

    public fetchFolders(): void {
        DefinitionsSource.instance().getReleaseDefinitionsFolders().then((folders: PipelineTypes.PipelineDefinitionFolder[]) => {
            this._definitionsActionsHub.foldersInitialized.invoke({ folders: folders });
            this._updateFolderPermissions(folders);
        },
            (error) => {
                this._handleError(error);
            });
    }

    public searchReleaseDefinitions(searchText: string): void {
        PerfTelemetryManager.instance.startScenario(PerfScenarios.SearchResults);
        if (searchText) {
            this._definitionsActionsHub.setSearchResults.invoke({
                isLoading: true,
                showSearchResults: true,
                releaseDefinitionsIds: []
            });

            let definitionsPromise = <Q.Promise<PipelineTypes.IReleaseDefinitionsResult>>DefinitionsSource.instance().searchReleaseDefinitions(searchText, RMContracts.ReleaseDefinitionExpands.LastRelease);
            definitionsPromise.then((releaseDefinitionsResult: PipelineTypes.IReleaseDefinitionsResult) => {
                if (releaseDefinitionsResult) {
                    DefinitionsHubTelemetry.SearchDefinitionsCalled(releaseDefinitionsResult.definitions.length);
                    let ids: number[] = [];
                    for (const definition of releaseDefinitionsResult.definitions) {
                        ids.push(definition.id);
                    }

                    this._commonDefinitionsActionsHub.setDefinitions.invoke({ releaseDefinitions: releaseDefinitionsResult.definitions });
                    this._definitionsActionsHub.setSearchResults.invoke({
                        isLoading: false,
                        showSearchResults: true,
                        releaseDefinitionsIds: ids
                    });
                    this._updateDefinitionsPermissions(releaseDefinitionsResult.definitions);
                }
            },
                (error) => {
                    this._handleError(error);
                    this._definitionsActionsHub.setSearchResults.invoke({
                        isLoading: false,
                        showSearchResults: true,
                        releaseDefinitionsIds: []
                    });

                }).fin(() => {
                    PerfTelemetryManager.instance.endScenario(PerfScenarios.SearchResults);
                });
        }
        else {
            DefinitionsSource.instance().cancelActiveSearchRequests();
            this._definitionsActionsHub.setSearchResults.invoke({
                isLoading: false,
                showSearchResults: false,
                releaseDefinitionsIds: []
            });
        }
    }

    public fetchMoreRootFolderReleaseDefinitions(): void {
        let hasMoreRootFolderDefinitions = DefinitionsSource.instance().hasMoreRootFolderDefinitions();
        if (!hasMoreRootFolderDefinitions) {
            return;
        }

        PerfTelemetryManager.instance.startScenario(PerfScenarios.FetchMoreDefinitions);
        DefinitionsHubTelemetry.FetchMoreDefinitionsOnScrollCalled();

        this._loadableComponentActionsCreator.showLoadingExperience();
        let definitionsPromise = <Q.Promise<PipelineTypes.IReleaseDefinitionsResult>>DefinitionsSource.instance().getRootFolderReleaseDefinitions(true);

        definitionsPromise.then((releaseDefinitionsResult: PipelineTypes.IReleaseDefinitionsResult) => {
            if (releaseDefinitionsResult) {
                let ids: number[] = [];
                for (const definition of releaseDefinitionsResult.definitions) {
                    ids.push(definition.id);
                }

                this._commonDefinitionsActionsHub.setDefinitions.invoke({ releaseDefinitions: releaseDefinitionsResult.definitions });
                this._definitionsActionsHub.setDefinitions.invoke({ releaseDefinitionsIds: ids });
                this._definitionsActionsHub.updateDefinitionsView.invoke({});
                this._updateDefinitionsPermissions(releaseDefinitionsResult.definitions);
            }
        },
            (error) => {
                this._handleError(error);
            }).fin(() => {
                this._loadableComponentActionsCreator.hideLoadingExperience();
                PerfTelemetryManager.instance.endScenario(PerfScenarios.FetchMoreDefinitions);
            });
    }

    public fetchFolderReleaseDefinitions(folderId: number, folderPath: string): void {
        DefinitionsHubTelemetry.ExpandFolderClicked();
        PerfTelemetryManager.instance.startScenario(PerfScenarios.ExpandFolder);

        let definitionsPromise = <Q.Promise<PipelineTypes.IReleaseDefinitionsResult>>DefinitionsSource.instance().getFolderReleaseDefinitions(folderPath);
        definitionsPromise.then((releaseDefinitionsResult: PipelineTypes.IReleaseDefinitionsResult) => {
            DefinitionsHubTelemetry.ExpandFolderSucceeded();

            this._definitionsActionsHub.expandFolder.invoke({ folderPath: folderPath });
            if (releaseDefinitionsResult) {
                let ids: number[] = [];
                for (const definition of releaseDefinitionsResult.definitions) {
                    ids.push(definition.id);
                }

                this._commonDefinitionsActionsHub.setDefinitions.invoke({ releaseDefinitions: releaseDefinitionsResult.definitions });
                this._definitionsActionsHub.setDefinitions.invoke({ releaseDefinitionsIds: ids });
                this._definitionsActionsHub.updateDefinitionsView.invoke({});
                this._updateDefinitionsPermissions(releaseDefinitionsResult.definitions);
            }
        },
            (error) => {
                DefinitionsHubTelemetry.ExpandFolderFailed();
                this._handleError(error);
            }).fin(() => {
                PerfTelemetryManager.instance.endScenario(PerfScenarios.ExpandFolder);
            });
    }

    public updateDefinitionLastReleaseReference(definitionId: number): void {
        DefinitionsSource.instance().updateDefinitionLastReleaseReference(definitionId)
            .then((definition: PipelineTypes.PipelineDefinition) => {

                this._commonDefinitionsActionsHub.updateDefinition.invoke(definition);

                this._definitionsActionsHub.updateDefinitionsView.invoke({});
            },
            (error) => {
                this._handleError(error);
            });
    }

    public deleteDefinition(definitionId: number, definitionName: string, comment: string, forceDelete: boolean): void {
        DefinitionsSource.instance().deleteDefinition(definitionId, comment, forceDelete)
            .then(() => {
                DefinitionsHubTelemetry.DeleteDefinitionSucceeded();

                this._commonDefinitionsActionsHub.deleteDefinition.invoke(definitionId);
                this._definitionsActionsHub.deleteDefinition.invoke(definitionId);
                this._definitionsActionsHub.updateDefinitionsView.invoke({});

                this._messageHandlerActionsCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey,
                    Utils_String.localeFormat(Resources.ReleaseDefinitionHasBeenDeleted, definitionName),
                    MessageBarType.success);
            },
            (error) => {
                DefinitionsHubTelemetry.DeleteDefinitionFailed();
                this._handleError(error);
            });
    }

    public deleteFolder(path: string): void {
        (<Q.Promise<void>>DefinitionsSource.instance().deleteFolder(path))
            .then(() => {
                DefinitionsHubTelemetry.DeleteFolderSucceeded();

                this._commonDefinitionsActionsHub.deleteFolder.invoke(path);
                this._definitionsActionsHub.deleteFolder.invoke(path);
                this._definitionsActionsHub.updateDefinitionsView.invoke({});

                this._messageHandlerActionsCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey,
                    Utils_String.localeFormat(Resources.ReleaseDefinitionFolderDeleted, path),
                    MessageBarType.success);
            },
            (error) => {
                DefinitionsHubTelemetry.DeleteFolderFailed();
                this._handleError(error);
            }).fin(() => {
                PerfTelemetryManager.instance.endScenario(PerfScenarios.DeleteFolder);
            });
    }

    public createDraftRelease(definitionId: number, source: string, projectName?: string): void {
        DefinitionsHubTelemetry.CreateDraftReleaseClicked(source);
        let pipelineReleaseParameters = {
            isDraft: true,
            definitionId: definitionId
        } as PipelineTypes.PipelineReleaseStartMetadata;
        let defaultProjectName: string = projectName;
        if (!defaultProjectName) {
            let webContext = VSSContext.getDefaultWebContext();
            defaultProjectName = webContext.project.name;
        }

        ReleaseSource.instance().createRelease(pipelineReleaseParameters, defaultProjectName)
            .then((pipelineRelease: PipelineTypes.PipelineRelease) => {
                DefinitionsHubTelemetry.CreateDraftReleaseSucceeded();
                // Redirect to the Release editor
                DefinitionsUtils.navigateToDraftRelease(pipelineRelease, PipelineTypes.PipelineReleaseEditorActions.environmentsEditorAction);
            },
            (error) => {
                DefinitionsHubTelemetry.CreateDraftReleaseFailed();
                this._handleError(error);
            });
    }

    public exportDefinition(definitionId: number, source: string): void {
        DefinitionsHubTelemetry.ExportRDClicked(source);
        DefinitionsSource.instance().getDefinition(definitionId)
            .then(function (definition: PipelineTypes.PipelineDefinition) {
                let definitionJson = JSON.stringify(definition);
                let definitionName = definition.name;
                let exportedFileName = definitionName.concat(".json");
                SaveToFile(definitionJson, exportedFileName);
                DefinitionsHubTelemetry.ExportRDSucceeded();
            },
            (error) => {
                DefinitionsHubTelemetry.ExportRDFailed();
                this._handleError(error);
            });
    }

    public pinWidgetToDashboard(widgetData: IWidgetData, source: string): void {
        DefinitionsHubTelemetry.AddToDashboardClicked(source);
        if (widgetData.projectId && widgetData.groupId && widgetData.dashboardId && widgetData.contributionId) {
            let widget: DashboardContracts.Widget = <DashboardContracts.Widget>{
                size: widgetData.size,
                id: null, // widget is not created, so id is not there
                position: {
                    column: 0, row: 0
                },
                name: widgetData.name,
                contributionId: widgetData.contributionId,
                artifactId: Utils_String.empty,
                settings: widgetData.data
            };
            Context.serviceContext.dashboardManager().createWidget(widget, widgetData.groupId, widgetData.dashboardId, widgetData.projectId)
                .then(() => {
                    DefinitionsHubTelemetry.AddToDashboardSucceeded();
                    this._messageHandlerActionsCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubSuccessMessageBarKey, Utils_String.localeFormat(Resources.WidgetAddedSuccessfullyMessage, widgetData.name), MessageBarType.success);
                },
                (error) => {
                    DefinitionsHubTelemetry.AddToDashboardFailed();
                    this._handleError(error);
                });
        }
    }

    public setAddToDashboardMessageState(args: PinArgs): void {
        this._definitionsActionsHub.setAddToDashboardMessageState.invoke(args);
    }

    public updateToolbarPermissions(): void {
        let permissionsBatch: PermissionEvaluationBatch = {
            alwaysAllowAdministrators: false,
            evaluations: []
        };

        DefinitionsUtils.addRMPermissionEvaluations(permissionsBatch.evaluations, Utils_String.empty);

        PermissionHelper.fetchPermissions(permissionsBatch).then((permissionsCollection: IPermissionCollection) => {
            this._definitionsActionsHub.updateToolbarPermissions.invoke(permissionsCollection);
        });
    }

    public updateNoResultsImageLoadingStatus(imageLoaded: boolean): void {
        this._definitionsActionsHub.updateNoResultsImageLoadingStatus.invoke(imageLoaded);
    }

    private _updateFolderPermissions(folders: PipelineTypes.PipelineDefinitionFolder[]): void {
        if (!folders || folders.length === 0) {
            return;
        }

        let permissionsBatch: PermissionEvaluationBatch = {
            alwaysAllowAdministrators: true,
            evaluations: []
        };

        folders.forEach((folder: PipelineTypes.PipelineDefinitionFolder) => {
            const token: string = SecurityUtils.createFolderPathSecurityToken(folder.path);

            DefinitionsUtils.addRMPermissionEvaluations(permissionsBatch.evaluations, token);
        });

        PermissionHelper.fetchPermissions(permissionsBatch).then((permissions: IPermissionCollection) => {
            this._definitionsActionsHub.updateFolderPermissions.invoke(permissions);
            this._definitionsActionsHub.updateDefinitionsView.invoke({});
        });
    }

    private _updateDefinitionsPermissions(definitions: PipelineTypes.PipelineDefinition[]): void {
        let permissionsBatch: PermissionEvaluationBatch = DefinitionsUtils.getRDPermissionsBatch(definitions);
        DefinitionsUtils.addRMUIPermissionEvaluations(permissionsBatch.evaluations);

        PermissionHelper.fetchPermissions(permissionsBatch).then((permissions: IPermissionCollection) => {
            this._commonDefinitionsActionsHub.updateDefinitionsPermissions.invoke(permissions);
            this._definitionsActionsHub.updateDefinitionsView.invoke({});
        });
    }

    private _handleError(error: string): void {
        let errorMessage: string = this._getErrorMessage(error);
        if (errorMessage) {
            Diag.logError(errorMessage);
            this._messageHandlerActionsCreator.addMessage(MessageBarParentKeyConstants.DefinitionsHubErrorMessageBarKey, errorMessage, MessageBarType.error);
        }
    }

    private _clearMessage(parentKey: string): void {
        this._messageHandlerActionsCreator.dismissMessage(parentKey);
    }

    private _getErrorMessage(error): string {
        if (!error) {
            return null;
        }

        return error.message || error;
    }

    private _commonDefinitionsActionsHub: CommonDefinitionsActionsHub;
    private _definitionsActionsHub: DefinitionsActionsHub;
    private _favoritesActionsHub: FavoritesActionsHub;
    private _loadableComponentActionsCreator: LoadableComponentActionsCreator;
    private _messageHandlerActionsCreator: MessageHandlerActionsCreator;
    private _dashboardsActionsCreator: DashboardsActionsCreator;
}