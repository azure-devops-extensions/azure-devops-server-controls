import * as React from "react";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind, css } from "OfficeFabric/Utilities";
import * as Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";
import {
    bowtieIcon,
    getParentPagePath,
} from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";
import { canNavigateToOrRenderPage, isTemplate } from "Wiki/Scripts/WikiPagesHelper";

import { WikiType, WikiPage } from "TFS/Wiki/Contracts";
import { Header } from "Wiki/Scenarios/Shared/Components/Header";
import { WikiMarkdownRenderer } from "Wiki/Scenarios/Shared/Components/WikiMarkdownRenderer";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";

import { PageMetadataBarContainer } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataBarContainer";
import * as CloneWikiDialog_Async from "Wiki/Scenarios/Overview/Components/CloneWikiDialog";
import { CloneWikiDialogContainer } from "Wiki/Scenarios/Overview/Components/CloneWikiDialogContainer";
import * as RenameWikiDialog_Async from "Wiki/Scenarios/Overview/Components/RenameWikiDialog";
import { ErrorPage, showImageForError } from "Wiki/Scenarios/Overview/Components/ErrorPage";
import { ContainerProps } from "Wiki/Scenarios/Overview/Components/OverviewContainer";
import { AggregateState } from "Wiki/Scenarios/Overview/Stores/ViewStoresHub";
import {RenameWikiDialog, RenameWikiDialogProps} from "Wiki/Scenarios/Overview/Components/RenameWikiDialog";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/PageContent";

export interface PageContentProps {
    cloneWikiDialogProps: CloneWikiDialog_Async.CloneWikiDialogProps;
    renameWikiDialogProps: RenameWikiDialog_Async.RenameWikiDialogProps;
    containerProps: ContainerProps;
    isPageContentLoading: boolean;
    rawMarkdownContent: string;
    title: string;
    editPage(): void;
    newPage(): void;
    onCloneWikiClick(): void;
    onWikiSecurityClick(): void;
    onEditInDraftVersionClick?(): void;
    onRenameWikiClick(): void;
}

export class PageContent extends React.Component<PageContentProps, {}> {
    private _wikiMarkdownRenderer: WikiMarkdownRenderer;
    private _pageMetadataBarContainer: PageMetadataBarContainer;

    public componentDidMount(): void {
        const storesHub = this.props.containerProps.storesHub;
        storesHub.pagePrintStore.addChangedListener(this.populateFrameAndPrint);
    }

    public componentWillUnmount(): void {
        const storesHub = this.props.containerProps.storesHub;
        if (storesHub.pagePrintStore) {
            storesHub.pagePrintStore.removeChangedListener(this.populateFrameAndPrint);
        }

        if (this._wikiMarkdownRenderer) {
            this._wikiMarkdownRenderer = null;
        }

        if (this._pageMetadataBarContainer) {
            this._pageMetadataBarContainer = null;
        }
    }

    public render(): JSX.Element {
        const sharedState = this.props.containerProps.storesHub.state.sharedState;
        const commonState = sharedState.commonState;
        const permissionState = sharedState.permissionState;
        const urlState: UrlParameters = sharedState.urlState;
        const parentPath: string = getParentPagePath(urlState.pagePath);
        const page = this.props.containerProps.storesHub.wikiPagesStore.state.wikiPages[urlState.pagePath];
        const cloneDialogRef = document.getElementsByClassName("wiki-more")[0] as HTMLElement;

        // Both page-content, Header using flexbox. inserted a div between page-content and Header which is required to avoid immediate nested flexbox issue with overflow child
        return (
            <div
                className={css("page-content-container", { immersiveHomePage: this._isImmersiveHomePage })}
                onDragOver={this._onPageContentDragDrop}
                onDrop={this._onPageContentDragDrop}
            >
                {commonState.error &&
                    showImageForError(commonState.error)
                    ?
                    <ErrorPage error={commonState.error as Error}
                        errorProps={commonState.errorProps}
                        onMount={this.props.containerProps.actionCreator.publishErrorPageTelemetries}
                    />
                    :
                    this.props.isPageContentLoading
                        ? <Spinner className={"wiki-spinner"} />
                        : <div className={"page-content"}>
                            {this._isImmersiveHomePage ||
                                <Header
                                    title={this.props.title}
                                    parentPath={parentPath}
                                />
                            }
                            <iframe className="print-frame" id="print-frame" width="0%" height="0%" hidden/>
                            <CloneWikiDialogContainer {...this.props.cloneWikiDialogProps} targetElement={cloneDialogRef} />
                            {this.props.renameWikiDialogProps.isOpen && <RenameWikiDialog {...this.props.renameWikiDialogProps} />}
                            {canNavigateToOrRenderPage(page, urlState.pagePath)
                                && <PageMetadataBarContainer
                                    wiki={commonState.wiki}
                                    wikiVersion={commonState.wikiVersion}
                                    page={page}
                                    repositoryContext={commonState.repositoryContext}
                                    onLinkedWorkItemsUpdated={this.props.containerProps.actionCreator.viewActionsHub.linkedWorkItemsUpdated}
                                    ref={this._savePageMetadataBarContainerRef}
                                    commandBarProps={{
                                        items: [],
                                        farItems: this._getfarItems(),
                                    }}
                                    showMetadata={!this._isImmersiveHomePage}
                                    showPageViewCount={WikiFeatures.isWikiPageViewStatsEnabled()}
                                    pagePath={urlState.pagePath}
                                />}
                            <WikiMarkdownRenderer
                                ref={this._saveMarkdownRendererRef}
                                content={this.props.rawMarkdownContent}
                                wiki={commonState.wiki}
                                repositoryContext={commonState.repositoryContext}
                                urlParameters={urlState}
                                onFragmentLinkClick={this._onFragmentLinkClick}
                                wikiPagesPromiseMethod={this.props.containerProps.actionCreator.getPagesToFilter}
                                enableHeaderAnchorSharing={true}
                            />
                        </div>
                }
            </div>);
    }

    @autobind
    private _onFragmentLinkClick(linkParameters: UrlParameters): void {
        this.props.containerProps.actionCreator.updateUrlSilently(linkParameters, false, false);
    }

    private _onPageContentDragDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        /* Prevent browser from loading file when a file is dropped.
         * We override this behaviour as and when needed */
        event.dataTransfer.dropEffect = "none";
        event.dataTransfer.effectAllowed = "none";
        event.preventDefault();
    }

    private _getfarItems(): IContextualMenuItem[] {
        const items: IContextualMenuItem[] = [];
        const commonState = this.props.containerProps.storesHub.state.sharedState.commonState;

        if (this._hasEditPermissions()) {
            if (!this._isImmersiveHomePage) {
                let classForEditButton: string = "wiki-edit";
                if ((WikiFeatures.isRichCodeWikiEditingEnabled() && (commonState.wiki.type === WikiType.CodeWiki))) {
                    classForEditButton = "wiki-edit-with-chevron";
                }
                items.push({
                    key: "edit",
                    name: WikiResources.EditPageButtonText,
                    iconProps: bowtieIcon("bowtie-edit-outline"),
                    onClick: () => this.props.editPage(),
                    className: classForEditButton,
                    disabled: this._isEditDisabled(),
                });
                if (WikiFeatures.isRichCodeWikiEditingEnabled() && (commonState.wiki.type === WikiType.CodeWiki)) {
                    const subItems: IContextualMenuItem[] = [];
                    subItems.push({
                        key: "edit-in-draft",
                        name: WikiResources.EditInDraftVersionButtonText,
                        iconProps: bowtieIcon("bowtie-edit-outline"),
                        onClick: () => this.props.onEditInDraftVersionClick(),
                        className: "edit-in-draft",
                        disabled: this._isEditInDraftVersionDisabled(),
                    });

                    items.push({
                        key: "edit-in-draft-chevron",
                        className: "edit-in-draft-chevron",
                        subMenuProps: {
                            items: subItems,
                        },
                    });
                }
            }

            items.push({
                key: "new",
                name: WikiResources.NewPageButtonText,
                iconProps: bowtieIcon("bowtie-math-plus-light"),
                onClick: () => this.props.newPage(),
                className: "wiki-new-page",
                disabled: this._isNewPageDisabled(),
            });
        }
        const subItems: IContextualMenuItem[] = [];

        if (!this._isCodeWiki() && !WikiFeatures.isImmersiveWikiEnabled()) {
            subItems.push({
                key: "clone",
                name: WikiResources.CloneWikiCommand,
                iconProps: bowtieIcon("bowtie-clone-to-desktop"),
                onClick: () => this.props.onCloneWikiClick(),
            });
        }

        if (this._hasRenamePermissions() && WikiFeatures.isRenameWikiFeatureEnabled() && !WikiFeatures.isImmersiveWikiEnabled()){
            subItems.push({
                key: "rename",
                name: WikiResources.RenameWikiCommand,
                iconProps: bowtieIcon("bowtie-edit-rename"),
                onClick: () => this.props.onRenameWikiClick(),
            });
        }

        if (!this._isCodeWiki() && !WikiFeatures.isImmersiveWikiEnabled() && (this._hasEditPermissions() || this._hasManagePermissions()))
        {
            subItems.push({
                key: "security",
                name: WikiResources.WikiSecurityCommand,
                iconProps: bowtieIcon("bowtie-security"),
                onClick: () => this.props.onWikiSecurityClick(),
            });
        }

        if (subItems.length > 0)
        {
            items.push({
                key: "more",
                name: WikiResources.MoreComandsMenuText,
                className: "wiki-more",
                subMenuProps: {
                    items: subItems,
                },
            });
        }

        return items;
    }

    private get _isImmersiveHomePage(): boolean {
        if (!WikiFeatures.isImmersiveWikiEnabled()) {
            return false;
        }

        const storesHubState: AggregateState = this.props.containerProps.storesHub.state;
        const currentPagePath: string = storesHubState.sharedState.urlState.pagePath;
        if (!currentPagePath) {
            return true;
        }

        const homePage: WikiPage = storesHubState.wikiPagesState.homePage;

        return homePage && homePage.path === storesHubState.sharedState.urlState.pagePath;
    }

    @autobind
    private _savePageMetadataBarContainerRef(ref: PageMetadataBarContainer): void {
        this._pageMetadataBarContainer = ref;
    }

    @autobind
    private _saveMarkdownRendererRef(ref: WikiMarkdownRenderer): void {
        this._wikiMarkdownRenderer = ref;
    }

    private _isEditDisabled(): boolean {
        return Boolean(this.props.containerProps.storesHub.state.sharedState.commonState.error);
    }

    private _isNewPageDisabled(): boolean {
        return this._isCodeWiki() || isTemplate(this.props.containerProps.storesHub.state.sharedState.urlState.pagePath);
    }

    private _isCodeWiki(): boolean {
        return this.props.containerProps.storesHub.state.sharedState.commonState.wiki.type === WikiType.CodeWiki;
    }

    private _hasEditPermissions(): boolean {
        return this.props.containerProps.storesHub.state.sharedState.permissionState.hasContributePermission;
    }

    private _hasManagePermissions(): boolean {
        return this.props.containerProps.storesHub.state.sharedState.permissionState.hasManagePermission;
    }

    private _hasRenamePermissions(): boolean {
        return (this._isCodeWiki() && this.props.containerProps.storesHub.state.sharedState.permissionState.hasContributePermission)
            || this.props.containerProps.storesHub.state.sharedState.permissionState.hasRenamePermission;
    }

    private _isEditInDraftVersionDisabled(): boolean {
        const commonState = this.props.containerProps.storesHub.state.sharedState.commonState;
        return this._isEditDisabled() || !(Boolean(commonState.draftVersions) && commonState.draftVersions.length > 0)
    }

    @autobind
    public populateFrameAndPrint(): void {
        // We do not support print in firefox because of the issue: http://kb.mozillazine.org/Problems_printing_web_pages
        if (BrowserCheckUtils.isFirefox()) {
            return;
        }

        const printContent = this._wikiMarkdownRenderer ? this._wikiMarkdownRenderer.getPrintContent : "";
        const pageAuthorInfo: string = this._pageMetadataBarContainer && this._pageMetadataBarContainer.getAuthor()
            ? this._pageMetadataBarContainer.getAuthor().replace("<", "< ").replace(">", " >")
            : "";
        const pageAuthoredDate: string = this._pageMetadataBarContainer && this._pageMetadataBarContainer.getAuthorDate()
            ? this._pageMetadataBarContainer.getAuthorDate().toUTCString()
            : "";

        //printFrame is of type Window (browser dependent), contentDocument and document both dont exist in it at same time
        let printFrame = window.frames["print-frame"];

        // We need links to get all styles for markdown
        let links = "";
        let allLinks = document.getElementsByTagName("link");

        for (let i = 0; i < allLinks.length; i++) {
            links += allLinks[i].outerHTML;
        }

        const metadata = pageAuthorInfo !== ""
            ? `<div class="div-metadata">
                <span class="metadata">
                    ${Utils_String.format(WikiResources.PrintMetaData, pageAuthorInfo, pageAuthoredDate)}
                </span>
            </div>`
            : "";

        const printBody = `<div class="div-body">
            <div class="div-header">
                <div class="div-title">
                    <span class="title">
                        ${this.props.title}
                    </span>
                </div>
                ${metadata}
            </div>
            <hr>
            <div class="div-content">
                ${ printContent}
            </div>
        </div>`;

        const contentDocument = BrowserCheckUtils.isIE() || BrowserCheckUtils.isSafari() ?
            printFrame.document : printFrame.contentDocument;
        contentDocument.write(`<head>${links}</head>`);
        contentDocument.write(`<body>${printBody}</body>`);
        contentDocument.close();

        $(".print-frame").one("load", this._printFrame);
    }

    @autobind
    private _printFrame(): void {
        let printFrame = window.frames["print-frame"];
        const contentWindow = BrowserCheckUtils.isIE() || BrowserCheckUtils.isSafari() ? printFrame : printFrame.contentWindow;
        contentWindow.focus();
        contentWindow.print();
    }
}
