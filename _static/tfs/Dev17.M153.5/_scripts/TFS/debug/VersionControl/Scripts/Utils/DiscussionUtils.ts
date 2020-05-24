import Q = require("q");
import * as DiscussionCommon from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { MentionProcessor } from "Mention/Scripts/TFS.Mention";

export class PersonMentionTranslator {
    private static _defaultInstance;
    private _mentionProcessor: MentionProcessor = null;

    constructor() {
        this._mentionProcessor = MentionProcessor.getDefault();
    }

    public static getDefault(): PersonMentionTranslator {
        if (!PersonMentionTranslator._defaultInstance) {
            PersonMentionTranslator._defaultInstance = new PersonMentionTranslator();
        }

        return PersonMentionTranslator._defaultInstance;
    }

    /**
     *
     * Methods to translate storage key to display name of person mention
     */

    public translateStorageKeyToDisplayNameInThreads(threads: DiscussionCommon.DiscussionThread[]): IPromise<DiscussionCommon.DiscussionThread[]> {
        if (threads) {
            return Q.all(threads.map(thread => this.translateStorageKeyToDisplayNameInThread(thread)));
        } else {
            return Q.resolve(null);
        }
    }

    public translateStorageKeyToDisplayNameInThread(thread: DiscussionCommon.DiscussionThread): IPromise<DiscussionCommon.DiscussionThread> {
        return this.translateStorageKeyToDisplayNameInComments(thread.comments)
            .then(translatedComments => {
                thread.comments = translatedComments;
                return thread;
            });
    }

    public translateStorageKeyToDisplayNameInComments(comments: DiscussionCommon.DiscussionComment[]): IPromise<DiscussionCommon.DiscussionComment[]> {
        if (comments) {
            return Q.all(comments.map(comment => this.translateStorageKeyToDisplayNameInComment(comment)));
        } else {
            return Q.resolve(null);
        }
    }

    public translateStorageKeyToDisplayNameInComment(comment: DiscussionCommon.DiscussionComment): IPromise<DiscussionCommon.DiscussionComment> {
        if (comment) {
            return this.translateStorageKeyToDisplayNameInText(comment.content)
                .then(translatedContent => {
                    comment.content = translatedContent;
                    return comment;
                })
                .then(contentUpdatedComment => {
                    return this.translateStorageKeyToDisplayNameInText(contentUpdatedComment.newContent)
                        .then(translatedNewContent => {
                            contentUpdatedComment.newContent = translatedNewContent;
                            return contentUpdatedComment;
                        });
                });
        } else {
            return Q.resolve(comment);
        }
    }

    public translateStorageKeyToDisplayNameInText(untranslatedText: string): IPromise<string> {
        if (this._mentionProcessor) {
            return Q.resolve(this._mentionProcessor.translateStorageKeysToDisplayNamesOfPersonMentions(untranslatedText));
        } else {
            return Q.resolve(untranslatedText);
        }
    }

    /**
     *
     * Methods to translate display name to storage key of person mention
     */

    public translateDisplayNameToStorageKeyInThreads(threads: DiscussionCommon.DiscussionThread[]): DiscussionCommon.DiscussionThread[] {
        if (threads) {
            threads = threads.map(thread => this.translateDisplayNameToStorageKeyInThread(thread));
        }
        return threads;
    }

    public translateDisplayNameToStorageKeyInThread(thread: DiscussionCommon.DiscussionThread): DiscussionCommon.DiscussionThread {
        if (thread) {
            thread.comments = this.translateDisplayNameToStorageKeyInComments(thread.comments);
        }
        return thread;
    }

    public translateDisplayNameToStorageKeyInComments(comments: DiscussionCommon.DiscussionComment[]): DiscussionCommon.DiscussionComment[] {
        if (comments) {
            comments = comments.map(comment => this.translateDisplayNameToStorageKeyInComment(comment));
        }
        return comments;
    }

    public translateDisplayNameToStorageKeyInComment(comment: DiscussionCommon.DiscussionComment): DiscussionCommon.DiscussionComment {
        if (comment) {
            comment.content = this.translateDisplayNameToStorageKeyInText(comment.content);
            comment.newContent = this.translateDisplayNameToStorageKeyInText(comment.newContent);
        }
        return comment;
    }

    public translateDisplayNameToStorageKeyInText(untranslatedText: string): string {
        let translatedText = untranslatedText;

        if (this._mentionProcessor) {
            translatedText = this._mentionProcessor.translateDisplayNamesToStorageKeysOfPersonMentions(untranslatedText);
        }

        return translatedText;
    }
}