import * as Utils_String from "VSS/Utils/String";
import * as EventsService from "VSS/Events/Services";

import { autobind } from "OfficeFabric/Utilities";
import {
    CompactMode,
    Node,
    TreeStore,
    ActionAdapter,
} from "Presentation/Scripts/TFS/Stores/TreeStore";
import { WikiPage } from "TFS/Wiki/Contracts";
import { combinePaths } from "VersionControl/Scripts/VersionControlPath";
import { RepoConstants } from "Wiki/Scripts/CommonConstants";
import { getNewPageParentPath, getPageNameFromPath, getParentPagePath } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { URL_Changed_Event } from "Wiki/Scripts/WikiHubViewState";
import { treeNodeSortOrderDecider } from "Wiki/Scripts/WikiTreeHelper";

import { SharedActionsHub } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { NavigateAwayDialogStore } from "Wiki/Scenarios/Shared/Stores/NavigateAwayDialogStore";
import { SharedState, SharedStoresHub } from "Wiki/Scenarios/Shared/Stores/SharedStoresHub";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";

import { UnsavedAttachmentsState, UnsavedAttachmentsStore } from "Wiki/Scenarios/Overview/Stores/AttachmentsStore";
import { CloneWikiState, CloneWikiStore } from "Wiki/Scenarios/Overview/Stores/CloneWikiStore";
import { PageContentState, PageContentStore } from "Wiki/Scenarios/Overview/Stores/PageContentStore";
import { PageDialogsState, PageDialogsStore } from "Wiki/Scenarios/Overview/Stores/PageDialogsStore";
import { PagePrintStore } from "Wiki/Scenarios/Overview/Stores/PagePrintStore";
import { RenameWikiState, RenameWikiStore } from "Wiki/Scenarios/Overview/Stores/RenameWikiStore";
import { WikiPagesState, WikiPagesStore } from "Wiki/Scenarios/Overview/Stores/WikiPagesStore";
import { TemplateContentState, TemplateContentStore } from "Wiki/Scenarios/Overview/Stores/TemplateContentStore";
import { WikiTreeAdapter } from "Wiki/Scenarios/Overview/Stores/WikiTreeAdapter";
import {
    PageChangedPayload,
    PageRetrievedPayload,
    ViewActionsHub,
    TempPageAddedPayload,
    TempPageDeletedPayload,
} from "Wiki/Scenarios/Overview/ViewActionsHub";

export interface AggregateState {
    cloneWikiState: CloneWikiState;
    pageContentState: PageContentState;
    pageDialogsState: PageDialogsState;
    sharedState: SharedState;
    unsavedAttachmentsState: UnsavedAttachmentsState;
    renameWikiState: RenameWikiState;
    wikiPagesState: WikiPagesState;
}

export class ViewStoresHub implements IDisposable {
    public attachmentsStore: UnsavedAttachmentsStore;
    public pageContentStore: PageContentStore;
    public templateContentStore: TemplateContentStore;
    public treeStore: TreeStore;
    public wikiPagesStore: WikiPagesStore;
    public cloneWikiStore: CloneWikiStore;
    public renameWikiStore: RenameWikiStore;
    public pageDialogsStore: PageDialogsStore;
    public pagePrintStore: PagePrintStore;
    public navigateAwayDialogStore: NavigateAwayDialogStore;

    private _wikiTreeAdapter: WikiTreeAdapter;

    constructor(
        private _sharedStoresHub: SharedStoresHub,
        private _sharedActionsHub: SharedActionsHub,
        private _actionsHub: ViewActionsHub,
    ) {
        this.attachmentsStore = this._createAttachmentsStore();
        this.pageContentStore = this._createPageContentStore();
        this.wikiPagesStore = this._createWikiPagesStore();
        this.cloneWikiStore = this._createCloneWikiStore();
        this.pageDialogsStore = this._createPageDialogsStore();
        this.treeStore = this._createTreeStore();
        this.pagePrintStore = this._createPagePrintPageStore();
        this.templateContentStore = this._createTemplateContentStore();
        this.renameWikiStore = this._createRenameWikiStore();
        this.navigateAwayDialogStore = this._sharedStoresHub.navigateAwayDialogStore;

        // Add listeners for url state
        EventsService.getService().attachEvent(URL_Changed_Event, this._onHubViewOptionsChanged);
    }

    public dispose(): void {
        // Remove listeners for url state before tearing down the object
        EventsService.getService().detachEvent(URL_Changed_Event, this._onHubViewOptionsChanged);

        this._disposeTreeStore();
        this._disposePageContentStore();
        this._disposeWikiPagesStore();
        this._disposeCloneWikiStore();
        this._disposeRenameWikiStore();
        this._disposePageDialogsStore();
        this._disposeAttachementsStore();
        this._disposeTemplateContentStore();

        this.navigateAwayDialogStore = null;
        this._sharedStoresHub = null;
        this._actionsHub = null;
    }

    public get state(): AggregateState {
        return {
            cloneWikiState: this.cloneWikiStore.state,
            pageContentState: this.pageContentStore.state,
            pageDialogsState: this.pageDialogsStore.state,
            sharedState: this._sharedStoresHub.state,
            unsavedAttachmentsState: this.attachmentsStore.state,
            wikiPagesState: this.wikiPagesStore.state,
            renameWikiState: this.renameWikiStore.state,
        };
    }

    @autobind
    public getAggregateState(): AggregateState {
        return this.state;
    }

    private _createAttachmentsStore(): UnsavedAttachmentsStore {
        const attachmentsStore = new UnsavedAttachmentsStore();

        this._actionsHub.attachmentsAdded.addListener(attachmentsStore.onAttachmentsAdded);
        this._actionsHub.attachmentRead.addListener(attachmentsStore.update);
        this._actionsHub.cancelPageEditing.addListener(attachmentsStore.clearAttachments);
        this._actionsHub.deletePageCompleted.addListener(attachmentsStore.clearAttachments);
        this._actionsHub.savePageCompleted.addListener(attachmentsStore.clearAttachments);

        return attachmentsStore;
    }

    private _disposeAttachementsStore(): void {
        if (!this.attachmentsStore) {
            return;
        }

        this._actionsHub.savePageCompleted.removeListener(this.attachmentsStore.clearAttachments);
        this._actionsHub.deletePageCompleted.removeListener(this.attachmentsStore.clearAttachments);
        this._actionsHub.cancelPageEditing.removeListener(this.attachmentsStore.clearAttachments);
        this._actionsHub.attachmentRead.removeListener(this.attachmentsStore.update);
        this._actionsHub.attachmentsAdded.removeListener(this.attachmentsStore.onAttachmentsAdded);

        this.attachmentsStore.dispose();
        this.attachmentsStore = null;
    }

    private _createPageContentStore(): PageContentStore {
        const pageContentStore = new PageContentStore();

        this._actionsHub.pageContentLoaded.addListener(pageContentStore.onPageContentFetched);
        this._actionsHub.pageLoadEnded.addListener(pageContentStore.onPageLoadEnded);
        this._actionsHub.pageReset.addListener(pageContentStore.onPageContentReset);
        this._actionsHub.pageVersionChanged.addListener(pageContentStore.onPageVersionChanged);
        this._actionsHub.pageDirtyFlagSet.addListener(this._sharedStoresHub.commonStore.setIsPageDirty);
        this._actionsHub.pageDirtyFlagReset.addListener(this._sharedStoresHub.commonStore.resetIsPageDirty);
        this._actionsHub.cancelPageEditing.addListener(this._sharedStoresHub.commonStore.resetIsPageDirty);
        this._actionsHub.savePageCompleted.addListener(this._sharedStoresHub.commonStore.resetIsPageDirty);
        this._actionsHub.pageReset.addListener(this._sharedStoresHub.commonStore.resetIsPageDirty);

        return pageContentStore;
    }

    private _disposePageContentStore(): void {
        if (!this.pageContentStore) {
            return;
        }

        this._actionsHub.pageContentLoaded.removeListener(this.pageContentStore.onPageContentFetched);
        this._actionsHub.pageLoadEnded.removeListener(this.pageContentStore.onPageLoadEnded);
        this._actionsHub.pageReset.removeListener(this.pageContentStore.onPageContentReset);
        this._actionsHub.pageVersionChanged.removeListener(this.pageContentStore.onPageVersionChanged);
        this._actionsHub.pageDirtyFlagSet.removeListener(this._sharedStoresHub.commonStore && this._sharedStoresHub.commonStore.setIsPageDirty);
        this._actionsHub.pageDirtyFlagReset.removeListener(this._sharedStoresHub.commonStore && this._sharedStoresHub.commonStore.resetIsPageDirty);
        this._actionsHub.cancelPageEditing.removeListener(this._sharedStoresHub.commonStore && this._sharedStoresHub.commonStore.resetIsPageDirty);
        this._actionsHub.savePageCompleted.removeListener(this._sharedStoresHub.commonStore && this._sharedStoresHub.commonStore.resetIsPageDirty);
        this._actionsHub.pageReset.removeListener(this._sharedStoresHub.commonStore && this._sharedStoresHub.commonStore.resetIsPageDirty);

        this.pageContentStore = null;
    }

    private _createTemplateContentStore(): TemplateContentStore {
        const templateContentStore = new TemplateContentStore();

        this._actionsHub.templateContentLoaded.addListener(templateContentStore.onTemplateContentLoaded);
        this._actionsHub.templateContentReset.addListener(templateContentStore.onTemplateContentReset);

        return templateContentStore;
    }

    private _disposeTemplateContentStore(): void {
        if (!this.templateContentStore) {
            return;
        }

        this._actionsHub.templateContentLoaded.removeListener(this.templateContentStore.onTemplateContentLoaded);
        this._actionsHub.templateContentReset.removeListener(this.templateContentStore.onTemplateContentReset);

        this.templateContentStore = null;
    }

    private _createPagePrintPageStore(): PagePrintStore {
        const pagePrintStore = new PagePrintStore();
        this._actionsHub.printPagePrompted.addListener(pagePrintStore.onPrintInvoked);
        return pagePrintStore;
    }

    private _disposePagePrintPageStore(): void {
        if (!this.pagePrintStore) {
            return;
        }
        this._actionsHub.printPagePrompted.removeListener(this.pagePrintStore.onPrintInvoked);
        this.pagePrintStore = null;
    }

    private _createTreeStore(): TreeStore {
        this._wikiTreeAdapter = new WikiTreeAdapter();

        // Task: 933158 Complete linking SmartTree adapter to actions. Add listeners for actions which require tree update
        this._actionsHub.pageChanged.addListener(this._onPageChanged);
        this._actionsHub.pageRetrievalSucceeded.addListener(this._onPageRetrievalSucceeded);
        this._actionsHub.treeItemExpanding.addListener(this._onTreeItemExpanding);
        this._actionsHub.treeItemExpanded.addListener(this._onTreeItemExpanded);
        this._actionsHub.treeItemCollapsed.addListener(this._onTreeItemCollapsed);

        this._actionsHub.pageAdded.addListener(this._wikiTreeAdapter.addPage);
        this._actionsHub.pageDeleted.addListener(this._wikiTreeAdapter.deletePage);
        this._actionsHub.pageRenamed.addListener(this._wikiTreeAdapter.renamePage);
        this._actionsHub.pageReordered.addListener(this._wikiTreeAdapter.reorderPage);
        this._actionsHub.pageReplaced.addListener(this._wikiTreeAdapter.replacePage);

        return new TreeStore({
            adapter: this._wikiTreeAdapter,
            isDeferEmitChangedMode: true,
            keepEmptyFolders: true,
            canCompactNodeIntoChild: CompactMode.none,
            compareChildren: (parentPath, page1, page2) => {
                return treeNodeSortOrderDecider(parentPath, page1, page2, this.state.wikiPagesState.wikiPages);
            },
        });
    }

    private _disposeTreeStore(): void {
        if (this._wikiTreeAdapter) {
            this._actionsHub.pageChanged.removeListener(this._onPageChanged);
            this._actionsHub.pageRetrievalSucceeded.removeListener(this._onPageRetrievalSucceeded);
            this._actionsHub.treeItemExpanding.removeListener(this._onTreeItemExpanding);
            this._actionsHub.treeItemExpanded.removeListener(this._onTreeItemExpanded);
            this._actionsHub.treeItemCollapsed.removeListener(this._onTreeItemCollapsed);

            this._actionsHub.pageAdded.removeListener(this._wikiTreeAdapter.addPage);
            this._actionsHub.pageDeleted.removeListener(this._wikiTreeAdapter.deletePage);
            this._actionsHub.pageRenamed.removeListener(this._wikiTreeAdapter.renamePage);
            this._actionsHub.pageReordered.removeListener(this._wikiTreeAdapter.reorderPage);
            this._actionsHub.pageReplaced.removeListener(this._wikiTreeAdapter.replacePage);

            this._wikiTreeAdapter.dispose();
            this._wikiTreeAdapter = null;
        }

        if (this.treeStore) {
            this.treeStore.dispose();
            this.treeStore = null;
        }
    }

    private _createWikiPagesStore(): WikiPagesStore {
        const wikiPagesStore = new WikiPagesStore();

        this._actionsHub.pageRetrievalSucceeded.addListener(wikiPagesStore.loadRetrievedPages);
        this._actionsHub.treeItemExpanded.addListener(wikiPagesStore.loadRetrievedPages);
        this._actionsHub.pageAdded.addListener(wikiPagesStore.addPage);
        this._actionsHub.pageDeleted.addListener(wikiPagesStore.deletePage);
        this._actionsHub.pageRenamed.addListener(wikiPagesStore.renamePage);
        this._actionsHub.pageReordered.addListener(wikiPagesStore.reorderPage);
        this._actionsHub.pageReplaced.addListener(wikiPagesStore.replacePage);
        this._actionsHub.allPagesRetrievalSucceeded.addListener(wikiPagesStore.loadAllPages);
        this._actionsHub.pageReorderStarted.addListener(wikiPagesStore.pageReorderStarted);

        return wikiPagesStore;
    }

    private _disposeWikiPagesStore(): void {
        if (!this.wikiPagesStore) {
            return;
        }

        this._actionsHub.pageRetrievalSucceeded.removeListener(this.wikiPagesStore.loadRetrievedPages);
        this._actionsHub.treeItemExpanded.removeListener(this.wikiPagesStore.loadRetrievedPages);
        this._actionsHub.pageAdded.removeListener(this.wikiPagesStore.addPage);
        this._actionsHub.pageDeleted.removeListener(this.wikiPagesStore.deletePage);
        this._actionsHub.pageRenamed.removeListener(this.wikiPagesStore.renamePage);
        this._actionsHub.pageReordered.removeListener(this.wikiPagesStore.reorderPage);
        this._actionsHub.pageReplaced.removeListener(this.wikiPagesStore.replacePage);
        this._actionsHub.allPagesRetrievalSucceeded.removeListener(this.wikiPagesStore.loadAllPages);
        this._actionsHub.pageReorderStarted.removeListener(this.wikiPagesStore.pageReorderStarted);

        this.wikiPagesStore = null;
    }

    private _createCloneWikiStore(): CloneWikiStore {
        const cloneWikiStore = new CloneWikiStore();

        this._actionsHub.cloneWikiDialogOpened.addListener(cloneWikiStore.openCloneWikiDialog);
        this._actionsHub.cloneWikiDialogClosed.addListener(cloneWikiStore.closeCloneWikiDialog);

        return cloneWikiStore;
    }

    private _disposeCloneWikiStore(): void {
        if (!this.cloneWikiStore) {
            return;
        }

        this._actionsHub.cloneWikiDialogOpened.removeListener(this.cloneWikiStore.openCloneWikiDialog);
        this._actionsHub.cloneWikiDialogClosed.removeListener(this.cloneWikiStore.closeCloneWikiDialog);

        this.cloneWikiStore = null;
    }

    private _createRenameWikiStore(): RenameWikiStore {
        const renameWikiStore = new RenameWikiStore();

        this._actionsHub.renameWikiDialogOpened.addListener(renameWikiStore.openRenameWikiDialog);
        this._actionsHub.renameWikiDialogClosed.addListener(renameWikiStore.closeRenameWikiDialog);
        this._actionsHub.wikiRenameFailed.addListener(renameWikiStore.wikiRenameFailed);
        this._actionsHub.wikiRenameStarted.addListener(renameWikiStore.wikiRenameProgress);

        return renameWikiStore;
    }

    private _disposeRenameWikiStore(): void {
        if (!this.renameWikiStore) {
            return;
        }

        this._actionsHub.renameWikiDialogOpened.removeListener(this.renameWikiStore.openRenameWikiDialog);
        this._actionsHub.renameWikiDialogClosed.removeListener(this.renameWikiStore.closeRenameWikiDialog);
        this._actionsHub.wikiRenameFailed.removeListener(this.renameWikiStore.wikiRenameFailed);
        this._actionsHub.wikiRenameStarted.removeListener(this.renameWikiStore.wikiRenameProgress);
        this.renameWikiStore = null;
    }

    private _createPageDialogsStore(): PageDialogsStore {
        const pageDialogsStore = new PageDialogsStore();

        this._actionsHub.savePageDialogPrompted.addListener(pageDialogsStore.promptSavePageDialog);
        this._actionsHub.savePageDialogDismissed.addListener(pageDialogsStore.dismissSavePageDialog);
        this._actionsHub.savePageStarted.addListener(pageDialogsStore.startSavingPage);
        this._actionsHub.savePageCompleted.addListener(pageDialogsStore.completeSavingPage);
        this._actionsHub.savePageFailed.addListener(pageDialogsStore.showSaveErrorMessage);
        this._actionsHub.deletePageDialogPrompted.addListener(pageDialogsStore.promptDeletePageDialog);
        this._actionsHub.deletePageDialogDismissed.addListener(pageDialogsStore.dismissDeletePageDialog);
        this._actionsHub.deletePageStarted.addListener(pageDialogsStore.startDeletingPage);
        this._actionsHub.deletePageCompleted.addListener(pageDialogsStore.completeDeletingPage);
        this._actionsHub.movePageDialogPrompted.addListener(pageDialogsStore.promptMovePageDialog);
        this._actionsHub.movePageDialogDismissed.addListener(pageDialogsStore.dismissMovePageDialog);
        this._actionsHub.movePageStarted.addListener(pageDialogsStore.startMovingPage);
        this._actionsHub.movePageCompleted.addListener(pageDialogsStore.onPageMoveCompleted);
        this._actionsHub.movePageFailed.addListener(pageDialogsStore.onPageMoveFailed);
        this._actionsHub.setAsHomePageDialogPrompted.addListener(pageDialogsStore.promptSetAsHomePageDialog);
        this._actionsHub.setAsHomePageDialogDismissed.addListener(pageDialogsStore.dismissSetAsHomePageDialog);
        this._actionsHub.setAsHomePageStarted.addListener(pageDialogsStore.startSettingAsHomePage);
        this._actionsHub.setAsHomePageCompleted.addListener(pageDialogsStore.onSetAsHomePageCompleted);
        this._actionsHub.setAsHomePageFailed.addListener(pageDialogsStore.onSetAsHomePageFailed);
        this._actionsHub.movePagePickerDialogPrompted.addListener(pageDialogsStore.promptMovePagePickerDialog);
        this._actionsHub.movePagePickerDialogDismissed.addListener(pageDialogsStore.dismissMovePagePickerDialog);
        this._actionsHub.linkWorkItemsDialogPrompted.addListener(pageDialogsStore.promptLinkWorkItemsDialog);
        this._actionsHub.linkWorkItemsDialogDismissed.addListener(pageDialogsStore.dismissLinkWorkItemsDialog);
        this._actionsHub.templatePickerDialogPrompted.addListener(pageDialogsStore.promptTemplatePickerDialog);
        this._actionsHub.templatePickerDialogDismissed.addListener(pageDialogsStore.dismissTemplatePickerDialog);
        this._actionsHub.unpublishWikiDialogPrompted.addListener(pageDialogsStore.promptUnpublishWikiDialog);
        this._actionsHub.unpublishWikiDialogDismissed.addListener(pageDialogsStore.dismissUnpublishWikiDialog);
        this._actionsHub.editInDraftVersionDialogPrompted.addListener(pageDialogsStore.promptEditInDraftVersionDialog);
        this._actionsHub.editInDraftVersionDialogDismissed.addListener(pageDialogsStore.dismissEditInDraftVersionDialog);
        return pageDialogsStore;
    }

    private _disposePageDialogsStore(): void {
        if (!this.pageDialogsStore) {
            return;
        }

        this._actionsHub.savePageDialogPrompted.removeListener(this.pageDialogsStore.promptSavePageDialog);
        this._actionsHub.savePageDialogDismissed.removeListener(this.pageDialogsStore.dismissSavePageDialog);
        this._actionsHub.savePageStarted.removeListener(this.pageDialogsStore.startSavingPage);
        this._actionsHub.savePageCompleted.removeListener(this.pageDialogsStore.completeSavingPage);
        this._actionsHub.savePageFailed.removeListener(this.pageDialogsStore.showSaveErrorMessage);
        this._actionsHub.deletePageDialogPrompted.removeListener(this.pageDialogsStore.promptDeletePageDialog);
        this._actionsHub.deletePageDialogDismissed.removeListener(this.pageDialogsStore.dismissDeletePageDialog);
        this._actionsHub.deletePageStarted.removeListener(this.pageDialogsStore.startDeletingPage);
        this._actionsHub.deletePageCompleted.removeListener(this.pageDialogsStore.completeDeletingPage);
        this._actionsHub.movePageDialogPrompted.removeListener(this.pageDialogsStore.promptMovePageDialog);
        this._actionsHub.movePageDialogDismissed.removeListener(this.pageDialogsStore.dismissMovePageDialog);
        this._actionsHub.movePageStarted.removeListener(this.pageDialogsStore.startMovingPage);
        this._actionsHub.movePageCompleted.removeListener(this.pageDialogsStore.onPageMoveCompleted);
        this._actionsHub.movePageFailed.removeListener(this.pageDialogsStore.onPageMoveFailed);
        this._actionsHub.setAsHomePageDialogPrompted.removeListener(this.pageDialogsStore.promptSetAsHomePageDialog);
        this._actionsHub.setAsHomePageDialogDismissed.removeListener(this.pageDialogsStore.dismissSetAsHomePageDialog);
        this._actionsHub.setAsHomePageStarted.removeListener(this.pageDialogsStore.startSettingAsHomePage);
        this._actionsHub.setAsHomePageCompleted.removeListener(this.pageDialogsStore.onSetAsHomePageCompleted);
        this._actionsHub.setAsHomePageFailed.removeListener(this.pageDialogsStore.onSetAsHomePageFailed);
        this._actionsHub.movePagePickerDialogPrompted.removeListener(this.pageDialogsStore.promptMovePagePickerDialog);
        this._actionsHub.movePagePickerDialogDismissed.removeListener(this.pageDialogsStore.dismissMovePagePickerDialog);
        this._actionsHub.linkWorkItemsDialogPrompted.removeListener(this.pageDialogsStore.promptLinkWorkItemsDialog);
        this._actionsHub.linkWorkItemsDialogDismissed.removeListener(this.pageDialogsStore.dismissLinkWorkItemsDialog);
        this._actionsHub.templatePickerDialogPrompted.removeListener(this.pageDialogsStore.promptTemplatePickerDialog);
        this._actionsHub.templatePickerDialogDismissed.removeListener(this.pageDialogsStore.dismissTemplatePickerDialog);
        this._actionsHub.unpublishWikiDialogPrompted.removeListener(this.pageDialogsStore.promptUnpublishWikiDialog);
        this._actionsHub.unpublishWikiDialogDismissed.removeListener(this.pageDialogsStore.dismissUnpublishWikiDialog);
        this._actionsHub.editInDraftVersionDialogPrompted.removeListener(this.pageDialogsStore.promptEditInDraftVersionDialog);
        this._actionsHub.editInDraftVersionDialogDismissed.removeListener(this.pageDialogsStore.dismissEditInDraftVersionDialog);

        this.pageDialogsStore = null;
    }

    // Tree action listeners
    private _onPageChanged = (payload: PageChangedPayload) => {
        this._wikiTreeAdapter.selectPage(payload.pagePath, payload.pageInfo ? payload.pageInfo.wikiPage : null);
    }

    private _onPageRetrievalSucceeded = (payload: PageRetrievedPayload) => {
        this._wikiTreeAdapter.addSubPagesAndExpandParent(payload.allRetrievedPages, payload.pageInfo && payload.pageInfo.wikiPage);
    }

    private _onTreeItemExpanding = (pagePath: string) => {
        this._wikiTreeAdapter.startExpand(pagePath);
    }

    private _onTreeItemExpanded = (payload: PageRetrievedPayload) => {
        this._wikiTreeAdapter.addSubPagesAndExpand(payload.allRetrievedPages, payload.pagePath);
    }

    private _onTreeItemCollapsed = (pagePath: string) => {
        this._wikiTreeAdapter.collapse(pagePath);
    }

    private _isNewPage(urlParams: UrlParameters): boolean {
        const isSubPage: boolean = this.state.sharedState.urlState.isSubPage;
        const pageExists: boolean = Boolean(this.getAggregateState().wikiPagesState.wikiPages[urlParams.pagePath]);
        return (!pageExists && isSubPage);
    }

    @autobind
    private _onHubViewOptionsChanged(urlParams: UrlParameters): void {
        const tempPage: WikiPage = this.state.wikiPagesState.tempPage;

        // Delete temp page on hub view options change
        if (tempPage && this._wikiTreeAdapter && this.wikiPagesStore) {
            const tempPageToDelete: TempPageDeletedPayload = {
                pagePath: tempPage.path,
                pageWasOnlySubPageToOldParent: this._getSubPagesCount(getParentPagePath(tempPage.path)) === 1
            };

            this._wikiTreeAdapter.deleteNewTemporaryPage(tempPageToDelete);
            this.wikiPagesStore.deleteNewTemporaryPage(tempPageToDelete);
        }

        // Add temp page on hub view options change if needed
        if (this._isNewPage(urlParams)) {
            const parentPath: string = getNewPageParentPath(this.state.sharedState.urlState.pagePath);
            const parentPage: WikiPage = this.state.wikiPagesState.wikiPages[parentPath];
            const tempPagePath: string = combinePaths(parentPath, WikiResources.NewPagePlaceHolderTitle);

            const tempPageToAdd: TempPageAddedPayload = {
                pagePath: tempPagePath,
                pageIsOnlySubPageToNewParent: parentPage
                    ? !parentPage.isParentPage
                    : true,
            };

            this._wikiTreeAdapter.addNewTemporaryPage(tempPageToAdd);
            this.wikiPagesStore.addNewTemporaryPage(tempPageToAdd);
        }
    }

    private _getSubPagesCount(pagePath: string): number {
        const parentPage = this.state.wikiPagesState.wikiPages[pagePath];

        return parentPage && parentPage.subPages
            ? parentPage.subPages.length
            : 0;
    }
}
