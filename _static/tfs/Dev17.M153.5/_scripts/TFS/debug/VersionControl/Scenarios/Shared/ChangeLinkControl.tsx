import * as React from "react";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Link } from "OfficeFabric/Link";
import { TooltipHost } from "VSSUI/Tooltip";
import { getId } from "OfficeFabric/Utilities";
import * as VCCommentParser from "VersionControl/Scripts/CommentParser";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import {
    ChangeList,
    GitCommit,
    VersionControlChangeType,
    GitObjectType,
    TfsChangeList,
} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ChangeType } from "VersionControl/Scripts/TFS.VersionControl";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!VersionControl/ChangeLinkControl";

export interface ChangeLinkControlProps extends React.Props<void> {
    changeList: ChangeList;
    fetchFullMessage?(changeList: ChangeList): void;
    titleUrl?: string;
    titleUrlTargetContributedHubId?: string
    afterTitleContent?: JSX.Element;
    itemPath?: string; // Relevant only for file history.
    itemChangeType?: VersionControlChangeType; // Relevant only for file history.
    itemObjectType?: GitObjectType;
    tabIndexForMoreMessageLink?: number;
    tabIndexForFullMessageContainer?: number;
    tagsList?: JSX.Element;
    repositoryContext?: RepositoryContext;
    customerIntelligenceData?: CustomerIntelligenceData;
    routeData?: { [refName: string]: string };
    onExpansionStateToggle?(): void;
}

export interface ChangeLinkControlState {
    /**
      * Whether the full message is expanded or collapsed. If true, full message is shown.
      */
    isExpanded: boolean;
}

/**
 * Renders the expandable/collapsible changelink control.
 */
export class ChangeLinkControl extends React.Component<ChangeLinkControlProps, ChangeLinkControlState> {
    private _linkText = "";
    private _linkTooltip = "";
    private _showEllipsis = false;
    private _linkHref = "";
    private _moreCommentsText = "";
    private _isExpanded = false;
    private _id = "";
    private _changeLinkTitleTooltipId: string;
    private _fullMessageContainer: HTMLElement;

    constructor(props: ChangeLinkControlProps, context?: any) {
        super(props, context);
        this.state = {
            isExpanded: this._isExpanded
        };
        this._id = getId('change-link-control');
        this._changeLinkTitleTooltipId = getId("change-link-title-tooltip");
    }

    public render(): JSX.Element {
        this._parseChangeListAttributes(this.props.changeList);
        const expandMessageToolTip = VCResources.ShowMessage;
        if (!this._linkText) {
            return null;
        }

        return (
            <div className={"change-link-control" + (this.state.isExpanded ? " expanded" : "")}>
                <div className={"more-message-link-container"} >
                    {
                        this._showEllipsis &&
                        <button
                            className={"more-message-link-button"}
                            aria-label={expandMessageToolTip}
                            aria-expanded={this.state.isExpanded}
                            aria-controls={this._id + "-full-message"}
                            tabIndex={this.props.tabIndexForMoreMessageLink}
                            onClick={this._onMoreMessageClick.bind(this, this.props.changeList)}
                        >
                            <span className={"bowtie-icon bowtie-chevron-down-light more-message-link"} />
                        </button>
                    }
                </div>

                <div className={"change-link-container"}>
                    <TooltipHost
                        id={this._changeLinkTitleTooltipId}
                        content={this._linkTooltip}
                        directionalHint={DirectionalHint.bottomCenter}>
                        {
                            (this.props.titleUrl) ?
                                <Link
                                    className={"inline text-dark change-link ms-Link"}
                                    href={this.props.titleUrl}
                                    aria-describedby={this._changeLinkTitleTooltipId}
                                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => this._onOpenChangeLink(e)}>
                                    {this._linkText}
                                </Link>
                                :
                                <span
                                    aria-describedby={this._changeLinkTitleTooltipId}
                                    className={"inline text-dark change-link text-only"}>
                                    {this._linkText}
                                </span>
                        }
                    </TooltipHost>

                    {this.props.afterTitleContent}

                    {
                        this._showEllipsis &&
                        this.state.isExpanded &&
                        this._moreCommentsText.length > 0 &&
                        <div id={this._id + "-full-message"} className={"full-message-container"} ref={(element: HTMLElement) => { this._fullMessageContainer = element; }} >
                            <div className={"full-message"} >
                                {this._moreCommentsText}
                            </div>
                        </div>
                    }
                    {this.props.tagsList}
                </div>
            </div>
        );
    }

    public componentDidUpdate(): void {
        if (this._fullMessageContainer) {

            const isVerticalScrollBarVisible = this._fullMessageContainer.offsetHeight < this._fullMessageContainer.scrollHeight;
            if (isVerticalScrollBarVisible) {
                $(this._fullMessageContainer).css({ "border": "1px solid #cccccc" });
                $(this._fullMessageContainer).attr({ "tabIndex": this.props.tabIndexForFullMessageContainer });
            }
        }

        if (this.state.isExpanded !== this._isExpanded) {
            this.setState({
                isExpanded: this._isExpanded
            });

            if (this.props.onExpansionStateToggle && $.isFunction(this.props.onExpansionStateToggle)) {
                this.props.onExpansionStateToggle();
            }
        }
    }

    public componentWillUnmount(): void {
        this._fullMessageContainer = null;
    }

    private _parseChangeListAttributes(changeList: ChangeList): void {
        this._linkText = this.getChangeLinkText(changeList);
        this._linkTooltip = this._getChangeLinkTooltip(changeList);
        this._showEllipsis = this._getShowEllipsis(changeList, this._linkText);
        const parsedComment = VCCommentParser.Parser.parseComment(getChangeListComment(changeList), 1, 0);

        this._moreCommentsText = "";
        if (parsedComment.remaining) {
            this._moreCommentsText = $.trim(parsedComment.remaining);
        }
    }

    private _getChangeLinkTooltip(changeList: ChangeList): string {
        return VCCommentParser.Parser.getFirstLine(getChangeListComment(changeList));
    }

    private getChangeLinkText(changeList: ChangeList, maxCommentLength?: number): string {
        return VCCommentParser.Parser.getShortComment(getChangeListComment(changeList), maxCommentLength, true);
    }

    private _getShowEllipsis(changeList: ChangeList, linkText: string): boolean {
        const comment = getChangeListComment(changeList);
        return (comment && (changeList.commentTruncated || $.trim(comment).length > linkText.length)) ? true : false;
    }

    private _onMoreMessageClick(changeList: ChangeList): void {
        this._showMoreMessage(changeList);
    }

    private _showMoreMessage(changeList: ChangeList): void {
        if (changeList.commentTruncated) {
            if (this.props.fetchFullMessage) {
                this.props.fetchFullMessage(changeList);
            }

            // Do not update the state immediately so that we expand only after the message has been fetched. 
            this._isExpanded = !this.state.isExpanded;
        }
        else {
            this._toggleIsExpandedState();
        }

        const ciPropertiesShowMore = {
            "IsExpanded": this._isExpanded
        };

        this._recordTelemetry(CustomerIntelligenceConstants.CHANGELINK_SHOWHIDE_COMPLETE_MESSAGE, false, ciPropertiesShowMore);
    }

    // public for UT
    public _onOpenChangeLink(event: React.MouseEvent<HTMLAnchorElement>): void {
        let ciPropertiesChangeLinkOpen: { [x: string]: any } = {};
        if (event.type === "click") {
            ciPropertiesChangeLinkOpen = {
                "Event": "Click",
                "IsCtrl": event.ctrlKey
            };
        }
        this._recordTelemetry(CustomerIntelligenceConstants.CHANGELINK_OPENED, true, ciPropertiesChangeLinkOpen);

        if (this.props.titleUrl) {
            onClickNavigationHandler(event, this.props.titleUrlTargetContributedHubId, (event.currentTarget as HTMLAnchorElement).href);
        }
    }

    /* Exposed only for unit tests */
    public _toggleIsExpandedState(): void {
        this._isExpanded = !this.state.isExpanded;
        this.setState({
            isExpanded: this._isExpanded
        });

        if (this.props.onExpansionStateToggle && $.isFunction(this.props.onExpansionStateToggle)) {
            this.props.onExpansionStateToggle();
        }
    }

    private _recordTelemetry(featureName: string, publishImmediate: boolean, properties: { [x: string]: any }): void {
        const ciData = new CustomerIntelligenceData();
        if (this.props.customerIntelligenceData) {
            ciData.area = this.props.customerIntelligenceData.area ? this.props.customerIntelligenceData.area : ciData.area;
            ciData.properties = $.extend({}, properties, this.props.customerIntelligenceData.properties);
        }

        ciData.publish(featureName, false, null, publishImmediate);
    }
}

const lineBreak = '\n\r';
/**
 * Temporary to handle shelveset title + comment parsing
 */
export function getChangeListComment(changeList: ChangeList): string {
    const tfsChangeList = changeList as TfsChangeList;
    const comment = tfsChangeList.comment ? tfsChangeList.comment : '';

    return tfsChangeList.isShelveset
        ? tfsChangeList.shelvesetName + lineBreak + comment
        : comment;
}
