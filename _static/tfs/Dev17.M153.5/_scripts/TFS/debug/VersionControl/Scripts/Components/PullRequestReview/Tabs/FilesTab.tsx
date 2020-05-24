/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />
/// <reference types="react-dom" />

import  * as React from "react";
import * as ReactDOM from "react-dom";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { autobind, css } from "OfficeFabric/Utilities";
import { IMenuItemSpec } from "VSS/Controls/Menus";
import { FullScreenHelper } from "VSS/Controls/Navigation";
import { format, defaultComparer } from "VSS/Utils/String";
import { IScenarioDescriptor } from "VSS/Performance";
import VSS_Telemetry = require("VSS/Telemetry/Services");
import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { HubSpinner, Alignment } from "MyExperiences/Scenarios/Shared/Components/HubSpinner";
import { PullRequestStatus } from "TFS/VersionControl/Contracts";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import { PullRequestPermissions } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestPermissionsStore";
import * as ChangeTransformer from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { PullRequestActions } from "VersionControl/Scripts/Stores/PullRequestReview/NavigationStore";
import { DiscussionThreadIterationContext } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { ChangeExplorerPaginationControllerView } from "VersionControl/Scripts/Components/PullRequestReview/ChangeExplorerPaginationControllerView";
import * as DiffViewer from "VersionControl/Scripts/Components/PullRequestReview/DiffViewer";
import * as DiffSummaryViewer from "VersionControl/Scripts/Components/PullRequestReview/DiffSummaryViewer";
import * as FileViewer from "VersionControl/Scenarios/Shared/FileViewers/FileViewer";
import { SearchableSparseFilesTree } from "VersionControl/Scenarios/Shared/Trees/SearchableSparseFilesTree";
import { SparseFilesTreeItemSelectedCallback } from "VersionControl/Scenarios/Shared/SparseFilesTree";
import { FileBar } from "VersionControl/Scripts/Components/PullRequestReview/FileBar";
import * as IterationSelector from "VersionControl/Scripts/Components/PullRequestReview/IterationSelector";
import { DiscussionFilter } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionFilter";
import Mixins = require("VersionControl/Scripts/Components/PullRequestReview/Mixins");
import { NotificationBarContainer } from "VersionControl/Scripts/Components/PullRequestReview/NotificationBarContainer";
import { NavigationActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/NavigationActionCreator";
import { IDiscussionContextItemActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionContextItemActionCreator";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { DiffViewerOrientation, VersionControlUserPreferences } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { Change, ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

/**
 * Rendering engine used to inject files view into older page lifecycle.
 */
export module FilesRenderer {
    export function attachTab(element: HTMLElement): void {
        ReactDOM.render(
            <FilesTab />,
            element);
    }
}

interface IFilesTabProps extends Mixins.IScenarioComponentProps {
}

interface IFilesMainProps extends DiffSummaryViewer.IDiffSummaryViewerProps,
                                  DiffViewer.IDiffViewerProps,
                                  FileViewer.IFileViewerProps {
    isDirectory: boolean;
    isFile: boolean;
    isEdit: boolean;
    isLoading: boolean;
    pullRequest: IPullRequest;
    permissions: PullRequestPermissions;
    linesDeleted?: number;
    linesAdded?: number;
    changeList: ChangeTransformer.ChangeList;
    selectedPath: string;
    selectedDiscussionId?: number;
    isVisible: boolean;
    itemDetail: ItemModel;
}

interface IFilesState extends IFilesMainProps {
    reviewerItems: ReviewerItem[];
    fileThreads: DiscussionThread[];
    threadCounts: IDictionaryNumberTo<number>,
    filter: DiscussionType;
    previousFilter: DiscussionType;
    pullRequestExists: boolean;
    sourceRepositoryContext: RepositoryContext;
}

/**
 * The files tab. Manages state for files rendering children.
 */
class FilesTab extends Mixins.TabFrame<IFilesTabProps, IFilesState> {
    constructor(props) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        if (!this.state.pullRequestExists) {
            return null;
        }

        return this.renderFrameNoFullPageScroll(
            <FilesPanel
                reviewerItems={this.state.reviewerItems}
                changeList={this.state.changeList}
                isLoading={this.state.isLoading}
                isVisible={this.state.isVisible}
                pullRequest={this.state.pullRequest}
                repositoryContext={this.state.repositoryContext}
                tfsContext={this.state.tfsContext}
                selectedPath={this.state.selectedPath}
                selectedDiscussionId={this.state.selectedDiscussionId}
                fileThreads={this.state.fileThreads}
                threadCounts={this.state.threadCounts}
                filter={this.state.filter}
                previousFilter={this.state.previousFilter}
                permissions={this.state.permissions}
                onChangesFiltered={this._changesFilteredCallback}
                onFilterSelected={this._filterSelectedCallback}
                onFileTreeItemSelected={this._fileTreeItemSelectedCallback} />,
            <FilesMain
                changeList={this.state.changeList}
                discussionManager={this.state.discussionManager}
                isEdit={this.state.isEdit}
                isDirectory={this.state.isDirectory}
                isFile={this.state.isFile}
                isDelete={this.state.isDelete}
                isVisible={this.state.isVisible}
                isLoading={this.state.isLoading}
                pullRequest={this.state.pullRequest}
                permissions={this.state.permissions}
                linesAdded={this.state.linesAdded}
                linesDeleted={this.state.linesDeleted}
                repositoryContext={this.state.repositoryContext}
                tfsContext={this.state.tfsContext}
                displayMode={this.state.displayMode}
                orientation={this.state.orientation}
                selectedDiffItem={this.state.selectedDiffItem}
                selectedPath={this.state.selectedPath}
                selectedDiscussionId={this.state.selectedDiscussionId}
                itemDetail={this.state.itemDetail}
                onError={this.state.onError}
                onOrientationChange={this.state.onOrientationChange} />,
            true,
            "Git.PullRequestDetails.LeftHubSplitter");
    }

    public componentDidMount() {
        super.componentDidMount();

        this._notifyContentRendered();

        Flux.instance().storesHub.contextStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.discussionsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.codeExplorerStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.repositoryItemDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.userPreferencesStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.fileLineDiffCountStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.featureAvailabilityStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.navigationStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._onChange);
    }

    public componentDidUpdate(): void {
        super.componentDidUpdate();
        this._notifyContentRendered();
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        Flux.instance().storesHub.contextStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.discussionsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.codeExplorerStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.repositoryItemDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.userPreferencesStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.fileLineDiffCountStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.featureAvailabilityStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.navigationStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): IFilesState {
        const isLoading = 
            Flux.instance().storesHub.contextStore.isLoading() ||
            Flux.instance().storesHub.codeExplorerStore.isLoadingSelected() ||
            Flux.instance().storesHub.pullRequestDetailStore.isLoading() ||
            Flux.instance().storesHub.featureAvailabilityStore.isLoading() ||
            Flux.instance().storesHub.discussionsStore.isLoading() ||
            Flux.instance().storesHub.userPreferencesStore.isLoading() ||
            Flux.instance().storesHub.permissionsStore.isLoading();

        if (isLoading) {
            return {
                isLoading
            } as IFilesState;
        }

        const selection: ChangeTransformer.ISelectedTreeItem = Flux.instance().storesHub.codeExplorerStore.getSelectedItem();
        const selectedPath: string = selection ? selection.path : null;
        const changeList: ChangeTransformer.ChangeList = Flux.instance().storesHub.codeExplorerStore.getSelectedIterationChangeList();
        const respositoryContext = Flux.instance().storesHub.contextStore.getRepositoryContext();
        const selectedDiffItem: ChangeTransformer.GitDiffItem = selection ? selection.gitDiffItem : null;
        const prefs: VersionControlUserPreferences = Flux.instance().storesHub.userPreferencesStore.getPreferences();

        const filter: DiscussionType = Flux.instance().storesHub.discussionsStore.getSelectedDiscussionCollapseFilter();
        const filteredPaths: string[] = Flux.instance().storesHub.codeExplorerStore.getFilteredPaths();
        const threadCounts: IDictionaryNumberTo<number> = Flux.instance().storesHub.discussionsStore.getDiscussionCountByType(
            [ DiscussionType.AllComments, DiscussionType.AllActiveComments, DiscussionType.AllResolvedComments, DiscussionType.New, DiscussionType.Mine, DiscussionType.Expanded ],
            { 
                excludeTypes: DiscussionType.Comment | DiscussionType.AllNonComments, 
                paths: filteredPaths,
                includePending: true, 
            });
        const fileThreads: DiscussionThread[] = Flux.instance().storesHub.discussionsStore.getDiscussionThreads({ 
            types: filter,
            excludeTypes: DiscussionType.Comment, // exclude PR comments
            includePending: true, 
            includeCollapsed: false,
        });

        return {
            tfsContext: Flux.instance().storesHub.contextStore.getTfsContext(),
            repositoryContext: respositoryContext,
            sourceRepositoryContext: Flux.instance().storesHub.pullRequestDetailStore.getSourceRepositoryContext(),
            pullRequest: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail(),
            pullRequestExists: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestExists(),
            permissions: Flux.instance().storesHub.permissionsStore.getPermissions(),
            linesAdded: Flux.instance().storesHub.fileLineDiffCountStore.getLinesAdded(selectedPath, selectedDiffItem, respositoryContext),
            linesDeleted: Flux.instance().storesHub.fileLineDiffCountStore.getLinesDeleted(selectedPath, selectedDiffItem, respositoryContext),
            discussionManager: Flux.instance().storesHub.discussionManagerStore.getDiscussionManager(),
            itemDetail: Flux.instance().storesHub.repositoryItemDetailStore.getItemDetail(),
            changeList: changeList,
            selectedPath: selectedPath,
            selectedDiscussionId: Flux.instance().storesHub.discussionsStore.getSelectedDiscussionId(),
            fileThreads: fileThreads,
            threadCounts: threadCounts,
            orientation: prefs ? prefs.diffViewerOrientation : null,
            displayMode: prefs ? prefs.changeExplorerGridDisplayMode : null,
            filter: filter,
            previousFilter: Flux.instance().storesHub.discussionsStore.getPreviousDiscussionCollapseFilter(),
            isDelete: selection ? selection.isDelete() : false,
            isEdit: selection ? selection.isEdit() : false,
            isDirectory: selection ? selection.isDirectory() : false,
            isFile: selection ? selection.isFile() : false,
            selectedDiffItem: selectedDiffItem,
            reviewerItems: Flux.instance().storesHub.reviewersStore.getReviewers(),
            isVisible: Flux.instance().storesHub.navigationStore.getCurrentTab() === PullRequestActions.Files,
            isLoading,
            onOrientationChange: this._orientationChangeCallback,
            onError: this._onErrorCallback,
        }
    }

    private _notifyContentRendered(): void {
        if (!this.state.isLoading) {
            Flux.instance().actionCreator.notifyMainContentRendered();
        }
    }

    public shouldComponentUpdate(nextProps: IFilesTabProps, nextState: IFilesState): boolean {
        if ((nextState.isLoading && this.state.isLoading) || !nextState.isVisible) {
            // if we are still loading, or if the tab is not currently visible don't bother to re-render
            return false; 
        }
        return true;
    }

    @autobind
    private _onErrorCallback(error: any): void {
        Flux.instance().actionCreator.codeExplorerActionCreator.raiseError(error);
    }

    /**
     * The diff viewer orientation can change inside the control and it will reset user preferences.
     * Since we maintain state on the page, we need to know if it changed so we can update our internal store.
     * in case you select another file or a push comes in.
     *
     * @param orientation - the new orientation
     */
    @autobind
    private _orientationChangeCallback(orientation: DiffViewerOrientation): void {
        Flux.instance().actionCreator.userPreferenceActionCreator.updateDiffViewerOrientation(orientation);
    }

    @autobind
    private _filterSelectedCallback(filter: DiscussionType): void {
        const telemetryEvent = new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_FILTER_FILES_FEATURE, {
                collpaseFilter: filter,
                collapseFilterString: DiscussionType[filter],
            });
        VSS_Telemetry.publishEvent(telemetryEvent);

        Flux.instance().actionCreator.discussionActionCreator.updateDiscussionCollapseFilter(filter);
    }

    @autobind
    private _fileTreeItemSelectedCallback(path: string, discussionId?: number, depth?: number): void {
        Flux.instance().actionCreator.navigationActionCreator.navigateWithState({ path, discussionId: discussionId || null });

        if (discussionId && discussionId === this.state.selectedDiscussionId) {
            // wait until after the previous select has been rendered so a repeat comment selection will still scroll
            Flux.instance().actionCreator.discussionActionCreator.selectComment(null, null);
            setTimeout(() => Flux.instance().actionCreator.discussionActionCreator.selectComment(discussionId, null), 0);
        }
    }

    @autobind
    private _changesFilteredCallback(changes: Change[]): void {
        Flux.instance().actionCreator.codeExplorerActionCreator.setFilteredChanges(changes);
    }
}

export interface IIterationsSectionProps extends Mixins.IScenarioComponentProps {
}

interface IIterationsSectionState {
    isLoading: boolean;
    isVisible: boolean;
    pullRequest: IPullRequest;
    iterations: ChangeTransformer.IIterationDetail[];
    latestIterationId: number;
    selectedIterationId: number;
    selectedBaseIterationId: number;
    iterationWatermark: number;
    pendingPushNotifications: number;
    targetChangedNotification: boolean;
}

class IterationsSection extends Mixins.DiagnosticComponent<IIterationsSectionProps, IIterationsSectionState> {
    constructor(props) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        // don't render if there is no latest iteration id (old PR)
        if (this.state.latestIterationId === 0) {
            return null;
        }

        return (
            <IterationSelector.IterationSelector
                iterations={this.state.iterations}
                selectedIterationId={this.state.selectedIterationId}
                selectedBaseIterationId={this.state.selectedBaseIterationId}
                latestIterationId={this.state.latestIterationId}
                iterationWatermark={this.state.iterationWatermark}
                pendingPushNotifications={this.state.pendingPushNotifications}
                targetChangedNotification={this.state.targetChangedNotification}
                iterationsSupported={this.state.pullRequest && this.state.pullRequest.supportsIterations}
                isVisible={this.state.isVisible}
                onIterationSelected={this._onIterationSelected}
                onPushNotificationsCleared={this._onPushNotificationsCleared} />
        );
    }

    public componentDidMount(): void {
        super.componentDidMount();

        Flux.instance().storesHub.codeExplorerStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.notificationStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();

        Flux.instance().storesHub.codeExplorerStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.notificationStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    public shouldComponentUpdate(nextProps: IIterationsSectionProps, nextState: IIterationsSectionState): boolean {
        return this.state.isLoading !== nextState.isLoading
            || this.state.isVisible !== nextState.isVisible
            || this.state.iterations !== nextState.iterations
            || this.state.selectedIterationId !== nextState.selectedIterationId
            || this.state.selectedBaseIterationId !== nextState.selectedBaseIterationId
            || this.state.latestIterationId !== nextState.latestIterationId
            || this.state.iterationWatermark !== nextState.iterationWatermark
            || this.state.pendingPushNotifications !== nextState.pendingPushNotifications;
    }

    private _getStateFromStores(): IIterationsSectionState {
        return {
            latestIterationId: Flux.instance().storesHub.codeExplorerStore.getLatestIterationId(),
            iterations: Flux.instance().storesHub.codeExplorerStore.getIterations(),
            selectedIterationId: Flux.instance().storesHub.codeExplorerStore.getSelectedIterationId(),
            selectedBaseIterationId: Flux.instance().storesHub.codeExplorerStore.getSelectedBaseIterationId(),
            iterationWatermark: Flux.instance().storesHub.codeExplorerStore.getLastAcknowledgedIterationId(),
            pendingPushNotifications: Flux.instance().storesHub.codeExplorerStore.getNewPushesCount(),
            targetChangedNotification: Flux.instance().storesHub.codeExplorerStore.getTargetChanged(),
            pullRequest: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail(),
            isVisible: Flux.instance().storesHub.navigationStore.getCurrentTab() === PullRequestActions.Files,
            isLoading: Flux.instance().storesHub.pullRequestDetailStore.isLoading() ||
                Flux.instance().storesHub.codeExplorerStore.isLoading()
        };
    }

    @autobind
    private _onIterationSelected(iteration: number, base: number): void {
        // if selecting the latest, set the iteration to null to remove it from the navigation context
        iteration = (iteration === this.state.latestIterationId && !base) ? null : iteration;
        base = base || null;

        // send out the navigation to the new iteration selection
        // reset the path and discussion (since these may not exist in the new compared view)
        Flux.instance().actionCreator.navigationActionCreator.navigateWithState({
            iteration: iteration,
            base: base,
            path: null,
            discussionId: null,
        });

        // if navigating would not have triggered an iteration change, manually trigger it
        const currentState = NavigationActionCreator.getState();
        if (!iteration && !currentState.iteration) {
            Flux.instance().actionCreator.codeExplorerActionCreator.selectIteration(this.state.latestIterationId);
        }
    }

    @autobind
    private _onPushNotificationsCleared(): void {
        Flux.instance().actionCreator.clearNewPushes();
    }
}

interface IFilesProps {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    isLoading: boolean;
    isVisible: boolean;
    pullRequest: IPullRequest;
    changeList: ChangeTransformer.ChangeList;
    selectedPath: string;
    selectedDiscussionId?: number;
    reviewerItems: ReviewerItem[];
    fileThreads: DiscussionThread[];
    threadCounts: IDictionaryNumberTo<number>;
    filter: DiscussionType;
    previousFilter: DiscussionType;
    onFileTreeItemSelected: SparseFilesTreeItemSelectedCallback;
    permissions: PullRequestPermissions;
    onFilterSelected(filter: DiscussionType): void;
    onChangesFiltered(changes: Change[]): void;
}

class FilesPanel extends React.Component<IFilesProps, {}> {
    public render(): JSX.Element {
        const typesToInclude = [
            DiscussionType.AllComments,
            DiscussionType.AllActiveComments,
            DiscussionType.AllResolvedComments,
            DiscussionType.New,
            this.props.permissions.addEditComment && DiscussionType.Mine,
            DiscussionType.None
        ].filter(t => t === DiscussionType.None || Boolean(t));

        return (
            <div role="region" aria-label={VCResources.PullRequest_FilesTab_TreeRegionLabel} className="vc-pullrequest-leftpane-section files-tab">
                <div className="iteration-and-filter-selection">
                    <IterationsSection />
                    <DiscussionFilter
                        filter={this.props.filter}
                        previousFilter={this.props.previousFilter}
                        typesToInclude={typesToInclude}
                        threadCounts={this.props.threadCounts}
                        onFilterSelected={this.props.onFilterSelected}
                        useShorthand={true}  />
                </div>

                {!this.props.isLoading && <ChangeExplorerPaginationControllerView />}

                {this.props.isLoading &&
                    <div className="loading-update">
                        <HubSpinner alignment={Alignment.center} labelText={VCResources.PullRequest_LoadingUpdate} delay={100} />
                    </div>}

                {!this.props.isLoading && <SearchableSparseFilesTree
                    // we only need to full page navigate if a fork is linking to a different source repo
                    isFullPageNavigate={this.props.pullRequest && this.props.pullRequest.isFork}
                    disableAddThread={!this.props.permissions.addEditComment}
                    tfsContext={this.props.tfsContext}
                    repositoryContext={this.props.repositoryContext}
                    changes={this.props.changeList && this.props.changeList.legacyChangeList().changes}
                    version={this.props.changeList && this.props.changeList.version}
                    allChangesIncluded={this.props.changeList && this.props.changeList.allChangesIncluded}
                    threads={this.props.fileThreads}
                    rootName={this.props.repositoryContext.getRepository().name}
                    sourceBranchName={this.props.pullRequest.sourceFriendlyName}
                    selectedFullPath={this.props.selectedPath}
                    pathComparer={defaultComparer}
                    selectedDiscussion={this.props.selectedDiscussionId}
                    isVisible={this.props.isVisible}
                    useBranchForNavigation={this.props.pullRequest.status === PullRequestStatus.Active && !this.props.pullRequest.isFork}
                    onItemSelected={this.props.onFileTreeItemSelected}
                    onChangesFiltered={this.props.onChangesFiltered}
                    discussionActionCreator={Flux.instance().actionCreator.discussionActionCreator} />}
            </div>
        );
    }
}

interface IDisplayStyle {
    display: string;
}

interface ITabContainerProps {
    className?: string;
    style?: IDisplayStyle;
}

class TabContainer extends React.Component<ITabContainerProps, {}> {
    public render(): JSX.Element {
        return (<div className={this.props.className} style={this.props.style} >
            {this.props.children}
        </div>);
    }
}

/**
 * This is the main file viewer. Note that we are rendering divs with show/hide because we want the
 * iframes to stick around, even if nothing is selected -- this is to prevent them from re-loading the editor.
 */
class FilesMain extends React.Component<IFilesMainProps, {}> {
    public render(): JSX.Element {

        // we don't really want to start rendering our controls
        // until we have enough detail
        if (!this._shouldStartRendering()) {
            return <NotificationBarContainer />;
        }

        return (
            <div role="region" aria-label={VCResources.PullRequest_FilesTab_DiffRegionLabel} className="files-main-container">
                <NotificationBarContainer />
                <div className="files-main-viewer-container">
                    <FileBar
                        path={this.props.selectedPath}
                        style={this._fileBarStyle()}
                        linesDeleted={this.props.linesDeleted}
                        linesAdded={this.props.linesAdded} />
                    {!this.props.isFile && !this.props.isDirectory && 
                        <MessageBar>
                            {format(VCResources.DiffFileFolderNotFoundInChangelist, this.props.selectedPath)}
                        </MessageBar>}
                    <TabContainer 
                        className="summaryContainer vc-change-summary absolute-fill v-scroll-auto"
                        style={this._summaryStyle()}>
                        <DiffSummaryViewer.DiffSummaryViewer
                            isVisible={this.props.isDirectory}
                            discussionManager={this.props.discussionManager}
                            repositoryContext={this.props.repositoryContext}
                            selectedDiffItem={this.props.selectedDiffItem}
                            displayMode={this.props.displayMode}
                            orientation={this.props.orientation}
                            changeList={this.props.changeList}
                            tfsContext={this.props.tfsContext}
                            onOrientationChange={this.props.onOrientationChange}
                            additionalMenuItems={this._additionalPullRequestActionMenuItems}/>
                    </TabContainer>
                    <TabContainer 
                        className={css("diffContainer", { "inline": this.props.orientation === DiffViewerOrientation.Inline })} 
                        style={this._diffStyle()}>
                        <DiffViewer.DiffViewer
                            isVisible={this.props.isEdit}
                            selectedDiffItem={this.props.selectedDiffItem}
                            discussionManager={this.props.discussionManager}
                            selectedDiscussionId={this.props.selectedDiscussionId}
                            orientation={this.props.orientation}
                            repositoryContext={this.props.repositoryContext}
                            onError={this.props.onError}
                            onOrientationChange={this.props.onOrientationChange} />
                    </TabContainer>
                    <TabContainer 
                        className="fileContainer" 
                        style={this._fileStyle()}>
                        <FileViewer.FileViewer
                            isVisible={!this.props.isEdit && !this.props.isDirectory}
                            itemDetail={this.props.itemDetail}
                            isDelete={this.props.isDelete}
                            discussionManager={this.props.discussionManager}
                            disableInitialPreview={true}
                            selectedDiscussionId={this.props.selectedDiscussionId}
                            repositoryContext={this.props.repositoryContext}
                            tfsContext={this.props.tfsContext}
                            cssClass={"vc-pullrequest-details-content"} />
                    </TabContainer>
                </div>
            </div>
        );
    }

    private _shouldStartRendering(): boolean {
        // because of the expense of the jquery diff controls
        // we don't want to unmount them after they are mounted
        // so we want to be careful what we check for in this method
        // for example, if the changelist gets set to null we still want to render
        // otherwise the components would be unmounted
        // so the only things we want here are the things we *need* on load
        return this.props.repositoryContext !== null
            && this.props.tfsContext !== null
            && this.props.discussionManager !== null;
    }

    private _diffStyle(): IDisplayStyle {
        return { display: (this.props.isFile && this.props.isEdit && this.props.selectedDiffItem) ? "" : "none" };
    }

    private _summaryStyle(): IDisplayStyle {
        return { display: (this.props.isDirectory) ? "" : "none" };
    }

    private _fileStyle(): IDisplayStyle {
        return { display: (!this.props.isEdit && this.props.isFile && this.props.itemDetail) ? "" : "none" };
    }

    private _fileBarStyle(): IDisplayStyle {
        return { display: (this.props.isFile) ? "" : "none" };
    }

    @autobind
    private _additionalPullRequestActionMenuItems(): IMenuItemSpec[] {
        const menuItems: IMenuItemSpec[] = [];
        const isFullScreen = FullScreenHelper.getFullScreen() || false;

        menuItems.push({
            id: "fullscreen-button",
            showText: false,
            icon: isFullScreen ? "bowtie-icon bowtie-view-full-screen-exit" : "bowtie-icon bowtie-view-full-screen",
            title: isFullScreen ? VCResources.ExitFullScreenMode : VCResources.EnterFullScreenModeTooltip,
            action: () => {
                const isFullScreen = FullScreenHelper.getFullScreen();
                FullScreenHelper.setFullScreen(!isFullScreen, true, true, false);

                // Toggling full screen may require a redraw/layout of controls such as the virtualized Change Explorer grid 
                // that typically update on a window resize.So, we trigger the window.resize event.
                $(window).trigger("resize");

                Flux.instance().actionCreator.toggleFullScreen(!isFullScreen);
            },
        });

        return menuItems;
    }
}
