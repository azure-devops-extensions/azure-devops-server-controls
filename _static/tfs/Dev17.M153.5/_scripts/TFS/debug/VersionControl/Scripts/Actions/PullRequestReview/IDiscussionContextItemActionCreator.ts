import { DiscussionThread, DiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";

export interface IDiscussionContextItemActionCreator {
    createThreadAndNavigate(newThread: DiscussionThread, updateDiscussionManager?: boolean): void;
    deleteComment(thread: DiscussionThread, comment: DiscussionComment): void;
}