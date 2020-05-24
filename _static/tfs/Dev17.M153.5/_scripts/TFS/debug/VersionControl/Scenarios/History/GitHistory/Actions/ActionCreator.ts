/// <reference types="q" />
import * as Q from "q";
import { ChangeListSearchCriteria } from "TFS/VersionControl/Contracts";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";

import { ActionsHub } from "VersionControl/Scenarios/History/GitHistory/Actions/ActionsHub";
import { GitHistorySearchCriteria } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { StoresHub } from "VersionControl/Scenarios/History/GitHistory/Stores/StoresHub";
import { TTIScenario } from "VersionControl/Scenarios/History/TTIScenario";
import { VersionSpec, GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { Notification } from "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { PathSearchItemIdentifier } from "VersionControl/Scenarios/Shared/Path/IPathSearchItemIdentifier";
import { LazyPathsSearchSource } from "VersionControl/Scenarios/Shared/Path/LazyPathsSearchSource";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VersionControlRegistryPath from "VersionControl/Scripts/VersionControlRegistryPath";

const resolved = Q.resolve(undefined);

/**
 * The entry point to trigger actions in the History page.
 */
export class ActionCreator {
    private _isFirstPathUpdate: boolean; // This is true even after finishInitialization, until current url is stacked the first for history navigation

    constructor(
        private actionsHub: ActionsHub,
        private readonly userLastVisitedBranch: string,
        private storesHub: StoresHub,
        private _gitPermissionSource: GitPermissionsSource,
        private repositoryContext: RepositoryContext,
        private searchSource?: LazyPathsSearchSource,
        private _ttiScenario?: TTIScenario) {

        this._gitPermissionSource.queryDefaultGitRepositoryPermissionsAsync()
            .then(x => {
                this.actionsHub.permissionUpdate.invoke(x);
            });
        this._isFirstPathUpdate = true;
    }

    public setupInitialVersion = (deletedUserBranchName: string): void => {
        this.changeRepository();
        if (deletedUserBranchName) {
            this.actionsHub.deletedBranchChanged.invoke(deletedUserBranchName);
        }
    }

    public setSearchCriteria = (searchCriteriaPayload: GitHistorySearchCriteria): void => {
        if (this._shouldUpdate(searchCriteriaPayload)) {
            const versionSpec: VersionSpec = VersionSpec.parse(searchCriteriaPayload.itemVersion);
            this.actionsHub.searchCriteriaUpdated.invoke(searchCriteriaPayload);
            this.changePath(
                searchCriteriaPayload.itemPath,
                versionSpec.toVersionString(),
                CustomerIntelligenceConstants.PATHCHANGESOURCE_SOURCE_EXPLORER_TREE);
        }
    }

    public changeRepository = (): void => {
        this.actionsHub.currentRepositoryChanged.invoke({
            isGit: true,
            repositoryName: this.repositoryContext.getRepository().name,
            repositoryContext: this.repositoryContext,
        });
    }

    public changePath = (path: string, version?: string, trigger?: string): IPromise<{}> => {
        path = this.normalizeGitPath(path);

        if (this.storesHub.pathState.path === path &&
            this.storesHub.version === version) {
            return resolved;
        }

        let versionSpec;
        if (version) {
            versionSpec = VersionSpec.parse(version);
        }
        else if (this.storesHub.versionSpec) {
            versionSpec = this.storesHub.versionSpec;
        } else {
            versionSpec = new GitBranchVersionSpec(this.userLastVisitedBranch);
        }

        this.actionsHub.selectedPathChanged.invoke({
            path,
            version: versionSpec,
            trigger
        });

        this.handleDelayedSourcePathNavigation(path, version);

        return resolved;
    }

    public startPathEditing = (): void => {
        let tailoredPath = this.storesHub.pathState.path;
        if (this.storesHub.isGit) {
            tailoredPath = this._customizeGitPath(tailoredPath);
        }
        this.actionsHub.pathEditingStarted.invoke(tailoredPath);
        this._searchInFolderPaths(tailoredPath, this.storesHub.version);
    }

    public finishInitialization = (): void => {
        if (this._ttiScenario) {
            this._ttiScenario.addSplitTiming("initialized");
        }
    }

    public editPathText = (text: string): void => {
        this.actionsHub.pathEdited.invoke(text);
        this._searchInFolderPaths(text, this.storesHub.version);
        this._searchGlobalPaths(text, this.storesHub.version);
    }

    public cancelPathEditing = (): void => {
        this.actionsHub.pathEditingCancelled.invoke(null);
    }

    public selectPathSearchItem = (itemIdentifier: PathSearchItemIdentifier, newInputText?: string): void => {
        this.actionsHub.pathSearchSelectionChanged.invoke({
            itemIdentifier,
            newInputText,
        });
    }

    public raiseError = (error: Error): void => {
        this.actionsHub.errorRaised.invoke(error);
    }

    public dismissNotification = (notification: Notification): void => {
        this.actionsHub.notificationDismissed.invoke(notification);
    }

    public onFilterUpdated = (searchCriteria: string): boolean => {
        // addHistoryPoint keeps other existing state, overriding only with matching property values (set nulls to enable clearing relevant search values).
        const criteriaWithNulls = $.extend(this._getNullSearchCriteria(), searchCriteria);
        Navigation_Services.getHistoryService().addHistoryPoint(null, criteriaWithNulls);
        return false;
    };

    public scenarioComplete = (scenarioName: string): void => {
        if (this._ttiScenario) {
            this._ttiScenario.notifyContentRendered(scenarioName);
        }
    };

    public onBranchChanged = (selectedVersion: VersionSpec): void => {
        const historySvc: Navigation_Services.HistoryService = Navigation_Services.getHistoryService();
        const state = historySvc.getCurrentState() || {};
        const versionString = selectedVersion ? selectedVersion.toVersionString() : "";

        // check for the existence of the current itemPath filter in the new branch to avoid an error with History (commits).
        if (state.itemPath) {
            // Check if the currently selected item exists in the newly selected branch
            // TASK 1039355: see if this call is required at all, remove otherwise
            this.repositoryContext.getClient().beginGetItem(this.repositoryContext, state.itemPath, versionString, null, (item) => {
                // Item exists: Go to this item in the new branch
                historySvc.addHistoryPoint(null, { itemVersion: versionString });
            }, (error: Error) => {
                // Item does not exist: Go to the root in the new branch
                historySvc.addHistoryPoint(null, { itemPath: "", itemVersion: versionString });
            });
        }
        else {
            historySvc.addHistoryPoint(null, { itemVersion: versionString });
        }
    }

    public saveBranchVersionSpec(versionSpec: VersionSpec): void {
        if (versionSpec instanceof GitBranchVersionSpec) {
            VersionControlRegistryPath.setUserDefaultBranchSetting(versionSpec.branchName, this.repositoryContext);
        }
    }

    public handleDelayedSourcePathNavigation = (path: string, version: string): void => {
        setTimeout(() => {
            this._handleSourcePathNavigation(path, version);
        });
    }

    // Handler called when the source path text changes
    // public for test
    public _handleSourcePathNavigation = (path: string, version: string): void => {

        if (!path && this.repositoryContext) {
            path = this.repositoryContext.getRootPath();
        }

        version = version || (this.storesHub.versionStore.state.versionSpec && this.storesHub.versionStore.state.versionSpec.toVersionString()) || "";

        this._navigateToPath(path, version, !this._isFirstPathUpdate);
        this._isFirstPathUpdate = false;
    }

    private _navigateToPath = (path: string, version: string, addHistoryPoint: boolean): void => {
        const extraParams: any = {
            itemPath: path,
            itemVersion: version
        }

        if (addHistoryPoint) {
            Navigation_Services.getHistoryService().addHistoryPoint(null, extraParams);
        } else {
            Navigation_Services.getHistoryService().replaceHistoryPoint(
                null,
                extraParams,
                /*windowTitle = */undefined,
                /*suppressNavigate = */undefined,
                /*mergeCurrentState = */ true);
        }
    }

    private _getNullSearchCriteria = (): ChangeListSearchCriteria => {
        return {
            itemPath: null,
            itemVersion: null,
            user: null,
            fromDate: null,
            toDate: null
        } as ChangeListSearchCriteria;
    }

    private _shouldUpdate = (newSearchCriteria: GitHistorySearchCriteria): boolean => {
        const oldSearchCriteria = this.storesHub.searchCriteriaStore.state.searchCriteria;
        return newSearchCriteria.itemPath !== oldSearchCriteria.itemPath ||
            newSearchCriteria.itemVersion !== oldSearchCriteria.itemVersion ||
            newSearchCriteria.user !== oldSearchCriteria.user ||
            newSearchCriteria.fromDate !== oldSearchCriteria.fromDate ||
            newSearchCriteria.toDate !== oldSearchCriteria.toDate ||
            newSearchCriteria.alias !== oldSearchCriteria.alias ||
            newSearchCriteria.gitLogHistoryMode !== oldSearchCriteria.gitLogHistoryMode;
    }

    private _customizeGitPath(text: string): string {
        // Truncate leading slashes.
        return text.replace(/^[\/\\]+/, "");
    }

    private _searchInFolderPaths(searchText: string, version: string): IPromise<void> {
        if (this.searchSource) {
            return this.searchSource.getInFolderSearchResults(searchText, version).then(
                searchResults => {
                    if (!searchResults.searchCancelled) {
                        this.actionsHub.inFolderPathSearchResultsLoaded.invoke(searchResults.results);
                    }
                },
                error => this._handlePathSearchError(error));
        }
    }

    private _searchGlobalPaths(searchText: string, version: string): IPromise<void> {
        if (this.searchSource) {
            return this.searchSource.getGlobalSearchResults(searchText, version).then(
                searchResults => {
                    if (!searchResults.searchCancelled) {
                        this.actionsHub.globalPathSearchResultsLoaded.invoke(searchResults.results);
                    }
                },
                error => this._handlePathSearchError(error));
        }
    }

    private _handlePathSearchError(error: Error): void {
        this.actionsHub.pathSearchFailed.invoke(error);
    }

    private normalizeGitPath(path: string): string {
        const rootPath = "/";
        if (path.substr(0, rootPath.length) !== rootPath) {
            return rootPath + path;
        }

        return path;
    }
}
