/// <reference types="q" />
import * as Q from "q";
import * as VSS_Service from "VSS/Service";
import * as Settings_RestClient from "VSS/Settings/RestClient";
import * as VSS from "VSS/VSS";
import { KeyCode } from "VSS/Utils/UI";
import { GitRefUpdate } from "TFS/VersionControl/Contracts";

import { TagsPageSource } from "VersionControl/Scenarios/Tags/TagsPage/Sources/TagsPageSource";
import { StoresHub, AggregatedState } from "VersionControl/Scenarios/Tags/TagsPage/Stores/StoresHub";

import {
    ActionsHub,
    TagsPageResults,
    TagDeletionStatus,
    TagDeletionStatusChangeReason,
    GitTagsDataProviderArguments,
    XhrNavigationParams
} from "VersionControl/Scenarios/Tags/TagsPage/Actions/ActionsHub";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { getRefFriendlyName } from "VersionControl/Scripts/GitRefUtility";
import { DelayAnnounceHelper } from "VersionControl/Scripts/DelayAnnounceHelper";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import * as GitCreateTag_NO_REQUIRE from "VersionControl/Scenarios/Tags/CreateTags/Components/CreateTagsDialog";
import { TagsPageTelemetrySpy } from "VersionControl/Scenarios/Tags/TagsPage/Sources/TagsPageTelemetrySpy";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { GitPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import { SettingsPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

export class ActionCreator {

    private _delayAnnounceHelper: DelayAnnounceHelper;

    constructor(
        private _actionsHub: ActionsHub,
        private _source: TagsPageSource,
        private _telemetrySpy: TagsPageTelemetrySpy,
        private _getAggregatedState: () => AggregatedState,
        private _permissionSource: GitPermissionsSource,
        private _settingPermissionSource: SettingsPermissionsSource) {

        this._delayAnnounceHelper = new DelayAnnounceHelper();
    }

    public initialize(repositoryContext: RepositoryContext) {
        this._actionsHub.contextUpdated.invoke(repositoryContext);
        this._permissionSource.queryDefaultGitRepositoryPermissionsAsync().then((x) => { this._actionsHub.gitPermissionUpdate.invoke(x); });
        this._settingPermissionSource.querySettingsPermissionsAsync().then((x) => {this._actionsHub.settingPermissionUpdate.invoke(x); });
    }
    public loadTags = (): void => {
        this._actionsHub.tagsDemandLoading.invoke(true);
        const tagsResult: TagsPageResults = this._source.getTagsFromJsonIsland();
        if (tagsResult && tagsResult.tags) {
            if (tagsResult.hasMoreRecords) {
                this._actionsHub.tagsHasMore.invoke(true);
            }
            this._actionsHub.tagsAdded.invoke(tagsResult);
        }
        else {
            this._actionsHub.showAll.invoke(null);
        }
    }

    public getSearchFilterResults = (filter: string): void => {
        const gitTagArgs: GitTagsDataProviderArguments = {
            filterString: filter
        } as GitTagsDataProviderArguments;
        this._delayAnnounceHelper.startAnnounce(VCResources.FetchingResultsText);
        this._source.getTagsFromDataProvider(gitTagArgs).then(
            (tagsResult: TagsPageResults) => {
                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText);
                this._actionsHub.filtersInvoked.invoke(tagsResult);
            },
            error => {
                this._actionsHub.fetchTagsFailed.invoke(error.message);
                this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText, true);
            });
    }

    public folderExpanded = (folderName: string): void => {
        this._actionsHub.folderExpanded.invoke(folderName);
    }

    public showAllTags = (): void => {
        this._actionsHub.showAll.invoke(null);
    }

    public folderCollapsed = (folderName: string): void => {
        this._actionsHub.folderCollapsed.invoke(folderName);
    }

    public collapseAllFolder = (): void => {
        this._actionsHub.collapseAll.invoke(null);
    }

    public searchFilterEnter = (filter: string): void => {
        if (!!filter.trim() && this._getAggregatedState().filterState.filterText != filter) {
            this._actionsHub.filterTextChanged.invoke(filter);
            this.getSearchFilterResults(filter);
        }
    }

    public searchFilterChange = (filter: string): void => {
        if (!filter && this._getAggregatedState().filterState.filterText) {
            this._actionsHub.filterCleared.invoke(null);
            this.showAllTags();
            this.collapseAllFolder();
        }
    }

    public notifyTagsPageListLoadComplete = (): void => {
        this._telemetrySpy.notifyContentRendered("TagsPageListLoadComplete");
    }

    public openCreateTagDialog = (repositoryContext: GitRepositoryContext, viewName: string): void => {
        VSS.using(
            ["VersionControl/Scenarios/Tags/CreateTags/Components/CreateTagsDialog"],
            (GitCreateTag: typeof GitCreateTag_NO_REQUIRE) => {
                GitCreateTag.CreateTagsDialog.show({
                    version: new GitBranchVersionSpec(getRefFriendlyName(repositoryContext.getRepository().defaultBranch)),
                    repositoryContext: repositoryContext as GitRepositoryContext,
                    initliazedFromView: viewName,
                });
            });
    }

    public deleteTag = (name: string): void => {
        const tagDeletePromise: IPromise<GitRefUpdate> = this._source.deleteTag(name);
        tagDeletePromise.then(() => {
            this._actionsHub.tagDeletionStatusChanged.invoke({
                name: name,
                reason: TagDeletionStatusChangeReason.Succeeded,
            });
        },
            (error: Error) => {
                this._actionsHub.tagDeletionStatusChanged.invoke({
                    name: name,
                    reason: TagDeletionStatusChangeReason.Failed,
                    error: error.message,
                });
            });
    }

    public onTagDeleteInitiated = (name: string): void => {
        this._actionsHub.tagDeletionInitiated.invoke(name);
    }

    public deleteTagDialogClose = (): void => {
        this._actionsHub.tagDeletionStatusChanged.invoke({ reason: TagDeletionStatusChangeReason.Cancelled });
    }

    public setComapreTagBase = (tagName: string): void => {
        this._source.setCompareTags(tagName).then(() => {
            this._actionsHub.compareTagSet.invoke(tagName);
        });
    }

    public xhrNavigateToHub = (url: string, hubId: string): void => {
        if (url && hubId) {
            // Need to invoke via promise because directly calling function
            // navigates to the url even before the VssDetailsList component dismiss function is called
            // that shows an error because component ceases to exsist by that time
            const xhrParams: XhrNavigationParams = {
                url: url,
                hubId: hubId,
            }
            const promise = Q.resolve(xhrParams);
            promise.then(item => {
                this._actionsHub.navigateToUrl.invoke(item);
            });
        }
    }

    public notificationcleared = (): void => {
        this._actionsHub.notificationCleared.invoke(null);
    }
}

export module TagCreators {
    let _tagsPageSource: TagsPageSource;
    let _actionsHub: ActionsHub;
    export function initialize(tagsPageSource: TagsPageSource, actionsHub: ActionsHub): void {
        _tagsPageSource = tagsPageSource;
        _actionsHub = actionsHub;
    }

    // Adds all the folder nodes fetched and returns a promise of bool value specifying if more results available
    export function ensureAllFolderNodesFetched(folderName: string, folderPage: number): IPromise<boolean> {
        const deferred = Q.defer<boolean>();
        _tagsPageSource.getTagsFromDataProvider(
            { folderName: folderName, resultsPageNumber: folderPage, filterString: null }).then<void>(
            tagsResult => {
                _actionsHub.compareTagSet.invoke(tagsResult.compareTagBase);
                _actionsHub.tagsAdded.invoke(tagsResult);
                deferred.resolve(tagsResult.hasMoreRecords);
            },
            (error: Error) => {
                _actionsHub.fetchTagsFailed.invoke(error.message);
                deferred.reject(error);
            });

        return deferred.promise;
    }
}
