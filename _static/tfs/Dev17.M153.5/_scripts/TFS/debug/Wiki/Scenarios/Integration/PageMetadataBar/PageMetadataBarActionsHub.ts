import { Action } from "VSS/Flux/Action";
import { IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { WikiPageViewStats } from "TFS/Wiki/Contracts";

export interface PageMetadataLoadedPayload {
    author: IAvatarImageProperties;
    authoredDate: Date;
    revisions: number;
}

export class PageMetadataBarActionsHub {
    public pageMetadataReset = new Action<void>();
    public pageMetadataLoaded = new Action<Partial<PageMetadataLoadedPayload>>();
    public pageViewStatsLoaded = new Action<WikiPageViewStats>();
    public linkedWorkItemsFetched = new Action<number[]>();
}