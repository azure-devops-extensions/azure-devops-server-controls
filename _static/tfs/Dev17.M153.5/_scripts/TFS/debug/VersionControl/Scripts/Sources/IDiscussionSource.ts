import { DiscussionThread, DiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";

export abstract class IDiscussionSource {
    abstract queryDiscussionThreadsAsync(iterationId: number, baseId: number): IPromise<DiscussionThread[]>;
    abstract queryDiscussionThreadAsync(threadId: number, iterationId: number, baseId: number): IPromise<DiscussionThread>;
    abstract commitNewThreadAsync(thread: DiscussionThread): IPromise<DiscussionThread>;
    abstract commitCommentAsync(comment: DiscussionComment): IPromise<DiscussionComment>;
    abstract deleteCommentAsync(comment: DiscussionComment): IPromise<void>;
    abstract updateThreadStatusAsync(thread: DiscussionThread): IPromise<DiscussionThread>;
    abstract createCommentLikeAsync(threadId: number, commentId: number): IPromise<void>;
    abstract deleteCommentLikeAsync(threadId: number, commentId: number): IPromise<void>;
    abstract resetCache(): void;

    /**
     * Get the name of this interface so that it can be indexed by type name
     */
    static getServiceName(): string { return "IDiscussionSource"; }
}

export const SupportsMarkdownPropertyName = "Microsoft.TeamFoundation.Discussion.SupportsMarkdown";
export const UniqueIDPropertyName = "Microsoft.TeamFoundation.Discussion.UniqueID";
