import * as React from "react";
import { Link } from "OfficeFabric/Link";
import { autobind, css } from "OfficeFabric/Utilities";
import Controls = require("VSS/Controls");
import { getHistoryService } from "VSS/Navigation/Services";
import { DiscussionThread, DiscussionThreadUtils, PositionContext } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { GitPullRequestIteration } from "TFS/VersionControl/Contracts";
import { Notification, NotificationType } from  "VersionControl/Scenarios/Shared/Notifications/NotificationStore";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import Activity = require("VersionControl/Scripts/Components/PullRequestReview/Activities/Activity");
import { DiscussionThreadHost } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost";
import { DiscussionCommentContextButton } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionCommentContextButton";
import { FileLink } from "VersionControl/Scripts/Components/PullRequestReview/FileLink";
import { DiscussionThreadIterationContext } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { Change, GitDiffItem, ChangeListUtils } from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { FileDiff } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { DiffViewerOrientation } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import Format = require("VersionControl/Scripts/Utils/Format");
import VCPullRequestBuiltInDiffViewer = require("VersionControl/Scripts/Controls/PullRequestBuiltInDiffViewer");
import RepositoryContext = require("VersionControl/Scripts/RepositoryContext");
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCFileIconPicker from "VersionControl/Scripts/VersionControlFileIconPicker";
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";

export interface InlineCommentProps extends Activity.IThreadActivityProps {
    pullRequest: IPullRequest;
    iterations: GitPullRequestIteration[];
    change: Change;
    diffItem: GitDiffItem;
    diffCache: IDictionaryStringTo<FileDiff>;
    selectedCommentId: number;
    latestIterationId: number;
    orientation: DiffViewerOrientation;
    repositoryContext: RepositoryContext.RepositoryContext;
}

export interface InlineCommentState extends Activity.IActivityState {
    /**
     * The diff item to use when viewing this thread in its original context
     */
    diffItemInContext?: GitDiffItem;
    /**
     * Whether or not we should use the current diffItemInContext as cached or query for a new one
     */
    diffItemIsCached?: boolean;
    /**
     * Whether or not we are currently viewing the thread in its original context
     */
    viewingDiffItemInContext?: boolean;
}

class InlineComment extends Activity.Component<InlineCommentProps, InlineCommentState> {
    private _controlElement: HTMLElement;
    private _diffViewer: VCPullRequestBuiltInDiffViewer.BuiltInDiffViewer;
    private _diffCache: any;
    private _diffNeedsRefresh: boolean = false;

    constructor(props: InlineCommentProps) {
        super(props);
        this.state = {}
        this._diffViewer = null;
    }

    public componentDidMount(): void {
        // try to show the file diff
        this.componentDidUpdate(this.props, this.state);
    }

    public componentWillUnmount(): void {
        this._diffViewer && this._diffViewer.dispose();
        this._diffViewer = null;
    }

    public componentWillReceiveProps(nextProps: InlineCommentProps): void {
        if (this._getDiffItemhasChanged(nextProps)) {
            this.setState({ diffItemIsCached: false });
        }
    }

    public shouldComponentUpdate(nextProps: InlineCommentProps, nextState: InlineCommentState): boolean {
        this._diffNeedsRefresh = this._getDiffItemhasChanged(nextProps)
            || nextProps.latestIterationId !== this.props.latestIterationId
            || nextState.viewingDiffItemInContext !== this.state.viewingDiffItemInContext
            || !DiscussionThreadUtils.getThreadPositionsAreEqual(nextProps.thread, this.props.thread);

        return nextState.diffItemInContext !== this.state.diffItemInContext
            || nextState.diffItemIsCached !== this.state.diffItemIsCached
            || nextState.viewingDiffItemInContext !== this.state.viewingDiffItemInContext
            || nextProps.latestIterationId !== this.props.latestIterationId
            || nextProps.thread !== this.props.thread
            || nextProps.isNew !== this.props.isNew
            || this._diffNeedsRefresh;
    }

    public componentDidUpdate(prevProps: InlineCommentProps, prevState: InlineCommentState): void {
        const diffWasInitialized: boolean = this._createDiffViewerIfNeeded();
        if (!this._diffViewer || (diffWasInitialized && !this._diffNeedsRefresh)) {
            return;
        }

        // before updating the current diff, set the min height to prevent jumps during switching
        this._controlElement.style.minHeight = this._getDiffViewerHeight() + "px";

        const diffItemToUse: GitDiffItem = this.state.viewingDiffItemInContext ? this.state.diffItemInContext : this.props.diffItem;
        if (!diffItemToUse || !diffItemToUse.item) {
            // if we don't have a valid item for this thread anymore the context must not be valid
            // display a notification allowing the user to view the comment in the original context
            this._displayContextNotification();
        }
        else {
            const iteration: number = this.state.viewingDiffItemInContext ? this.props.thread.secondComparingIteration : this.props.latestIterationId;
            const base: number = this.state.viewingDiffItemInContext ? this.props.thread.firstComparingIteration : 0;

            const newDiffViewerThread: DiscussionThread = { ...this.props.thread };
            DiscussionThreadUtils.updateThreadPositionInContext(newDiffViewerThread, iteration, base);
            
            this._diffViewer._options.discussionThread = newDiffViewerThread;

            // if diff was toggled via a user interaction, we want to animate in the new diff to give the appearance
            // that something is happening even if behind the scenes it happens really fast or instantly
            const diffWasToggled: boolean = this.state.viewingDiffItemInContext !== prevState.viewingDiffItemInContext;
            diffWasToggled
                ? this._diffViewer._element.fadeOut(200, () => this._diffViewer.reshowDiff(this.props.repositoryContext, diffItemToUse, this._onDiffLoaded)).fadeIn(200)
                : this._diffViewer.reshowDiff(this.props.repositoryContext, diffItemToUse, this._onDiffLoaded);
        }
    }

    public render(): JSX.Element {
        // if viewing thread in original context, use the original item path as the file name in the header
        const itemPath: string = 
            (this.state.viewingDiffItemInContext && this.props.thread.trackingCriteria && this.props.thread.trackingCriteria.origFilePath) ||
            (this.props.diffItem && this.props.diffItem.mpath) || 
            this.props.thread.itemPath;

        // if we're viewing the thread in original context, the link to the file should go to that context as well
        let iteration: number = null;
        let base: number = null;
        if (this.state.viewingDiffItemInContext || !this.props.diffItem || !this.props.diffItem.item) {
            iteration = this.props.thread.secondComparingIteration;
            base = DiscussionThreadUtils.getBaseIterationForNav(this.props.thread);
        }

        return this._renderContainer(
            <div className={css("file-icon", "bowtie-icon", VCFileIconPicker.getIconNameForFile(itemPath))} />,
            <div className={"file-header"}>
                <div className={"file-link"}>
                    <FileLink 
                        text={VersionControlPath.getFileName(itemPath)}
                        cssClass={"file-name"}
                        itemPath={itemPath}
                        discussionId={this.props.thread.id}
                        iteration={iteration} 
                        base={base} />
                    {Boolean(this.props.change) && <DiscussionCommentContextButton
                        thread={this.props.thread}
                        isReadOnly={false}
                        viewingThreadInContext={this.state.viewingDiffItemInContext}
                        latestIterationId={this.props.latestIterationId}
                        onViewDiffContext={this._onViewDiffContext}
                        onResetDiffContext={this._onResetDiffContext} />}
                </div>
                <div className={"file-full-path"}>{itemPath}</div>
            </div>,
            this.props.thread.publishedDate,
            <div>
                <div ref={this._setControlElement} />
                <DiscussionThreadHost
                    threadId={this.props.thread.id}
                    iterationContext={DiscussionThreadIterationContext.Latest} />
            </div>,
            null,
            null,
            "inline-comment"
        );
    }

    @autobind
    private _onViewDiffContext(): void {
        const iterationId: number = this.props.thread.secondComparingIteration;
        const baseId: number = this.props.thread.firstComparingIteration;

        // if we don't have the iteration we need, do nothing
        if (!this.props.iterations[iterationId]) {
            return;
        }

        // if we have an item cached already, just transition to using it
        if (this.state.diffItemIsCached) {
            this.setState({ viewingDiffItemInContext: true });
            return;
        }

        const iterationVersion: string = this.props.iterations[iterationId - 1].sourceRefCommit.commitId;
        const baseVersion: string = (baseId === 0 || baseId === iterationId)
            ? this.props.iterations[iterationId - 1].targetRefCommit.commitId
            : this.props.iterations[baseId - 1].sourceRefCommit.commitId;

        const diffItemInContext: GitDiffItem = ChangeListUtils.getDiffItem(this.props.change.item.serverItem, baseVersion, iterationVersion, this.props.change);

        // if we don't have a cached "queried-for" context, we need to re-query 
        // (new pushes could change the changetype in the latest changelist)
        if (diffItemInContext.mpath !== diffItemInContext.opath) {
            const queryPath: string = diffItemInContext.mpath || diffItemInContext.opath;
            const queryVersion: string = diffItemInContext.mpath ? diffItemInContext.oversion : diffItemInContext.mversion;

            // if the paths are different, the latest changelist shows this change as an add/delete/rename
            // we need to query to see if the original context would also show an add/delete/rename as well
            Flux.instance().actionCreator.codeExplorerActionCreator.queryItemDetail(queryPath, "GC" + queryVersion).then(
                (item: ItemModel) => {
                    // successful query - the original context is an edit and not an add/delete/rename
                    // in this case we should set both paths to the successful query path
                    diffItemInContext.mpath = queryPath;
                    diffItemInContext.opath = queryPath;
                    return diffItemInContext;
                },
                (error) => {
                    // failed query - the original context is still an add/delete/rename
                    // in this case, if the failure is in a rename scenario replace the failed paths
                    const contextIsRename: boolean = Boolean(diffItemInContext.mpath) && Boolean(diffItemInContext.opath);
                    const threadOnOriginalPath: boolean = this.props.thread.trackingCriteria && (this.props.thread.trackingCriteria.origFilePath === diffItemInContext.opath);
                    diffItemInContext.mpath = contextIsRename && threadOnOriginalPath ? diffItemInContext.opath : diffItemInContext.mpath;
                    return diffItemInContext;
                }).then((item: GitDiffItem) => {
                    this.setState({
                        diffItemInContext: diffItemInContext,
                        diffItemIsCached: true,
                        viewingDiffItemInContext: true,
                    });
                });
        }
        else {
            this.setState({
                diffItemInContext: diffItemInContext,
                diffItemIsCached: true,
                viewingDiffItemInContext: true,
            });
        }
    }

    @autobind
    private _onResetDiffContext(): void {
        this.setState({ viewingDiffItemInContext: false });
    }

    private _createDiffViewerIfNeeded(): boolean {
        const diffWasInitialized: boolean = Boolean(this._diffViewer);

        if (!this._diffViewer && this._controlElement) {
            this._diffViewer = Controls.BaseControl.createIn(VCPullRequestBuiltInDiffViewer.BuiltInDiffViewer, $(this._controlElement), {
                tfsContext: this.props.tfsContext,
                partialDiff: true,
                expandable: true,
                fixedSize: false,
                orientation: this.props.orientation,
                cache: this.props.diffCache,
                diffCallback: this._cacheFileDiffResults,
                discussionManager: null,
                discussionThreadControlManager: null,
                discussionThread: this.props.thread,
                showFileChangedMessage: false,
                repositoryContext: this.props.repositoryContext,
                change: null,
            }) as VCPullRequestBuiltInDiffViewer.BuiltInDiffViewer;
        }

        return diffWasInitialized;
    }

    private _displayContextNotification(): void {
        const notification = {
            message: VCResources.PullRequest_ActivityFeed_CommentContextNotification,
            type: NotificationType.info,
            specialType: "commentContext",
        } as Notification;

        this._diffViewer.showDiffNotification(notification, {
            "commentContext": () => {
                const link: string = getHistoryService().getFragmentActionLink("files", {
                    path: this.props.thread.itemPath,
                    discussionId: this.props.thread.id,
                    iteration: this.props.thread.secondComparingIteration,
                    base: DiscussionThreadUtils.getBaseIterationForNav(this.props.thread),
                });
                return (
                    <span>
                        {notification.message}
                        <Link href={link}>{VCResources.PullRequest_ActivityFeed_ViewCommentContext}</Link>
                    </span>);
            }
        });

        this._onDiffLoaded();
    }

    @autobind
    private _onDiffLoaded(): void {
        // now that we've loaded the new diff, reset the diff viewer min height
        this._controlElement.style.minHeight = "0px";
    }

    @autobind
    private _setControlElement(controlElement: HTMLElement): void {
        if (controlElement && this._controlElement !== controlElement) {
            this._controlElement = controlElement;
        }
    }

    private _getDiffViewerHeight(): number {
        const diffViewerElement = this._controlElement.getElementsByClassName("vc-diff-viewer")[0];
        return (diffViewerElement && diffViewerElement.clientHeight) || 0;
    }

    protected _getTimelineIconClass(): string {
        return "bowtie-comment-outline";
    }

    private _getDiffItemhasChanged(nextProps: InlineCommentProps): boolean {
        return (!nextProps.diffItem && Boolean(this.props.diffItem))
            || (!nextProps.diffItem && Boolean(this.props.diffItem))
            || (nextProps.diffItem && this.props.diffItem && nextProps.diffItem.item !== this.props.diffItem.item);
    }

    @autobind
    private _cacheFileDiffResults(itemDescription: string, fileDiff: FileDiff): void {
        // this callback may get triggered after the react element has been disposed
        // so we need to ensure we have an HTML element before calling flux
        if (this._controlElement) {
            Flux.instance() 
                && Flux.instance().actionCreator 
                && Flux.instance().actionCreator.codeExplorerActionCreator
                && Flux.instance().actionCreator.codeExplorerActionCreator.cacheFileDiff(itemDescription, fileDiff);
        }
    }
}

export function create(props: InlineCommentProps): JSX.Element {
    return <InlineComment {...props}/>;
}
