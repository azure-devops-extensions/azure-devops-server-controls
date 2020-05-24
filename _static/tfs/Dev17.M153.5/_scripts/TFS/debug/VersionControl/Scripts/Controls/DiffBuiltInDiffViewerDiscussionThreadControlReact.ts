import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");

import VCDiffBuiltInDiffViewer = require("VersionControl/Scripts/Controls/DiffBuiltInDiffViewer");
import VSS = require("VSS/VSS");

import DiscussionThreadHost_NO_REQUIRE = require("VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost");
import Utils_UI = require("VSS/Utils/UI");

export class BuiltInDiffViewerDiscussionThreadControlReact implements DiscussionThreadHost_NO_REQUIRE.IDiscussionThreadHostListener {

    private _$container: JQuery;
    private _$fillerContainers: JQuery[];
    private _builtInDiffViewer: VCDiffBuiltInDiffViewer.BuiltInDiffViewer;
    private _discussionThread: DiscussionCommon.DiscussionThread;
    private _previousContainerHeight: number;
    private static CONTAINER_PADDING: string = "10px";

    constructor(
        builtInDiffViewer: VCDiffBuiltInDiffViewer.BuiltInDiffViewer,
        discussionThread: DiscussionCommon.DiscussionThread,
        discussionThreadManager: DiscussionOM.DiscussionThreadControlManager,
        $container: JQuery,
        $fillerContainers?: JQuery[],
        positionHorizontalOffset?: number) {

        this._builtInDiffViewer = builtInDiffViewer;

        this._$container = $container;
        this._$fillerContainers = $fillerContainers || [];
        this._discussionThread = discussionThread;
        this._previousContainerHeight = 0;

        $container.data("discussionId", discussionThread.id);

        VSS.using(["VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost"], (reactDiscussion: typeof DiscussionThreadHost_NO_REQUIRE) => {
            if (!this.isDisposed()) {
                reactDiscussion.DiscussionThreadHost.createDiscussionThread(this._$container, discussionThread, this as any);
                this.updateLayout();
            }
        });

        discussionThreadManager.registerThreadControl(this);
    }

    public updateLayout() {
        if (this.isDisposed()) {
            return;
        }

        // update discussion container padding if transitioning from hidden (height 0) to not (or vice versa)
        // this is done programatically instead of in CSS to prevent padding from sticking around when a thread is hidden
        const height: number = this._$container.height();
        if ((!height || !this._previousContainerHeight) && height !== this._previousContainerHeight) {
            this._previousContainerHeight = height;
            this._$container.css("padding-bottom", height ? BuiltInDiffViewerDiscussionThreadControlReact.CONTAINER_PADDING : 0);
        }

        const outerHeight: number = this._$container.outerHeight();
        if (this._$fillerContainers.length) {
            $.each(this._$fillerContainers, (i: number, $fillerContainer: JQuery) => {
                $fillerContainer.height(outerHeight);
            });
        }
    }

    public handleUpdatedThreadId(originalThreadId: number, newThreadId: number) {
    }

    public setSelectedState(selected: boolean, discussionSelectionEventState?: any) {
    }

    public hostShouldUnmount() {
        this.dispose();
    }

    public dispose() {
        if (!this.isDisposed()) {
            const $container = this._$container;
            VSS.using(["VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost"], (reactDiscussion: typeof DiscussionThreadHost_NO_REQUIRE) => {
                reactDiscussion.DiscussionThreadHost.removeDiscussionThread($container);

                if (this._discussionThread &&
                    this._discussionThread.id < 0 &&
                    this._discussionThread.position &&
                    this._builtInDiffViewer) {
                    this._builtInDiffViewer.focusCommentButton(this._discussionThread.position);
                }
            });

            this._$container.remove();
            this._$container = null;
            $.each(this._$fillerContainers, (i: number, $fillerContainer: JQuery) => {
                $fillerContainer.remove();
            });
        }
    }

    public sizeChanged(lockView: boolean): void {
        if (this._builtInDiffViewer) {
            this._builtInDiffViewer.updateLayout();
        }
    }

    public scrollIntoView(): void {
        if (!this.isDisposed()) {
            Utils_UI.Positioning.scrollIntoViewVertical(this._$container, Utils_UI.Positioning.VerticalScrollBehavior.Middle, false, 500);
        }
    }

    public focus(): void {
    }

    public getThread() {
        return this._discussionThread;
    }

    public removeComment(commentId: any) {
        this.sizeChanged(true);
        return false;
    }

    public getCommentControl(commentId: number) {
        return null;
    }

    public updateCommentId(previousCommentId: number, newCommentId: number) {
    }

    private isDisposed(): boolean {
        return !this._$container;
    }
}
