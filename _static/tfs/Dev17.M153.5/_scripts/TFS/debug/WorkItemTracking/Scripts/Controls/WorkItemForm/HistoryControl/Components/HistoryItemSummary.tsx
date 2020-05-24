import React = require("react");
import Utils_String = require("VSS/Utils/String");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITHelpers = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Utils_Core = require("VSS/Utils/Core");

import { BaseComponent, autobind, css, divProperties, getNativeProps } from "OfficeFabric/Utilities";
import { HistoryControlActionsCreator } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActionsCreator";
import { HistoryControlStore } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Stores/HistoryControlStore";
import { IHistoryItem, ItemFocusState } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { HistoryUtils } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/HistoryUtils";
import { EditActionSet, EditActionType } from "WorkItemTracking/Scripts/OM/History/EditActionSet";
import { KeyCodes } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/HistoryUtils";

import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { DirectionalHint, TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { ICalloutProps } from "OfficeFabric/Callout";
import { getAvatarUrl } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";

export interface IHistoryItemSummaryProps {
    item: IHistoryItem;
    itemId: number;
    onItemSelected: (itemId: number) => void;
    actionCreator: HistoryControlActionsCreator;
    focusState?: ItemFocusState;
    showSelection: boolean;
    store: HistoryControlStore;
}

export interface IHistoryItemSummaryState {
    focusState?: ItemFocusState;
    isSelected: boolean;
}

export class HistoryItemSummary extends React.Component<IHistoryItemSummaryProps, IHistoryItemSummaryState> {
    private static CSS_ITEM_SELECTED = "history-item-summary history-item-selected";
    private static CSS_ITEM_UNSELECTED = "history-item-summary";

    private _comment: HTMLElement;
    private _datetime: HTMLElement;
    private _summaryItem: HTMLElement;

    private _changedDelegate: Function;

    constructor(props: IHistoryItemSummaryProps, context?: any) {
        super(props, context);

        this.state = this._getState();
        window.addEventListener("resize", this._updateCommentRowWidth);
    }

    public shouldComponentUpdate(newProps: IHistoryItemSummaryProps, newState: IHistoryItemSummaryState): boolean {
        if (newProps
            && newProps.item
            && (newProps.item.isSelected !== this.state.isSelected
                || newProps.item.focusState !== this.state.focusState)) {
            return true;
        }

        return false;
    }

    public componentDidMount() {
        this._updateCommentRowWidth();
        this._setFocus();
        this.setState({
            focusState: this.props.item.focusState,
            isSelected: this.props.item.isSelected
        });
    }

    public componentDidUpdate() {
        this._setFocus();
        this.setState({
            focusState: this.props.item.focusState,
            isSelected: this.props.item.isSelected
        });
    }

    public componentWillMount() {
        this._changedDelegate = Utils_Core.delegate(this, this._onStoreChanged);
        this.props.store.addChangedListener(this._changedDelegate);
    }

    public componentWillUnmount(): void {
        window.removeEventListener("resize", this._updateCommentRowWidth);
        if (this._changedDelegate) {
            this.props.store.removeChangedListener(this._changedDelegate);
            this._changedDelegate = null;
        }
    }

    @autobind
    private _updateCommentRowWidth() {
        if (this._comment && this._datetime) {
            // Since the width of the date text is variable we calcuate it here.  There is an 8px gap between the comment and the date
            // If component is not rendered in actual DOM, bounding client width is 0, so take approx width            
            const dateTimeWidth = this._datetime.getBoundingClientRect().width;
            const width = dateTimeWidth === 0 ? 51 : dateTimeWidth + 8;
            this._comment.setAttribute("style", "max-width: calc(100% - " + width + "px);");
        }
    }

    private _onStoreChanged(data?: any) {
        this.setState(this._getState());
    }

    private _getState(): IHistoryItemSummaryState {
        return {
            focusState: this.props.item.focusState,
            isSelected: this.props.item.isSelected
        };
    }

    public render(): JSX.Element {
        // get the summary information for this change.

        const editActionSet: EditActionSet = this.props.item.editActionSet;

        const itemSummary = HistoryUtils.getRevisionSummary(this.props.item.workItem, editActionSet, true);
        const identity = itemSummary.changedByIdentity;
        const imageUrl = getAvatarUrl(identity);
        let summaryText = itemSummary.userSubjectLine;

        itemSummary.changes.forEach((value, index, array) => {
            summaryText += (index === 0) ? " " : ", ";
            summaryText += value.message;
        });

        const tooltipProps: ICalloutProps = {
            gapSpace: 0
        };

        const icons = this._getIcons(itemSummary.userSubjectLine);
        let maxIconWidth = icons.length * 21; // Icons are 16 pixels wide plus 5 pixels of padding

        if (editActionSet.stateChanged()) {
            // State changed icon is smaller than the others, only 11 px wide plus 6px margins, so 17px instead of 21px so subtract the difference
            maxIconWidth -= 4;
        }

        const iconsStyle = {
            width: maxIconWidth
        };

        const summaryTextStyle = {
            maxWidth: "calc(100% - " + (maxIconWidth + 5) + "px)",
        };

        let comment: JSX.Element;

        if (itemSummary.comment) {
            const firstLineAndTooltip = this._getFirstLineAndTooltipFromComment(itemSummary.comment);

            // All html tags have been removed at this point so this is safe.  Using this mechanism fixes issues where we use html entities like &nbsp;
            comment = <TooltipHost overflowMode={TooltipOverflowMode.Parent} calloutProps={tooltipProps} content={firstLineAndTooltip.toolTip}>
                <span data-is-focusable={true}
                    className="history-item-comment-text history-focus-outline"
                    dangerouslySetInnerHTML={{ __html: firstLineAndTooltip.firstLine }}>
                </span>
            </TooltipHost>;
        }

        const className = this.props.item.isSelected && this.props.showSelection ?
            HistoryItemSummary.CSS_ITEM_SELECTED
            : HistoryItemSummary.CSS_ITEM_UNSELECTED;

        const uid = "group-" + this.props.item.groupId + "-item-" + this.props.itemId;
        const dateString = HistoryUtils.getHistoryGroupDateString(itemSummary.changedDate, this.props.item.groupId);
        const identityTooltipGap = 24;

        return (
            <FocusZone direction={FocusZoneDirection.horizontal} isInnerZoneKeystroke={this._isInnerZoneKeystroke}>
                <div className={className}
                    onClick={this._handleClick}
                    onKeyDown={this._handleKeyDown}
                    ref={this._resolveSummaryItemElement}
                    tabIndex={-1}
                    role="treeitem"
                >
                    <FocusZone direction={FocusZoneDirection.horizontal}>
                        <div className="history-item-summary-icon">
                            <TooltipHost calloutProps={{ gapSpace: identityTooltipGap }} content={identity.displayName}>
                                <img
                                    src={imageUrl}
                                    data-is-focusable={true}
                                    alt={identity.displayName}
                                    className="history-identity-icon history-focus-outline"></img>
                            </TooltipHost>
                        </div>
                        <div className="history-item-summary-details">
                            <div className="history-item-summary-row">
                                <div className="history-tooltiphost-container" style={summaryTextStyle}>
                                    <TooltipHost overflowMode={TooltipOverflowMode.Parent} calloutProps={tooltipProps} content={summaryText}>
                                        <span className="history-focus-outline history-item-summary-text"
                                            data-is-focusable={true} dangerouslySetInnerHTML={{ __html: summaryText }}>
                                        </span>
                                    </TooltipHost>
                                </div>
                                <span className="history-status-icons-container" style={iconsStyle}>
                                    {icons}
                                </span>
                            </div>
                            <div className="history-item-summary-row">
                                <div className="history-tooltiphost-container" ref={this._resolveCommentElement}>
                                    {comment}
                                </div>
                                <span className="history-item-summary-date" ref={this._resolveDateTimeElement}>
                                    {dateString}
                                </span>
                            </div>
                        </div>
                    </FocusZone>
                </div>
            </FocusZone>
        );
    }

    // Get up to 200 characters of text or the location of the first newline in a comment. If the returned text for tooltip
    // is same as the comment, then null is returned. We don't want to show the same text that is already displayed as tooltip
    // text as it's redundant
    private _getFirstLineAndTooltipFromComment(commentText: string): { firstLine: string, toolTip: string } {
        if (!commentText) {
            return null;
        }
        let newlineIndex: number = commentText.indexOf("\r\n");
        newlineIndex = newlineIndex < 0 || newlineIndex > 200 ? 200 : newlineIndex;
        const firstLine = commentText.substr(0, newlineIndex);

        if (firstLine && firstLine !== commentText) {
            // This means we are trimming the comment so, append a message at the end of the trimmed tooltip text to inform about
            // the additional text available in the actual comment
            return { firstLine: firstLine, toolTip: Utils_String.decodeHtmlSpecialChars(`${firstLine} ${WITResources.HistoryControlTooltipAdditionalTextMessage}`) };
        } else {
            return { firstLine: firstLine, toolTip: (firstLine ? Utils_String.decodeHtmlSpecialChars(firstLine) : null) };
        }
    }

    private _setFocus() {
        const item = this.props.item;
        if (item.isSelected
            && (item.focusState === ItemFocusState.Set
                || item.focusState === ItemFocusState.ForceSet)) {
            this._summaryItem.focus();
        }

        if (item.focusState === ItemFocusState.ForceSet) {
            item.focusState = ItemFocusState.Set;
        }
    }

    @autobind
    private _isInnerZoneKeystroke(ev: React.KeyboardEvent<HTMLElement>) {
        return ev.keyCode === KeyCodes.RIGHT;
    }

    @autobind
    private _handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        switch (e.keyCode) {
            case KeyCodes.LEFT:
                this.props.actionCreator.toggleGroup(this.props.item.groupId, true);
                break;
            default:
                break;
        }
    }

    @autobind
    private _resolveSummaryItemElement(item: HTMLElement): void {
        this._summaryItem = item;
    }

    @autobind
    private _resolveCommentElement(item: HTMLElement) {
        this._comment = item;
    }

    @autobind
    private _resolveDateTimeElement(item: HTMLElement) {
        this._datetime = item;
    }

    @autobind
    private _handleClick() {
        this.props.onItemSelected(this.props.itemId);
    }

    protected _getIcons(user: string): JSX.Element[] {
        const icons: JSX.Element[] = [];
        const editActionSet = this.props.item.editActionSet;
        const tooltipProps: ICalloutProps = {
            gapSpace: 0
        };

        if (editActionSet.assignedToChanged) {
            const assignedToValue = HistoryUtils.getFieldValueText(this.props.item.workItem.fieldMapById[WITConstants.CoreField.AssignedTo], editActionSet.getRev());
            const iconDescription = assignedToValue ?
                Utils_String.format(WITResources.HistoryControlAssignmentAdornmentText, assignedToValue)
                : WITResources.HistoryControlAssignmentDefaultAdornmentText;
            icons.push(<TooltipHost key="assignedTo" calloutProps={tooltipProps} directionalHint={DirectionalHint.topCenter} content={iconDescription}><span role="text" aria-label={iconDescription} className="icon bowtie-icon bowtie-user history-focus-outline" data-is-focusable={true}></span></TooltipHost>);
        }

        if (editActionSet.stateChanged()) {
            const newState = editActionSet.stateChanges[1];
            const iconDescription = Utils_String.format(WITResources.HistoryControlStateAdornmentText, newState);
            const styleObject = WITHelpers.WITStateCircleColors.getStateColors(newState, this.props.item.workItem.workItemType);
            icons.push(<TooltipHost key="state" calloutProps={tooltipProps} directionalHint={DirectionalHint.topCenter} content={iconDescription}><span role="text" aria-label={iconDescription} className="state-circle history-focus-outline" style={styleObject} data-is-focusable={true}></span></TooltipHost>);
        }

        if (editActionSet.messageAdded()) {
            const iconDescription = WITResources.HistoryControlCommentAdornmentText;
            icons.push(<TooltipHost key="discussion" calloutProps={tooltipProps} directionalHint={DirectionalHint.topCenter} content={iconDescription}><span role="text" aria-label={iconDescription} className="icon bowtie-icon bowtie-comment-outline history-focus-outline" data-is-focusable={true}></span></TooltipHost>);
        }

        if (editActionSet.projectChanged()) {
            const iconDescription = Utils_String.format(WITResources.HistoryControlProjectAdornmentText, editActionSet.projectChanges[1]);
            icons.push(<TooltipHost key="project" calloutProps={tooltipProps} directionalHint={DirectionalHint.topCenter} content={iconDescription}><span role="text" aria-label={iconDescription} className="icon bowtie-icon bowtie-work-item-move history-focus-outline" data-is-focusable={true}></span></TooltipHost>);
        }

        if (editActionSet.linkAdded()) {
            const links = editActionSet.getLinkChanges()
                .filter((change) => change.type === EditActionType.AddHyperLink || change.type === EditActionType.AddExternalLink || change.type === EditActionType.AddWorkItemLink)
                .map((linkChange) => this.props.item.workItem.allLinks[linkChange.index]);

            if (links.length > 0) {
                const iconDescription = links.length === 1 ?
                    Utils_String.format(WITResources.HistoryControlSingleLinkAdornmentText, HistoryUtils.getFriendlyLinkType(links[0].baseLinkType))
                    : WITResources.HistoryControlMultipleLinksAdornmentText;
                icons.push(<TooltipHost key="links" calloutProps={tooltipProps} directionalHint={DirectionalHint.topCenter} content={iconDescription}><span role="text" aria-label={iconDescription} className="icon bowtie-icon bowtie-link history-focus-outline" data-is-focusable={true}></span></TooltipHost>);
            }
        }

        if (editActionSet.attachmentsChanged()) {
            const attachmentChanges = HistoryUtils.getAttachmentChanges(this.props.item.workItem, editActionSet);
            if (attachmentChanges.attachmentAdds.length > 0) {
                const iconDescription = attachmentChanges.attachmentAdds.length === 1 ?
                    Utils_String.format(WITResources.HistoryControlSingleAttachmentAdornmentText, attachmentChanges.attachmentAdds[0].linkData.OriginalName)
                    : WITResources.HistoryControlMultipleAttachmentsAdornmentText;
                icons.push(<TooltipHost key="attachment" calloutProps={tooltipProps} directionalHint={DirectionalHint.topCenter} content={iconDescription}><span role="text" aria-label={iconDescription} className="icon bowtie-icon bowtie-attach history-focus-outline" data-is-focusable={true}></span></TooltipHost>);
            }
        }

        const revision = editActionSet.getRev();

        const isDeletedValue = HistoryUtils.getFieldChange(revision, WITConstants.CoreField.IsDeleted, this.props.item.workItem);
        if (isDeletedValue.isChanged) {
            if (isDeletedValue.newValue) {
                const iconDescription = Utils_String.format(WITResources.HistoryControlWorkItemDeletedAdornmentText, user);
                icons.push(<TooltipHost key="deleted" calloutProps={tooltipProps} directionalHint={DirectionalHint.topCenter} content={iconDescription}><span role="text" aria-label={iconDescription} className="icon bowtie-icon bowtie-recycle-bin history-focus-outline" data-is-focusable={true}></span></TooltipHost>);
            } else {
                const iconDescription = Utils_String.format(WITResources.HistoryControlWorkItemRestoredAdornmentText, user);
                icons.push(<TooltipHost key="restored" calloutProps={tooltipProps} directionalHint={DirectionalHint.topCenter} content={iconDescription}><span role="text" aria-label={iconDescription} className="icon bowtie-icon bowtie-recycle-bin-restore history-focus-outline" data-is-focusable={true}></span></TooltipHost>);
            }
        }

        const tagsValue = HistoryUtils.getFieldChange(revision, WITConstants.CoreField.Tags, this.props.item.workItem);

        if (tagsValue.isChanged && (tagsValue.newValue || tagsValue.oldValue)) {
            const tagsChanges = HistoryUtils.getTagsDiff(tagsValue.oldValue, tagsValue.newValue);
            if (tagsChanges.added.length > 0) {
                const iconDescription = WITResources.HistoryControlWorkItemTagAddedAdornmentText;
                icons.push(<TooltipHost key="tagadded" calloutProps={tooltipProps} directionalHint={DirectionalHint.topCenter} content={iconDescription}><span role="text" aria-label={iconDescription} className="icon bowtie-icon bowtie-tag history-focus-outline" data-is-focusable={true}></span></TooltipHost>);
            } else if (tagsChanges.removed.length > 0) {
                const iconDescription = WITResources.HistoryControlWorkItemTagRemovedAdornmentText;
                icons.push(<TooltipHost key="tagremoved" calloutProps={tooltipProps} directionalHint={DirectionalHint.topCenter} content={iconDescription}><span role="text" aria-label={iconDescription} className="icon bowtie-icon bowtie-tag history-focus-outline" data-is-focusable={true}></span></TooltipHost>);
            }
        }

        return icons;
    }
}
