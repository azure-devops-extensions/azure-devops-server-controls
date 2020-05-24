import { Action } from "VSS/Flux/Action";

import {
    WikiV2,
    WikiPage
} from "TFS/Wiki/Contracts";

import { Attachment, PageContentLoadedPayload } from "Wiki/Scenarios/Shared/SharedActionsHub";

export interface PageInfo {
    wikiPage: WikiPage;
}

export interface PageChangedPayload {
    pagePath: string;
    pageInfo?: PageInfo;
}

export interface AllPagesRetrievedPayload {
    allPages: WikiPage[];
}

export interface PageRetrievedPayload {
    pagePath: string;
    pageInfo?: PageInfo;
    allRetrievedPages?: WikiPage[];
}

export interface PageRetrievalFailedPayload {
    pagePath: string;
    error?: Error;
}

export interface TempPageAddedPayload {
    pagePath: string;
    pageIsOnlySubPageToNewParent: boolean;
}

export interface TempPageDeletedPayload {
    pagePath: string;
    pageWasOnlySubPageToOldParent: boolean;
}

export interface PageAddedPayload {
    page: WikiPage;
    pageIsOnlySubPageToNewParent: boolean;
}

export interface PageDeletedPayload {
    pagePath: string;
    isParentPage: boolean;
    pageWasOnlySubPageToOldParent: boolean;
}

export interface PageRenamedPayload {
    originalPagePath: string;
    newPagePath: string;
    originalOrder: number;
    newOrder: number;
    isParentPage: boolean;
    pageIsOnlySubPageToNewParent: boolean;
    pageWasOnlySubPageToOldParent: boolean;
}

export interface PageReorderedPayload {
    pagePath: string;
    isParentPage: boolean;
    originalOrder: number;
    newOrder: number;
}

export interface PageReplacedPayload {
    page: WikiPage;
    pageIsOnlySubPageToParent: boolean;
}

export interface MovePageParams {
    sourcePage: WikiPage;
    targetPage: WikiPage;
    newOrderInParent: number;
}

export interface TreeFilterUpdatedPayload {
    filterText: string;
    filteredPages: WikiPage[];
}

export interface MovePagePickerDialogParams {
    sourcePage: WikiPage;
}

export interface LinkWorkItemsDialogParams {
    sourcePage: WikiPage;
}

export interface TemplateContentLoadedPayload {
    templateName: string;
    templateContent: string;
}

export interface TemplatePickerDialogParams {
    pagePath: string;
    addPageWithTitle: boolean;
}

export class ViewActionsHub {
    public attachmentsAdded = new Action<Attachment[]>();
    public attachmentRead = new Action<Attachment>();
    public cancelPageEditing = new Action();
    public pageChanged = new Action<PageChangedPayload>();
    public pageLoadEnded = new Action<void>();
    public pageContentLoaded = new Action<PageContentLoadedPayload>();
    public pageVersionChanged = new Action<string>();
    public pageDirtyFlagSet = new Action<void>();
    public pageDirtyFlagReset = new Action<void>();
    public pageReset = new Action<boolean>();

    public templateContentLoaded = new Action<TemplateContentLoadedPayload>();
    public templateContentReset = new Action();
    
    public cloneWikiDialogOpened = new Action<void>();
    public cloneWikiDialogClosed = new Action<void>();

    public savePageDialogPrompted = new Action<void>();
    public savePageDialogDismissed = new Action<void>();
    public savePageStarted = new Action<void>();
    public savePageCompleted = new Action<boolean>();
    public savePageFailed = new Action<string>();
    public deletePageDialogPrompted = new Action<string>();
    public deletePageDialogDismissed = new Action<void>();
    public deletePageStarted = new Action<void>();
    public deletePageCompleted = new Action<void>();

    public movePageDialogPrompted = new Action<MovePageParams>();
    public movePageDialogDismissed = new Action<void>();
    public movePageStarted = new Action<void>();
    public movePageCompleted = new Action<boolean>();
    public movePageFailed = new Action<void>();

    public setAsHomePageDialogPrompted = new Action<string>();
    public setAsHomePageDialogDismissed = new Action<void>();
    public setAsHomePageStarted = new Action<void>();
    public setAsHomePageCompleted = new Action<boolean>();
    public setAsHomePageFailed = new Action<void>();

    public pageRetrievalSucceeded = new Action<PageRetrievedPayload>();
    public pageRetrievalFailed = new Action<PageRetrievalFailedPayload>();
    public treeItemExpanding = new Action<string>();
    public treeItemExpanded = new Action<PageRetrievedPayload>();
    public treeItemCollapsed = new Action<string>();

    public pageAdded = new Action<PageAddedPayload>();
    public pageDeleted = new Action<PageDeletedPayload>();
    public pageRenamed = new Action<PageRenamedPayload>();
    public pageReorderStarted = new Action<void>();
    public pageReordered = new Action<PageReorderedPayload>();
    public pageReplaced = new Action<PageReplacedPayload>();

    public allPagesRetrievalSucceeded = new Action<AllPagesRetrievedPayload>();

    public movePagePickerDialogPrompted = new Action<MovePagePickerDialogParams>();
    public movePagePickerDialogDismissed = new Action<void>();

    public linkWorkItemsDialogPrompted = new Action<LinkWorkItemsDialogParams>();
    public linkWorkItemsDialogDismissed = new Action<void>();
    public linkedWorkItemsUpdated = new Action<void>();

    public unpublishWikiDialogPrompted = new Action<void>();
    public unpublishWikiDialogDismissed = new Action<void>();

    public printPagePrompted = new Action<void>();

    public templatePickerDialogPrompted = new Action <TemplatePickerDialogParams>();
    public templatePickerDialogDismissed = new Action();

    public editInDraftVersionDialogPrompted = new Action<void>();
    public editInDraftVersionDialogDismissed = new Action<void>();

    public renameWikiDialogOpened = new Action<void>();
    public renameWikiDialogClosed = new Action<void>();
    public wikiRenameSucceeded = new Action<WikiV2>();
    public wikiRenameFailed = new Action<Error>();
    public wikiRenameStarted = new Action<void>();
}
