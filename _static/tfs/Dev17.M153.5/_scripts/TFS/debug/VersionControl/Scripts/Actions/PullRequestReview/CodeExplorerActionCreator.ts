import { autobind } from "OfficeFabric/Utilities";

// actions
import { ActionsHub } from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { DiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/DiscussionActionCreator";

// sources
import { IGitRepositorySource } from "VersionControl/Scripts/Sources/GitRepositorySource";
import { IPullRequestChangesSource } from "VersionControl/Scripts/Sources/PullRequestChangesSource";
import { IPullRequestDetailSource } from "VersionControl/Scripts/Sources/PullRequestDetailSource";
import { SourcesHub } from "VersionControl/Scripts/Sources/SourcesHub";

// stores
import { StoresHub } from "VersionControl/Scripts/Stores/PullRequestReview/StoresHub";

// contracts
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { ISelectedTreeItem } from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCPullRequest from "VersionControl/Scripts/TFS.VersionControl.PullRequest";

export class CodeExplorerActionCreator {
    private static DEFAULT_PAGE_START: number = 0;
    private static DEFAULT_PAGE_SIZE: number = 1000;

    private static ITERATION_NO_COMPARE: number = 0;
    private static ITERATION_MIN: number = 1;

    private _gitRepositorySource: IGitRepositorySource;
    private _pullRequestChangesSource: IPullRequestChangesSource;
    private _pullRequestDetailSource: IPullRequestDetailSource;
    private _discussionActionCreator: DiscussionActionCreator;
    private _pullRequestId: number;
    private _storesHub: StoresHub;
    private _actionsHub: ActionsHub;

    constructor(
        discussionActionCreator: DiscussionActionCreator,
        pullRequestId: number,
        storesHub: StoresHub,
        actionsHub: ActionsHub,
        sourcesHub: SourcesHub) {
        this._discussionActionCreator = discussionActionCreator;
        this._gitRepositorySource = sourcesHub.gitRepositorySource;
        this._pullRequestChangesSource = sourcesHub.pullRequestChangesSource;
        this._pullRequestDetailSource = sourcesHub.pullRequestDetailSource;
        this._pullRequestId = pullRequestId;
        this._storesHub = storesHub;
        this._actionsHub = actionsHub;
    }

    /**
     * Load the changes of the latest iteration.
     * @param skipCache - if false, try to use cached data first if available
     */
    public queryIterations(skipCache?: boolean, switchToLatest?: boolean): void {
        this._actionsHub.iterationsUpdating.invoke({ pullRequestId: this._pullRequestId });

        const pullRequestId: number = this._pullRequestId;

        this._pullRequestDetailSource.queryPullRequestIterationsAsync(this._pullRequestId, true)
            .then(iterations => {
                this._actionsHub.iterationsUpdated.invoke({ pullRequestId, iterations });

                const latestIterationId = iterations[iterations.length - 1].id;

                // by default the latest changes and threads tracked to the latest are requested (for the overview)
                // if an iteration is specified in the URL, navigating will handle its selection
                this.queryIterationChanges(latestIterationId, CodeExplorerActionCreator.ITERATION_NO_COMPARE, null, null, skipCache);
                this._discussionActionCreator.queryDiscussionThreads(latestIterationId, CodeExplorerActionCreator.ITERATION_NO_COMPARE);

                if (switchToLatest) {
                    this.selectIteration(latestIterationId);
                }
            });
    }

    /**
     * Actions to be taken when someone selects an iteration.
     */
    public selectIteration(iterationId?: number, baseId?: number): IPromise<void> {
        iterationId = iterationId || this._storesHub.codeExplorerStore.getLatestIterationId();
        baseId = baseId || CodeExplorerActionCreator.ITERATION_NO_COMPARE;

        const promises: IPromise<void>[] = [];

        if (iterationId >= CodeExplorerActionCreator.ITERATION_MIN) {
            this._actionsHub.iterationSelected.invoke({ iterationId, baseId });

            promises.push(this.queryIterationChanges(iterationId, baseId));
            promises.push(this._discussionActionCreator.queryDiscussionThreads(iterationId, baseId));
        }

        return Promise.all(promises).then(results => {});
    }

    /**
     * Query an iteration for its list of changes. Top and skip are used to paginate. If they are not specified they will default.
     * @param iterationId
     * @param baseId
     * @param top - defaults to 1000.
     * @param skip - defaults to 0.
     * @param skipCache - if false, try to use cached data first if available
     */
    public queryIterationChanges(iterationId: number, baseId: number, top?: number, skip?: number, skipCache?: boolean): IPromise<void> {
        top = top || CodeExplorerActionCreator.DEFAULT_PAGE_SIZE;
        skip = skip || CodeExplorerActionCreator.DEFAULT_PAGE_START;

        // query for changes for the given iteration if we don't already have them cached
        if (skipCache || !this._storesHub.codeExplorerStore.hasChangesCached(iterationId, baseId, top, skip)) {
            this._actionsHub.iterationChangesUpdateStart.invoke({ iterationId, baseId });

            // query for the latest iteration
            return this._pullRequestChangesSource.queryChangesAsync(iterationId, baseId, top, skip, skipCache)
                .then( (changes : VCContracts.GitPullRequestIterationChanges) => {
                    this._actionsHub.iterationChangesUpdated.invoke({
                        iterationId: iterationId,
                        baseId: baseId,
                        changes: changes,
                        top: top,
                        skip: skip,
                    });

                    // query item detail if necessary now that the iteration changes are loaded
                    this.queryItemDetailIfNeeded();
                })
                .then(undefined, this.raiseError);
        }

        return Promise.resolve(null);
    }

    public selectChangeExplorerItem(path: string): void {
        this._actionsHub.changeExplorerSelect.invoke({ path });
    }

    public setFilteredChanges(changes: VCLegacyContracts.Change[]): void {
        this._actionsHub.changesFiltered.invoke({ changes });
    }

    /**
     * Query for item detail on currently selected item.
     */
    public queryItemDetailIfNeeded(): IPromise<void> {
        let selectedPath: string = null;
        let selectedVersion: string = null;

        const selectedTreeItem: ISelectedTreeItem = this._storesHub.codeExplorerStore.getSelectedItem();
        const itemDetail = this._storesHub.repositoryItemDetailStore.getItemDetail();
        const shouldQueryItemDetail: boolean = !itemDetail
            && !!selectedTreeItem
            && !selectedTreeItem.isEdit()
            && !!selectedTreeItem.gitDiffItem
            && !!selectedTreeItem.gitDiffItem.item;

        if (shouldQueryItemDetail) {
            selectedPath = selectedTreeItem.path;
            selectedVersion = selectedTreeItem.gitDiffItem.item.detailVersion;
        }

        if (!selectedPath || !selectedVersion) {
            return Promise.resolve(null);
        }

        this._actionsHub.changeItemDetailLoading.invoke(null);

        return this._gitRepositorySource.getItemDetailAsync(selectedPath, selectedVersion)
            .then(newItemDetail => {
                // note the path is used as an ID so we can
                // match the detail request to the explorer selection
                this._actionsHub.changeItemDetailLoaded.invoke({
                    item: newItemDetail,
                    id: selectedPath,
                });
            })
            .then(undefined, this.raiseError);
    }

    public queryItemDetail(path: string, version: string): IPromise<VCLegacyContracts.ItemModel> {
        return this._gitRepositorySource.getItemDetailAsync(path, version);
    }

    /**
     * Cache the given file diff
     */
    public cacheFileDiff(itemDescription: string, fileDiff: VCLegacyContracts.FileDiff): void {
        this._actionsHub.fileDiffCache.invoke({
            itemDescription: itemDescription,
            fileDiff: fileDiff,
        });
    }

    /**
    * Raise an application error. This could be a typical JS error or some text.
    */
    @autobind
    public raiseError(error: any): void {
        this._actionsHub.raiseError.invoke(error);
    }
}