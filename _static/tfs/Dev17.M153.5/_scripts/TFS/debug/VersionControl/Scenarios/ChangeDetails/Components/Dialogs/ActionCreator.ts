import * as Q from "q";
import * as VCContracts from "TFS/VersionControl/Contracts";

import { ActionsHub, SearchResultEntry, SearchStatus, SearchRequest } from "VersionControl/Scenarios/ChangeDetails/Components/Dialogs/ActionsHub";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as GitClientSource from "VersionControl/Scenarios/Branches/Actions/GitClientSource";
import * as GitRefService from "VersionControl/Scripts/Services/GitRefService";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import { GitWebApiConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";

export class ActionCreator {
    constructor(private _actionsHub: ActionsHub) {
    }

    public searchCommitInSelectedVersion(
        repositoryContext: GitRepositoryContext,
        commitId: string,
        selectedVersion: VCSpecs.VersionSpec): void {

        const targetRefs: VCContracts.GitRef[] = [];
        const isBranchSelected = (selectedVersion instanceof VCSpecs.GitBranchVersionSpec);
        const refName = isBranchSelected
                        ? (selectedVersion as VCSpecs.GitBranchVersionSpec).branchName : (selectedVersion as VCSpecs.GitTagVersionSpec).tagName;

        if (refName) {
            this._searchCommitInTargetRefs(repositoryContext, commitId, [{name: refName}] as VCContracts.GitRef[], isBranchSelected);
        }
    }

    public prefixSearchForRefs(
        repositoryContext: GitRepositoryContext,
        commitId: string,
        prefixSearchText: string,
        isBranchSearch: boolean ): void {

            this._actionsHub.prefixSearchForRefsStarted.invoke(null);

            const filterParam = (isBranchSearch ? GitWebApiConstants.HeadsFilter : GitWebApiConstants.TagsFilter)
                                + "/" + prefixSearchText;

            this._getGitRefsWithFilter(repositoryContext, filterParam).then(
                (results) => {
                    if (results && results.length > 0) {
                            this._searchCommitInTargetRefs(
                                repositoryContext,
                                commitId,
                                results,
                                isBranchSearch
                            );
                    } else {
                        const searchRequest: SearchRequest = {
                            searchText: prefixSearchText,
                            isTagSearch: !isBranchSearch
                        };
                        this._actionsHub.prefixSearchForRefsNoResultsFound.invoke(searchRequest);
                    }
                },
                (error) => {
                    this._actionsHub.prefixSearchForRefsFailed.invoke(null);
                }
            );
    }

    private _searchCommitInTargetRefs(
        repositoryContext: GitRepositoryContext,
        commitId: string,
        targetRefs: VCContracts.GitRef[],
        isBranchSearch: boolean): void {

            const targetRefDescriptors: VCContracts.GitVersionDescriptor[] = [];
            const searchResultEntries: SearchResultEntry[] = [];
            const versionType = isBranchSearch ? VCContracts.GitVersionType.Branch : VCContracts.GitVersionType.Tag;
            for (const ref of targetRefs) {
                const refFriendlyName = GitRefUtility.getRefFriendlyName(ref.name);
                targetRefDescriptors.push({
                    version: refFriendlyName,
                    versionType: versionType,
                } as VCContracts.GitVersionDescriptor);

                searchResultEntries.push({
                    refName: refFriendlyName,
                    refUrl: isBranchSearch
                            ? VersionControlUrls.getBranchExplorerUrl(repositoryContext, refFriendlyName)
                            : VersionControlUrls.getTagExplorerUrl(repositoryContext, refFriendlyName),
                    isBranch: isBranchSearch,
                    doesRefIncludeCommit: null,
                    searchStatus: SearchStatus.InProgress,
                } as SearchResultEntry);
            }

            this._startSearch(repositoryContext, commitId, targetRefDescriptors, searchResultEntries);
    }

    private _startSearch(
        repositoryContext: GitRepositoryContext,
        commitId: string,
        targetRefDescriptors: VCContracts.GitVersionDescriptor[],
        searchResultEntries: SearchResultEntry[],
        ): void {

        this._actionsHub.searchStarted.invoke(searchResultEntries);

        const baseCommit: VCContracts.GitVersionDescriptor = {
            version: commitId,
            versionType: VCContracts.GitVersionType.Commit,
        } as VCContracts.GitVersionDescriptor;

        const searchCommitPromise: IPromise<VCContracts.GitBranchStats[]> = this._getBranchStatsBatch(
            baseCommit,
            targetRefDescriptors,
            repositoryContext
        );

        searchCommitPromise.then(
            (results) => {
                const searchResultEntriesClone: SearchResultEntry[] = $.extend(true, [], searchResultEntries) as SearchResultEntry[];
                for (let i = 0; i < results.length; i++) {
                    searchResultEntriesClone[i].doesRefIncludeCommit = (results[i].behindCount === 0);
                    searchResultEntriesClone[i].searchStatus = SearchStatus.Succeeded;
                }

                this._actionsHub.searchSucceeded.invoke(searchResultEntriesClone);
            },
            (error) => {
                const searchResultEntriesClone: SearchResultEntry[] = $.extend(true, [], searchResultEntries) as SearchResultEntry[];
                for (let i = 0; i < searchResultEntriesClone.length; i++) {
                    searchResultEntriesClone[i].searchStatus = SearchStatus.Failed;
                }
                this._actionsHub.searchFailed.invoke(searchResultEntriesClone);
            }
        );
    }

    private _getBranchStatsBatch(
        baseCommit: VCContracts.GitVersionDescriptor,
        targetRefDescriptors: VCContracts.GitVersionDescriptor[],
        repositoryContext: GitRepositoryContext
        ): IPromise<VCContracts.GitBranchStats[]> {

        return GitClientSource.getGitHttpClient().getBranchStatsBatch(
            {
                baseCommit: baseCommit,
                targetCommits: targetRefDescriptors,
            } as VCContracts.GitQueryBranchStatsCriteria,
            repositoryContext.getRepository().id,
            repositoryContext.getRepository().project.id
        );
    }

    private _getGitRefsWithFilter(
        repositoryContext: GitRepositoryContext,
        filter: string,
        ): IPromise<VCContracts.GitRef[]> {

        return GitClientSource.getGitHttpClient().getRefs(repositoryContext.getRepository().id, repositoryContext.getRepository().project.id, filter);
    }
}
