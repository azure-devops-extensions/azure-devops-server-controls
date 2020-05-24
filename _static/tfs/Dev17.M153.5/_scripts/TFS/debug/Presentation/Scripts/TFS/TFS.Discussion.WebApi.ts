import DiscussionConstants = require("Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants");
import WebApi_RestClient = require("VSS/WebApi/RestClient");

export class DiscussionHttpClient extends WebApi_RestClient.VssHttpClient {

    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public beginGetDiscussionThreadsByArtifactUri(artifactUri: string) {
        return this._beginRequest<DiscussionConstants.DiscussionThread[]>({
            area: DiscussionConstants.DiscussionWebApiConstants.AreaName,
            locationId: DiscussionConstants.DiscussionWebApiConstants.MultipleThreadsLocationId,
            data: {
                artifactUri: artifactUri
            },
            responseType: DiscussionConstants.TypeInfo.DiscussionThread,
            responseIsCollection: true
        });
    }

    public beginPostNewThread(newThread: DiscussionConstants.DiscussionThread) {
        return this._beginRequest<DiscussionConstants.DiscussionThread>({
            area: DiscussionConstants.DiscussionWebApiConstants.AreaName,
            locationId: DiscussionConstants.DiscussionWebApiConstants.MultipleThreadsLocationId,
            httpMethod: 'POST',
            data: newThread,
            responseType: DiscussionConstants.TypeInfo.DiscussionThread
        });
    }

    public beginUpdateDiscussion(thread: DiscussionConstants.DiscussionThread) {
        return this._beginRequest<DiscussionConstants.DiscussionThread>({
            area: DiscussionConstants.DiscussionWebApiConstants.AreaName,
            locationId: DiscussionConstants.DiscussionWebApiConstants.ThreadsLocationId,
            httpMethod: 'PATCH',
            routeValues: {
                discussionId: thread.id,
            },
            data: thread,
            responseType: DiscussionConstants.TypeInfo.DiscussionThread
        });
    }

    public beginPostNewComment(newComment: DiscussionConstants.DiscussionComment) {
        return this._beginRequest<DiscussionConstants.DiscussionComment>({
            area: DiscussionConstants.DiscussionWebApiConstants.AreaName,
            locationId: DiscussionConstants.DiscussionWebApiConstants.CommentsLocationId,
            httpMethod: 'POST',
            routeValues: {
                discussionId: newComment.threadId
            },
            data: newComment,
            responseType: DiscussionConstants.TypeInfo.DiscussionComment
        });
    }

    public beginUpdateComment(comment: DiscussionConstants.DiscussionComment) {
        return this._beginRequest<DiscussionConstants.DiscussionComment>({
            area: DiscussionConstants.DiscussionWebApiConstants.AreaName,
            locationId: DiscussionConstants.DiscussionWebApiConstants.CommentsLocationId,
            httpMethod: 'PATCH',
            routeValues: {
                discussionId: comment.threadId,
                commentId: comment.id
            },
            data: comment,
            responseType: DiscussionConstants.TypeInfo.DiscussionComment
        });
    }

    public beginDeleteComment(discussionId: number, commentId: any) {
        return this._beginRequest({
            area: DiscussionConstants.DiscussionWebApiConstants.AreaName,
            locationId: DiscussionConstants.DiscussionWebApiConstants.CommentsLocationId,
            httpMethod: "DELETE",
            httpResponseType: "html",
            routeValues: {
                discussionId: discussionId,
                commentId: commentId
            }
        });
    }

    public beginGetDiscussionThreadsBatch(artifactUris: string[]) {
        return this._beginRequest<DiscussionConstants.DiscussionThread[]>({
            area: DiscussionConstants.DiscussionWebApiConstants.AreaName,
            locationId: DiscussionConstants.DiscussionWebApiConstants.ThreadsBatchLocationId,
            httpMethod: 'POST',
            data: artifactUris,
            responseType: DiscussionConstants.TypeInfo.DiscussionThread,
            responseIsCollection: true
        });
    }
}
