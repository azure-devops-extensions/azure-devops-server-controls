import * as Q from "q";

import { autobind } from "OfficeFabric/Utilities";
import * as VSS_ClientTrace_Contract from "VSS/ClientTrace/Contracts";
import * as VSS_Error from "VSS/Error";
import { getScenarioManager } from "VSS/Performance";
import { getClient } from "VSS/Service";
import { SettingsHttpClient } from "VSS/Settings/RestClient";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_Clipboard from "VSS/Utils/Clipboard";
import * as Utils_String from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

import * as SharedSearchConstants from "SearchUI/Constants";

import { GitRef, GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import {
    WikiPage,
    WikiPageMoveResponse,
    WikiPageResponse,
    WikiType,
    WikiV2,
} from "TFS/Wiki/Contracts";

import { ArtifactUriQueryResult, WorkItemReference } from "TFS/WorkItemTracking/Contracts";

import { MentionProcessor } from "Mention/Scripts/TFS.Mention";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { getGitUIService, ICreateBranchOptions, ICreateBranchResult } from "VersionControl/Scripts/Services/GitUIService";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { combinePaths, getParentPaths } from "VersionControl/Scripts/VersionControlPath";
import { getExplorerUrl } from "VersionControl/Scripts/VersionControlUrls";

import { PageMetadataSource } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataSource";
import { getFormattedErrorMessage, getNonConformanceError, getLearnMoreLink } from "Wiki/Scenarios/Shared/Components/Errors";
import { SharedActionCreator } from "Wiki/Scenarios/Shared/SharedActionCreator";
import {
    Attachment,
    ErrorProps,
    GuidSuffixedFile,
} from "Wiki/Scenarios/Shared/SharedActionsHub";
import { WikiPagesInitialData, WikiPagesSource } from "Wiki/Scenarios/Shared/Sources/WikiPagesSource";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import {
    RepoConstants,
    VersionControlConstants,
    WikiActionIds,
} from "Wiki/Scripts/CommonConstants";
import { VersionedPageContent } from "Wiki/Scripts/Contracts";
import { PageErrorType, SavePageOperationType, SaveOptionType, PerformanceConstants } from "Wiki/Scripts/CustomerIntelligenceConstants";
import { WikiErrorNames } from "Wiki/Scripts/ErrorHelper";
import { DraftVersionsConstants } from "Wiki/Scripts/Generated/Constants";
import {
    convertToLevelOnePagePath,
    getDefaultUrlParameters,
    getDepthOfPage,
    getGitItemPathForPage,
    getNewPageParentPath,
    getPageNameFromPath,
    getParentPagePath,
    getValueFromETag,
    getWikiTemplatePath,
    isTopLevelPage,
    versionDescriptorToString,
    showBranchSecurityPermissions,
    getGitFriendlyWikiPath,
} from "Wiki/Scripts/Helpers";
import { sanitizeTemplateContent } from "Wiki/Scripts/TemplatesHelper";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";
import {
    canNavigateToOrRenderPage,
    flattenWikiPage,
    isPageWithoutAssociatedContent,
} from "Wiki/Scripts/WikiPagesHelper";
import { redirectToUrl, getWikiPageViewUrl, getWikiUrl } from "Wiki/Scripts/WikiUrls";

import { FileSource } from "Wiki/Scenarios/Overview/Sources/FileSource";
import { RenameWikiSource } from "Wiki/Scenarios/Overview/Sources/RenameWikiSource";
import { TrialPageIdSourceAsync } from "Wiki/Scenarios/Overview/Sources/TrialPageIdSourceAsync";
import { TelemetrySpy } from "Wiki/Scenarios/Overview/Sources/TelemetrySpy";
import { AggregateState } from "Wiki/Scenarios/Overview/Stores/ViewStoresHub";
import { ViewActionsHub, MovePageParams, TemplatePickerDialogParams } from "Wiki/Scenarios/Overview/ViewActionsHub";
import { getLinkFromPath } from "Wiki/Scripts/Helpers";

export interface Sources {
    fileSource: FileSource;
    wikiPagesSource: WikiPagesSource;
    renameWikiSource: RenameWikiSource;
    wikiPageIdSource: TrialPageIdSourceAsync;
}

/**
 * The entry point to trigger actions for wiki.
 */
export class ViewActionCreator {
    private _currentDraggedPage: WikiPage;
    private _lastWikiPageRequest: Q.Deferred<WikiPage[]>;

    constructor(
        private _sharedActionCreator: SharedActionCreator,
        private _actionsHub: ViewActionsHub,
        private _sources: Sources,
        private _getAggregateState: () => AggregateState,
        private _telemetrySpy: TelemetrySpy,
        private _gitRestClient?: GitHttpClient,
    ) {
        if (!this._gitRestClient) {
            this._gitRestClient = ProjectCollection.getDefaultConnection()
                .getHttpClient<GitHttpClient>(GitHttpClient);
        }
    }

    public get viewActionsHub(): ViewActionsHub {
        return this._actionsHub;
    }

    public get wikiPagesSource(): WikiPagesSource {
        return this._sources.wikiPagesSource;
    }

    public get telemetrySpy(): TelemetrySpy {
        return this._telemetrySpy;
    }

    public addAttachments(files: GuidSuffixedFile[]): void {
        const attachments: Attachment[] = files.map(FileSource.CREATE_ATTACHMENT);
        this._actionsHub.attachmentsAdded.invoke(attachments);

        for (const attachment of attachments) {
            this._sources.fileSource.readContent(attachment).then(
                (updatedAttachment: Attachment) => this._actionsHub.attachmentRead.invoke(updatedAttachment),
                (error: Error) => this._sharedActionCreator.showErrorIfNecessary(error),
            );
        }
    }

    public openInNewTab(pagePath: string): void {
        const url: string = getWikiPageViewUrl({ pagePath: pagePath });
        const windowObject = window.open(url, "_blank");
        windowObject.opener = null;
    }

    public addPage(
        pagePath?: string,
        replaceHistoryPoint?: boolean,
        addPageWithTitle?: boolean,
        templateName?: string,
        isLandingPage?: boolean,
    ): void {
        const commonState = this._getAggregateState().sharedState.commonState;

        if (commonState.wiki && commonState.wiki.type === WikiType.CodeWiki) {
            // Block add page experience for CodeWiki
            return;
        }

        const ifConformant = (): void => {
            this._addPageAction(pagePath, replaceHistoryPoint, addPageWithTitle, templateName, isLandingPage);
        };

        const ifNonConformant = (): void => {
            const errorMessage = Utils_String.format(WikiResources.NonConformanceError_ForAddSubPage, getPageNameFromPath(pagePath));
            this._sharedActionCreator.showErrorIfNecessary(getNonConformanceError(errorMessage));
        };

        const tentativeAction = () => this._performActionBasedOnConformity(
            pagePath,
            ifConformant,
            ifNonConformant);

        if (this._sharedActionCreator.checkChangesToLose(tentativeAction)) {
            return;
        }

        tentativeAction();
    }

    public createProjectWiki(): void {
        this._sharedActionCreator.createWiki();
    }

    public publishWiki(): void {
        this._sharedActionCreator.publishWiki();
    }

    public promptUnpublishWikiDialog(): void {
        this._actionsHub.unpublishWikiDialogPrompted.invoke(null);
    }

    public dismissUnpublishWikiDialog(): void {
        this._actionsHub.unpublishWikiDialogDismissed.invoke(null);
    }

    public loadWikiTree = (pagePath: string): void => {
        if (!getPageNameFromPath(pagePath) && this._wikiPagesStoreHasPages()) {
            // this to prevent loading the root pages multiple times
            return;
        }

        const wikiPage: WikiPage = this._getWikiPageFromStore(pagePath);
        if (!this._canUseWikiPage(wikiPage)) {
            this.wikiPagesSource.loadPageHierarchy(pagePath).then(
                (data: WikiPagesInitialData) => {
                    let actionablePagePath = pagePath;

                    if (data.landingPagePath
                        && data.landingPageVersion) {

                        // Checking just on page path and page version is sufficient
                        actionablePagePath = data.landingPagePath;
                        this._actionsHub.pageContentLoaded.invoke({
                            path: data.landingPagePath,
                            content: data.landingPageContent ? data.landingPageContent : "",
                            version: data.landingPageVersion,
                        });
                    } else if (!data.pages || data.pages.length <= 1) {
                        const commonState = this._getAggregateState().sharedState.commonState;
                        if (commonState.wiki && commonState.wiki.type === WikiType.CodeWiki) {
                            // No landing page path and no pages in the wiki, may be just the root.
                            this._handleZeroPagesInCodeWiki();

                            return;
                        }
                    }

                    this._handlePagesRetrieval(pagePath, data.pages);

                    const isPageExisting = this._getAggregateState().wikiPagesState.wikiPages[actionablePagePath] != null;
                    const shouldAddPage = this._getAggregateState().sharedState.urlState.isSubPage;
                    const isLandingPage = true;

                    if (!isPageExisting && !shouldAddPage) {
                        // Navigate to the non-existing page in view action to show error experience
                        this.changePath(actionablePagePath, isLandingPage);
                    } else {
                        // Navigate to path based on action
                        if (this._getAggregateState().sharedState.urlState.action === WikiActionIds.Edit) {
                            const originPath = null;
                            const replaceHistoryPoint = true;

                            if (shouldAddPage) {
                                const useTitleFromUrl = getPageNameFromPath(pagePath) !== "";
                                this.addPage(pagePath, replaceHistoryPoint, useTitleFromUrl, undefined, isLandingPage);
                            } else {
                                this.editPage(actionablePagePath, originPath, replaceHistoryPoint, isLandingPage);
                            }
                        } else {
                            this.changePath(actionablePagePath, isLandingPage);
                        }
                    }
                },
                (error: Error) => this._actionsHub.pageRetrievalFailed.invoke({
                    pagePath: pagePath,
                    error: error,
                }));
        }
    }

    public changePath = (pagePath: string, isLandingPage?: boolean): void => {
        if (this.isTempPagePath(pagePath)) {
            // Update URL should not be called on the temp page while it is being created
            return;
        }

        const ifConformant = (): void => {
            this._changePathAction(pagePath, isLandingPage);
        };

        const ifNonConformant = (): void => {
            const errorMessage: string = Utils_String.format(WikiResources.NonConformanceError_ForLoad, getPageNameFromPath(pagePath));
            this._sharedActionCreator.showErrorIfNecessary(getNonConformanceError(errorMessage));
        };

        const tentativeAction = () => this._performActionBasedOnConformity(
            pagePath,
            ifConformant,
            ifNonConformant);

        if (this._sharedActionCreator.checkChangesToLose(tentativeAction)) {
            return;
        }

        tentativeAction();
    }

    public collapseTreeItem = (pagePath: string): void => {
        this._actionsHub.treeItemCollapsed.invoke(pagePath);
    }

    public cancelEditing(pagePath: string): void {
        this._actionsHub.cancelPageEditing.invoke(null);
        this.changePath(pagePath);
    }

    public deletePage = (pagePath: string): void => {
        const ifConformant = (): void => {
            this._deletePageAction(pagePath);
        };

        const ifNonConformant = (): void => {
            const errorMessage = Utils_String.format(WikiResources.NonConformanceError_ForDelete, getPageNameFromPath(pagePath));
            this._sharedActionCreator.showErrorIfNecessary(getNonConformanceError(errorMessage));
            this._actionsHub.deletePageCompleted.invoke(undefined);
        };

        this._performActionBasedOnConformity(
            pagePath,
            ifConformant,
            ifNonConformant);
    }

    public editPage = (
        pagePath?: string,
        originPagePath?: string,
        replaceHistoryPoint?: boolean,
        isLandingPage?: boolean,
    ): void => {
        const sharedState = this._getAggregateState().sharedState;
        const commonState = sharedState.commonState;

        if (commonState.wiki
            && commonState.wiki.type === WikiType.CodeWiki
            && !WikiFeatures.isRichCodeWikiEditingEnabled()) {
            this._redirectToCode(pagePath, VersionControlActionIds.Preview);
            return;
        }

        const ifConformant = (): void => {
            this._editPageAction(pagePath, originPagePath, replaceHistoryPoint, isLandingPage);
        };

        const ifNonConformant = (): void => {
            const errorMessage = Utils_String.format(WikiResources.NonConformanceError_ForEdit, getPageNameFromPath(pagePath));
            this._sharedActionCreator.showErrorIfNecessary(getNonConformanceError(errorMessage));
        };

        const tentativeAction = () => this._performActionBasedOnConformity(
            pagePath,
            ifConformant,
            ifNonConformant);

        if (this._sharedActionCreator.checkChangesToLose(tentativeAction)) {
            return;
        }

        tentativeAction();
    }

    public expandTreeItem = (pagePath: string): void => {
        const ifConformant = (): void => {
            this._expandTreeItemAction(pagePath);
        };

        const ifNonConformant = (): void => {
            const errorMessage = Utils_String.format(WikiResources.NonConformanceError_ForLoad, getPageNameFromPath(pagePath));
            this._sharedActionCreator.showErrorIfNecessary(getNonConformanceError(errorMessage));
        };

        this._performActionBasedOnConformity(
            pagePath,
            ifConformant,
            ifNonConformant);
    }

    public reparentPage = (sourcePage: WikiPage, parentPage: WikiPage): void => {
        if (!sourcePage
            || !parentPage
            || !sourcePage.path
            || !parentPage.path
            || sourcePage.path === parentPage.path) {
            // source and target are same pages and hence it is a no-op
            return;
        }

        const newOrderInParent = 0;
        this.promptMovePageDialog({
            sourcePage: sourcePage,
            targetPage: parentPage,
            newOrderInParent: newOrderInParent
        });
    }

    public reorderPage = (sourcePage: WikiPage, siblingPage: WikiPage, isReorderAbove?: boolean): void => {
        if (!sourcePage
            || !siblingPage
            || !sourcePage.path
            || !siblingPage.path
            || sourcePage.path === siblingPage.path) {
            // source and target are same pages and hence it is a no-op
            return;
        }

        const sourceParentPath = getParentPagePath(sourcePage.path);
        const targetParentPath = getParentPagePath(siblingPage.path);

        if (sourceParentPath === targetParentPath) {
            // Same parent, so reorder only change
            this._makePageAsSibling(sourcePage, siblingPage, isReorderAbove);
        } else {
            // Different parents, so both reorder and reparent change
            const parentPage = this._getAggregateState().wikiPagesState.wikiPages[targetParentPath];
            const newOrderInParent = isReorderAbove ? (siblingPage.order || 0) : ((siblingPage.order || 0) + 1);
            this.promptMovePageDialog({
                sourcePage: sourcePage,
                targetPage: parentPage,
                newOrderInParent: newOrderInParent,
            });
        }
    }

    public copyPagePathToClipboard = (path: string): void => {
        // This path has to adhere server side path rules
        const mdPath = Utils_String.format("[{0}]({1})", getPageNameFromPath(path), getLinkFromPath(path));
        Utils_Clipboard.copyToClipboard(mdPath);
        this._publishCopyPagePathClicked();

    }

    public promptWikiCloneDialog = (): void => this._actionsHub.cloneWikiDialogOpened.invoke(void 0);

    public hideWikiCloneDialog = (): void => this._actionsHub.cloneWikiDialogClosed.invoke(undefined);

    public promptDeletePageDialog = (path: string): void => this._actionsHub.deletePageDialogPrompted.invoke(path);

    public dismissDeletePageDialog = (): void => this._actionsHub.deletePageDialogDismissed.invoke(undefined);

    public promptSavePageDialog = (): void => this._actionsHub.savePageDialogPrompted.invoke(undefined);

    public dismissSavePageDialog = (): void => this._actionsHub.savePageDialogDismissed.invoke(undefined);

    public onCancelButtonClick = (tentativeAction: () => void): void => this._sharedActionCreator.promptNavigateAwayDialog(tentativeAction);

    public promptMovePageDialog = (params: MovePageParams): void => this._actionsHub.movePageDialogPrompted.invoke(params);

    public dismissMovePageDialog = (): void => this._actionsHub.movePageDialogDismissed.invoke(undefined);

    public setAsHomePage(path: string): void {
        // Don't prompt dialog when page is top level as path is not changed.
        if (isTopLevelPage(path)) {
            this.setPageAsHome(path);
            return;
        }

        this._actionsHub.setAsHomePageDialogPrompted.invoke(path);
    }

    public dismissSetAsHomePageDialog = (): void => this._actionsHub.setAsHomePageDialogDismissed.invoke(undefined);

    public publishCopyCloneUrlClicked = (): void => this._telemetrySpy.publishCopyCloneUrlClicked();

    @autobind
    public publishPagePrinted(): void {
        this._telemetrySpy.publishPagePrinted();
    }

    public publishEditContainerPreviewToggled(previewMode: string): void {
        this._telemetrySpy.publishEditContainerPreviewToggled(previewMode);
    }

    public dismissNavigateAwayDialog = (): void => this._sharedActionCreator.dismissNavigateAwayDialog();

    public promptMovePagePickerDialog = (page: WikiPage): void => this._actionsHub.movePagePickerDialogPrompted.invoke({
        sourcePage: page,
    });

    public promptLinkWorkItemsDialog = (page: WikiPage): void => this._actionsHub.linkWorkItemsDialogPrompted.invoke({
        sourcePage: page,
    });

    @autobind
    public promptPrintPage(): void {
        this._actionsHub.printPagePrompted.invoke(undefined);
        this.publishPagePrinted();
    }

    public dismissLinkWorkItemsPageDialog = (): void => this._actionsHub.linkWorkItemsDialogDismissed.invoke(undefined);

    public dismissMovePagePickerDialog = (): void => this._actionsHub.movePagePickerDialogDismissed.invoke(undefined);

    public publishPageEditingCancelledWithoutAnyChange = (): void => this._telemetrySpy.publishPageEditingCancelledWithoutAnyChange();

    @autobind
    public promptTemplatePickerDialog(params?: TemplatePickerDialogParams): void {
        this._actionsHub.templatePickerDialogPrompted.invoke(params);
    }

    @autobind
    public dismissTemplatePickerDialog(): void {
        this._actionsHub.templatePickerDialogDismissed.invoke(undefined);
    }

    @autobind
    public publishPageSaved(
        saveOptionType: SaveOptionType,
        savePageOperationType: SavePageOperationType,
        wikiPage: WikiPage, isDefaultCommentChanged: boolean,
    ): void {
        this._telemetrySpy.publishPageSaved(saveOptionType, savePageOperationType, wikiPage, isDefaultCommentChanged);
    }

    @autobind
    public publishErrorPageTelemetries(pagePath: string): void {
        const parentPath: string = getParentPagePath(pagePath);
        const parentPage: WikiPage = this._getAggregateState().wikiPagesState.wikiPages[parentPath];

        if (!this._canUseWikiPage(parentPage) && parentPath !== RepoConstants.RootPath) {
            this._telemetrySpy.publishBrokenLinkWithBrokenParentVisited();
        }

        this._telemetrySpy.publishBrokenLinkErrorPageVisited();
    }

    public showWikiSecurityDialog = (): void => {
        const commonState = this._getAggregateState().sharedState.commonState;
        const repoContext = commonState.repositoryContext;

        showBranchSecurityPermissions(
            repoContext.getTfsContext(),
            repoContext.getRepositoryId(),
        );
        this._telemetrySpy.publishSecurityDialogPrompted();
    }

    public setPageAsHome = (pagePath: string, closeOnComplete?: boolean): void => {
        const ifConformant = (): void => {
            this._setAsHomePageAction(pagePath, closeOnComplete);
        };

        const ifNonConformant = (): void => {
            const errorMessage = Utils_String.format(WikiResources.NonConformanceError_ForSetAsHomePage, getPageNameFromPath(pagePath));
            this._sharedActionCreator.showErrorIfNecessary(getNonConformanceError(errorMessage));
            this._actionsHub.setAsHomePageFailed.invoke(null);
        };

        this._performActionBasedOnConformity(
            pagePath,
            ifConformant,
            ifNonConformant);
    }

    public viewPageHistory = (pagePath: string): void => {
        const ifConformant = (): void => {
            this._viewHistoryAction(pagePath);
        };

        const ifNonConformant = (): void => {
            const errorMessage = Utils_String.format(WikiResources.NonConformanceError_ForViewRevisions, getPageNameFromPath(pagePath));
            this._sharedActionCreator.showErrorIfNecessary(getNonConformanceError(errorMessage));
        };

        const tentativeAction = () => this._performActionBasedOnConformity(
            pagePath,
            ifConformant,
            ifNonConformant);

        if (this._sharedActionCreator.checkChangesToLose(tentativeAction)) {
            return;
        }

        tentativeAction();
    }

    public renderPage = (pagePath: string, loadMetadata?: boolean, isEdit?: boolean) => {
        const canRenderPage = this._canNavigateToOrRenderPath(pagePath);

        if (!canRenderPage) {
            const defaultPageToNavigateTo = this._getDefaultPageToNavigateTo();

            if (defaultPageToNavigateTo
                && defaultPageToNavigateTo.path
                && this._getAggregateState().sharedState.urlState.action === WikiActionIds.View) {
                // If we cannot operate on the given page path, render the default page from root level instead
                pagePath = defaultPageToNavigateTo.path;
            } else {
                // If no default page, bail out
                return;
            }
        }

        this._renderPageContent(pagePath, isEdit);
    }

    public loadWikiTemplate(templateName: string): void {
        const templatePath = getWikiTemplatePath(templateName);
        this.wikiPagesSource.getVersionedPageContent(templatePath).then(
            (versionedPageContent: VersionedPageContent) => {
                this._actionsHub.templateContentLoaded.invoke({
                    templateContent: sanitizeTemplateContent(versionedPageContent.content),
                    templateName: templateName
                });
            },
            (error: Error) => {
                this._actionsHub.templateContentLoaded.invoke({
                    templateContent: "",
                    templateName: templateName,
                });

                this._sharedActionCreator.showErrorIfNecessary(
                    new Error(Utils_String.format(WikiResources.LoadWikiTemplateFailed, templateName)));
            },
        );
    }

    public promptWikiRenameDialog = (): void => this._actionsHub.renameWikiDialogOpened.invoke(null);

    public hideWikiRenameDialog = (): void => this._actionsHub.renameWikiDialogClosed.invoke(null);


    public getPageIds = (pagePath: string): void => {
        if (WikiFeatures.isGetWikiPageIdFeatureEnabled()) {
            const wikiId: string = this._getAggregateState().sharedState.commonState.wiki.id;
            const wikiVersion: string = this._getAggregateState().sharedState.commonState.wikiVersion.version;

            this._sources.wikiPageIdSource.getWikiPageIds(wikiId, wikiVersion, getGitFriendlyWikiPath(pagePath)).then(
                (result) => {
                    console.log(result);
                });
        }
    }

    public saveWikiName = (newName: string): void => {
        let wikiId: string = this._getAggregateState().sharedState.commonState.wiki.id;
        let project: string = this._getAggregateState().sharedState.commonState.wiki.projectId;
        this._sources.renameWikiSource.updateWikiName(
            wikiId,
            project,
            newName,
        ).then(
            (value: WikiV2) => {
                // Invoke action that a wiki is renamed.
                this.renameSuccssfull(value);
            },
            (error: Error) => {
                this.renameFailed(error);
            });
    }

    private renameSuccssfull = (wiki: WikiV2): void => {
        redirectToUrl(getWikiUrl(
            WikiActionIds.View,
            {
                wikiIdentifier: wiki.id
            }
        ));
    }

    private renameFailed = (error: Error): void => {
        this._actionsHub.wikiRenameFailed.invoke(error);
    }

    public savePage(
        version: string,
        comment: string,
        title: string,
        content: string,
        initialPath: string,
        isNew: boolean,
        isRename: boolean,
        attachments: Attachment[],
        onSaveSuccess?: () => void,
        onSaveFailure?: (error: Error) => void,
        closeRenameDialogOnComplete?: boolean,
        draftVersion?: GitVersionDescriptor,
    ): void {
        title = title.trim();
        this._actionsHub.savePageStarted.invoke(undefined);
        const parentPath = getParentPagePath(initialPath);
        const newPagePath = combinePaths(parentPath, title);
        const pagePath = isNew ? newPagePath : initialPath;
        const wikiPage = this._getAggregateState().wikiPagesState.wikiPages[initialPath];
        this.wikiPagesSource.saveAttachments(attachments, draftVersion).then(
            () => {
                // Only if the attachments are saved, the content should be saved.
                this._sources.wikiPagesSource.savePage(
                    pagePath,
                    content,
                    version,
                    comment,
                    draftVersion,
                ).then(
                    (pageResponse: WikiPageResponse) => {
                        const savedPage = pageResponse.page;
                        const newVersion = getValueFromETag(pageResponse.eTag[0]);

                        if (isRename) {
                            this._sources.wikiPagesSource.renamePage(
                                newPagePath,
                                initialPath,
                                null,  // In this case of title only rename, order passed is 'null'
                                comment,
                            ).then(
                                (pageMoveResponse: WikiPageMoveResponse) => {
                                    const renamedPage = pageMoveResponse.pageMove.page;
                                    const versionAfterRename = getValueFromETag(pageMoveResponse.eTag[0]);
                                    const parentHasOneSubPage = this._getSubPagesCount(parentPath) == 1;

                                    // This is just a title change, so no expansion of parent folder is required
                                    this._actionsHub.pageRenamed.invoke({
                                        originalPagePath: pagePath,
                                        originalOrder: savedPage.order,
                                        newPagePath: newPagePath,
                                        newOrder: renamedPage.order,
                                        isParentPage: this._isParentPage(pagePath),
                                        pageIsOnlySubPageToNewParent: parentHasOneSubPage,
                                        pageWasOnlySubPageToOldParent: parentHasOneSubPage,
                                    });

                                    this._actionsHub.savePageCompleted.invoke(closeRenameDialogOnComplete);
                                    this.dismissNavigateAwayDialog();
                                    this._actionsHub.pageVersionChanged.invoke(versionAfterRename);

                                    if (onSaveSuccess) {
                                        onSaveSuccess();
                                    }
                                },
                                (error: Error) => {
                                    this.promptSavePageDialog();
                                    this.dismissNavigateAwayDialog();
                                    this._actionsHub.savePageFailed.invoke(error.message);

                                    if (onSaveFailure) {
                                        onSaveFailure(error);
                                    }
                                },
                            );
                        } else {
                            if (isNew) {
                                const parentPath = getParentPagePath(savedPage.path);
                                const parentPage = this._getAggregateState().wikiPagesState.wikiPages[parentPath];
                                const pageFromStore = this._getAggregateState().wikiPagesState.wikiPages[savedPage.path];

                                if (isPageWithoutAssociatedContent(pageFromStore)) {
                                    // Check if the page is already existing in store. This is a case for parent pages without content associated
                                    this._actionsHub.pageReplaced.invoke({
                                        page: savedPage,
                                        pageIsOnlySubPageToParent: this._getSubPagesCount(parentPath) === 1,
                                    });
                                } else {
                                    if (parentPath === RepoConstants.RootPath || this._canUseWikiPage(parentPage)) {
                                        this._actionsHub.pageAdded.invoke({
                                            page: savedPage,
                                            pageIsOnlySubPageToNewParent: !this._isParentPage(getParentPagePath(savedPage.path))
                                        });

                                        this._invokeTreeItemExpanded(parentPath);
                                    } else {
                                        this.expandTreeItem(parentPath);
                                    }
                                }
                            }

                            this._actionsHub.savePageCompleted.invoke(undefined);
                            this.dismissNavigateAwayDialog();
                            this._actionsHub.pageVersionChanged.invoke(newVersion);
                            if (WikiFeatures.isRichCodeWikiEditingEnabled() && draftVersion) {
                                this.updateDraftVersions(draftVersion).then(
                                    () => {
                                        if (onSaveSuccess) {
                                            onSaveSuccess();
                                        }
                                        this.redirectToWikiVersion(draftVersion, WikiActionIds.View);
                                    },
                                    (error: any) => {
                                        return;
                                    }
                                );
                            }
                            else {
                                if (onSaveSuccess) {
                                    onSaveSuccess();
                                }
                            }
                        }
                    },
                    (error: Error) => {
                        if ((error as TfsError).serverError && (error as TfsError).serverError.typeKey === "WikiPageHasConflictsException") {
                            const wikiPage: WikiPage = this._getAggregateState().wikiPagesState.wikiPages[pagePath];
                            this._telemetrySpy.publishConflictError(wikiPage);
                        }

                        this.promptSavePageDialog();
                        this.dismissNavigateAwayDialog();
                        this._actionsHub.savePageFailed.invoke(error.message);

                        if (onSaveFailure) {
                            onSaveFailure(error);
                        }
                    },
                );
            },
            (error: Error) => {
                if ((error as TfsError).serverError
                    && (error as TfsError).serverError.typeKey === "InvalidArgumentValueException") {
                    this._actionsHub.savePageFailed.invoke(error.message);
                } else {
                    this._actionsHub.savePageFailed.invoke(WikiResources.Attachment_SaveFailed);
                }

                if (onSaveFailure) {
                    onSaveFailure(error);
                }
            });
    }

    public setIsPageDirtyFlag = (): void => {
        this._actionsHub.pageDirtyFlagSet.invoke(undefined);
    }

    public onPageDrag = (draggedPage: WikiPage): void => {
        this._currentDraggedPage = draggedPage;
    }

    public onPageDrop = (targetPage: WikiPage, isReorderOperation?: boolean, isReorderAbove?: boolean): void => {
        const sourcePage: WikiPage = jQuery.extend(true, {}, this._currentDraggedPage);

        // Resetting the stored value
        this._currentDraggedPage = null;

        if (isReorderOperation) {
            this.reorderPage(sourcePage, targetPage, isReorderAbove);
        } else {
            this.reparentPage(sourcePage, targetPage);
        }
    }

    public isValidDragSource = (sourcePage: WikiPage): boolean => {
        const aggregatedState = this._getAggregateState();
        const canEditWiki: boolean = aggregatedState.sharedState.permissionState.hasContributePermission
            && aggregatedState.sharedState.commonState.wiki.type === WikiType.ProjectWiki;
        const tempPage: WikiPage = aggregatedState.wikiPagesState.tempPage;

        return canEditWiki && sourcePage
            && !sourcePage.isNonConformant
            && (!tempPage || tempPage.path !== sourcePage.path);
    }

    public isValidDropTarget = (targetPage: WikiPage, isReorderOperation?: boolean): boolean => {
        return this.isReorderOrReparentPagesAllowed(this._currentDraggedPage, targetPage, isReorderOperation);
    }

    public isReorderOrReparentPagesAllowed(sourcePage: WikiPage, targetPage: WikiPage, isReorderOperation: boolean): boolean {
        if (!sourcePage
            || sourcePage.isNonConformant
            || !targetPage
            || targetPage.isNonConformant
            || sourcePage.path === targetPage.path) {
            return false;
        }

        if (this.isTempPagePath(targetPage.path) || this.isEditInProgress()) {
            // Temp page and all pages in edit mode are not valid drop targets
            return false;
        }

        const isTargetDescendantOfSource = Utils_String.startsWith(targetPage.path, sourcePage.path + RepoConstants.RootPath);
        const isTargetImmediateParentOfSource = getParentPagePath(sourcePage.path) === targetPage.path;

        if (isReorderOperation) {
            return !isTargetDescendantOfSource;
        } else {
            return !isTargetImmediateParentOfSource && !isTargetDescendantOfSource;
        }
    }

    @autobind
    public onSearchWithWikiSearchClick(): void {
        this.telemetrySpy.publishSearchWithWikiSearchClicked();
    }

    public resetIsPageDirtyFlag = (): void => {
        this._actionsHub.pageDirtyFlagReset.invoke(null);
    }

    public makePageAsSubPage(
        sourcePage: WikiPage,
        parentPage: WikiPage,
        newOrderInParent?: number,
        showError: boolean = true,
        closeOnComplete: boolean = false,
    ): IPromise<boolean> {
        const deferred = Q.defer<boolean>();
        this._actionsHub.movePageStarted.invoke(undefined);

        // Parent page can be undefined in case of root
        const parentPath = parentPage ? parentPage.path : RepoConstants.RootPath;
        const defaultOrder = parentPath === RepoConstants.RootPath ? 1 : 0;

        const pageTitle = getPageNameFromPath(sourcePage.path);
        const newPagePath = combinePaths(parentPath, pageTitle);
        const originalPath = sourcePage.path;

        const newOrder = newOrderInParent == null ? defaultOrder : newOrderInParent;
        const originalOrder = (sourcePage.order || 0);
        const comment = Utils_String.format(
            WikiResources.MovePageDefaultComment,
            pageTitle,
            getParentPagePath(sourcePage.path),
            parentPath);

        this._sources.wikiPagesSource.renamePage(
            newPagePath,
            originalPath,
            newOrder,
            comment,
        ).then(
            (pageMoveResponse: WikiPageMoveResponse) => {
                const versionAfterRename = getValueFromETag(pageMoveResponse.eTag[0]);

                if (parentPath === RepoConstants.RootPath || this._canUseWikiPage(parentPage)) {
                    this._actionsHub.pageRenamed.invoke({
                        originalPagePath: originalPath,
                        originalOrder: originalOrder,
                        newPagePath: newPagePath,
                        newOrder: newOrder,
                        isParentPage: sourcePage.isParentPage,
                        pageIsOnlySubPageToNewParent: !this._isParentPage(getParentPagePath(newPagePath)),
                        pageWasOnlySubPageToOldParent: this._getSubPagesCount(getParentPagePath(originalPath)) === 1
                    });

                    this._invokeTreeItemExpanded(parentPath);
                } else {
                    this._actionsHub.pageDeleted.invoke({
                        pagePath: originalPath,
                        isParentPage: this._isParentPage(originalPath),
                        pageWasOnlySubPageToOldParent: this._getSubPagesCount(getParentPagePath(originalPath)) === 1
                    });

                    this.expandTreeItem(parentPath);
                }

                this._actionsHub.movePageCompleted.invoke(closeOnComplete);
                this.changePath(newPagePath);
                deferred.resolve(true);
            },
            (error: Error) => {
                this._actionsHub.movePageFailed.invoke(null);
                if (showError) {
                    this._sharedActionCreator.showErrorIfNecessary(error);
                }
                deferred.reject(error);
            }
        );

        return deferred.promise;
    }

    public showPageError = (message: Error | JSX.Element, telemetryMessage: string, errorType: PageErrorType): void => {
        this._sharedActionCreator.showErrorIfNecessary(message);
        this._telemetrySpy.publishPageError(telemetryMessage, errorType);
    }

    public clearPageError = (): void => this._sharedActionCreator.clearError();

    /**
     * Returns true if the given path is the temp page's path, else false
     * @param pagePath - given page path
     */
    public isTempPagePath(pagePath: string): boolean {
        const tempPage: WikiPage = this._getAggregateState().wikiPagesState.tempPage;

        return !!tempPage && pagePath === tempPage.path;
    }

    public isEditInProgress(): boolean {
        return this._getAggregateState().sharedState.urlState.action === WikiActionIds.Edit;
    }

    public onFilterCleared = (selectedPath: string): void => {
        const individualPaths: string[] = getParentPaths(selectedPath).reverse().concat(selectedPath);
        individualPaths.forEach((path: string) => {
            this._getOrFetchWikiPage(path);
        });
    }

    public getPagesToFilter = (): IPromise<WikiPage[]> => {
        const areAllPagesFetched = this._getAggregateState().wikiPagesState.areAllPagesFetched;

        if (!areAllPagesFetched && this._lastWikiPageRequest && this._lastWikiPageRequest.promise.isPending()) {
            return this._lastWikiPageRequest.promise;
        }
        const deferred = Q.defer<WikiPage[]>();

        if (areAllPagesFetched) {
            const wikiPages: WikiPage[] = [];
            for (const path in this._getAggregateState().wikiPagesState.wikiPages) {
                wikiPages.push(this._getAggregateState().wikiPagesState.wikiPages[path]);
            }

            deferred.resolve(wikiPages);
        } else {
            this._lastWikiPageRequest = deferred;

            this._sources.wikiPagesSource.getAllWikiPages().then(
                (pages: WikiPage[]) => {
                    this._actionsHub.allPagesRetrievalSucceeded.invoke({
                        allPages: pages,
                    });

                    deferred.resolve(pages);
                },
                (error: Error) => {
                    deferred.reject(error);
                });
        }
        return deferred.promise;
    }

    public onPageKeyDown = (sourcePage: WikiPage, event: __React.KeyboardEvent<HTMLElement>): void => {
        // Proceed only if there is no reorder operation already in progress and also block keyboard events
        if (this._getAggregateState().wikiPagesState.isPageReorderInProgress) {
            event.stopPropagation();
            event.preventDefault();

            return;
        }

        if (!sourcePage || !event || !event.ctrlKey) {
            // No operation required
            return;
        }

        // Page reorder keyboard shortcuts
        switch (event.keyCode) {
            case KeyCode.UP:
                const aboveTargetPage: WikiPage = this._getNextSibling(sourcePage);
                if (aboveTargetPage) {
                    this.reorderPage(sourcePage, aboveTargetPage, true);
                }

                event.stopPropagation();
                event.preventDefault();
                break;

            case KeyCode.DOWN:
                const belowTargetPage: WikiPage = this._getNextSibling(sourcePage, false);
                if (belowTargetPage) {
                    this.reorderPage(sourcePage, belowTargetPage);
                }

                event.stopPropagation();
                event.preventDefault();
                break;
        }
    }

    /**
     * Updates URL without navigating. Adds history point for back navigation. Used to update URL for internal anchor links.
     * @param urlParameters - URLParameters
	 * @param replaceHistoryPoint - True to overwrite previous history point, false by default
     * @param suppressViewOptionsChangeEvent - False for not suppressing ViewOptionsChangeEvent, true by default
     */
    @autobind
    public updateUrlSilently(
        urlParameters: UrlParameters,
        replaceHistoryPoint: boolean = false,
        suppressViewOptionsChangeEvent: boolean = true
    ): void {
        this._sharedActionCreator.updateUrl(urlParameters, replaceHistoryPoint, suppressViewOptionsChangeEvent);
    }

    // Create branch dialog
    public createDraftVersion(): IPromise<ICreateBranchResult> {
        const commonState = this._getAggregateState().sharedState.commonState;
        const gitUIService = getGitUIService(commonState.repositoryContext);
        const createBranchOptions = {
            sourceRef: new GitBranchVersionSpec(commonState.wikiVersion.version),
        } as ICreateBranchOptions;
        // Create a branch
        return gitUIService.createBranch(createBranchOptions);
    }

    public isWikiVersionDraftVersion(): boolean {
        return this._sharedActionCreator.isWikiVersionDraftVersion();
    }

    // Adds new draft version to user settings and redirect to that draft version
    public updateDraftVersions(draftVersion: GitVersionDescriptor): IPromise<void> {
        const commonState = this._getAggregateState().sharedState.commonState;
        let draftVersions: GitVersionDescriptor[];
        if (commonState.draftVersions) {
            // If draft versions already exist
            draftVersions = commonState.draftVersions;
        } else {
            // If this is the first draft version for the user
            draftVersions = [];
        }
        draftVersions.push(draftVersion);
        return this._sharedActionCreator.updateDraftVersionsInUserSettings(draftVersions);
    }

    // Redirects to the wiki version passed in the parameters
    public redirectToWikiVersion(version: GitVersionDescriptor, wikiActionId: string): void {
        const commonState = this._getAggregateState().sharedState.commonState;
        redirectToUrl(getWikiUrl(
            wikiActionId,
            {
                wikiIdentifier: commonState.wiki.name,
                wikiVersion: versionDescriptorToString(version),
            }),
            false
        );
    }

    @autobind
    public promptEditInDraftVersionDialog(): void {
        this._actionsHub.editInDraftVersionDialogPrompted.invoke(undefined);
    }

    @autobind
    public dismissEditInDraftVersionDialog(): void {
        this._actionsHub.editInDraftVersionDialogDismissed.invoke(undefined);
    }

    private _publishCopyPagePathClicked(): void {
        this._telemetrySpy.publishCopyPagePathClicked();
    }

    private _performActionBasedOnConformity(
        pagePath: string,
        ifConformant: () => void,
        ifNonConformant: () => void
    ): void {
        const page: WikiPage = this._getAggregateState().wikiPagesState.wikiPages[pagePath];
        if (page && page.isNonConformant) {
            // Invoke the ifNonConformant() callback if the page is non conformant
            ifNonConformant();

            // Record the non-conformant action
            this._telemetrySpy.publishNonConformantPageAction();

            return;
        }

        // Invoke the ifConformant() callback if the page is conformant
        ifConformant();
    }

    private _getPageErrorProp(error: Error, pagePath: string): ErrorProps {
        const parentPath: string = getParentPagePath(pagePath);
        const pageName: string = getPageNameFromPath(pagePath);
        const parentPage: WikiPage = this._getAggregateState().wikiPagesState.wikiPages[parentPath];

        if (this._canUseWikiPage(parentPage) || parentPath === RepoConstants.RootPath) {
            // Scenario where the user can create page for the given non-existing page path.
            const errorMessage: string = Utils_String.format(WikiResources.ErrorMessage_PageNotFound, pagePath);
            const secondaryErrorMessage: string = getParentPagePath(pagePath) === RepoConstants.RootPath
                ? Utils_String.format(WikiResources.InfoErrorPageCreationAtRootMessage, getPageNameFromPath(pagePath))
                : Utils_String.format(WikiResources.InfoErrorPageCreationAtPathMessage,
                    getPageNameFromPath(pagePath),
                    getParentPagePath(pagePath));

            const errorProps: ErrorProps = {
                errorMessage: errorMessage,
                secondaryErrorMessage: secondaryErrorMessage,
                actionButtonText: WikiResources.CreatPageText,
                actionCallbackHandler: this._onCreatePageActionCallback,
                actionCallbackData: pagePath,
                disableActionButton: this._getAggregateState().sharedState.commonState.wiki.type === WikiType.CodeWiki,
            };
            return errorProps;
        } else {
            // Scenario where the user cannot create page for the given non-existing page path.
            const errorProps: ErrorProps = {
                errorMessage: Utils_String.format(WikiResources.ErrorMessage_PageNotFound_ParentNonExistant, pagePath),
                actionButtonText: WikiResources.GotoWikiHome,
                actionCallbackHandler: this._onGotoHomePageActionCallback,
                actionCallbackData: pagePath,
                disableActionButton: false,
            };
            return errorProps;
        }
    }

    public _onAddPageContentActionCallback = (errorProps: ErrorProps): void => {
        this.addPage(errorProps.actionCallbackData, false, true);
        this._telemetrySpy.publishAddPageContent();
    }

    public _onCreatePageActionCallback = (errorProps: ErrorProps): void => {
        this._telemetrySpy.publishPageCreatedAtBrokenLink();

        const newPage = errorProps.actionCallbackData;
        if (WikiFeatures.isImmersiveWikiEnabled()) {
            this.promptTemplatePickerDialog({
                pagePath: newPage,
                addPageWithTitle: true,
            });
        } else {
            this.addPage(newPage, false, true);
        }
    }

    public _onGotoHomePageActionCallback = (errorProps: ErrorProps): void => {
        this.changePath(RepoConstants.RootPath);
    }

    private _addPageAction = (
        pagePath?: string,
        replaceHistoryPoint?: boolean,
        addPageWithTitle?: boolean,
        templateName?: string,
        isLandingPage?: boolean,
    ): void => {
        if (!isLandingPage) {
            // There is no content to be fetched in 'Add' page case. So, `isLoading` = false.
            this._actionsHub.pageReset.invoke(false);
            this._actionsHub.templateContentReset.invoke({});
        }

        if (!pagePath) {
            const currentPagePath = this._getAggregateState().sharedState.urlState.pagePath;
            pagePath = getParentPagePath(currentPagePath);
        }

        if ((!addPageWithTitle) && pagePath.charAt(pagePath.length - 1) !== SharedSearchConstants.RepoConstants.PathSeparator) {
            pagePath += SharedSearchConstants.RepoConstants.PathSeparator;
        }

        const addNewPage = (): void => {
            this._sharedActionCreator.updateUrl(
                {
                    action: WikiActionIds.Edit,
                    pagePath: pagePath,
                    anchor: null,
                    isSubPage: true,
                    template: templateName,
                },
                replaceHistoryPoint,
            );
        };

        const parentPagePath: string = getNewPageParentPath(pagePath);
        if (parentPagePath !== RepoConstants.RootPath) {

            const wikiPage: WikiPage = this._getWikiPageFromStore(parentPagePath);

            if (!this._canUseWikiPage(wikiPage)) {
                // Parent page is not usable yet, so fetch it and then add a page under it
                this._fetchPageAndSubPages(parentPagePath, addNewPage);
                return;
            }
        }

        // If we have reached here, the parent is usable so we can add the new page
        addNewPage();
    }

    private _changePathAction = (pagePath: string, isLandingPage?: boolean): void => {
        let replaceHistoryPoint: boolean = false;
        const canNavigateToPage = this._canNavigateToOrRenderPath(pagePath);

        if (!canNavigateToPage) {
            const defaultPageToNavigateTo = this._getDefaultPageToNavigateTo();

            // Since we are navigating from given path to another path, we will have to replaceHistory point and not add history point
            replaceHistoryPoint = true;

            if (defaultPageToNavigateTo && defaultPageToNavigateTo.path) {
                // If we cannot operate on the given page path, navigate to the deafult page
                pagePath = defaultPageToNavigateTo.path;
            } else {
                // No valid page to land on. Handle this scenario depending on the wiki type.
                this._handleNoValidPagesToLandError();

                return;
            }
        }

        const urlState = this._getAggregateState().sharedState.urlState;
        const currentPagePath = urlState.pagePath;
        const currentAction = urlState.action;
        if (pagePath === currentPagePath && currentAction === WikiActionIds.View) {
            // Do not update if new path is already the current path
            return;
        }

        getScenarioManager().resetPageLoadScenario();

        const invokeActions = () => {
            // This will be called once the page for the path to be moved to is available.
            if (!isLandingPage) {
                // For landing page, the content is pre-fetched. So, we need not fire a reset.
                // Also, for a landing page, there is no previous stale content that requires a reset.
                this._actionsHub.pageReset.invoke(true);
            }
            this._actionsHub.pageChanged.invoke({
                pagePath: pagePath,
                pageInfo: {
                    wikiPage: this._getAggregateState().wikiPagesState.wikiPages[pagePath],
                },
            });

            this._sharedActionCreator.updateUrl(
                {
                    action: WikiActionIds.View,
                    pagePath: pagePath,
                    anchor: null,
                    isSubPage: false,
                    template: null,
                },
                replaceHistoryPoint || isLandingPage,
            );
        };

        // Find the page in the path below which we do not have pages loaded in the store
        let pathToFetch: string = null;
        const individualPaths: string[] = getParentPaths(pagePath).reverse().concat(pagePath);
        individualPaths.every((individualPath: string) => {
            const page = this._getAggregateState().wikiPagesState.wikiPages[individualPath];

            if (this._canUseWikiPage(page)) {
                return true;
            }

            pathToFetch = individualPath;
            return false;
        });


        if (pathToFetch) {
            // Fetch all the pages under pathToFetch
            this.wikiPagesSource.getPageAndDescendants(pathToFetch).then(
                (wikiPages: WikiPage[]) => {
                    // If pages are available, load them and then invoke actions
                    this._handlePagesRetrieval(pathToFetch, wikiPages);

                    invokeActions();
                },
                (error: Error) => {
                    // If pages are not avialable, they are for non-existing pages. We invoke actions for that also.
                    invokeActions();
                });
        } else {
            invokeActions();
        }
    }

    private _expandTreeItemAction = (pagePath: string) => {
        const wikiPage = this._getOrFetchWikiPage(pagePath);

        if (this._canUseWikiPage(wikiPage)) {
            this._actionsHub.treeItemExpanded.invoke({
                pagePath: pagePath,
                pageInfo: {
                    wikiPage: wikiPage
                },
                allRetrievedPages: wikiPage.isParentPage ? wikiPage.subPages : [wikiPage],
            });
        } else {
            this._actionsHub.treeItemExpanding.invoke(pagePath);
        }
    }

    private _editPageAction = (
        pagePath?: string,
        originPagePath?: string,
        replaceHistoryPoint?: boolean,
        isLandingPage?: boolean): void => {
        const currentPagePath: string = originPagePath || this._getAggregateState().sharedState.urlState.pagePath;
        let { content, version } = this._getAggregateState().pageContentState;

        const isPageResetRequired = (!isLandingPage && pagePath !== currentPagePath);
        const isMentionProcessingRequired = WikiFeatures.isPeopleMentionFeatureEnabled();
        if (isPageResetRequired || isMentionProcessingRequired) {
            // Page content needs to be fetched in 'Edit' page case. So, `isLoading` = true.
            this._actionsHub.pageReset.invoke(true);
        }

        const finalPath: string = pagePath ? pagePath : currentPagePath;
        this._actionsHub.pageChanged.invoke({
            pagePath: finalPath,
            pageInfo: {
                wikiPage: this._getAggregateState().wikiPagesState.wikiPages[finalPath],
            },
        });

        this._sharedActionCreator.updateUrl({
            action: WikiActionIds.Edit,
            pagePath: finalPath,
            isSubPage: false,
            template: null,
        },
            replaceHistoryPoint);

        // in case of mention, we reset the page if content is avaialble
        if (isMentionProcessingRequired && !isPageResetRequired) {

            this._invokePageContentLoaded(currentPagePath, content, version);
        }
    }

    private _viewHistoryAction = (path: string): void => {
        this._actionsHub.pageDirtyFlagReset.invoke(undefined);
        this._sharedActionCreator.updateUrl({
            action: WikiActionIds.History,
            pagePath: path,
            anchor: null,
            isSubPage: false,
            template: null,
        });
    }

    private _deletePageAction = (pagePath: string): void => {
        this._actionsHub.deletePageStarted.invoke(undefined);
        this._sources.wikiPagesSource.deletePage(pagePath).then(
            (pageResponse: WikiPageResponse) => {
                this._actionsHub.pageDeleted.invoke({
                    pagePath: pagePath,
                    isParentPage: this._isParentPage(pagePath),
                    pageWasOnlySubPageToOldParent: this._getSubPagesCount(getParentPagePath(pagePath)) === 1
                });

                this._actionsHub.deletePageCompleted.invoke(undefined);
                this.changePath(this._getParentPageOrHomePagePath(pagePath));
            },
            (error: Error) => {
                this._actionsHub.deletePageCompleted.invoke(undefined);
                this._sharedActionCreator.showErrorIfNecessary(error);
            }
        );
    }

    private _setAsHomePageAction = (pagePath: string, closeOnComplete?: boolean): void => {
        this._actionsHub.setAsHomePageStarted.invoke(undefined);

        const levelOnePagePath = convertToLevelOnePagePath(pagePath);
        const wikiPage = this._getAggregateState().wikiPagesState.wikiPages[pagePath];
        const order = wikiPage ? wikiPage.order : 0;

        this._sources.wikiPagesSource.setAsHomePage(
            pagePath,
        ).then(
            (pageMoveResponse: WikiPageMoveResponse) => {
                const page: WikiPage = this._getAggregateState().wikiPagesState.wikiPages[pagePath];
                this._actionsHub.pageRenamed.invoke({
                    originalPagePath: pagePath,
                    newPagePath: levelOnePagePath,
                    originalOrder: page.order,
                    newOrder: 0,
                    isParentPage: page.isParentPage,
                    pageIsOnlySubPageToNewParent: false,
                    pageWasOnlySubPageToOldParent: this._getSubPagesCount(getParentPagePath(pagePath)) === 1
                });

                this._actionsHub.setAsHomePageCompleted.invoke(closeOnComplete);
                this.changePath(levelOnePagePath);
            },
            (error: Error) => {
                this._actionsHub.setAsHomePageFailed.invoke(null);
                this._sharedActionCreator.showErrorIfNecessary(error);
            }
        );
    }

    private _renderPageContent(pagePath: string, isEditMode?: boolean) {
        const prefetchedPagePath: string = this._getAggregateState().pageContentState.path;

        if (prefetchedPagePath === pagePath) {
            // Content already exists, no need to fetch again.
            return;
        }

        this.wikiPagesSource.getVersionedPageContent(pagePath).then(
            (versionedPageContent: VersionedPageContent) => {
                if (!versionedPageContent.content) {
                    const pageFromStore = this._getAggregateState().wikiPagesState.wikiPages[pagePath];

                    if (isPageWithoutAssociatedContent(pageFromStore)) {
                        this._handlePageWithoutAssociatedContent(pagePath);

                        return;
                    }
                }
                this._invokePageContentLoaded(pagePath, versionedPageContent.content ? versionedPageContent.content : "", versionedPageContent.version);
            },
            (error: Error) => this._handlePageContentError(pagePath, error),
        );
    }

    private _handlePageContentError(pagePath: string, error: Error): void {

        this._actionsHub.pageLoadEnded.invoke(void 0);

        // If page has been removed, let the store know
        if ((error.name === WikiErrorNames.gitItemNotFoundException) ||
            (error.name === WikiErrorNames.wikiPageNotFoundException)) {
            this._actionsHub.pageDeleted.invoke({
                pagePath: pagePath,
                isParentPage: this._isParentPage(pagePath),
                pageWasOnlySubPageToOldParent: this._getSubPagesCount(getParentPagePath(pagePath)) === 1
            });
        }

        this._sharedActionCreator.showErrorIfNecessary(error, this._getPageErrorProp(error, pagePath));
        VSS_Error.publishErrorToTelemetry(error, false, VSS_ClientTrace_Contract.Level.Error, {
            "Source": "handlePageContentError"
        });
    }

    private _makePageAsSibling(sourcePage: WikiPage, siblingPage: WikiPage, isReorderAbove?: boolean): void {
        sourcePage.order = sourcePage.order || 0;
        siblingPage.order = siblingPage.order || 0;
        const originalOrder = sourcePage.order || 0;
        let newOrder = 0;

        if (isReorderAbove) {
            newOrder = sourcePage.order > siblingPage.order ? siblingPage.order : siblingPage.order - 1;
        } else {
            newOrder = sourcePage.order > siblingPage.order ? siblingPage.order + 1 : siblingPage.order;
        }

        if (newOrder === originalOrder) {
            return;
        }

        this._actionsHub.pageReorderStarted.invoke(undefined);
        Utils_Accessibility.announce(Utils_String.format(WikiResources.PageReorderStartedMessage, sourcePage.path));

        const pagePath = sourcePage.path;

        this._sources.wikiPagesSource.reorderPage(
            pagePath,
            newOrder,
            originalOrder,
        ).then(
            (pageMoveResponse: WikiPageMoveResponse) => {
                Utils_Accessibility.announce(Utils_String.format(WikiResources.PageReorderSucceededMessage, sourcePage.path));
                this._actionsHub.pageReordered.invoke({
                    pagePath: sourcePage.path,
                    originalOrder: originalOrder,
                    newOrder: newOrder,
                    isParentPage: this._isParentPage(sourcePage.path)
                });

                this.changePath(sourcePage.path);
            },
            (error: Error) => {
                Utils_Accessibility.announce(Utils_String.format(WikiResources.PageReorderFailedMessage, sourcePage.path));
                this._sharedActionCreator.showErrorIfNecessary(error);
            },
        );
    }

    private _getOrFetchWikiPage(pagePath: string): WikiPage {
        /*
            Check if the page from store is available and usable
            1. If page and its subpages are available, use it
            2. If not available, fetch the page and its subpages
        */
        const wikiPage = this._getWikiPageFromStore(pagePath);

        if (this._canUseWikiPage(wikiPage)) {
            this._handlePagesRetrieval(pagePath, flattenWikiPage(wikiPage));
        } else {
            this._fetchPageAndSubPages(pagePath);
        }

        return wikiPage;
    }

    private _fetchPageAndSubPages(pagePath: string, onSuccess?: () => void): void {
        // Make async call to fetch the file from server, and invoke PageRetrieved or PageRetrievalFailed actions
        this.wikiPagesSource.getPageAndSubPages(pagePath).then(
            (pages: WikiPage[]) => {
                this._handlePagesRetrieval(pagePath, pages);

                // Execute the onSuccess callback if provided
                if (onSuccess) {
                    onSuccess();
                }
            },
            (error: Error) => this._actionsHub.pageRetrievalFailed.invoke({
                pagePath: pagePath,
                error: error,
            }));
    }

    private _handlePagesRetrieval(currentPagePath: string, pages: WikiPage[]): void {
        const currentPage = this._findItem(currentPagePath, pages);
        this._actionsHub.pageRetrievalSucceeded.invoke({
            pagePath: currentPagePath,
            pageInfo: {
                wikiPage: currentPage
            },
            allRetrievedPages: pages,
        });
    }

    private _findItem(path: string, allPages: WikiPage[]): WikiPage {
        let currentPage: WikiPage = null;

        if (allPages && allPages.length > 0) {
            for (let page of allPages) {
                if (page && Utils_String.ignoreCaseComparer(page.path, path) === 0) {
                    return page;
                } else if (page && page.subPages && page.subPages.length > 0) {
                    currentPage = page.subPages.filter((subPage: WikiPage) =>
                        subPage && Utils_String.ignoreCaseComparer(subPage.path, path) === 0)[0];
                }

                if (currentPage) {
                    return currentPage;
                }
            }
        }

        // Unlikely. If this happens tree will not autoselect current page
        return undefined;
    }

    private _wikiPagesStoreHasPages(): boolean {
        return Object.keys(this._getAggregateState().wikiPagesState.wikiPages).length > 0;
    }

    private _isParentPage(pagePath: string): boolean {
        if (pagePath === RepoConstants.RootPath) {
            return true;
        }

        const wikiPage: WikiPage = this._getAggregateState().wikiPagesState.wikiPages[pagePath];
        return wikiPage
            ? wikiPage.isParentPage
            : false;
    }

    private _getParentPageOrHomePagePath(pagePath: string): string {
        const parentPage = getParentPagePath(pagePath);

        return parentPage !== RepoConstants.RootPath
            ? parentPage
            : this._getHomePagePath();
    }

    private _getHomePagePath(): string {
        const homePage = this._getAggregateState().wikiPagesState.homePage;

        return homePage
            ? homePage.path
            : null;
    }

    private _getWikiPageFromStore(pagePath: string): WikiPage {
        return this._getAggregateState().wikiPagesState.wikiPages[pagePath];
    }

    private _getSubPagesCount(pagePath: string): number {
        const parentPage = this._getAggregateState().wikiPagesState.wikiPages[pagePath];

        return parentPage && parentPage.subPages
            ? parentPage.subPages.length
            : 0;
    }

    private _canUseWikiPage(wikiPage: WikiPage): boolean {
        return wikiPage && !!(wikiPage.isParentPage
            ? (wikiPage.subPages && wikiPage.subPages.length > 0)
            : true);
    }

    private _invokeTreeItemExpanded(path: string): void {
        const page = this._getAggregateState().wikiPagesState.wikiPages[path];

        if (path === RepoConstants.RootPath || (page && page.isParentPage)) {
            this._actionsHub.treeItemExpanded.invoke({
                pagePath: path,
                allRetrievedPages: page.subPages
            });
        }
    }

    /**
     * Gets the first page from the root level which is conformant. If no page from root level is conformant, returns null.
     */
    private _getDefaultPageToNavigateTo(): WikiPage {
        const homePage: WikiPage = this._getAggregateState().wikiPagesState.homePage;

        if (homePage) {
            return homePage;
        }

        let defaultPage: WikiPage = null;
        const tempPage: WikiPage = this._getAggregateState().wikiPagesState.tempPage;
        const rootPage = this._getAggregateState().wikiPagesState.wikiPages[RepoConstants.RootPath];
        const rootLevelPages = rootPage && rootPage.subPages;

        for (const page of rootLevelPages) {
            if (page.isNonConformant) {
                continue;
            }

            if (tempPage && tempPage.path === page.path) {
                continue;
            }

            if (!defaultPage || page.order < defaultPage.order) {
                defaultPage = page;
            }
        }

        return defaultPage;
    }

    private _canNavigateToOrRenderPath(pagePath: string): boolean {
        const page: WikiPage = this._getAggregateState().wikiPagesState.wikiPages[pagePath];
        const isPathNonRoot: boolean = (pagePath !== RepoConstants.RootPath);
        const isPageNotLoaded: boolean = !page;
        const isPageLoadedAndConformant: boolean = this._isPageConformant(page);

        /**
         * To render or navigate to the page,
         * 1. The path exists and should be non-root since there is no content to be navigated to or rendered
         * 2. Either page is not loaded yet, or if the page is loaded and conformant
         */
        return pagePath && isPathNonRoot && (isPageNotLoaded || isPageLoadedAndConformant);
    }

    /**
     * Returns true if the provided page exists and is conformant, else returns false
     * @param page - the wiki page to be checked
     */
    private _isPageConformant(page: WikiPage): boolean {
        return page && !page.isNonConformant;
    }

    /**
     * Returns the next sibling above or below the given wiki page. If no sibling in the required direction is present, returns null.
     * @param sourcePage - page for which the sibling is to be found
     * @param above - if false, the below sibling is retrieved. If true, the above sibling is retrieved, which is the default.
     */
    private _getNextSibling(sourcePage: WikiPage, above: boolean = true): WikiPage {
        const parentPagePath: string = getParentPagePath(sourcePage.path);
        const wikiPageState = this._getAggregateState().wikiPagesState;
        let subPages: IDictionaryStringTo<WikiPage> | WikiPage[];

        const parentPage: WikiPage = wikiPageState.wikiPages[parentPagePath];

        subPages = parentPage && parentPage.subPages ? parentPage.subPages : [];

        let nextSibling: WikiPage = null;
        let orderDifference: number = Number.MAX_VALUE;
        const sourcePageOrder: number = sourcePage.order;
        for (const key in subPages) {
            const page: WikiPage = subPages[key];
            const pageOrder: number = page.order || 0;
            let currentOrderDifference: number = null;

            if (above) {
                if (pageOrder >= sourcePageOrder) {
                    continue;
                }
                currentOrderDifference = sourcePageOrder - pageOrder;
            } else {
                if (pageOrder <= sourcePageOrder) {
                    continue;
                }
                currentOrderDifference = Math.abs(sourcePageOrder - pageOrder);
            }

            if (currentOrderDifference < orderDifference) {
                nextSibling = page;
                orderDifference = currentOrderDifference;
            }
        }

        return nextSibling;
    }

    private _handlePageWithoutAssociatedContent(pagePath: string): void {
        const commonState = this._getAggregateState().sharedState.commonState;
        // This is a parent page without a corresponding MD file.
        if (commonState.wiki && commonState.wiki.type === WikiType.CodeWiki) {
            // In CodeWiki we will treat it like a folder.
            const secondaryErrorMessage = getFormattedErrorMessage(
                WikiResources.SecondaryErrorMessage_PathIsAFolder,
                [
                    getLearnMoreLink(WikiResources.LearnMoreLink_ProductDocumentationBlog, "pageWithoutAssociatedContentLearnMoreLey"),
                    getPageNameFromPath(pagePath),
                ]
            );
            const errorProps: ErrorProps = {
                errorMessage: Utils_String.format(WikiResources.ErrorMessage_PathIsAFolder, getPageNameFromPath(pagePath)),
                secondaryErrorMessage: secondaryErrorMessage,
                errorIconPath: "Wiki/code-wiki-folder.svg",
            };

            const error = new Error();
            error.name = WikiErrorNames.parentPageContentUnavailableException;
            this._sharedActionCreator.showErrorIfNecessary(error, errorProps);
        } else {
            // In ProjectWiki we will treat it like a parent page without content.
            const errorProps: ErrorProps = {
                errorMessage: Utils_String.format(WikiResources.ErrorMessage_PageContentUnavailable),
                actionButtonText: WikiResources.AddPageContent,
                actionCallbackHandler: this._onAddPageContentActionCallback,
                actionCallbackData: pagePath,
                disableActionButton: this._getAggregateState().sharedState.commonState.wiki.type === WikiType.CodeWiki,
            };

            const error = new Error();
            error.name = WikiErrorNames.parentPageContentUnavailableException;
            this._sharedActionCreator.showErrorIfNecessary(error, errorProps);
        }
    }

    private _handleZeroPagesInCodeWiki(): void {
        const commonState = this._getAggregateState().sharedState.commonState;

        const errorProps: ErrorProps = {
            errorMessage: WikiResources.ErrorMessage_ZeroPagesInWiki,
            secondaryErrorMessage: WikiResources.SecondaryErrorMessage_ZeroPagesInWiki,
            actionButtonText: WikiResources.GoToCodeButtonText,
            actionCallbackHandler: () => this._redirectToCode(),
            actionCallbackData: null,
            disableActionButton: false,
        };

        const error = new Error();
        error.name = WikiErrorNames.zeroPagesInWiki;
        this._sharedActionCreator.showErrorIfNecessary(error, errorProps);
    }

    private _handleNoValidPagesToLandError(): void {
        const commonState = this._getAggregateState().sharedState.commonState;

        if (commonState.wiki && commonState.wiki.type === WikiType.CodeWiki) {
            const secondaryMessage = getFormattedErrorMessage(
                WikiResources.SecondaryErrorMessage_NoValidPagesInWiki,
                [getLearnMoreLink(WikiResources.LearnMoreLink_NoValidPages, "noValidPagesLearnMoreLey")]
            );
            const errorProps: ErrorProps = {
                errorMessage: WikiResources.ErrorMessage_NoValidPagesInWiki,
                secondaryErrorMessage: secondaryMessage,
                actionButtonText: WikiResources.GoToCodeButtonText,
                actionCallbackHandler: () => this._redirectToCode(),
                actionCallbackData: null,
                disableActionButton: false,
            };

            const error = new Error();
            error.name = WikiErrorNames.noValidPagesToLand;
            this._sharedActionCreator.showErrorIfNecessary(error, errorProps);
        } else {
            // No valid page to land on, prompt the user to create a page at the root level
            this.addPage(RepoConstants.RootPath, true);
        }
    }

    private _redirectToCode(pagePath?: string, action?: string): void {
        const commonState = this._getAggregateState().sharedState.commonState;
        const path: string = getGitItemPathForPage(pagePath, commonState.wiki.mappedPath);
        const version: string = versionDescriptorToString(commonState.wikiVersion);
        const explorerUrl: string = getExplorerUrl(commonState.repositoryContext, null, null, null, {
            path: path,
            _a: action,
            version: version,
        });

        redirectToUrl(explorerUrl, true, CodeHubContributionIds.gitFilesHub);
    }

    private _invokePageContentLoaded(path: string, content: string, version: string): void {
        if (WikiFeatures.isPeopleMentionFeatureEnabled() && this._getAggregateState().sharedState.urlState.action === WikiActionIds.Edit) {
            MentionProcessor.getDefault().translateStorageKeysToDisplayNamesOfPersonMentions(content).then(
                (translatedContent: string) => {
                    this._actionsHub.pageContentLoaded.invoke({
                        path,
                        content: translatedContent,
                        version,
                    });
                });
        }
        else {
            this._actionsHub.pageContentLoaded.invoke({
                path,
                content,
                version,
            });
        }
    }
}
