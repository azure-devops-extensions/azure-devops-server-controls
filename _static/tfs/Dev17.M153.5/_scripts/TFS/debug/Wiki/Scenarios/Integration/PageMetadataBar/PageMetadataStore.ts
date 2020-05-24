import { autobind } from "OfficeFabric/Utilities";
import * as VSSStore from "VSS/Flux/Store";
import { WikiPageViewStats } from "TFS/Wiki/Contracts";
import { IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { PageMetadataBarActionsHub, PageMetadataLoadedPayload } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataBarActionsHub";

/**
 * Store for metadata information associated with a wiki page
 */

export interface PageMetadataState {
    author: IAvatarImageProperties;
    authoredDate: Date;
    revisions: number;
    workItemIds: number[];
    pageViewStats: WikiPageViewStats;
}

export class PageMetadataStore extends VSSStore.RemoteStore {
    private _state: PageMetadataState = {} as PageMetadataState;

    constructor(
        private _actionsHub: PageMetadataBarActionsHub,
    ) {
        super();

        this._actionsHub.pageMetadataLoaded.addListener(this.onPageMetadataFetched);
        this._actionsHub.pageViewStatsLoaded.addListener(this.onPageViewStatsLoaded);
        this._actionsHub.linkedWorkItemsFetched.addListener(this.onLinkedWorkItemsFetched);
    }

    public get state(): PageMetadataState {
        return this._state;
    }

    @autobind
    public onPageMetadataFetched(payload: Partial<PageMetadataLoadedPayload>): void {
        if (this._state.author !== payload.author
            || this._state.authoredDate !== payload.authoredDate
            || this._state.revisions !== payload.revisions) {
            this._state.author = payload.author;
            this._state.authoredDate = payload.authoredDate;
            this._state.revisions = payload.revisions;
            this.emitChanged();
        }
    }

    @autobind
    public onPageViewStatsLoaded(pageViewStats: WikiPageViewStats): void {
        this.state.pageViewStats = pageViewStats;

        this.emitChanged();
    }

    @autobind
    public onLinkedWorkItemsFetched(workItemIds: number[]): void {
        this._state.workItemIds = workItemIds;

        this.emitChanged();
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.pageMetadataLoaded.removeListener(this.onPageMetadataFetched);
            this._actionsHub.pageViewStatsLoaded.removeListener(this.onPageViewStatsLoaded);
            this._actionsHub.linkedWorkItemsFetched.removeListener(this.onLinkedWorkItemsFetched);

            this._actionsHub = null;
        }
    }
}
