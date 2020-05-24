import * as Q from "q";
import {
    ChangeList,
    ChangeQueryResults,
    GitObjectReference,
} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import {
    ActionsHub,
    IChangeListMoreChangesPayload,
    ItemDetails,
} from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";
import { findChange } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";
import { ChangeListSource } from "VersionControl/Scenarios/ChangeDetails/Sources/ChangeListSource";
import { ChangeListStore } from "VersionControl/Scenarios/ChangeDetails/Stores/ChangeListStore";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/Stores/StoresHub";

const maxAutoLoadMoreCountForSearch = 5;
const autoLoadMoreBatchSize = 20000;
/**
 * Action Creator for ChangeList
 */
export class ChangeListActionCreator {

    protected static INITIAL_MAX_CHANGES_TO_FETCH = 1000;

    constructor(
        protected _actionsHub: ActionsHub,
        protected _storesHub: StoresHub,
        protected _repositoryContext: RepositoryContext,
        protected _changeListSource?: ChangeListSource) {
    }

    /**
     * Loads changeset data and invokes relevant actions.
     */
    public loadChangeList = (changeList: ChangeList): void => {
        this._actionsHub.changeListLoaded.invoke({
            originalChangeList: changeList,
        });
    };

    /**
     * Loads all changes (subject to a max of 'autoLoadMoreBatchSize') for the current change list.
     * Particularly useful when searching. in case there are > autoLoadMoreBatchSize changes, we fetch first 'autoLoadMoreBatchSize' and keep showing Load more button
     * internally uses loadChanges() method.
     * Once the delta changes are fetched, invokes the "changeListMoreChangesLoaded" action.
     * Returns a promise for loading all changes
     * Promise returned does not return the entire changelist data - as data is returned incrementally with each call
     */
    public loadAllChanges(
        changeList: ChangeList,
        baseVersion: string,
        targetVersion: string): IPromise<boolean> {

        if (this._storesHub.changeListStore.currentChangeList.allChangesIncluded) {
            return Q.resolve(false); // all changes already present
        }

        if (this._storesHub.changeListStore.loadAllInProgress ||
            this._areMaxAutoLoadChangesLoaded()) {
            return Q.reject(null); // don't start another search
        }

        const deferred: Q.Deferred<boolean> = Q.defer<boolean>();
        let promise: IPromise<boolean> = Q.when(true);

        this._actionsHub.changeListAutoLoadAllStarted.invoke(null);

        // Pre-populate maxAutoLoadMoreCountForSearch calls, actual calls made will depend on value of allChangesIncluded
        for (let ct: number = 0; ct < this._maxAutoLoadMoreCountForSearch(); ct++) {
            promise = promise.then(() => {
                return this._loadAllChangesInternal(
                    changeList,
                    baseVersion,
                    targetVersion
                );
            });
        }

        // once all the calls are completed notify store
        promise.then(this.stopLoadAllChanges);

        return promise;
    }

    public stopLoadAllChanges = (): void => {
        this._actionsHub.changeListAutoLoadAllStopped.invoke(null);
    }

    /**
     * Loads more changes to the current change list.
     * Uses loadMoreChanges() from ChangeListSource.
     * Once the delta changes are fetched, invokes the "changeListMoreChangesLoaded" action.
     */
    public loadMoreChanges(
        changeList: ChangeList,
        baseVersion: string,
        targetVersion: string): IPromise<IChangeListMoreChangesPayload> {

        if (!!changeList) {
            this._actionsHub.changeListMoreChangesLoading.invoke(null);

            return this.loadChanges(
                changeList,
                baseVersion,
                targetVersion,
                this._storesHub.changeListStore.maxChangesToInclude,
                this._storesHub.changeListStore.changeListSkipCount)
                .then((moreChanges: IChangeListMoreChangesPayload) => {
                    this._actionsHub.changeListMoreChangesLoaded.invoke(moreChanges);
                    return moreChanges;
                },
                error => {
                    this._actionsHub.changeListMoreChangesLoadFailed.invoke(null);
                    this._actionsHub.errorRaised.invoke(error);
                    return error;
                });
        }

        return Q<IChangeListMoreChangesPayload>(null);
    }

    /**
     * Used internally to fetch more changes for the given changelist
     * Does not invoke any action on success/failure - should be handled by caller
     * Returns a promise of newly loaded changes 
     */
    protected loadChanges(
        changeList: ChangeList,
        baseVersion: string,
        targetVersion: string,
        maxChangesToInclude: number,
        skipCount: number): IPromise<IChangeListMoreChangesPayload> {

        if (!changeList) {
            return Q<IChangeListMoreChangesPayload>(null);
        }

        return Q.Promise((resolve, reject) => {
            this.changeListSource.loadMoreChanges(
                changeList.version,
                maxChangesToInclude,
                skipCount)
                .then(changeQueryResults => {
                    const moreChanges = {
                        changes: changeQueryResults.results,
                        allChangesIncluded: !changeQueryResults.moreResultsAvailable,
                        changeCounts: changeQueryResults.changeCounts,
                    } as IChangeListMoreChangesPayload;
                    resolve(moreChanges);
                }, error => {
                    reject(error);
                });
        });
    }

    protected get changeListSource(): ChangeListSource {
        if (!this._changeListSource) {
            this._changeListSource = new ChangeListSource(this._repositoryContext);
        }

        return this._changeListSource;
    }

    private _loadAllChangesInternal(
        changeList: ChangeList,
        baseVersion: string,
        targetVersion: string): IPromise<boolean> {

        const deferred: Q.Deferred<boolean> = Q.defer<boolean>();

        const changeListStore: ChangeListStore = this._storesHub.changeListStore;
        if (!changeListStore.currentChangeList.allChangesIncluded &&
            !this._areMaxAutoLoadChangesLoaded()) {
            this.loadChanges(
                changeList,
                baseVersion,
                targetVersion,
                this._autoLoadMoreBatchSize(),
                changeListStore.changeListSkipCount)
                .then((moreChanges: IChangeListMoreChangesPayload) => {
                    // in between call to fetch changes and response, if user made some action to cancel this loadmore
                    // don't even process the currently fetched changes
                    // and make no more calls
                    if (changeListStore.loadAllInProgress && this.appendLoadMoreChanges()) {
                        this._actionsHub.changeListMoreChangesLoaded.invoke(moreChanges);
                        deferred.resolve(moreChanges.allChangesIncluded);
                    }
                    else {
                        // Case : result from previous call came but load all is cancelled
                        deferred.reject(null);
                    }
                },
                (error) => {
                    // don't invoke failed action
                    this._actionsHub.changeListAutoLoadAllStopped.invoke(null);
                    deferred.reject(error);
                });
        }
        else {
            if (changeListStore.loadAllInProgress) {
                deferred.resolve(false);
            }
            else {
                deferred.reject(null);
            } 
        }

        return deferred.promise;
    }

    protected appendLoadMoreChanges(): boolean {
        return true;
    }

    private _areMaxAutoLoadChangesLoaded(): boolean {
        const maxAutoLoadChangeLimit = this._maxAutoLoadMoreCountForSearch() * this._autoLoadMoreBatchSize();
        return this._storesHub.changeListStore.currentChangeList &&
            this._storesHub.changeListStore.currentChangeList.changes &&
            this._storesHub.changeListStore.currentChangeList.changes.length >= maxAutoLoadChangeLimit;
    }

    // method for testing
    private _maxAutoLoadMoreCountForSearch(): number {
        return maxAutoLoadMoreCountForSearch;
    }

    // methods for testing
    // public for testing
    public _autoLoadMoreBatchSize(): number {
        return autoLoadMoreBatchSize;
    }

}
