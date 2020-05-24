import * as VSSStore from "VSS/Flux/Store";
import { ErrorData } from "Search/Scripts/Generated/Search.SharedLegacy.Contracts";
import { IndexingErrorCodeConstants } from "Search/Scenarios/WorkItem/Constants";
import { ResultsLoadedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
import { WorkItemSearchResponse, WorkItemResult } from "Search/Scenarios/WebApi/Workitem.Contracts";

export interface NotificationStoreState {
    workItemPreviewBannerState: WorkitemPreviewPaneScenario;

    indexingBannerState: IndexingBanner;
}

export enum IndexingBanner {
    AccountIndexing,

    None
}

export enum WorkitemPreviewPaneScenario {
    Stale,

    Deleted,

    None
}

export class NotificationStore extends VSSStore.Store {
    protected _state = {
        workItemPreviewBannerState: WorkitemPreviewPaneScenario.None,
        indexingBannerState: IndexingBanner.None
    } as NotificationStoreState;

    public get state(): NotificationStoreState {
        return this._state;
    }

    public showWorkItemPreviewBanner = (scenario: WorkitemPreviewPaneScenario): void => {
        this._state.workItemPreviewBannerState = scenario;
        this.emitChanged();
    }

    public dismissWorkItemPreviewBanner = (): void => {
        this._state.workItemPreviewBannerState = WorkitemPreviewPaneScenario.None;
        this.emitChanged();
    }

    public onSearchResultsLoaded = (payload: ResultsLoadedPayload<WorkItemSearchResponse, WorkItemResult>): void => {
        const response = payload.response;
        this._state.indexingBannerState = IndexingBanner.None;

        if (response && response.errors.length > 0) {
            const isIndexingScenario: boolean = this.check(response.errors,
                IndexingErrorCodeConstants.AccountIsBeingIndexed,
                IndexingErrorCodeConstants.AccountIsBeingReindexed);

            if (isIndexingScenario) {
                this._state.indexingBannerState = IndexingBanner.AccountIndexing;
            }
        }

        this.emitChanged();
    }

    public reset = (): void => {
        this._state.workItemPreviewBannerState = WorkitemPreviewPaneScenario.None;
        this._state.indexingBannerState = IndexingBanner.None;
        this.emitChanged();
    }

    private check(errors: ErrorData[], ...args: string[]): boolean {
        return errors
            .some(e => args.some((arg: string) => e.errorCode === arg));
    }
}