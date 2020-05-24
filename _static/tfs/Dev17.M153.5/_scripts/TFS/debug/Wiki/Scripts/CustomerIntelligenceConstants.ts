export const enum Areas {
    Wiki = "Wiki",
}

export const enum TelemetryConstants {
    AttachmentsAdded = "AttachmentsAdded",
    AddPageContentToParentPagesWithoutMDFiles = "AddPageContentToParentPagesWithoutMDFiles",
    BrokenLinkWithBrokenParentVisited = "BrokenLinkWithBrokenParentVisited",
    BrokenLinkErrorPageVisited = "BrokenLinkErrorPageVisited",
    PageCreatedAtBrokenLink = "PageCreatedAtBrokenLink",
    ConflictErrorOnPageSave = "ConflictErrorOnPageSave",
    PageError = "PageError",
    PageDeleted = "PageDeleted",
    PageSaved = "PageSaved",
    PageViewed = "PageViewed",
    PageEditingStarted = "PageEditingStarted",
    PageEditingCancelledWithoutAnyChange = "PageEditingCancelledWithoutAnyChange",
    PageMoved = "PageMoved",
    PageSetAsHomePage = "PageSetAsHomePage",
    PageHistoryViewed = "PageHistoryViewed",
    PageCompared = "PageCompared",
    PageEditingAbandoned = "PageEditingAbandoned",
    PageFilterPerformed = "PageFilterPerformed",
    PageCreatedWithTemplate = "PageCreatedWithTemplate",
    FilteredPageClicked = "FilteredPageClicked",
    CopyCloneUrlClicked = "CopyCloneUrlClicked",
    CopyPagePathClicked = "CopyPagePathClicked",
    PagePrinted = "PagePrinted",
    DeletePageDialogPrompted = "DeletePageDialogPrompted",
    DeletePageDialogDismissed = "DeletePageDialogDismissed",
    MovePageDialogPrompted = "MovePageDialogPrompted",
    MovePageDialogDismissed = "MovePageDialogDismissed",
    MovePagePickerDialogPrompted = "MovePagePickerDialogPrompted",
    SetAsHomePageDialogPrompted = "SetAsHomePageDialogPrompted",
    SetAsHomePageDialogDismissed = "SetAsHomePageDialogDismissed",
    SecurityDialogPrompted = "SecurityDialogPrompted",
    EditContainerPreviewToggled = "EditContainerPreviewToggled",
    NonConformancePageAction = "NonConformancePageAction",
    MarkdownPasteTypeHtmlButtonClicked = "MarkdownToolbar.MarkdownHTMLButtonClicked",
    LinkWorkItemsToWikiPage = "LinkWorkItemsToWikiPage",
    LandedOnWikiHub = "LandedOnWiki",
    WikiLandingPageCreateWikiScreen = "WikiCreateScreen",
    WikiLandingPageInSufficientReadPermissionScreen = "WikiNoReadPerms",
    WikiLandingPageInSufficientWritePermissionScreen = "WikiNoWritePerms",
    PublishWikiStarted = "PublishWikiStarted",
    WikiCreated = "WikiCreated",
    WikiUnpublished = "WikiUnpublished",
    PublishVersionStarted = "PublishVersionStarted",
    PublishSearchWithWikiSearchClicked = "SearchWithWikiSearchClicked",
    WikiVersionPublished = "WikiVersionPublished",
    WikiVersionUnpublished = "WikiVersionUnpublished",
    HandleBrokenLinks = "HandleBrokenLinks",
    WikiVersionUnavailableErrorPage = "WikiVersionUnavailable",
    TOCAddedToPageContent = "TOCAddedToPageContent",
    WikiRenameSucceeded = "WikiRenameSucceeded",
    WikiRenameFailed = "WikiRenameFailed",
    SourcePageArea = "SourcePageArea",

    // Micropedia
    MicropediaPageChange = "MicropediaPageChange",
    NavigateToMicropediaHome = "NavigateToMicropediaHome",
    NavigateToOrgHome = "NavigateToOrgHome",
    NavigateToOrgSearch = "NavigateToOrgSearch",
    MicropediaSearchSource = "Wiki.MicropediaHeader.Search",
}

export const enum PerformanceConstants {
    WikiScenarioPrefix = "Wiki.",
    Overview = "Overview",
    Revisions = "Revisions",
    Compare = "Compare",
    Publish = "Publish",
    PageLoadScenarioSuffix = ".Load",
    IsFirstRender = "isFirstRender",
}

export enum PageErrorType {
    AttachmentSizeExceeded = 0,
    PageSizeExceeded = 1,
    InvalidAttachmentExtension = 2,
    InvalidAttachmentName = 3,
}

export enum SavePageOperationType {
    CreatePage = 0,
    RenamePage = 1,
    RevisePage = 2,
}

export enum SaveOptionType {
    QuickSaveByClick = 0,
    SaveWithCustomMessage = 1,
    QuickSaveByShortcut = 2,
    NavigateAwaySave = 3,
}

export function getDefaultTelemetryPropsForMentionFeatures(): Object {
    let props = {};
    props[TelemetryConstants.SourcePageArea] = Areas.Wiki;
    return props;
}