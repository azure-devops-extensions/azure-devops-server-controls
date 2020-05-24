import { CommentBubble } from "Discussion/Scripts/Components/CommentBubble/CommentBubble";
import { IWorkItem, IWorkItemMentionRenderOptions } from "Mention/Scripts/WorkItem/WorkItemMentionModels";
import * as React from "react";
import { BrowserCheckUtils } from "VSS/Utils/UI";
import { IWorkItemDiscussionComment } from "WorkItemTracking/Scripts/OM/History/Discussion";
import { richTextPreRenderProcessor } from "WorkItemTracking/Scripts/Utils/RichTextPreRenderUtility";

export interface IDiscussionPreviewProps {

    /**
     * The comment details, including timestamp, identity, and content.
     * The content must be safe HTML that has been sanitized previously
     */
    comment: IWorkItemDiscussionComment;

    /**
     * Determine whether the image should be thumbnailed or kept in the original format
     */
    makeImagesThumbnail: boolean;
}

export class MessagePreviewComponent extends React.Component<IDiscussionPreviewProps, {}> {
    private _contentElement: HTMLElement;

    public render() {
        const { comment } = this.props;

        const author = comment && comment.user.identity;
        return <CommentBubble
            className="mobile-discussion-control-message"
            contentClassName="mobile-discussion-content"
            author={author}
            dateTime={comment.timestamp}
            htmlText={comment.content}
            contentRef={this._resolveContentElement} />;
    }

    public componentDidMount() {
        if (this._contentElement) {
            this._processMessageContent(this._contentElement);
        }
    }

    public componentDidUpdate(prevProps: IDiscussionPreviewProps) {
        if (this._contentElement && (prevProps.comment !== this.props.comment)) {
            this._processMessageContent(this._contentElement);
        }
    }

    private _processMessageContent(container: HTMLElement) {
        const workItemRenderOptions: IWorkItemMentionRenderOptions = {
            onWorkItemClick: this._onWorkItemClick
        };

        const $container = $(container);
        richTextPreRenderProcessor($container, false, workItemRenderOptions);

        this._thumbnailImages(container);
    }

    private _thumbnailImages(container: HTMLElement) {
        if (!this.props.makeImagesThumbnail) {
            return;
        }

        const images = container.getElementsByTagName("img");
        for (let i = 0; i < images.length; i++) {
            const img = images.item(i);

            const parent = img.parentElement;
            if (!parent.getAttribute("class")
                || !parent.classList.contains("image-container")) {

                const imageContainer = document.createElement("div");
                imageContainer.setAttribute("class", "image-container");

                const link = document.createElement("a");
                link.setAttribute("href", img.getAttribute("src"));
                link.setAttribute("target", "_blank");
                link.setAttribute("rel", "noopener");

                link.appendChild(imageContainer);
                parent.replaceChild(link, img);
                imageContainer.appendChild(img);
            }
        }
    }

    private _resolveContentElement = (item: HTMLElement) => {
        this._contentElement = item;
    }

    private _onWorkItemClick = (workItem: IWorkItem, url: string, defaultCallback: () => void) => {
        // HACK: Safari in iOS does not allow window.open in async calls,
        // so we open window here.
        if (BrowserCheckUtils.isSafari() && BrowserCheckUtils.isIOS()) {
            window.open(url);
        } else {
            defaultCallback();
        }
    }
}
