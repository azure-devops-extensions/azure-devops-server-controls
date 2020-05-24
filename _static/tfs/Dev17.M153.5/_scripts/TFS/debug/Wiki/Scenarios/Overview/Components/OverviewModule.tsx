import * as React from "react";

import { autobind, css } from "OfficeFabric/Utilities";
import { Artifact, IArtifactData } from "VSS/Artifacts/Services";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";
import * as Utils_String from "VSS/Utils/String";
import { IPickListAction } from "VSSUI/Components/PickList/PickList.Props";
import { VssIconType } from "VSSUI/VssIcon";

import { StatefulSplitter } from "Presentation/Scripts/TFS/Components/StatefulSplitter";
import { GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiV2, WikiPage, WikiType } from "TFS/Wiki/Contracts";
import { RepoConstants, WikiActionIds, WikiPageArtifact } from "Wiki/Scripts/CommonConstants";
import { OperationStatus } from "Wiki/Scripts/CommonInterfaces";
import { TelemetryConstants } from "Wiki/Scripts/CustomerIntelligenceConstants";
import {
    getNewPagePathOnMove,
    getPageNameFromPath,
    versionDescriptorToString,
} from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";
import * as WikiPageArtifactHelpers from "Wiki/Scripts/WikiPageArtifactHelpers";
import { getWikiUrl, getWikiUpdateUrl, redirectToUrl } from "Wiki/Scripts/WikiUrls";

import { SharedContainerProps } from "Wiki/Scenarios/Shared/Components/WikiContainer";
import { TelemetryWriter, createWikiEventData } from "Wiki/Scenarios/Shared/Sources/TelemetryWriter";
import { WikiPagesSource } from "Wiki/Scenarios/Shared/Sources/WikiPagesSource";

import * as LinkWorkItemsDialog_Async from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsDialog";
import { LinkWorkItemsSource } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsSource";
import { PageMetadataSource } from "Wiki/Scenarios/Integration/PageMetadataBar/PageMetadataSource";
import { PagePicker } from "Wiki/Scenarios/Integration/PagePicker/PagePicker";
import { TemplateType, WikiPageTemplate } from "Wiki/Scenarios/Integration/TemplatePicker/ActionsHub";
import { TemplatePicker } from "Wiki/Scenarios/Integration/TemplatePicker/TemplatePicker";
import { VersionPicker } from "Wiki/Scenarios/Integration/VersionPicker/VersionPicker";
import { EditPageContainer } from "Wiki/Scenarios/Overview/Components/EditPageContainer";
import { UnpublishWikiDialog } from "Wiki/Scenarios/Publish/Components/UnpublishWikiDialog";
import {
    DeletePageDialog,
    MovePageDialog,
    SetAsHomePageDialog,
    EditInDraftVersionDialog
} from "Wiki/Scenarios/Overview/Components/EditPageDialogs";
import { OverviewContainer } from "Wiki/Scenarios/Overview/Components/OverviewContainer";
import { WikiTreeContainer } from "Wiki/Scenarios/Overview/Components/WikiTreeContainer";
import { FileSource } from "Wiki/Scenarios/Overview/Sources/FileSource";
import { RenameWikiSource } from "Wiki/Scenarios/Overview/Sources/RenameWikiSource";
import { TelemetrySpy } from "Wiki/Scenarios/Overview/Sources/TelemetrySpy";
import { TrialPageIdSourceAsync } from "Wiki/Scenarios/Overview/Sources/TrialPageIdSourceAsync";
import { ViewStoresHub } from "Wiki/Scenarios/Overview/Stores/ViewStoresHub";
import { ViewActionCreator } from "Wiki/Scenarios/Overview/ViewActionCreator";
import {
    ViewActionsHub,
    LinkWorkItemsDialogParams,
    MovePageParams,
    MovePagePickerDialogParams,
    TemplatePickerDialogParams,
} from "Wiki/Scenarios/Overview/ViewActionsHub";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/OverviewModule";

export interface OverviewModuleState {
    expandTree: boolean;
    isDeletePageDialogVisible: boolean;
    isDeleting: boolean;
    isEditing: boolean;
    pagePathToBeDeleted: string;
    isMovePageDialogVisibile: boolean;
    movePageStatus: OperationStatus;
    movePageParams: MovePageParams;
    isLinkWorkItemsDialogVisibile: boolean;
    linkWorkItemsDialogParams: LinkWorkItemsDialogParams;
    isUnpublishWikiDialogVisible: boolean;
    isSetAsHomePageDialogVisibile: boolean;
    setAsHomePageStatus: OperationStatus;
    pagePathToBeSetAsHomePage: string;
    isMovePagePickerDialogVisible: boolean;
    movePagePickerDialogParams: MovePagePickerDialogParams;
    setFocusOnSearcBox: boolean;
    isTemplatePickerOpen: boolean;
    templatePickerParams: TemplatePickerDialogParams;
    isEditInDraftVersionDialogOpen: boolean;
}

export class OverviewModule extends React.Component<SharedContainerProps, OverviewModuleState> {
    private _actionCreator: ViewActionCreator;
    private _storesHub: ViewStoresHub;
    private _telemetrySpy: TelemetrySpy;
    private _wikiTreeContainer: WikiTreeContainer;
    private _focusFilter: boolean;
    private _rightPaneContainerRef: HTMLDivElement;

    constructor(props: SharedContainerProps) {
        super(props);

        const isEditing = props.sharedStoresHub.state.urlState.action === WikiActionIds.Edit;
        this._focusFilter = false;

        this.state = {
            expandTree: !isEditing,
            isDeletePageDialogVisible: false,
            isDeleting: false,
            isEditing: isEditing,
            pagePathToBeDeleted: null,
            isMovePageDialogVisibile: false,
            movePageStatus: OperationStatus.NotStarted,
            movePageParams: null,
            isSetAsHomePageDialogVisibile: false,
            setAsHomePageStatus: OperationStatus.NotStarted,
            pagePathToBeSetAsHomePage: null,
            isMovePagePickerDialogVisible: false,
            movePagePickerDialogParams: null,
            isLinkWorkItemsDialogVisibile: false,
            linkWorkItemsDialogParams: null,
            isUnpublishWikiDialogVisible: false,
            setFocusOnSearcBox: false,
            isTemplatePickerOpen: false,
            templatePickerParams: null,
            isEditInDraftVersionDialogOpen: false,
        };
    }

    public componentWillMount(): void {
        const viewActionsHub = new ViewActionsHub();
        this._storesHub = new ViewStoresHub(this.props.sharedStoresHub, this.props.sharedActionsHub, viewActionsHub);
        this._storesHub.pageDialogsStore.addChangedListener(this._onPageDialogStateChanged);
        const telemetryWriter = new TelemetryWriter();
        this._telemetrySpy = new TelemetrySpy(telemetryWriter, viewActionsHub);
        this._actionCreator = new ViewActionCreator(
            this.props.sharedActionCreator,
            viewActionsHub,
            {
                fileSource: new FileSource(),
                wikiPagesSource: new WikiPagesSource(
                    this._storesHub.state.sharedState.commonState.wiki,
                    this._storesHub.state.sharedState.commonState.wikiVersion,
                ),
                renameWikiSource: new RenameWikiSource(),
                wikiPageIdSource: new TrialPageIdSourceAsync(),
            },
            this._storesHub.getAggregateState,
            this._telemetrySpy,
        );
    }

    public componentDidMount(): void {
        this._storesHub.wikiPagesStore.addChangedListener(this._onWikiPagesStoreChanged);

        const sharedState = this._storesHub.state.sharedState;
        let pagePath = sharedState.urlState.pagePath;

        if (!getPageNameFromPath(pagePath)) {
            // TODO: Should have empty path here on load and revert to the home page path after tree load. To be fixed along with removal of "/" prefix
            pagePath = RepoConstants.RootPath;
        }

        this._actionCreator.loadWikiTree(pagePath);
    }

    public componentDidUpdate(): void {
        if (this.state.expandTree && this._focusFilter) {
            this._wikiTreeContainer.setFilterFocus();
            this._focusFilter = false;
        }
    }

    public componentWillUnmount(): void {
        if (this._storesHub) {
            this._storesHub.pageDialogsStore.removeChangedListener(this._onPageDialogStateChanged);
            this._storesHub.wikiPagesStore.removeChangedListener(this._onWikiPagesStoreChanged);
            this._storesHub.dispose();
            this._storesHub = null;
        }

        if (this._telemetrySpy) {
            this._telemetrySpy.dispose();
            this._telemetrySpy = null;
        }

        this._wikiTreeContainer = null;
        this._actionCreator = null;
    }

    public componentWillReceiveProps(): void {
        const shouldEdit = this._storesHub.state.sharedState.urlState.action === WikiActionIds.Edit;
        if (this.state.isEditing !== shouldEdit) {
            this.setState({ isEditing: shouldEdit, expandTree: !shouldEdit } as OverviewModuleState);
        } else {
            this.setState({ expandTree: undefined } as OverviewModuleState);
        }
    }

    public render(): JSX.Element {
        const state = this._storesHub.state;
        const containerProps = {
            actionCreator: this._actionCreator,
            storesHub: this._storesHub,
            onContentRendered: this.props.sharedActionCreator.notifyContentRendered,
        };

        const overviewContainerProps = {
            actionCreator: this._actionCreator,
            storesHub: this._storesHub,
            onContentRendered: this.props.sharedActionCreator.notifyContentRendered,
            onFilterShortcut: this._filterShortcut,
        };

        const pagePath: string = state.sharedState.urlState.pagePath;
        const leftPaneContent = (): JSX.Element => this.state.isEditing
            ? <EditPageContainer {...containerProps} />
            : <OverviewContainer {...overviewContainerProps} />;

        const rightPaneContent = () => {
            return (
                <div className={"wiki-right-pane"} ref={this._setRightPaneContainerRef}>
                    {this._showVersionPicker()
                        && <VersionPicker
                            wiki={state.sharedState.commonState.wiki}
                            selectedItem={state.sharedState.commonState.wikiVersion}
                            onSelectionChange={this._onWikiVersionChange}
                            getActions={this._getVersionPickerActions}
                            draftVersions={this.props.sharedStoresHub.state.commonState.draftVersions} />}
                    <WikiTreeContainer
                        ref={this._setTreeRef}
                        {...containerProps} />
                </div>);
        };

        const isImmersiveWikiEnabled: boolean = WikiFeatures.isImmersiveWikiEnabled();

        return (
            <div
                className={css("wiki-overview", { edit: this.state.isEditing })}>
                <StatefulSplitter
                    className={"wiki-splitter right-fix"}
                    left={leftPaneContent()}
                    right={rightPaneContent()}
                    vertical={false}
                    collapsedLabel={WikiResources.Pages}
                    fixedSide={"right"}
                    enableToggleButton={true}
                    isExpanded={this.state.expandTree}
                    isFixedPaneVisible={!WikiFeatures.isImmersiveWikiEnabled()}
                />
                {this._getPageDialogs()}
            </div>
        );
    }

    private _getPageDialogs(): JSX.Element {
        const sourcePagePath: string = this.state.movePageParams && this.state.movePageParams.sourcePage && this.state.movePageParams.sourcePage.path;
        const targetPagePath: string = this.state.movePageParams && this.state.movePageParams.targetPage && this.state.movePageParams.targetPage.path;
        const commonState = this._storesHub.state.sharedState.commonState;
        let selectedDraftVersion: GitVersionDescriptor = null;
        if (commonState.draftVersions && commonState.draftVersions.length > 0) {
            selectedDraftVersion = commonState.draftVersions[0];
        }
        return (
            <div className="page-dialogs">
                <DeletePageDialog
                    isOpen={this.state.isDeletePageDialogVisible}
                    onDelete={this._onDelete}
                    onDismiss={this._actionCreator.dismissDeletePageDialog}
                    isDeleting={this.state.isDeleting}
                    pageName={getPageNameFromPath(this.state.pagePathToBeDeleted)}
                />
                <MovePageDialog
                    isOpen={this.state.isMovePageDialogVisibile}
                    onMove={this._onMove}
                    onDismiss={this._actionCreator.dismissMovePageDialog}
                    newPagePath={getNewPagePathOnMove(targetPagePath, sourcePagePath)}
                    oldPagePath={sourcePagePath}
                    repositoryContext={this._storesHub.state.sharedState.commonState.repositoryContext}
                    wiki={this._storesHub.state.sharedState.commonState.wiki}
                    movePageStatus={this.state.movePageStatus}
                />

                {this._renderLinkWorkItemDialog()}
                {this._renderUnpublishWikiDialog()}

                <SetAsHomePageDialog
                    isOpen={this.state.isSetAsHomePageDialogVisibile}
                    onSetAsHomePage={this._onSetAsHomePage}
                    onDismiss={this._actionCreator.dismissSetAsHomePageDialog}
                    oldPagePath={this.state.pagePathToBeSetAsHomePage}
                    repositoryContext={this._storesHub.state.sharedState.commonState.repositoryContext}
                    wiki={this._storesHub.state.sharedState.commonState.wiki}
                    setAsHomePageStatus={this.state.setAsHomePageStatus}
                />
                {   // PagePicker is created every time it is needed so that its stores are created new.
                    this.state.isMovePagePickerDialogVisible &&
                    <PagePicker
                        isOpen={true}
                        title={Utils_String.format(WikiResources.MoveToPagePickerTitle, this.state.movePagePickerDialogParams.sourcePage.path)}
                        text={WikiResources.MovePagePickerDialogText}
                        ctaText={WikiResources.MovePageDialog_MoveButtonText}
                        wiki={this._storesHub.state.sharedState.commonState.wiki}
                        onCTA={this._onMovePagePickerCTA}
                        onCancel={this._actionCreator.dismissMovePagePickerDialog}
                        getPageIsDisabled={this._getPageIsDisabled}
                    />}
                {WikiFeatures.isImmersiveWikiEnabled() &&
                    <TemplatePicker
                        isOpen={this.state.isTemplatePickerOpen}
                        onDismiss={this._actionCreator.dismissTemplatePickerDialog}
                        title={WikiResources.TemplatePickerTitle}
                        wiki={this._storesHub.state.sharedState.commonState.wiki}
                        onSelection={this._addPageWithTemplate}
                    />
                }

                {WikiFeatures.isRichCodeWikiEditingEnabled() &&
                    commonState.wiki.type === WikiType.CodeWiki &&
                    Boolean(commonState.draftVersions) &&
                    Boolean(commonState.draftVersions.length > 0) &&
                    <EditInDraftVersionDialog
                        isOpen={this.state.isEditInDraftVersionDialogOpen}
                        onSelectionChange={this._onPageDialogStateChanged}
                        selectedItem={selectedDraftVersion}
                        onDismiss={this._actionCreator.dismissEditInDraftVersionDialog}
                        draftVersions={commonState.draftVersions}
                        editInSelectedDraftVersion={this._editInSelectedDraftVersion}
                    />
                }
            </div>
        );
    }

    @autobind
    private _setRightPaneContainerRef(element: HTMLDivElement): void {
        this._rightPaneContainerRef = element;
    }

    @autobind
    private _showVersionPicker(): boolean {
        /* Show version picker only if
            1. Current wiki is a Code Wiki
            2. Wiki product documentation FF is ON
        */
        const currentWiki = this.props.sharedStoresHub.getSharedState().commonState.wiki;
        return currentWiki
            && currentWiki.type === WikiType.CodeWiki
            && WikiFeatures.isProductDocumentationEnabled();
    }

    @autobind
    private _onDelete(): void {
        const pagePath = this._storesHub.state.pageDialogsState.pagePathToBeDeleted;
        this._actionCreator.deletePage(pagePath);
    }

    @autobind
    private _onMove(closeOnComplete: boolean): void {
        const moveParams: MovePageParams = this.state.movePageParams;
        this._actionCreator.makePageAsSubPage(
            moveParams.sourcePage,
            moveParams.targetPage,
            moveParams.newOrderInParent,
            true,
            closeOnComplete,
        );
    }

    @autobind
    private _onSetAsHomePage(closeOnComplete: boolean): void {
        this._actionCreator.setPageAsHome(this.state.pagePathToBeSetAsHomePage, closeOnComplete);
    }

    @autobind
    private _onMovePagePickerCTA(selectedPage: WikiPage): IPromise<Boolean> {
        const sourcePage: WikiPage = this.state.movePagePickerDialogParams.sourcePage;
        return this._actionCreator.makePageAsSubPage(sourcePage, selectedPage, null, false);
    }

    @autobind
    private _setTreeRef(wikiTreeContainer: WikiTreeContainer): void {
        this._wikiTreeContainer = wikiTreeContainer;
    }

    @autobind
    private _getPageIsDisabled(targetPage: WikiPage): boolean {
        if (!targetPage) {
            // Default should be false
            return false;
        }

        return !this._actionCreator.isReorderOrReparentPagesAllowed(this.state.movePagePickerDialogParams.sourcePage, targetPage, false);
    }

    private _onPageDialogStateChanged = (): void => {
        const pageDialogsState = this._storesHub.state.pageDialogsState;
        this.setState({
            isDeletePageDialogVisible: pageDialogsState.isDeletePageDialogVisibile,
            isDeleting: pageDialogsState.isDeleting,
            pagePathToBeDeleted: pageDialogsState.pagePathToBeDeleted,
            isMovePageDialogVisibile: pageDialogsState.isMovePageDialogVisibile,
            movePageStatus: pageDialogsState.movePageStatus,
            movePageParams: pageDialogsState.movePageParams,
            isSetAsHomePageDialogVisibile: pageDialogsState.isSetAsHomePageDialogVisibile,
            setAsHomePageStatus: pageDialogsState.setAsHomePageStatus,
            pagePathToBeSetAsHomePage: pageDialogsState.pagePathToBeSetAsHomePage,
            isMovePagePickerDialogVisible: pageDialogsState.isMovePagePickerDialogVisible,
            movePagePickerDialogParams: pageDialogsState.movePagePickerDialogParams,
            isLinkWorkItemsDialogVisibile: pageDialogsState.isLinkWorkItemsDialogVisibile,
            linkWorkItemsDialogParams: pageDialogsState.linkWorkItemsDialogParams,
            isUnpublishWikiDialogVisible: pageDialogsState.isUnpublishWikiDialogVisibile,
            isTemplatePickerOpen: pageDialogsState.isTemplatePickerDialogVisible,
            templatePickerParams: pageDialogsState.templatePickerDialogParams,
            isEditInDraftVersionDialogOpen: pageDialogsState.isEditInDraftVersionDialogVisible,
        } as OverviewModuleState);
    }

    private _renderLinkWorkItemDialog(): JSX.Element {
        const wiki = this._storesHub.state.sharedState.commonState.wiki;
        const linkWorkItemsPagePath = this._getPagePathToLinkWorkItem();
        if (linkWorkItemsPagePath) {
            const wikiPageArtifactData: IArtifactData = {
                id: WikiPageArtifactHelpers.getWikiPageArtifactId(
                    wiki.projectId,
                    wiki.id,
                    linkWorkItemsPagePath,
                ),
                tool: WikiPageArtifactHelpers.Tool,
                type: WikiPageArtifactHelpers.Type,
            };

            return <AsyncLinkWorkItemsDialog
                projectId={wiki.projectId}
                isOpen={this.state.isLinkWorkItemsDialogVisibile}
                message={Utils_String.format(WikiResources.LinkWorkItemsDialogMessage, getPageNameFromPath(linkWorkItemsPagePath))}
                onDismiss={(haveWorkItemsUpdated: boolean) => this._onDismissLinkWorkItemsPageDialog(this.state.linkWorkItemsDialogParams, haveWorkItemsUpdated)}
                artifactLinkName={WikiPageArtifact.Name}
                hostArtifact={new Artifact(wikiPageArtifactData)}
                dialogHeaderLabel={WikiResources.LinkWorkItemsDialogHeaderLabel}
                telemetryEventData={createWikiEventData(TelemetryConstants.LinkWorkItemsToWikiPage)}
            />;
        }

        return null;
    }

    private _renderUnpublishWikiDialog(): JSX.Element {
        if (WikiFeatures.isUnpublishWikiEnabled()
            && this.props.sharedStoresHub.getSharedState().commonState.wiki.type === WikiType.CodeWiki
            && this.state.isUnpublishWikiDialogVisible) {
            const commonState = this._storesHub.state.sharedState.commonState;

            return <UnpublishWikiDialog
                wiki={commonState.wiki}
                repositoryName={commonState.repositoryContext.getRepository().name}
                onDismiss={this._onDismissUnpublishWikiDialog}
                onUnpublished={this._onWikiUnpublished}
                sharedActionsHub={this.props.sharedActionsHub}
            />;
        }

        return null;
    }

    @autobind
    private _onDismissUnpublishWikiDialog(): void {
        this._actionCreator.dismissUnpublishWikiDialog();
    }

    @autobind
    private _onWikiUnpublished(): void {
        this._actionCreator.dismissUnpublishWikiDialog();

        redirectToUrl(getWikiUrl(
            null,
            { wikiIdentifier: null },
            StateMergeOptions.routeValues,
        ));
    }

    @autobind
    private _filterShortcut(): void {
        if (!this.state.isEditing) {
            this._focusFilter = true;
            this.setState({ expandTree: true });
        }
    }

    private _onWikiPagesStoreChanged = (): void => {
        // After the component is mounted, the tree expand state is only changed by user action
        this.setState({ expandTree: undefined });
        this.forceUpdate();
    }

    @autobind
    private _onDismissLinkWorkItemsPageDialog(linkWorkItemsDialogParams: LinkWorkItemsDialogParams, haveWorkItemsUpdated: boolean): void {
        this._actionCreator.dismissLinkWorkItemsPageDialog();
        const pagePathToLinkWorkItems: string = this._getPagePathToLinkWorkItem(linkWorkItemsDialogParams);

        if (haveWorkItemsUpdated && pagePathToLinkWorkItems) {
            const urlState = this._storesHub.state.sharedState.urlState;

            if (pagePathToLinkWorkItems === urlState.pagePath) {
                this._actionCreator.viewActionsHub.linkedWorkItemsUpdated.invoke(null);
            } else {
                // Change overview to wiki page to which work items were linked.
                this._actionCreator.changePath(pagePathToLinkWorkItems);
            }
        }
    }

    private _getPagePathToLinkWorkItem(dialogParams: LinkWorkItemsDialogParams = null): string {
        const linkWorkItemsDialogParams = dialogParams ? dialogParams : this.state.linkWorkItemsDialogParams;

        return linkWorkItemsDialogParams && linkWorkItemsDialogParams.sourcePage
            ? linkWorkItemsDialogParams.sourcePage.path
            : null;
    }

    @autobind
    private _onWikiVersionChange(version: GitVersionDescriptor): void {
        // redirectToUrl() - isInternal is 'false' to force full refresh.
        // TODO: Fix Task 1153173 before making isInternal 'true' to force XHR.
        redirectToUrl(getWikiUrl(
            WikiActionIds.View,
            {
                wikiIdentifier: this._storesHub.state.sharedState.commonState.wiki.name,
                wikiVersion: versionDescriptorToString(version),
            },
            StateMergeOptions.routeValues),
            false);
    }

    @autobind
    private _getVersionPickerActions(): IPickListAction[] {
        // Show version picker actions only if user has repository contribute permission
        if (!this._storesHub.state.sharedState.permissionState.hasContributePermission) {
            return [];
        }

        const currentWiki = this._storesHub.state.sharedState.commonState.wiki;
        const actions: IPickListAction[] = [
            {
                name: WikiResources.VersionPickerPublishVersionActionText,
                disabled: currentWiki.type === WikiType.ProjectWiki,
                iconProps: {
                    iconName: "bowtie-icon bowtie-math-plus-light",
                    iconType: VssIconType.bowtie,
                },
                onClick: this._onAddWikiVersionAction,
            }
        ];

        return actions;
    }

    @autobind
    private _onAddWikiVersionAction(): void {
        // TODO Task 1153729: Version picker does not close the dropdown when an action in it is clicked
        if (this._rightPaneContainerRef) {
            // To toggle version picker dropdown which otherwise does not toggle on action click.
            this._rightPaneContainerRef.click();
        }

        redirectToUrl(getWikiUpdateUrl());
    }

    @autobind
    private _addPageWithTemplate(template?: WikiPageTemplate): void {
        // Close the dialog.
        this._actionCreator.dismissTemplatePickerDialog();

        const templatePickerParams: TemplatePickerDialogParams = this.state.templatePickerParams;
        const pagePath: string = templatePickerParams
            ? templatePickerParams.pagePath
            : null;
        const addPageWithTitle: boolean = templatePickerParams
            ? templatePickerParams.addPageWithTitle
            : false;

        // Pass template name only if the template is not a blank template
        const templateName = (template && template.type == TemplateType.blank)
            ? null
            : template.name;

        this._actionCreator.addPage(
            pagePath,
            false,
            addPageWithTitle,
            templateName,
        );

        this._telemetrySpy.publishPageCreatedWithTemplate();
    }

    // Redirects to the selected draft version in edit in draft version dialog
    @autobind
    private _editInSelectedDraftVersion(version: GitVersionDescriptor): void {
        if (version) {
            this._actionCreator.dismissEditInDraftVersionDialog();
            this._actionCreator.redirectToWikiVersion(version, WikiActionIds.Edit);
        }
    }
}

const AsyncLinkWorkItemsDialog = getAsyncLoadedComponent(
    ["Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsDialog"],
    (m: typeof LinkWorkItemsDialog_Async) => m.LinkWorkItemsDialog
);
