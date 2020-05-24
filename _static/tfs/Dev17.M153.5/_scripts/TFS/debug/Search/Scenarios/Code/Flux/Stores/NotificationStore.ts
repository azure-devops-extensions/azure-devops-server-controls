import * as VSSStore from "VSS/Flux/Store";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ResultsLoadedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
import { ContextRetrievedPayload } from "Search/Scenarios/Code/Flux/ActionsHub";
import { ErrorData } from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { IndexingErrorCodeConstants, SearchErrorCodeConstants } from "Search/Scenarios/Code/Constants";
import { CodeQueryResponse, CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { isGitType, isTfvcType } from "Search/Scenarios/Code/Utils";

export interface NotificationStoreState {
    indexingBannerState: IndexingBanner;

    fileBannerState: StaleFileBanner;

    searchQueryState: QueryState;
}

export enum IndexingBanner {
    AccountIndexing,

    BranchIndexing,

    None
}

export enum StaleFileBanner {
    FileDeleted,

    StaleFile,

    None
}

export enum QueryState {
    TimedOut,

    Succeeded
}

export class NotificationStore extends VSSStore.Store {
    protected _state = {
        indexingBannerState: IndexingBanner.None,
        fileBannerState: StaleFileBanner.None,
        searchQueryState: QueryState.Succeeded
    } as NotificationStoreState;

    public get state(): NotificationStoreState {
        return this._state;
    }

    public onSearchResultsLoaded = (payload: ResultsLoadedPayload<CodeQueryResponse, CodeResult>): void => {
        const response = payload.response;
        this._state.indexingBannerState = IndexingBanner.None;
        this._state.fileBannerState = StaleFileBanner.None;
        this._state.searchQueryState = QueryState.Succeeded;

        if (response && response.errors.length > 0) {
            const isIndexingScenario: boolean = this.check(response.errors,
                IndexingErrorCodeConstants.AccountIsBeingIndexed,
                IndexingErrorCodeConstants.AccountIsBeingReindexed),
                isBranchIndexingScenario: boolean = this.check(response.errors,
                    IndexingErrorCodeConstants.BranchesAreBeingIndexed),
                isPartialResultForCodeScenario: boolean = this.check(response.errors,
                    SearchErrorCodeConstants.PartialResultsDueToSearchRequestTimeout);

            if (isIndexingScenario) {
                this._state.indexingBannerState = IndexingBanner.AccountIndexing;
            }
            else if (isBranchIndexingScenario) {
                this._state.indexingBannerState = IndexingBanner.BranchIndexing;
            }
            else if (isPartialResultForCodeScenario) {
                this._state.searchQueryState = QueryState.TimedOut;
            }
        }

        this.emitChanged();
    }

    public onContextUpdated = (activeItem: CodeResult, payload: ContextRetrievedPayload): void => {
        // Ignore the update if the context is not of the latest selected item
        if (activeItem !== payload.item) {
            return;
        }

        const { latestServerItem } = payload;

        // If latest server item is missing from the payload -> item is deleted from the server.
        if (!latestServerItem) {
            this._state.fileBannerState = StaleFileBanner.FileDeleted;
            this.emitChanged();

            return;
        }

        if (isGitType(activeItem.vcType)) {
            const objectId = (latestServerItem as _VCLegacyContracts.GitItem).objectId.full;
            if (activeItem.contentId &&
                activeItem.contentId !== "" &&
                activeItem.contentId !== objectId) {
                this._state.fileBannerState = StaleFileBanner.StaleFile;
            }
        }
        else if (isTfvcType(activeItem.vcType)) {
            const changeSet = (latestServerItem as _VCLegacyContracts.TfsItem).changeset;
            if (changeSet > parseInt(activeItem.changeId)) {
                this._state.fileBannerState = StaleFileBanner.StaleFile;
            }
        }

        this.emitChanged();
    }

    public resetFileBannerState = (): void => {
        this._state.fileBannerState = StaleFileBanner.None;
    }

    private check(errors: ErrorData[], ...args: string[]): boolean {
        return errors
            .some(e => args.some((arg: string) => e.errorCode === arg));
    }
}