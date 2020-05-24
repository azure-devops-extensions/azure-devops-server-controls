import * as React from "react";

import { DefaultButton, IconButton, PrimaryButton } from "OfficeFabric/Button";
import { Callout } from "OfficeFabric/Callout";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";
import { Async, autobind, css } from "OfficeFabric/Utilities";
import * as Events_Document from "VSS/Events/Document";
import * as Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";

import * as SharedSearchConstants from "SearchUI/Constants";
import { GitVersionDescriptor, GitVersionOptions, GitVersionType } from "TFS/VersionControl/Contracts";
import { WikiPage, WikiType } from "TFS/Wiki/Contracts";
import { combinePaths } from "VersionControl/Scripts/VersionControlPath";
import { PreviewMode, RepoConstants } from "Wiki/Scripts/CommonConstants";
import { OperationStatus } from "Wiki/Scripts/CommonInterfaces";
import { PerformanceConstants, SaveOptionType, SavePageOperationType } from "Wiki/Scripts/CustomerIntelligenceConstants";
import {
    bowtieIcon,
    getEncodedAttachmentName,
    getNewPageParentPath,
    getPageNameFromPath,
    getParentPagePath,
    validatePagePathAndTitle,
} from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";
import { ShortcutCode, ShortcutListener, WikiEditModeShortcutGroup } from "Wiki/Scripts/WikiKeyboardShortcuts";
import { isTemplate } from "Wiki/Scripts/WikiPagesHelper";

import { Header } from "Wiki/Scenarios/Shared/Components/Header";
import { Attachment } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { SharedState } from "Wiki/Scenarios/Shared/Stores/SharedStoresHub";

import { NavigateAwayDialog, SavePageDialog } from "Wiki/Scenarios/Overview/Components/EditPageDialogs";
import { MarkdownEditor } from "Wiki/Scenarios/Overview/Components/MarkdownEditor";
import { ContainerProps } from "Wiki/Scenarios/Overview/Components/OverviewContainer";
import { WikiPagesState } from "Wiki/Scenarios/Overview/Stores/WikiPagesStore";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/EditPageContainer";

export interface EditPageState {
    initialPageTitle: string;
    initialPageContent: string;
    initialPagePath: string;
    pageTitleError: string;
    isPageContentLoading: boolean;
    isTemplateContentLoading: boolean,
    isSavePageDialogVisible: boolean;
    savePageStatus: OperationStatus;
    isSaveEnabled: boolean;
    errorMessage: string;
    isNavigateAwayDialogVisible: boolean;
    onNavigateAwayConfirmAction(): void;
    isCancelButtonClicked: boolean;
    previewMode: PreviewMode;
    saveInProgress: boolean;
    showToast: boolean;
    showSavePageCallout: boolean;
}

export class EditPageContainer extends React.Component<ContainerProps, EditPageState> implements ShortcutListener {
    private _async: Async;
    private _documentsEntryForDirtyCheck: Events_Document.RunningDocumentsTableEntry;
    private _header: Header;
    private _editor: MarkdownEditor;  // If we move the text area in MarkdownEditor to fabric, we can get id of the ref
    private _editPreviewButton = "edit-and-preview-button";
    private _saveCalloutTextFieldRef: TextField;
    private _toastTimeoutHandler: number = null;
    private _saveButtonClassName = "save-button-default-commit";
    private _saveChevronClassName = "save-button-new-commit";
    private _unsavedNewPage: boolean = false;
    private _renderedPagePath: string = null;
    private _isFirstContentRendered = false;
    private _saveOptionType: SaveOptionType;
    private _pageTitleCallback = () => this.state.initialPageTitle;
    private _wikiShortcut: WikiEditModeShortcutGroup;
    private _saveAndClose: boolean;
    private _handleBrokenLinksFeatureEnabled: boolean;
    private _commentForRenamePageDialog: string = null;
    private _editPageContainerRef: Element;

    constructor(props: ContainerProps) {
        super(props);

        this._async = new Async();
        this._wikiShortcut = new WikiEditModeShortcutGroup();
        this._handleBrokenLinksFeatureEnabled = WikiFeatures.isHandleBrokenLinksEnabled();
        const urlState = props.storesHub.state.sharedState.urlState;
        this.state = {
            initialPageContent: "",
            initialPageTitle: this._initialTitle,
            initialPagePath: urlState.pagePath,
            pageTitleError: "",
            isPageContentLoading: !this._isNew,
            isTemplateContentLoading: this._isNew && Boolean(urlState.template),
            isSavePageDialogVisible: false,
            savePageStatus: OperationStatus.NotStarted,
            isSaveEnabled: this._isNewPageWithPresetTitle(),
            errorMessage: null,
            isNavigateAwayDialogVisible: false,
            onNavigateAwayConfirmAction: undefined,
            isCancelButtonClicked: false,
            previewMode: PreviewMode.Live,
            saveInProgress: false,
            showToast: false,
            showSavePageCallout: false,
        };

        this._unsavedNewPage = this._isNew;
    }

    public componentDidMount(): void {
        this.props.storesHub.pageContentStore.addChangedListener(this._onInitialPageContentLoaded);
        this.props.storesHub.pageDialogsStore.addChangedListener(this._onPageDialogStateChanged);
        this.props.storesHub.navigateAwayDialogStore.addChangedListener(this._onNavigateAwayDialogStoreChanged);
        this.props.storesHub.templateContentStore.addChangedListener(this._onTemplateContentLoaded);

        this._wikiShortcut.registerWikiShortcuts(this.onShortcutPressed, this._editPageContainerRef);
        const sharedState = this.props.storesHub.state.sharedState;
        let pagePath = sharedState.urlState.pagePath;

        if (!getPageNameFromPath(pagePath)) {
            pagePath = RepoConstants.RootPath;
        }

        this._documentsEntryForDirtyCheck = Events_Document.getRunningDocumentsTable().add("Wiki.EditPageContainer", this);

        this._renderIfPagesHaveLoaded(pagePath);
        this._onEditPageRenderComplete();

        if (this._isNewPageWithPresetTitle() && this._editor) {
            this._editor.setFocusOnEditor();
        }
    }

    public componentWillReceiveProps(): void {
        const sharedState = this.props.storesHub.state.sharedState;
        let currentPagePath = sharedState.urlState.pagePath;

        if (this.state.initialPagePath !== currentPagePath) {
            // Not setting the entire state again. Setting only the ones which need not be persisted across pages.
            this.setState({
                initialPageTitle: this._initialTitle,
                initialPagePath: currentPagePath,
                pageTitleError: "",
                isSavePageDialogVisible: false,
                savePageStatus: OperationStatus.NotStarted,
                isSaveEnabled: this._isNewPageWithPresetTitle(),
                errorMessage: null,
                isNavigateAwayDialogVisible: false,
                onNavigateAwayConfirmAction: undefined,
                isCancelButtonClicked: false,
                previewMode: PreviewMode.Live,
                saveInProgress: false,
                showToast: false,
                showSavePageCallout: false,
            });
        }
    }

    public componentWillUnmount(): void {
        if (this._documentsEntryForDirtyCheck) {
            Events_Document.getRunningDocumentsTable().remove(this._documentsEntryForDirtyCheck);
            this._documentsEntryForDirtyCheck = null;
        }
        this._wikiShortcut.dispose();
        if (!this.props.storesHub) {
            return;
        }

        if (this.props.storesHub.pageDialogsStore) {
            this.props.storesHub.pageDialogsStore.removeChangedListener(this._onPageDialogStateChanged);
        }

        if (this.props.storesHub.pageContentStore) {
            this.props.storesHub.pageContentStore.removeChangedListener(this._onInitialPageContentLoaded);
        }

        if (this.props.storesHub.templateContentStore) {
            this.props.storesHub.templateContentStore.removeChangedListener(this._onTemplateContentLoaded);
        }

        if (this.props.storesHub.navigateAwayDialogStore) {
            this.props.storesHub.navigateAwayDialogStore.removeChangedListener(this._onNavigateAwayDialogStoreChanged);
        }

        this._async.dispose();
    }

    public componentDidUpdate(): void {
        if (!this._isFirstContentRendered) {
            this._onEditPageRenderComplete();
        }

        let pagePath: string = this.props.storesHub.state.sharedState.urlState.pagePath;

        if (!getPageNameFromPath(pagePath)) {
            pagePath = RepoConstants.RootPath;
        }

        // RenderPage if pagePath in url is not the one already rendered and if the pages have loaded
        if (pagePath !== this._renderedPagePath) {
            this._renderIfPagesHaveLoaded(pagePath);
        }

        if (this.state.showSavePageCallout && this._saveCalloutTextFieldRef) {
            this._saveCalloutTextFieldRef.focus();
        }

        if (this.state.showToast && this._toastTimeoutHandler === null) {
            this._toastTimeoutHandler = this._async.setTimeout(this.dismissCallout, 3000);
        }
        this._toastTimeoutHandler = null;
    }

    public render(): JSX.Element {
        const sharedState: SharedState = this.props.storesHub.state.sharedState;
        const urlState: UrlParameters = sharedState.urlState;
        const parentPath: string = urlState.isSubPage ? urlState.pagePath : getParentPagePath(urlState.pagePath);

        return (
            <div className={"edit-page-container"}
                ref={(element: Element) => {
                    this._editPageContainerRef = element;
                }}
                onDragOver={this._onEditPageDragDrop}
                onDrop={this._onEditPageDragDrop}>
                {
                    !this._hasSavePermissions() &&
                    <MessageBar
                        className={"edit-page-error-bar"}
                        messageBarType={MessageBarType.error}>
                        {WikiResources.EditWiki_InsufficientPermissions}
                    </MessageBar>
                }
                <div className={css("save-in-progress", { visible: this.state.saveInProgress })} />
                <div className={"header-container"}>
                    <Header
                        title={this.state.initialPageTitle}
                        errorMessage={this.state.pageTitleError}
                        onChanged={this._onTitleChanged}
                        parentPath={parentPath}
                        onNotifyTitleValidationResult={this._onNotifyTitleValidationResult}
                        commandBarProps={{
                            items: [], // Favorite button will go here
                            farItems: this._getfarItems(),
                        }}
                        editableTitle={!this._isTitleDisabled()}
                        setFocusOnTitle={this._isNew || !this._unsavedNewPage}
                        key={this.state.initialPageTitle}
                        ref={this._refHeader}
                    />
                </div>
                <MarkdownEditor
                    actionCreator={this.props.actionCreator}
                    storesHub={this.props.storesHub}
                    initialContent={this.state.initialPageContent}
                    isPageContentLoading={this.state.isPageContentLoading || this.state.isTemplateContentLoading}
                    onChange={this._onPageContentChange}
                    ref={this._saveEditorRef}
                    previewMode={this.state.previewMode}
                />
                <SavePageDialog
                    errorMessage={this.state.errorMessage}
                    isOpen={this.state.isSavePageDialogVisible}
                    warningMessage={WikiResources.SavePageDialog_RenameInfoMessage}
                    pageTitle={this._pageTitleCallback}
                    onSave={this._onRenameDialogSaveClick}
                    onDismiss={this._dismissSaveDialog}
                    isRename={this._isRename()}
                    oldPagePath={combinePaths(parentPath, this.state.initialPageTitle)}
                    newPagePath={combinePaths(parentPath, this.currentTitle)}
                    repositoryContext={sharedState.commonState.repositoryContext}
                    wiki={sharedState.commonState.wiki}
                    savePageStatus={this.state.savePageStatus}
                />
                <NavigateAwayDialog
                    isOpen={this.state.isNavigateAwayDialogVisible}
                    ctaText={this.state.isSaveEnabled ? WikiResources.SaveButtonText : WikiResources.ContinueEditButtonText}
                    onCtaClick={this.state.isSaveEnabled ? this._onNavigateAwaySave : this._onNavigateAwayDialogDismiss}
                    isCtaActionInProgress={this.state.savePageStatus === OperationStatus.InProgress}
                    onDiscardChanges={this.state.onNavigateAwayConfirmAction}
                    onDismiss={this._onNavigateAwayDialogDismiss}
                    navigateAwayMessage={this.state.initialPageTitle
                        ? (this.state.isSaveEnabled
                            ? Utils_String.format(WikiResources.NavigateAwayDialog_NamedMessage, this.state.initialPageTitle)
                            : Utils_String.format(WikiResources.NavigateAwayDialog_NamedMessage_ContinueEdit, this.state.initialPageTitle))
                        : WikiResources.NavigateAwayDialog_DefaultMessage
                    }
                />
                {this.state.showToast &&
                    <Callout
                        role={"alertdialog"}
                        gapSpace={0}
                        target={`.${this._saveButtonClassName}`}
                        onDismiss={this._onDismissDefaultMsgCallout}
                        setInitialFocus={true}
                        className={"callout-save-default-commit-message"}
                        ariaLabel={this._calloutMessage}>
                        <IconButton
                            iconProps={bowtieIcon("bowtie-status-success-outline button-icon")}
                            className={"bowtie-success"}
                        />
                        <div className={"commit-title"}>
                            {this._calloutMessage}
                        </div>
                    </Callout>
                }
                {this.state.showSavePageCallout &&
                    <Callout
                        role={"alertdialog"}
                        gapSpace={0}
                        target={`.${this._saveChevronClassName}`}
                        onDismiss={this._onDismissNewMsgCallout}
                        setInitialFocus={true}
                        className={"callout-save-new-commit-message"}
                        ariaLabel={WikiResources.SaveCalloutHeader}
                    >
                        <div className="header">
                            {WikiResources.SaveCalloutHeader}
                        </div>
                        {this._isRename() && !this._handleBrokenLinksFeatureEnabled &&
                            <MessageBar
                                className={"wiki-message-bar"}
                                messageBarType={MessageBarType.warning}>
                                {WikiResources.SavePageDialog_RenameInfoMessage}
                            </MessageBar>
                        }
                        <div className="commit-title">
                            {WikiResources.SavePageMessageHeader}
                        </div>
                        <TextField
                            placeholder={this._autoComment}
                            componentRef={this._refSavePageCallout}
                            multiline rows={2}
                            className={"text-field"}
                        />
                        <div className="save-callout-bar">
                            <PrimaryButton
                                text={WikiResources.SaveButtonText}
                                onClick={this._onCalloutSave}
                                className={"save-button"}
                            />
                            <DefaultButton
                                text={WikiResources.CancelButtonText}
                                onClick={this._onDismissNewMsgCallout}
                            />
                        </div>
                    </Callout>
                }
            </div>);
    }

    @autobind
    public onShortcutPressed(shortcut: ShortcutCode): void {
        switch (shortcut) {
            case ShortcutCode.Save:
                return this._onSaveKeyShortcut();
            case ShortcutCode.SaveAndClose:
                return this._onSaveAndCloseKeyShortcut();
            case ShortcutCode.Esc:
                return this._onEscKeyShortcut();
        }
    }

    private get _calloutMessage(): string {
        return WikiResources.SavePageDefaultMessage + "\n '" + Utils_String.format(WikiResources.Updated, this.currentTitle);
    }

    @autobind
    private _onRenameDialogSaveClick(closeRenameDialogOnComplete: boolean): void {
        // Do not close the dialog if RenamePageDialog needs to stay open when save is completed.
        this._saveAndClose = this._saveAndClose && closeRenameDialogOnComplete;

        this._onSave(
            !this._handleBrokenLinksFeatureEnabled,
            this._commentForRenamePageDialog,
            false,
            true,
            closeRenameDialogOnComplete,
        );
    }

    @autobind
    private dismissCallout(): void {
        this.setState({
            showToast: false,
            isSaveEnabled: false,
        });
    }

    @autobind
    private _dismissSaveDialog(closePageAfterRename: boolean): void {
        this._commentForRenamePageDialog = null;
        this.setState({ saveInProgress: false });
        this.props.actionCreator.dismissSavePageDialog();

        if (closePageAfterRename) {
            // Closing the edit view now to avoid the conflict in case user further edits something (since the links to self are not in updated state yet, further editing might create conflict)
            this._closePage(true);
        }
    }

    private get _initialTitle(): string {
        const urlState = this.props.storesHub.state.sharedState.urlState;

        return getPageNameFromPath(urlState.pagePath);
    }

    @autobind
    private _onSaveKeyShortcut(): void {
        if (this.state.isSaveEnabled) {
            this._saveOptionType = SaveOptionType.QuickSaveByShortcut;
            this._savePageWithDefaultCommitMsg();
        }
    }

    @autobind
    private _onSaveAndCloseKeyShortcut(): void {
        if (this.state.isSaveEnabled) {
            this._saveOptionType = SaveOptionType.QuickSaveByShortcut;
            this._saveAndClose = true;
            this._savePageWithDefaultCommitMsg(true);
        } else {
            this._closePage(false);
        }
    }

    @autobind
    private _onEscKeyShortcut(): void {
        this._closePage(false);
    }

    private _onNavigateAwayDialogDismiss = (): void => {
        if (this.state.isCancelButtonClicked) {
            this.setState({ isCancelButtonClicked: false } as EditPageState);
        }
        this.props.actionCreator.dismissNavigateAwayDialog();
    }

    private _onEditPageDragDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        /* Prevent browser from loading file, when a file is dropped.
         * We override this behaviour as and when needed */
        if (BrowserCheckUtils.isIE() || BrowserCheckUtils.isSafari()) {
            event.dataTransfer.dropEffect = null;
            event.dataTransfer.effectAllowed = null;
        } else {
            event.dataTransfer.dropEffect = "none";
            event.dataTransfer.effectAllowed = "none";
        }

        event.preventDefault();
    }

    public isDirty(): boolean {
        return this.props.storesHub.getAggregateState().sharedState.commonState.isPageDirty;
    }

    private _renderIfPagesHaveLoaded(pagePath: string): void {
        const urlState = this.props.storesHub.state.sharedState.urlState;
        const hasTemplate: boolean = Boolean(urlState.template);
        if (this._isNew) {
            this._renderedPagePath = pagePath;

            if (hasTemplate) {
                this.props.actionCreator.loadWikiTemplate(urlState.template);
            } else {
                // There is no need make a render call for a new page. New page content is always empty.
                this.setState({
                    initialPageContent: "",
                    isPageContentLoading: false,
                    isTemplateContentLoading: false,
                });
            }
        } else {
            // Call renderPage only if the wiki pages are loaded
            const wikiPagesState: WikiPagesState = this.props.storesHub.state.wikiPagesState;
            if (wikiPagesState && wikiPagesState.wikiPages && Object.keys(wikiPagesState.wikiPages).length > 0) {
                this._renderedPagePath = pagePath;

                const pageContentStore = this.props.storesHub.pageContentStore;
                if (pageContentStore.state.path === pagePath) {
                    // Content already available in the page content store. Update local states from page content store.
                    this._onInitialPageContentLoaded();
                } else {
                    this.props.actionCreator.renderPage(pagePath, false, true);
                }
            }
        }
    }

    private get _initialPagePath(): string {
        const urlState = this.props.storesHub.state.sharedState.urlState;
        const lastIndex = urlState.pagePath.lastIndexOf(RepoConstants.RootPath);

        return (urlState.isSubPage && urlState.pagePath !== RepoConstants.RootPath)
            ? urlState.pagePath.substr(0, lastIndex)
            : urlState.pagePath;
    }

    private get _hasPageContentChanged(): boolean {
        if (!this._editor) {
            return false;
        }

        return this._hasEditorContentChanged(this._editor.content, this.state.initialPageContent);
    }

    private get _hasTitleChanged(): boolean {
        if (!this._header) {
            return false;
        }
        return (this.currentTitle !== this.state.initialPageTitle);
    }

    private get _isNew(): boolean {
        const urlState = this.props.storesHub.state.sharedState.urlState;
        const page = this.props.storesHub.getAggregateState().wikiPagesState.wikiPages[urlState.pagePath];
        /*
         *  We declare page does not exist, if
         *  1. Path is root, since root does not have a physical page, OR
         *  2. If page for the given path doesn't exist
         */
        const pageDoesNotExist: boolean = (urlState.pagePath === RepoConstants.RootPath) || !Boolean(page);
        /*
         *  We declare page does not have content,
         *  1. Path is non root, since root will never have a content page, AND
         *  2. If page for the given path is present, is parent page and does not have a content page associated
         */
        const pageContentDoesNotExist: boolean = urlState.pagePath !== RepoConstants.RootPath
            && Boolean(page && page.isParentPage && page.gitItemPath == null);

        // We cannot rely only on pageExists as changePath resets and refetches the pages, and all pages may not be fetched
        return (urlState.isSubPage
            && (pageDoesNotExist || pageContentDoesNotExist));
    }

    private _isSaveEnabled(): boolean {
        return this._hasSavePermissions()
            && this.state.isSaveEnabled;
    }

    private _hasSavePermissions(): boolean {
        return this.props.storesHub.state.sharedState.permissionState.hasContributePermission;
    }

    private _isNewPageWithPresetTitle(): boolean {
        const urlState: UrlParameters = this.props.storesHub.state.sharedState.urlState;
        // If the page is new, title is not empty and not yet edited, we have preset title
        return this._isNew && !this.isDirty() && (getPageNameFromPath(urlState.pagePath) !== "");
    }

    private _isTitleDisabled(): boolean {
        const urlState: UrlParameters = this.props.storesHub.state.sharedState.urlState;
        const wiki = this.props.storesHub.state.sharedState.commonState.wiki;
        // If we got page title from URL, and creating a new page, make title uneditable
        return (wiki.type === WikiType.CodeWiki ||
            this._isNew && (getPageNameFromPath(urlState.pagePath) !== "")) ||
            isTemplate(urlState.pagePath);
    }

    private get _autoComment(): string {
        if (this._isNew) {
            return Utils_String.format(WikiResources.AddPageDefaultComment, this.currentTitle);
        } else if (this._hasTitleChanged && !this._hasPageContentChanged) {
            return Utils_String.format(WikiResources.RenamePageDefaultComment, this.state.initialPageTitle, this.currentTitle);
        } else if (!this._hasTitleChanged && this._hasPageContentChanged) {
            return Utils_String.format(WikiResources.EditPageDefaultComment, this.currentTitle);
        } else {
            return Utils_String.format(WikiResources.EditAndRenamePageDefaultComment, this.state.initialPageTitle, this.currentTitle);
        }
    }

    private get currentTitle(): string {
        if (this._header) {
            return this._header.title.trim();
        }
        return this._initialTitle;
    }

    private _saveEditorRef = (editor: MarkdownEditor): void => {
        this._editor = editor;
    }

    private _getfarItems(): IContextualMenuItem[] {
        const previewModes: PreviewMode[] = [PreviewMode.Live, PreviewMode.Full, PreviewMode.Off];
        const items: IContextualMenuItem[] = [
            {
                key: "preview",
                iconProps: bowtieIcon("bowtie-details-pane"),
                name: this._toDisplayString(this.state.previewMode),
                className: this._editPreviewButton,
                subMenuProps: {
                    items: previewModes.map((mode: PreviewMode) => ({
                        key: PreviewMode[mode],
                        canCheck: true,
                        checked: mode === this.state.previewMode,
                        name: this._toDisplayString(mode),
                        onClick: this._onPreviewModeChange,
                    } as IContextualMenuItem)),
                },
            },
            {
                key: "save",
                name: WikiResources.SaveButtonText,
                iconProps: bowtieIcon("bowtie-save"),
                text: WikiResources.SaveButtonText,
                title: this.state.isSaveEnabled ? WikiResources.SaveShortcut : null,
                disabled: !this._isSaveEnabled(),
                onClick: this._saveButtonClicked,
                className: this._saveButtonClassName,
            },
            {
                key: "save-chevron",
                iconProps: bowtieIcon("bowtie-chevron-down-light"),
                disabled: !this._isSaveEnabled(),
                onClick: this._promptSavePageNewCommitMsg,
                className: this._saveChevronClassName,
                ariaLabel: WikiResources.ExpandSaveButtonAriaLabel
            }
        ];

        const rootPage = this.props.storesHub.state.wikiPagesState.wikiPages["/"];
        const tempPage = this.props.storesHub.state.wikiPagesState.tempPage;
        if (rootPage && rootPage.subPages && rootPage.subPages.length) {
            if (!(rootPage.subPages.length === 1 && tempPage)) {
                items.push({
                    key: "cancel",
                    name: WikiResources.CloseButtonText,
                    iconProps: bowtieIcon("bowtie-navigate-close"),
                    onClick: () => this._closePage(false),
                    className: "wiki-cancel",
                });
            }
        }

        return items;
    }

    @autobind
    private _saveButtonClicked(): void {
        this._saveOptionType = SaveOptionType.QuickSaveByClick;
        this._savePageWithDefaultCommitMsg();
    }

    @autobind
    private _isRename(): boolean {
        if (this._isNew) return false;
        return (this.state.initialPageTitle !== "" && !Utils_String.equals(this.currentTitle, this.state.initialPageTitle));
    }

    @autobind
    private _onCancel(): void {
        this.props.actionCreator.cancelEditing(this._initialPagePath);
    }

    @autobind
    private _onTemplateContentLoaded(): void {
        const templateContentStoreState = this.props.storesHub.templateContentStore.state;
        this.setState({
            initialPageContent: templateContentStoreState.templateContent,
            isTemplateContentLoading: templateContentStoreState.isLoading,
        });
    }

    @autobind
    private _onInitialPageContentLoaded(): void {
        // This gets executed once when page content is fetched
        const pageContentStoreState = this.props.storesHub.pageContentStore.state;
        this.setState({
            initialPageContent: pageContentStoreState.content,
            isPageContentLoading: (this._isNew || this._unsavedNewPage)
                ? false
                : pageContentStoreState.isLoading,
        });
    }

    @autobind
    private _onNavigateAwayDialogStoreChanged(): void {
        const navigateAwayDialogState = this.props.storesHub.state.sharedState.navigateAwayDialogState;
        this.setState({
            isNavigateAwayDialogVisible: navigateAwayDialogState.isNavigateAwayDialogVisible,
            onNavigateAwayConfirmAction: navigateAwayDialogState.onConfirmAction,
        } as EditPageState);
    }

    @autobind
    private _onNavigateAwaySave(): void {
        this._saveOptionType = SaveOptionType.NavigateAwaySave;
        this._onSave(false, this._autoComment, this.state.isCancelButtonClicked);
        if (!this.state.isCancelButtonClicked) {
            this.state.onNavigateAwayConfirmAction();
        }
    }

    @autobind
    private _onPreviewModeChange(event: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): void {
        this.setState({ previewMode: PreviewMode[item.key] }, this._publishEditContainerPreviewToggled);
    }

    @autobind
    private _onSave(
        shouldShowToast?: boolean,
        comment?: string,
        changePathPostSave?: boolean,
        isRenameWarningShown?: boolean,
        closeRenameDialogOnComplete?: boolean,
    ): void {
        const aggregatedState = this.props.storesHub.state;
        const sharedState = aggregatedState.sharedState;
        const isSubPage = sharedState.urlState.isSubPage;
        const isNew = this._isNew;
        const isRename = this._isRename();
        const parentPath = getNewPageParentPath(sharedState.urlState.pagePath);
        const oldPagePath = combinePaths(parentPath, getPageNameFromPath(sharedState.urlState.pagePath));
        const pagePath = combinePaths(parentPath, this.currentTitle);
        const savePageOpeationType: SavePageOperationType = this._getSavePageOperationType(isRename, isNew);
        if (!comment) {
            comment = this._autoComment;
        }
        const isDefaultCommentChanged: boolean = comment !== this._autoComment;
        if (isRename && !isRenameWarningShown) {
            // The comment will be used when save is initiated from SavePageDialog
            this._commentForRenamePageDialog = comment;
            this.props.actionCreator.promptSavePageDialog();
        } else {
            if (this._shouldCreateDraftVersion()) {
                this._createDraftVersionAndSave(comment,
                    oldPagePath,
                    () => this._onSaveSuccess(savePageOpeationType, pagePath, isDefaultCommentChanged, shouldShowToast, changePathPostSave)
                );
            } else {
                this.props.actionCreator.savePage(
                    aggregatedState.pageContentState.version,
                    comment,
                    this.currentTitle,
                    /* Using content from this._editor istead of state.pageContent to address issue of
                    * onchange event not getting fired in IE when last input is selected from IME tool.*/
                    this._editor.content,
                    isRename ? oldPagePath : pagePath,
                    isNew,
                    isRename,
                    getReferredAttachments(this._editor.content, aggregatedState.unsavedAttachmentsState.attachments),
                    () => this._onSaveSuccess(savePageOpeationType, pagePath, isDefaultCommentChanged, shouldShowToast, changePathPostSave),
                    this._onSaveFailure,
                    closeRenameDialogOnComplete,
                );
            }
        }
    }

    @autobind
    private _getWikiPage(fullPagePath: string): WikiPage {
        return this.props.storesHub.state.wikiPagesState.wikiPages[fullPagePath];
    }

    @autobind
    private _onSaveSuccess(
        savePageOpeationType: SavePageOperationType,
        pagePath: string,
        isDefaultCommentChanged: boolean,
        shouldShowToast: boolean,
        changePathPostSave: boolean,
    ): void {
        this.props.actionCreator.publishPageSaved(this._saveOptionType, savePageOpeationType, this._getWikiPage(pagePath), isDefaultCommentChanged);
        if (this._isRename()) {
            const urlState: UrlParameters = this.props.storesHub.state.sharedState.urlState;
            urlState.pagePath = pagePath;

            // Updating the page path stored locally before updating page path in URL
            this._renderedPagePath = pagePath;
            this.props.actionCreator.updateUrlSilently(urlState, true, true);
        }

        this.setState({
            initialPageContent: this._editor && this._editor.content,
            initialPageTitle: this.currentTitle,
            isSaveEnabled: false,
            saveInProgress: false,
            showToast: this.state.showToast || shouldShowToast,
        });

        if (this._unsavedNewPage) {
            // Updating the page path stored locally before updating action in URL
            this._renderedPagePath = pagePath;

            const currentPagePath = pagePath;
            this.props.actionCreator.editPage(pagePath, currentPagePath, true);

            // Once page got saved successfully, it should behave as an existing page only
            this._unsavedNewPage = false;
        }

        if (changePathPostSave) {
            this.props.actionCreator.changePath(pagePath);
        }

        if (this._saveAndClose) {
            this._closePage(true);
        }
    }

    @autobind
    private _onSaveFailure(error: Error): void {
        this.setState({
            saveInProgress: false,
            isSaveEnabled: true,
        });
    }

    private _getSavePageOperationType(isRename: boolean, isNew: boolean): SavePageOperationType {
        if (isRename) {
            return SavePageOperationType.RenamePage;
        } else if (isNew) {
            return SavePageOperationType.CreatePage;
        } else {
            return SavePageOperationType.RevisePage;
        }
    }

    @autobind
    private _onPageDialogStateChanged(): void {
        const pageDialogsState = this.props.storesHub.pageDialogsStore.state;
        this.setState({
            isSavePageDialogVisible: pageDialogsState.isSavePageDialogVisible,
            savePageStatus: pageDialogsState.savePageStatus,
            errorMessage: pageDialogsState.errorMessage,
        } as EditPageState);
    }

    @autobind
    private _closePage(closePageAfterSaveSuccess: boolean): void {
        if (this.isDirty()) {
            this.setState({ isCancelButtonClicked: true } as EditPageState);
            this.props.actionCreator.onCancelButtonClick(this._onCancel);
        } else {
            this.props.actionCreator.changePath(this._initialPagePath);

            if (!closePageAfterSaveSuccess) {
                this.props.actionCreator.publishPageEditingCancelledWithoutAnyChange();
            } 
        }
        this._saveAndClose = false;
    }

    @autobind
    private _savePageWithDefaultCommitMsg(hideToast?: boolean): void {
        if (this.isDirty() || this._isNewPageWithPresetTitle()) {
            this.setState({ saveInProgress: true });
            this._onSave(!hideToast, this._autoComment);
        }
    }

    @autobind
    private _promptSavePageNewCommitMsg(): void {
        if (this.isDirty() || this._isNewPageWithPresetTitle()) {
            this.setState({
                saveInProgress: true,
                showSavePageCallout: true,
            });
        }
    }

    @autobind
    private _onCalloutSave(): void {
        this._saveOptionType = SaveOptionType.SaveWithCustomMessage;
        if (this._saveCalloutTextFieldRef.value !== "") {
            this._onSave(false, this._saveCalloutTextFieldRef.value, false, !this._handleBrokenLinksFeatureEnabled);
        } else {
            this._onSave(false, this._autoComment, false, !this._handleBrokenLinksFeatureEnabled);
        }
        this.setState({
            showSavePageCallout: false,
            isSaveEnabled: false,
        })
    }

    @autobind
    private _onDismissDefaultMsgCallout(ev: any): void {
        this.setState({
            showToast: false,
            isSaveEnabled: false,
        });
        this._async.clearTimeout(this._toastTimeoutHandler);
        this._toastTimeoutHandler = null;
    }

    @autobind
    private _onDismissNewMsgCallout(ev: any): void {
        this.setState({
            saveInProgress: false,
            showSavePageCallout: false,
        });
    }

    @autobind
    private _onTitleChanged(newTitle: string): void {
        const urlState: UrlParameters = this.props.storesHub.state.sharedState.urlState;
        const parentPath: string = urlState.isSubPage ? getNewPageParentPath(urlState.pagePath) : getParentPagePath(urlState.pagePath);
        const errorMessage: string = validatePagePathAndTitle(parentPath, newTitle);

        this._onNotifyTitleValidationResult(errorMessage, newTitle);
    }

    @autobind
    private _onNotifyTitleValidationResult(errorMessage: string, pageTitle: string): void {
        if (errorMessage === "" || !pageTitle) {
            // The input page title is valid
            this._updateState(pageTitle, errorMessage, this._editor.content);
        } else {
            // There input page title is invalid. Disable save button.
            this.setState({
                pageTitleError: errorMessage,
                isSaveEnabled: false,
            } as EditPageState);
        }
    }

    @autobind
    private _onPageContentChange(): void {
        this._updateState(this.currentTitle, this.state.pageTitleError, this._editor.content);
    }

    @autobind
    private _publishEditContainerPreviewToggled(): void {
        this.props.actionCreator.publishEditContainerPreviewToggled(PreviewMode[this.state.previewMode]);
    }

    @autobind
    private _refHeader(header: Header): void {
        this._header = header;
    }

    @autobind
    private _refSavePageCallout(ref: TextField): void {
        this._saveCalloutTextFieldRef = ref;
    }

    private _toDisplayString(mode: PreviewMode): string {
        switch (mode) {
            case PreviewMode.Full:
                return WikiResources.PreviewMode_Full;
            case PreviewMode.Live:
                return WikiResources.PreviewMode_Live;
            case PreviewMode.Off:
                return WikiResources.PreviewMode_Off;
        }
    }

    private _hasEditorContentChanged(editorContent: string, initialPageContent: string): boolean {
        return (editorContent !== initialPageContent.replace(/\r/g, ""));
    }

    private _updateState = (
        pageTitle: string,
        pageTitleError: string,
        newPageContent: string,
    ): void => {
        const hasTitle = pageTitle !== "" ? true : false;
        const hasTitleChanged = (hasTitle ? pageTitle.trim() !== this.state.initialPageTitle : false);
        const hasContentChanged = (this._hasEditorContentChanged(newPageContent, this.state.initialPageContent));

        if (hasTitleChanged || hasContentChanged) {
            if (!this.isDirty()) {
                // Fire action to set dirty flag only if it is not set already. Otherwise we can skip this redundant action.
                this.props.actionCreator.setIsPageDirtyFlag();
            }
        } else if (this.isDirty()) {
            this.props.actionCreator.resetIsPageDirtyFlag();
        }

        this.setState(
            {
                pageTitleError: pageTitleError,
                isSaveEnabled: hasTitle && !pageTitleError && (hasTitleChanged || hasContentChanged),
            } as EditPageState,
        );
    }

    private _onEditPageRenderComplete(): void {
        const pageContentState = this.props.storesHub.state.pageContentState;
        const isContentAvailable = pageContentState.path
            && (pageContentState.content || pageContentState.content === "");

        if (isContentAvailable) {
            this._isFirstContentRendered = true;

            if (this.props.onContentRendered) {
                this.props.onContentRendered(PerformanceConstants.Overview,
                    {
                        "isEdit": true,
                    });
            }
        }
    }

    // Returns true if current version is a code wiki and not a draft version
    private _shouldCreateDraftVersion(): boolean {
        const wiki = this.props.storesHub.state.sharedState.commonState.wiki;
        return WikiFeatures.isRichCodeWikiEditingEnabled() &&
            wiki.type === WikiType.CodeWiki &&
            !this.props.actionCreator.isWikiVersionDraftVersion();
    }

    // Redirect to create branch dialog and then saves the changes in the newly created draft version
    private _createDraftVersionAndSave(comment: string, pagePath: string, onSaveSuccess?: () => void): void {
        const aggregatedState = this.props.storesHub.state;
        let draftVersion: GitVersionDescriptor = null;
        this.props.actionCreator.createDraftVersion().then(result => {
            if (result.cancelled || result.error) {
                this.setState({ saveInProgress: false });
                return;
            } else {
                draftVersion = {
                    versionOptions: GitVersionOptions.None,
                    version: result.selectedFriendlyName,
                    versionType: GitVersionType.Branch,
                } as GitVersionDescriptor;
                this.props.actionCreator.savePage(
                    aggregatedState.pageContentState.version,
                    comment,
                    this.currentTitle,
                    this._editor.content,
                    pagePath,
                    false,
                    false,
                    getReferredAttachments(this._editor.content, aggregatedState.unsavedAttachmentsState.attachments),
                    onSaveSuccess,
                    this._onSaveFailure,
                    false,
                    draftVersion,
                );
            }
        });
    }
}

export function getReferredAttachments(content: string, attachmentsMap: IDictionaryStringTo<Attachment>): Attachment[] {
    const attachments: Attachment[] = [];
    if (!content) {
        return attachments;
    }

    for (const name of Object.keys(attachmentsMap)) {
        const attachmentPath = `](${RepoConstants.AttachmentsFolder}${SharedSearchConstants.RepoConstants.PathSeparator}${getEncodedAttachmentName(name)}`;
        if (content.indexOf(attachmentPath) >= 0) {
            attachments.push(attachmentsMap[name]);
        }
    }

    return attachments;
}
