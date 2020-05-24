import { Action } from "VSS/Flux/Action";

import { IInternalLinkedArtifactDisplayData } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { WikiSearchResponse } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { WorkItemReference } from "TFS/WorkItemTracking/Contracts";
import { OperationStatus } from "Wiki/Scripts/CommonInterfaces";

export interface BrokenLinksAutoFixMetrics {
    pageUpdateSuccessCount;
    pageUpdateFailureCount;
    workItemUpdateSuccessCount;
    workItemUpdateFailureCount;
}

export interface WikiPageUpdateData {
    pagePath: string;
    links: string[];
    updateState: OperationStatus;
}

export interface WorkItemData {
    wikiPagePaths: string[];
    displayData: IInternalLinkedArtifactDisplayData;
    updateState: OperationStatus;
}

export interface ArtifactUriToWorkItemReferencesMap {
    [key: string]: WorkItemReference[];
}

export interface WikiPageLinkSearchResultPayload {
    wikiSearchResponse: WikiSearchResponse;
    isLoadMore: boolean;
}

export class RenamePageDialogActionsHub {
    public workItemReferencesLoaded = new Action<ArtifactUriToWorkItemReferencesMap>();
    public workItemsDisplayDataLoaded = new Action<IInternalLinkedArtifactDisplayData[]>();
    public fetchingPageLinks = new Action<boolean>();
    public wikiPageSearchResultLoaded = new Action<WikiPageLinkSearchResultPayload>();
    public evaluationStarted = new Action<void>();
    public updateStarted = new Action<boolean>();
    public autofixCompleted = new Action<void>();
    public wikiPageLinksUpdateSucceeded = new Action<string>();
    public wikiPageLinksUpdateFailed = new Action<string>();
    public workItemUpdateResultsLoaded = new Action<IDictionaryNumberTo<boolean>>();
    public workItemUpdatesFailed = new Action<void>();
}