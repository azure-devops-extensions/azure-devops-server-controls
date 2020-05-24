import * as React from "react";

import { autobind } from "OfficeFabric/Utilities";

import { WikiType } from "TFS/Wiki/Contracts";
import { RepoConstants, WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { PerformanceConstants } from "Wiki/Scripts/CustomerIntelligenceConstants";
import { getPageNameFromPath } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";
import { ShortcutCode, ShortcutListener, WikiHubShortcutGroup } from "Wiki/Scripts/WikiKeyboardShortcuts";

import * as CloneWikiDialog from "Wiki/Scenarios/Overview/Components/CloneWikiDialog";
import * as RenameWikiDialog from "Wiki/Scenarios/Overview/Components/RenameWikiDialog";
import { PageContent } from "Wiki/Scenarios/Overview/Components/PageContent";
import { TemplatePickerDialogParams } from "Wiki/Scenarios/Overview/ViewActionsHub";
import { ViewStoresHub } from "Wiki/Scenarios/Overview/Stores/ViewStoresHub";
import { WikiPagesState } from "Wiki/Scenarios/Overview/Stores/WikiPagesStore";
import { ViewActionCreator } from "Wiki/Scenarios/Overview/ViewActionCreator";
import { WikiBreadCrumb } from "Wiki/Scenarios/Shared/Components/WikiBreadCrumb";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/OverviewContainer";

export interface ContainerProps {
    actionCreator: ViewActionCreator;
    storesHub: ViewStoresHub;
    onContentRendered?(scenario?: string, data?: any): void;
}

export interface OverviewContainerProps extends ContainerProps {
    onFilterShortcut(): void;
}

export interface OverviewState {
    isCloneWikiDialogOpen: boolean;
    isRenameWikiDialogOpen: boolean;
}

export class OverviewContainer extends React.Component<OverviewContainerProps, OverviewState> implements ShortcutListener {
    private _isFirstContentRendered = false;
    private _renderedPagePath: string = null;
    private _wikiShortcuts: WikiHubShortcutGroup;
    private _pageContentRef: PageContent;

    constructor(props: OverviewContainerProps) {
        super(props);

        this._wikiShortcuts = new WikiHubShortcutGroup();
        this.state = {
            isCloneWikiDialogOpen: false,
            isRenameWikiDialogOpen: false,
        };
    }

    public componentDidMount(): void {
        this.props.storesHub.pageContentStore.addChangedListener(this._onPageContentChanged);
        this.props.storesHub.cloneWikiStore.addChangedListener(this._onCloneWikiStateChanged);
        this.props.storesHub.renameWikiStore.addChangedListener(this._onRenameWikiStateChanged);

        this._wikiShortcuts.registerWikiShortcuts(this.onShortcutPressed);
        const sharedState = this.props.storesHub.state.sharedState;
        let pagePath = sharedState.urlState.pagePath;

        if (!getPageNameFromPath(pagePath)) {
            pagePath = RepoConstants.RootPath;
        }

        this._renderIfPagesHaveLoaded(pagePath);
        this._onOverviewRenderComplete();
    }

    public componentWillUnmount(): void {
        if (!this.props.storesHub) {
            return;
        }
        this._wikiShortcuts.dispose();

        if (this.props.storesHub.pageContentStore) {
            this.props.storesHub.pageContentStore.removeChangedListener(this._onPageContentChanged);
        }

        if (this.props.storesHub.cloneWikiStore) {
            this.props.storesHub.cloneWikiStore.removeChangedListener(this._onCloneWikiStateChanged);
        }

        if (this.props.storesHub.renameWikiStore) {
            this.props.storesHub.renameWikiStore.removeChangedListener(this._onRenameWikiStateChanged);
        }
    }

    public render(): JSX.Element {
        const state = this.props.storesHub.state;

        let pagePath = state.sharedState.urlState.pagePath;
        if (!pagePath || pagePath === "") {
            pagePath = RepoConstants.RootPath;
        }

        const commonState = this.props.storesHub.getAggregateState().sharedState.commonState;

        const cloneWikiDialogProps: CloneWikiDialog.CloneWikiDialogProps = {
            cloneUrl: commonState.cloneUrl,
            headingLevel: 1,
            isOpen: this.state.isCloneWikiDialogOpen,
            onDismiss: this.props.actionCreator.hideWikiCloneDialog,
            repositoryContext: commonState.repositoryContext,
            sshEnabled: commonState.sshEnabled,
            sshUrl: commonState.sshUrl,
            publishCopyCloneUrlClicked: this.props.actionCreator.publishCopyCloneUrlClicked
        };

        const renameWikiDialogProps: RenameWikiDialog.RenameWikiDialogProps = {
            onDismiss: this.props.actionCreator.hideWikiRenameDialog,
            isOpen: this.state.isRenameWikiDialogOpen,
            name: this.props.storesHub.getAggregateState().sharedState.commonState.wiki.name,
            onSave: this.props.actionCreator.saveWikiName,
            errorMessage: this.props.storesHub.state.renameWikiState.errorMessage,
            isRenameInProgress: this.props.storesHub.state.renameWikiState.isRenameInProgress,
        };

        const isImmersiveWikiEnabled: boolean = WikiFeatures.isImmersiveWikiEnabled();

        return (
            <div className="overview-container">
                {isImmersiveWikiEnabled ||
                    <WikiBreadCrumb
                        currentAction={WikiActionIds.View}
                        currentWiki={state.sharedState.commonState.wiki}
                        currentWikiVersion={state.sharedState.commonState.wikiVersion}
                        onCreateWiki={this._onCreateWiki}
                        onPublishWikiAction={this._onPublishWiki}
                        onUnpublishWikiAction={this._onUnpublishWiki}
                        hideProjectWikiAction={!this._showCreateProjectWikiAction()}
                        hidePublishWikiAction={!this._showPublishWikiAction()}
                        hideUnpublishWikiAction={!this._showUnpublishWikiAction()}
                    />
                }
                <PageContent
                    editPage={this._editPage}
                    newPage={this._newPage}
                    containerProps={this.props}
                    rawMarkdownContent={state.pageContentState.content}
                    isPageContentLoading={state.pageContentState.isLoading}
                    cloneWikiDialogProps={cloneWikiDialogProps}
                    renameWikiDialogProps={renameWikiDialogProps}
                    onCloneWikiClick={this.props.actionCreator.promptWikiCloneDialog}
                    onRenameWikiClick={this.props.actionCreator.promptWikiRenameDialog}
                    onWikiSecurityClick={this.props.actionCreator.showWikiSecurityDialog}
                    title={getPageNameFromPath(pagePath)}
                    ref={this._savePageContentRef}
                    onEditInDraftVersionClick={this.props.actionCreator.promptEditInDraftVersionDialog}
                />
            </div>
        );
    }

    public componentDidUpdate(): void {
        this._onOverviewRenderComplete();

        let pagePath = this.props.storesHub.state.sharedState.urlState.pagePath;

        if (!getPageNameFromPath(pagePath)) {
            pagePath = RepoConstants.RootPath;
        }

        // RenderPage if pagePath in url is not the one already rendered and if the pages have loaded
        if (pagePath !== this._renderedPagePath) {
            this._renderIfPagesHaveLoaded(pagePath);
        }
    }

    @autobind
    public onShortcutPressed(shortcut: ShortcutCode): void {
        switch (shortcut) {
            case ShortcutCode.NewPage:
                return this._newPage();
            case ShortcutCode.EditPage:
                return this._editPage();
            case ShortcutCode.CreateSubPage:
                return this._onCreateSubpageShortcut();
            case ShortcutCode.FilterPages:
                return this._onFilterShortcut();
            case ShortcutCode.PrintPage:
                return this._printPage();
        }
    }

    @autobind
    private _showCreateProjectWikiAction(): boolean {
        const state = this.props.storesHub.state;

        /*
            Show 'Create project wiki' action if,
            1. Project wiki is not already existing, and
            2. User has create repository permission
        */
        return !state.sharedState.commonState.isProjectWikiExisting
            && state.sharedState.permissionState.hasCreatePermission;
    }

    @autobind
    private _showPublishWikiAction(): boolean {
        const state = this.props.storesHub.state;

        /*
            Show 'Create code wiki' action if,
            1. Code hub service is turned on
            2. User has repo Contribute permission
        */
        return WikiFeatures.isCodeHubEnabled() && state.sharedState.permissionState.hasContributePermission;
    }

    private _showUnpublishWikiAction(): boolean {
        const state = this.props.storesHub.state.sharedState;

        /*
         * Show 'Unpublish wiki' action if,
         * 1. Current wiki is a code wiki, and
         * 2. User has repo Contribute permission
         */
        return WikiFeatures.isUnpublishWikiEnabled()
            && state.commonState.wiki.type === WikiType.CodeWiki
            && state.permissionState.hasContributePermission;
    }

    @autobind
    private _onCreateWiki(): void {
        this.props.actionCreator.createProjectWiki();
    }

    @autobind
    private _onPublishWiki(): void {
        this.props.actionCreator.publishWiki();
    }

    @autobind
    private _onUnpublishWiki(): void {
        this.props.actionCreator.promptUnpublishWikiDialog();
    }

    @autobind
    private _onCreateSubpageShortcut(): void {
        let pagePath = this.props.storesHub.state.sharedState.urlState.pagePath;
        this.props.actionCreator.addPage(pagePath);
    }

    @autobind
    private _onFilterShortcut(): void {
        this.props.onFilterShortcut();
    }

    @autobind
    private _savePageContentRef(ref: PageContent): void {
        this._pageContentRef = ref;
    }

    private _printPage(): void {
        this._pageContentRef && this._pageContentRef.populateFrameAndPrint();
        this.props.actionCreator.publishPagePrinted();
    }

    private _renderIfPagesHaveLoaded(pagePath: string): void {
        // Call renderPage only if the wiki pages are loaded
        const wikiPagesState: WikiPagesState = this.props.storesHub.state.wikiPagesState;
        const sharedState = this.props.storesHub.state.sharedState;

        if (wikiPagesState && wikiPagesState.wikiPages && Object.keys(wikiPagesState.wikiPages).length > 0) {
            this._renderedPagePath = pagePath;

            /* Call render only if action is view, edit action handled by EditPageContainer */
            if (sharedState.urlState.action === WikiActionIds.View) {
                this.props.actionCreator.renderPage(pagePath, true, false);
            }
        }
    }

    @autobind
    private _editPage(): void {
        const pagePath = this.props.storesHub.state.sharedState.urlState.pagePath;
        this.props.actionCreator.editPage(pagePath);
    }

    @autobind
    private _newPage(): void {
        if (WikiFeatures.isImmersiveWikiEnabled()) {
            this.props.actionCreator.promptTemplatePickerDialog();
        } else {
            this.props.actionCreator.addPage();
        }
    }

    private _onPageContentChanged = () => {
        this.forceUpdate();
    }

    private _onCloneWikiStateChanged = (): void => {
        this.setState({ isCloneWikiDialogOpen: this.props.storesHub.cloneWikiStore.state.isCloneWikiDialogOpen } as OverviewState);
    }

    private _onRenameWikiStateChanged = (): void => {
        this.setState({ isRenameWikiDialogOpen: this.props.storesHub.renameWikiStore.state.isRenameWikiDialogOpen } as OverviewState);
    }

    private _onOverviewRenderComplete(): void {
        const pageContentState = this.props.storesHub.state.pageContentState;
        const isContentAvailable = pageContentState.path
            && (pageContentState.content || pageContentState.content === "");

        if (isContentAvailable) {
            if (this.props.onContentRendered) {
                let data: { [key: string]: any } = {};
                data[PerformanceConstants.IsFirstRender] = !this._isFirstContentRendered;
                this.props.onContentRendered(PerformanceConstants.Overview, data);
            }

            this._isFirstContentRendered = true;
        }
    }
}
