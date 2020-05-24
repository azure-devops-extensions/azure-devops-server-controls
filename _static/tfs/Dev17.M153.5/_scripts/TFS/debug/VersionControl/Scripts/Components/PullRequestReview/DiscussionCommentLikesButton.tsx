import * as React from "react";
import { IconButton } from "OfficeFabric/Button";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";
import { format } from "VSS/Utils/String";
import { Debug } from "VSS/Diag";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { DiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import "VSS/LoaderPlugins/Css!VersionControl/DiscussionCommentLikesButton";

export interface IDiscussionCommentLikesButtonProps {
    tfsContext: TfsContext;
    comment: DiscussionComment;
    onCreateLike(): void;
    onDeleteLike(): void;
}

/**
 * Button to show and toggle comment likes.
 */
export class DiscussionCommentLikesButton extends React.Component<IDiscussionCommentLikesButtonProps, {}> {

    private _buttonKey: string = "likes-button";
    private _buttonKeyToggle: boolean = false;
    private _likesChanged: boolean = false;

    public shouldComponentUpdate(nextProps: IDiscussionCommentLikesButtonProps, nextState: {}): boolean {
        const likesChanged: boolean = this._didLikesChange(nextProps);

        // each time the likes change, toggle this flag so the button key will change (the button will be re-rendered and
        // the animation will be forced to re-run)
        this._buttonKeyToggle = likesChanged ? !this._buttonKeyToggle : this._buttonKeyToggle;
        this._likesChanged = this._likesChanged || likesChanged;

        return nextProps.comment !== this.props.comment;
    }

    public render(): JSX.Element {
        const userLikesComment: boolean = this._getDoesUserLikeComment();
        const usersLikedList: string[] = this._getUserLikesList();

        const tooltipContent: string = usersLikedList.join(", ") || VCResources.DiscussionCommentLikeThisComment;
        const ariaLabel: string = Boolean(usersLikedList.length)
            ? format(VCResources.DiscussionCommentLikeAriaLabelWithUsers, usersLikedList)
            : VCResources.DiscussionCommentLikeAriaLabelWithoutUsers;

        return (
            <div className={css("vc-discussion-comment-likes", { "has-likes": Boolean(usersLikedList.length) })}>
                <TooltipHost 
                    content={tooltipContent} // content needs to be defined before our custom function will get called
                    calloutProps={{ gapSpace: 8 }}
                    tooltipProps={{ onRenderContent: this._onRenderTooltipContent }}
                    directionalHint={DirectionalHint.topCenter}
                    setAriaDescribedBy={false}>
                    <IconButton
                        key={this._buttonKey + this._buttonKeyToggle}
                        className={css("vc-discussion-comment-toolbarbutton", "likes-button", { "animate-likes": this._likesChanged })}
                        ariaLabel={ariaLabel}
                        iconProps={{ iconName: userLikesComment ? "LikeSolid" : "Like" }}
                        onClick={userLikesComment ? this.props.onDeleteLike : this.props.onCreateLike}>
                        <span className="likes-count">{usersLikedList.length || null}</span>
                    </IconButton>
                </TooltipHost>
            </div>
        );
    }

    @autobind
    private _onRenderTooltipContent(): JSX.Element {
        const usersLikedList: string[] = this._getUserLikesList();
        const usersLikedListItems: JSX.Element[] = usersLikedList.map(name => <li key={name}>{name}</li>);
        
        return (
            <div className="vc-discussion-comment-likes-tooltip">
                {usersLikedListItems.length > 0
                    ? <ul>{usersLikedListItems}</ul>
                    : <span className="likes-prompt">{VCResources.DiscussionCommentLikeThisComment}</span>}
            </div>
        );
    }

    private _didLikesChange(nextProps: IDiscussionCommentLikesButtonProps): boolean {
        const thisLikesDoNotExist: boolean = !this.props.comment || this.props.comment.usersLiked === undefined;
        const nextLikesDoNotExist: boolean = !nextProps.comment || nextProps.comment.usersLiked === undefined;

        if (thisLikesDoNotExist || nextLikesDoNotExist) {
            Debug.assert(!thisLikesDoNotExist, "previous user likes do not exist (and should exist)");
            Debug.assert(!nextLikesDoNotExist, "next user likes do not exist (and should exist)");
            return false;
        }

        // if like lengths are different, they definitely changed
        if (this.props.comment.usersLiked.length !== nextProps.comment.usersLiked.length) {
            return true;
        }

        const thisIdMap: IDictionaryStringTo<boolean> = {};
        this.props.comment.usersLiked.forEach(user => thisIdMap[user.id] = true);

        // like lengths are the same, compare ids
        for (const user of nextProps.comment.usersLiked) {
            if (!thisIdMap[user.id]) {
                return true;
            }
        }

        return false;
    }

    private _getUserLikesList(): string[] {
        const usersLiked = this.props.comment.usersLiked || [];
        const userLikesComment: boolean = this._getDoesUserLikeComment();
        const usersLikedList: string[] = [];

        usersLiked.forEach((user, i) => {
            userLikesComment && user.id === this.props.tfsContext.currentIdentity.id
                ? usersLikedList.unshift(user.displayName)
                : usersLikedList.push(user.displayName);
        });

        return usersLikedList;
    }

    private _getDoesUserLikeComment(): boolean {
        return (this.props.comment.usersLiked || []).some(user => user.id === this.props.tfsContext.currentIdentity.id);
    }
}
