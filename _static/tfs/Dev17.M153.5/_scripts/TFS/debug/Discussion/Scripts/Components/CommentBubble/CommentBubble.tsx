import "VSS/LoaderPlugins/Css!Discussion/Components/CommentBubble/CommentBubble";

import * as React from "react";
import * as DiscussionResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion";
import * as Utils_String from "VSS/Utils/String";

import { css } from "OfficeFabric/Utilities";
import { ago } from "VSS/Utils/Date";

import { ICommentBubbleProps } from "./CommentBubble.Props";
import { IdentityHelper, IdentityImageMode, IdentityImageSize } from "Presentation/Scripts/TFS/TFS.OM.Identities";

export class CommentBubble extends React.Component<ICommentBubbleProps, {}> {
    public render() {
        const { author, dateTime, htmlText, className, contentClassName, contentRef } = this.props;
        const displayName = author && author.displayName;
        const timeStamp = ago(dateTime);
        const headerAriaLabel = Utils_String.format(DiscussionResources.CommentHeaderAriaLabel, displayName, timeStamp);

        return <div className={css("comment-bubble-container", className)}>
            <div className="comment-bubble-author">
                {this._renderAvatar()}
            </div>
            <div className="comment-bubble">
                <div className="comment-bubble-beak" />

                <div className="comment-bubble-header" role="text" aria-label={headerAriaLabel} tabIndex={0}>
                    <span className="comment-bubble-author-name">
                        {displayName}
                    </span>
                    <span className="comment-bubble-timestamp">
                        {timeStamp}
                    </span>
                </div>
                <div className={css("comment-bubble-comment", contentClassName)} dangerouslySetInnerHTML={{
                    __html: htmlText
                }} ref={contentRef} />
            </div>
        </div>;
    }

    private _renderAvatar(): JSX.Element {
        const { author } = this.props;

        const src: string = author && IdentityHelper.getIdentityImageUrl(
            author, IdentityImageMode.ShowGenericImage, IdentityImageSize.Medium);

        return <img src={src} alt={IdentityHelper.getUniquefiedIdentityName(author)} />;
    }
}