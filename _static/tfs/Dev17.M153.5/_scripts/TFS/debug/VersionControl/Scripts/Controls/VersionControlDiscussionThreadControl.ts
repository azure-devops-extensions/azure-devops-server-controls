import VSS = require("VSS/VSS");
import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import DiscussionCommonUI = require("Presentation/Scripts/TFS/TFS.Discussion.Common.UI");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import DiscussionThreadHost_NO_REQUIRE = require("VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost");

export class VersionControlDiscussionThreadControlReact {
    private _$container: JQuery;

    constructor($container: JQuery, discussionThread: DiscussionCommon.DiscussionThread) {
        this._$container = $container;
        VSS.using(["VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost"], (reactDiscussion: typeof DiscussionThreadHost_NO_REQUIRE) => {
            reactDiscussion.DiscussionThreadHost.createDiscussionThread(this._$container, discussionThread, this as any);
        });

    }

    public dispose() {
        VSS.using(["VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost"], (reactDiscussion: typeof DiscussionThreadHost_NO_REQUIRE) => {
            if (this._$container) {
                reactDiscussion.DiscussionThreadHost.removeDiscussionThread(this._$container);
                this._$container = null;
            }
        });
    }

    public hostShouldUnmount() {
        this.dispose();
    }

    public sizeChanged(lockView: boolean): void { }
    public scrollIntoView(): void { }
    
    public getElement() {
        return this._$container;
    }

    public appendTo($container: JQuery) {
    }

    public updateCommentSizes() {
    }

    public isSelected() {
        return false;
    }

    public setSelectedState(selected: boolean, state?: any) {
    }

    public setSelectedCommentControl(commentControlToSelect) {
    }

    public isExpanded() {
        return false;
    }

    public setExpandedState(expanded: boolean, fireResizeEvent: boolean) {
    }

    public toggleExpandedState() {
    }

    public addNewComment(newComment: DiscussionCommon.DiscussionComment) {
    }

    public _createCommentControl(comment: DiscussionCommon.DiscussionComment) {
    }

    public updateCommentId(previousCommentId: number, newCommentId: number) {
    }

    public removeComment(commentId: any) {
        return false;
    }

    public handleUpdatedThreadId(originalThreadId: number, newThreadId: number) {
    }

    public handleCommentsRedraw() {
    }

    public getCommentControl(commentId: number) {
        return null;
    }

    protected drawComments($container: JQuery, comments: DiscussionCommon.DiscussionComment[]) {
    }
}