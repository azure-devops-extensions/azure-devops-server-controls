import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { DiscussionHttpClient } from "Presentation/Scripts/TFS/TFS.Discussion.WebApi";

import * as DiscussionCommon from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import * as DiscussionConstants from "Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants";

import { IDiscussionSource, SupportsMarkdownPropertyName, UniqueIDPropertyName } from "VersionControl/Scripts/Sources/IDiscussionSource";

import { PersonMentionTranslator } from "VersionControl/Scripts/Utils/DiscussionUtils";

export class DiscussionSource implements IDiscussionSource {
    private _httpClient: DiscussionHttpClient;
    private _authorId: string;

    constructor(tfsContext: TfsContext, private artifactUri: string) {
        this._httpClient = ProjectCollection.getDefaultConnection().getHttpClient<DiscussionHttpClient>(DiscussionHttpClient);
        this._authorId = tfsContext.currentIdentity.id;
    }

    public queryDiscussionThreadsAsync(iterationId: number, baseId: number): IPromise<DiscussionCommon.DiscussionThread[]> {
        return this._httpClient.beginGetDiscussionThreadsByArtifactUri(this.artifactUri).
            then((threads: DiscussionConstants.DiscussionThread[]) => {
                return PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInThreads(this._convertThreads(threads));
            });
    }

    public commitNewThreadAsync(thread: DiscussionCommon.DiscussionThread): IPromise<DiscussionCommon.DiscussionThread> {
        thread.comments = thread.comments.map(comment => {
            return PersonMentionTranslator.getDefault().translateDisplayNameToStorageKeyInComment(comment);
        });

        return this._httpClient.beginPostNewThread(this._convertCommonThread(thread)).
            then((postedThread: DiscussionConstants.DiscussionThread) => {
                return PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInThread(this._convertThread(postedThread));
            });
    }

    public queryDiscussionThreadAsync(threadId: number, iterationId: number, baseId: number): IPromise<DiscussionCommon.DiscussionThread> {
        throw new Error("not supported");
    }

    public commitCommentAsync(comment: DiscussionCommon.DiscussionComment): IPromise<DiscussionCommon.DiscussionComment> {
        if (comment.id < 0) {
            return this._httpClient.beginPostNewComment(PersonMentionTranslator.getDefault().translateDisplayNameToStorageKeyInComment(comment)).
                then((postedComment: DiscussionConstants.DiscussionComment) => {
                    return PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInComment(this._convertComment(postedComment));
                });
        }
        else {
            return this._httpClient.beginUpdateComment(PersonMentionTranslator.getDefault().translateDisplayNameToStorageKeyInComment(comment)).
                then((postedComment: DiscussionConstants.DiscussionComment) => {
                    return PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInComment(this._convertComment(postedComment));
                });
        }
    }

    public deleteCommentAsync(comment: DiscussionConstants.DiscussionComment): IPromise<void> {
        return this._httpClient.beginDeleteComment(comment.threadId, comment.id).
            then((postedComment: DiscussionConstants.DiscussionComment) => {
                return undefined;
            });
    }

    public updateThreadStatusAsync(thread: DiscussionCommon.DiscussionThread): IPromise<DiscussionCommon.DiscussionThread> {
        return this._httpClient.beginUpdateDiscussion(this._convertCommonThreadForStatusUpdate(PersonMentionTranslator.getDefault().translateDisplayNameToStorageKeyInThread(thread))).
            then((postedThread: DiscussionConstants.DiscussionThread) => {
                return PersonMentionTranslator.getDefault().translateStorageKeyToDisplayNameInThread(this._convertThread(postedThread));
            });
    }

    public createCommentLikeAsync(threadId: number, commentId: number): IPromise<void> {
        throw new Error("not supported");
    }

    public deleteCommentLikeAsync(threadId: number, commentId: number): IPromise<void> {
        throw new Error("not supported");
    }

    public resetCache(): void {
        throw new Error("not supported");
    }

    private _convertComment(comment: DiscussionConstants.DiscussionComment): DiscussionCommon.DiscussionComment {
        const convertedComment = { ...comment } as DiscussionCommon.DiscussionComment;
        convertedComment.canDelete = (comment.author.id == this._authorId);
        return convertedComment;
    }

    private _convertComments(comments: DiscussionConstants.DiscussionComment[]): DiscussionCommon.DiscussionComment[] {
        return comments.map(
            (comment: DiscussionConstants.DiscussionComment): DiscussionCommon.DiscussionComment => {
                return this._convertComment(comment);
            });
    }

    private _convertThread(thread: DiscussionConstants.DiscussionThread): DiscussionCommon.DiscussionThread {
        return {
            id: thread.id,
            artifactUri: null,
            publishedDate: thread.publishedDate,
            lastUpdatedDate: thread.lastUpdatedDate,
            comments: this._convertComments(thread.comments),
            properties: thread.properties,
            workItemId: null,
            status: thread.status,
            commentsCount: thread.comments.length,
            itemPath: thread.properties && thread.properties[DiscussionConstants.DiscussionThreadPropertyNames.ItemPath] && thread.properties[DiscussionConstants.DiscussionThreadPropertyNames.ItemPath].$value,
            position: this._getThreadPosition(thread),
            _links: thread._links,
            isDeleted: thread.isDeleted,

            supportsMarkdown: thread.properties &&
            thread.properties[SupportsMarkdownPropertyName] &&
            thread.properties[SupportsMarkdownPropertyName].$value === 1,
            uniqueId: thread.properties &&
            thread.properties[UniqueIDPropertyName] &&
            thread.properties[UniqueIDPropertyName].$value
        } as DiscussionCommon.DiscussionThread;
    }

    private _convertThreads(threads: DiscussionConstants.DiscussionThread[]): DiscussionCommon.DiscussionThread[] {
        return threads.filter(thread => !thread.workItemId).map<DiscussionCommon.DiscussionThread>(
            (thread: DiscussionConstants.DiscussionThread): DiscussionCommon.DiscussionThread => {
                return this._convertThread(thread);
            });
    }

    private _getClientProperties(thread: DiscussionCommon.DiscussionThread): any {
        const properties: any = {};
        if (thread.supportsMarkdown) {
            properties[SupportsMarkdownPropertyName] = {
                type: DiscussionIntProperty,
                value: 1
            };
        }
        if (thread.uniqueId) {
            properties[UniqueIDPropertyName] = {
                type: DiscussionStringProperty,
                value: thread.uniqueId
            };
        }

        if (thread.itemPath) {
            properties[DiscussionConstants.DiscussionThreadPropertyNames.ItemPath] = {
                type: DiscussionStringProperty,
                value: thread.itemPath
            }
        }

        if (thread.position) {
            properties[DiscussionConstants.DiscussionThreadPropertyNames.StartLine] = {
                type: DiscussionIntProperty,
                value: thread.position.startLine
            }
            properties[DiscussionConstants.DiscussionThreadPropertyNames.EndLine] = {
                type: DiscussionIntProperty,
                value: thread.position.endLine
            }
            properties[DiscussionConstants.DiscussionThreadPropertyNames.StartColumn] = {
                type: DiscussionIntProperty,
                value: thread.position.startColumn
            }
            properties[DiscussionConstants.DiscussionThreadPropertyNames.EndColumn] = {
                type: DiscussionIntProperty,
                value: thread.position.endColumn
            }
            properties[DiscussionConstants.DiscussionThreadPropertyNames.PositionContext] = {
                type: DiscussionStringProperty,
                value: thread.position.positionContext
            }
        }

        return properties;
    }

    private _convertCommonThread(thread: DiscussionCommon.DiscussionThread): DiscussionConstants.DiscussionThread {
        return {
            id: thread.id,
            comments: thread.comments as DiscussionConstants.DiscussionComment[],
            isDeleted: thread.isDeleted,
            properties: this._getClientProperties(thread),
            status: thread.status,
            artifactUri: this.artifactUri,
        } as DiscussionConstants.DiscussionThread;
    }

    private _convertCommonThreadForStatusUpdate(thread: DiscussionCommon.DiscussionThread): DiscussionConstants.DiscussionThread {
        return {
            id: thread.id,
            artifactUri: this.artifactUri,
            status: thread.status,
        } as DiscussionConstants.DiscussionThread;
    }

    private _getThreadPosition(thread: DiscussionConstants.DiscussionThread): DiscussionCommon.DiscussionPosition {
        const getThreadPropertyValue = (propertyName: string) => thread.properties && thread.properties[propertyName] && thread.properties[propertyName].$value;

        if (thread.properties) {
            const startLine = getThreadPropertyValue(DiscussionConstants.DiscussionThreadPropertyNames.StartLine);
            const endLine = getThreadPropertyValue(DiscussionConstants.DiscussionThreadPropertyNames.EndLine);
            const startColumn = getThreadPropertyValue(DiscussionConstants.DiscussionThreadPropertyNames.StartColumn);
            const endColumn = getThreadPropertyValue(DiscussionConstants.DiscussionThreadPropertyNames.EndColumn);
            const positionContext = getThreadPropertyValue(DiscussionConstants.DiscussionThreadPropertyNames.PositionContext);

            if (startLine || endLine || startColumn || endColumn || positionContext) {
                return { startLine, endLine, startColumn, endColumn, positionContext } as DiscussionCommon.DiscussionPosition;
            }
        }

        return null;
    }
}

const DiscussionStringProperty = 'System.String';
const DiscussionIntProperty = 'System.Int32';