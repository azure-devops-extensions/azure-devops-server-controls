import * as React from "react";

import { IconButton } from "OfficeFabric/Button";
import { autobind, css } from "OfficeFabric/Utilities";

import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import * as IdentityImage from "Presentation/Scripts/TFS/Components/IdentityImage";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { AvatarUtils } from "VersionControl/Scenarios/Shared/AvatarUtils";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { getPrDisplayDateString, getPrTooltipDateString } from "VersionControl/Scripts/Utils/VersionControlDateUtils";

import "VSS/LoaderPlugins/Css!VersionControl/Activity";

export interface IActivityProps extends React.ClassAttributes<any> {
    tfsContext: TfsContext;
    isNew?: boolean;
    expanded?: boolean;
    onExpanded?(expanded: boolean): void;
}

export interface IActivityState {
}

// used by several sub-classes
export interface IThreadActivityProps extends IActivityProps {
    thread: DiscussionThread;
    validAttachmentTypes: string[];
}

export class Component<Props extends IActivityProps, State extends IActivityState> extends React.Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = $.extend({collapsed: false}, this.state);
    }

    /**
     * Renders a standard box for an item in the activity feed
     * @param image main image for the item.  Should be the return value of *Image methods of this class (_identityImage, _tfIdImage, etc.) with a default size which will be properly formatted
     * @param header text or react element containing top line of the activity
     * @param date (can be null) timestamp of the activity
     * @param contents body of the activity
     * @param bodyImage smaller image to display alongside the body of the activity
     * @param collapsedContents if this is null, the activity block can not be collapsed.  If this parameter is non-null, it is the contents displayed when the block is collapsed.  Collapse state and behavior is controlled through the Props
     */
    protected _renderContainer(
        image: JSX.Element,
        header: string | JSX.Element,
        date: Date,
        contents: string | JSX.Element | JSX.Element[] = null,
        bodyImage: JSX.Element = null,
        collapsedContents: JSX.Element = null,
        activityClass: string = null,
        ariaLabel: string = null,
        ariaLabelledBy: string = null): JSX.Element {

        const expanded: boolean = (!collapsedContents) || this.props.expanded;

        const dateDiv: JSX.Element = (date) ?
                <span className="vc-pullrequest-activity-date" title={getPrTooltipDateString(date)}>
                    {getPrDisplayDateString(date)}
                </span>
            : null;

        let expandElem: JSX.Element = null;
        if (collapsedContents) {
            const label = expanded ? VCResources.PullRequest_CollapseDescription : VCResources.PullRequest_ExpandDescription;
            expandElem = (
                <IconButton
                    iconProps={{ iconName: null }}
                    ariaLabel={label}
                    className={css("vc-pullrequest-activity-collapse-toggle", "clear-button", "button-link", "bowtie-icon",
                            { "bowtie-chevron-up-light": expanded },
                            { "bowtie-chevron-down-light": !expanded })}
                    onClick={this._toggleActivity} />
            );
        }

        const fullClass: string = expanded ? "vc-pullrequest-activity-shown" : "vc-pullrequest-activity-hidden";

        const collapsedClass: string = expanded ? "vc-pullrequest-activity-hidden" : "vc-pullrequest-activity-shown";
        const bodyClass: string = bodyImage ? "vc-pullrequest-activity-body-with-image" : "vc-pullrequest-activity-body";

        const fullContents: JSX.Element =
            <div className={fullClass}>
                <div className="vc-pullrequest-activity-header">
                    {image}
                    {header}
                    {dateDiv}
                </div>
                <div className={"vc-pullrequest-activity-shown " + bodyClass}>
                    {bodyImage}
                    {contents}
                </div>
            </div>;

        const activityBoxClass = css(
            "vc-pullrequest-activity-box",
            {[activityClass]: !!activityClass});

        const containerProps = {
            className: activityBoxClass
        };

        if (ariaLabel) {
            containerProps["aria-label"] = ariaLabel;
        } else if (ariaLabelledBy) {
            containerProps["aria-labelledby"] = ariaLabelledBy;
        }

        return (
            <div {...containerProps}>
                <div className={this._getTimelineLineClass()}></div>
                {this._getTimelineIcon()}
                {expandElem}
                {fullContents}
                <div className={collapsedClass}>{collapsedContents}</div>
            </div>
        );
    }

    @autobind
    private _toggleActivity(event: React.MouseEvent<HTMLButtonElement>) {
        if ($.isFunction(this.props.onExpanded)) {
            this.props.onExpanded(!this.props.expanded);
        }
    }

    /**
     * generate an image suitable for _renderContainer from an IdentityRef
     */
    protected _identityImage(
        identity: IdentityRef,
        size?: string): JSX.Element {

        return identityImage(this.props.tfsContext, identity, size);
    }

    /**
     * generate an image suitable for _renderContainer from a TfId
     */
    protected _tfIdImage(
        identity: IdentityRef,
        size?: string): JSX.Element {

        return tfIdImage(this.props.tfsContext, identity, size);
    }

    /**
     * generate an image suitable for _renderContainer that is not associated with a particular user
     */
    protected _systemImage() {
        return (
            <div className="vc-pullrequest-activity-item">
                <div className="vc-pullrequest-large-icon-container icon-tfs-vc-pullrequests-status-update-large"/>
                <span className="vc-pullrequest-activity-item vc-pullrequest-activity-image-spacer">&nbsp; </span>
            </div>);
    }

    protected _getTimelineIcon() {
        let iconClass = this._getTimelineIconClass();
        if (!iconClass) {
            return null;
        }

        iconClass += " bowtie-icon timeline-icon";
        iconClass += this.props.isNew ? " new" : "";

        return (
            <i className={iconClass}>
                { this.props.isNew ?
                    <div className="visually-hidden">{VCResources.PullRequest_RecentUpdate}</div> :
                    null }
            </i>);
    }

    protected _getTimelineIconClass(): string {
        return null;
    }

    protected _getTimelineLineClass(): string {
        let timelineLineClass = "timeline-icon-line";
        timelineLineClass += this.props.isNew ? " new" : "";

        return timelineLineClass;
    }

    public getPropertyValue(objWithProps: any, propName: string, defaultValue: string = null): string {
        if (objWithProps.properties[propName]) {
            return objWithProps.properties[propName].$value;
        }
        return defaultValue;
    }

    public getThreadPropertyValue(propName: string, defaultValue: string = null): string {
        const anyProps: any = this.props;
        return this.getPropertyValue(anyProps.thread, propName, defaultValue);
    }
}

function _getImageSizeString(size: string) {
    if (size === null || size === undefined) {
        return IdentityImage.imageSizeSmall;
    }
    return size;
}

export function identityImage(
    tfsContext: TfsContext,
    identity: IdentityRef,
    size ?: string): JSX.Element {

    return (
        <div className="vc-pullrequest-activity-item">
            <IdentityImage.Component
                tfsContext={tfsContext}
                size={_getImageSizeString(size)}
                cssClass="vc-pullrequest-activity-item"
                identity={identity}/>
            <span className="vc-pullrequest-activity-item vc-pullrequest-activity-image-spacer">&nbsp;</span>
        </div>);
}

function _tfIdImage(
    tfsContext: TfsContext,
    identity: IdentityRef,
    size?: string,
    style?: string): JSX.Element {
    let imgClass: string = "identity-picture " + _getImageSizeString(size);
    if (style) {
        imgClass += " " + style;
    }

    const imageUrl: string = AvatarUtils.getAvatarUrl(identity) || tfsContext.getIdentityImageUrl(identity.id);

    return <img className={imgClass} src={imageUrl}/>;
}

export function tfIdImage(
    tfsContext: TfsContext,
    identity: IdentityRef,
    size?: string,
    style?: string): JSX.Element {

    return (
        <div className="vc-pullrequest-activity-item">
            {_tfIdImage(tfsContext, identity, size, style)}
            <span className="vc-pullrequest-activity-item vc-pullrequest-activity-image-spacer">&nbsp;</span>
        </div>);
}
