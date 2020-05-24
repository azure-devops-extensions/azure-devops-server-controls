import * as React from "react";
import * as Navigation_Services from "VSS/Navigation/Services";

import { FilterState } from "Presentation/Scripts/TFS/Controls/Filters/IFilterPanel";
import * as Actions from "VersionControl/Scenarios/Pushes/ActionsHub";
import { BranchUpdatesSource } from "VersionControl/Scenarios/Pushes/Sources/BranchUpdatesSource";
import { PushesLocalStorageHelper } from "VersionControl/Scenarios/Pushes/Sources/PushesLocalStorageHelper";
import { PushesViewTelemetrySpy } from "VersionControl/Scenarios/Pushes/Sources/PushesViewTelemetrySpy";
import { AggregateState } from "VersionControl/Scenarios/Pushes/Stores/StoresHub";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { DelayAnnounceHelper } from "VersionControl/Scripts/DelayAnnounceHelper";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VersionSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VersionControlRegistryPath from "VersionControl/Scripts/VersionControlRegistryPath";

export class ActionCreator {
    private _delayAnnounceHelper: DelayAnnounceHelper;
    private _isFirstLoad: boolean = true;
    private _updatesTimeout: number;

    constructor(
        private _actionsHub: Actions.ActionsHub,
        private _source: BranchUpdatesSource,
        private _gitPermissionSource: GitPermissionsSource,
        private readonly _getState?: () => AggregateState,
        private _telemetrySpy?: PushesViewTelemetrySpy) {
        this._delayAnnounceHelper = new DelayAnnounceHelper();
        this._gitPermissionSource.queryDefaultGitRepositoryPermissionsAsync()
            .then(x => {
                this._actionsHub.permissionUpdate.invoke(x);
            });
    }

    public initialize = (repositoryContext: RepositoryContext, defaultBranchName: string): void => {
        this._actionsHub.currentRepositoryChanged.invoke({
            repositoryContext: repositoryContext,
        });
    }

    public clearUpdatesList = (): void => {
        this._actionsHub.branchUpdatesCleared.invoke(null);
    }

    public clearAllErrors = (): void => {
        this._actionsHub.branchUpdatesClearAllErrorsRaised.invoke(null);
    }

    public fetchMissingItemBranchUpdates = (index: number): React.ReactNode => {
        // dont send another call if there already is one call waiting - eat up the second call
        if (this._getState().branchUpdatesState.listenToAutoscroll && !this._updatesTimeout) {
            this._updatesTimeout = setTimeout(() => {
                this._updatesTimeout = null;
                this.fetchBranchUpdates(
                    this._getState().searchCriteriaState.searchCriteria,
                    true,
                    this._getState().branchUpdatesState.refUpdates.length);
            },
            500);
        }
        return undefined;
    }

    public fetchBranchUpdates = (
        searchFilter: Actions.PushesSearchFilterData,
        appendToExistingResults: boolean = false,
        skip?: number,
        top?: number): void => {
        if (!this._source) {
            return;
        }

        if (!appendToExistingResults) {
            this._actionsHub.branchUpdatesLoadStarted.invoke(null);
        } else {
            this._actionsHub.moreBranchUpdatesLoadStarted.invoke(null);
        }

        this._delayAnnounceHelper.startAnnounce(VCResources.FetchingResultsText);

        this._source.getUpdatesFromDataProvider(searchFilter, skip, top).then(
            (results: Actions.BranchUpdatesLoadedPayload) => {
                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText);

                if (!appendToExistingResults) {
                    this._actionsHub.branchUpdatesLoaded.invoke(results);
                } else {
                    this._actionsHub.moreBranchUpdatesLoaded.invoke(results);
                }
            },
            (error: Error) => {
                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText, true);
                this._actionsHub.branchUpdatesLoadErrorRaised.invoke(error);
            });
    }

    public loadBranchUpdates = (searchFilter: Actions.PushesSearchFilterData): void => {
        if (!this._source) {
            return;
        }

        const updates = this._source.getUpdatesFromJsonIsland();
        if (updates && this._isFirstLoad) {
            this._actionsHub.branchUpdatesLoaded.invoke(updates);
            this._isFirstLoad = false;
        } else {
            this.fetchBranchUpdates(searchFilter);
        }
    }

    public fetchMoreBranchUpdates = (searchFilter: Actions.PushesSearchFilterData, skip?: number, top?: number): void => {
        this.fetchBranchUpdates(searchFilter, true, skip, top);
    }

    public setSearchCriteria = (searchCriteria: Actions.PushesSearchFilterData): void => {
        this._actionsHub.pushesSearchCriteriaChanged.invoke(searchCriteria);
        this.loadBranchUpdates(searchCriteria);
    }

    public changeUrl = (searchCriteria: Actions.PushesSearchFilterData): void => {
        if (!this._getState().searchCriteriaState.searchCriteria.itemVersion) {
            // This is not a navigation, this is normalizing the original URL
            Navigation_Services.getHistoryService().replaceHistoryPoint(null, searchCriteria);
        }
        else {
            Navigation_Services.getHistoryService().addHistoryPoint(null, searchCriteria);
        }
    }

    public updateSearchcriteria = (searchCriteria: Actions.PushesSearchFilterData): void => {
        this.changeUrl(searchCriteria);
    }

    public saveBranchVersionSpec = (selectedVersion: VersionSpecs.VersionSpec): void => {
        if (selectedVersion instanceof VersionSpecs.GitBranchVersionSpec) {
            VersionControlRegistryPath.setUserDefaultBranchSetting(selectedVersion.branchName, this._getState().repositoryContext);
        }
    }

    public changeVersionSpec = (selectedVersion: VersionSpecs.VersionSpec): void => {
        let newSearchCriteria = this._getState().searchCriteriaState.searchCriteria;
        newSearchCriteria.itemVersion = selectedVersion.toVersionString();
        this.updateSearchcriteria(newSearchCriteria);
    }

    public onFiltersUpdated = (newFilters): void => {
        this.updateSearchcriteria(($.extend(this._getState().searchCriteriaState.searchCriteria, newFilters)));
    }

    public onBranchUpdatesScenarioComplete = (splitTimingName: string): void => {
        if (this._telemetrySpy) {
            this._telemetrySpy.notifyScenarioChanged();
        }
    }

    public onFilterPanelVisibilityToggled = (): void => {
        PushesLocalStorageHelper.setFilterPaneVisibility(!this._getState().searchCriteriaState.isFilterPanelVisible);
        this._actionsHub.filterPanelVisibilityToggled.invoke(null);
    }

    public dispose = (): void => {
        if (this._telemetrySpy) {
            this._telemetrySpy.dispose();
        }
    }
}
