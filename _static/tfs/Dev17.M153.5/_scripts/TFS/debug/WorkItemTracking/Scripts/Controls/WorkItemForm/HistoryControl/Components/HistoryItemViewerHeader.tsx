import Controls = require("VSS/Controls");
import Culture = require("VSS/Utils/Culture");
import IdentitiesPickerControls = require("VSS/Identities/Picker/Controls");

import React = require("react");
import ReactDOM = require("react-dom");
import Utils_Date = require("VSS/Utils/Date");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

import { PersonaCard } from "VSS/Identities/Picker/PersonaCard";
import Constants_Platform = require("VSS/Common/Constants/Platform");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import Service = require("VSS/Service");
import Picker_Controls = require("VSS/Identities/Picker/Controls");

import { HistoryUtils, IChangedByDetails } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/HistoryUtils";
import { IHistoryItem } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { css } from "OfficeFabric/Utilities";
import { getAvatarUrl } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";

export interface IHistoryItemViewerHeaderProps {
    item: IHistoryItem;
    enableContactCard: boolean;
}

export interface IHistoryItemViewerHeaderState {
    showProfileCard: boolean;
}

export class HistoryItemViewerHeader extends React.Component<IHistoryItemViewerHeaderProps, IHistoryItemViewerHeaderState> {
    private static REFS_ITEM_HEADER = "header";
    private static REFS_DATETIME = "date";
    private static REFS_SUMMARY_TEXT = "summary";
    private static ID_CARD_CONSUMER_ID = "022035bf-f989-4d77-8493-a0b9af6e386a";

    private dtf = Culture.getCurrentCulture().dateTimeFormat;

    private _imageElement: HTMLElement;

    public constructor(props: IHistoryItemViewerHeaderProps) {
        super(props);

        this.state = {
            showProfileCard: false
        };
    }

    public componentDidMount() {
        this._handleDOMUpdate();
    }

    public componentDidUpdate() {
        this._handleDOMUpdate();
    }

    public render(): JSX.Element {
        const actionSet = this.props.item.editActionSet;
        const itemSummary = HistoryUtils.getRevisionSummary(this.props.item.workItem, actionSet, false);
        const identity = itemSummary.changedByIdentity;
        const imageUrl: string = getAvatarUrl(identity);

        let summaryText: string = "";
        let formattedText: string = "";

        itemSummary.changes.forEach((value, index, array) => {
            summaryText += (index === 0) ? "" : ", ";
            summaryText += value.message;

            formattedText += (index === 0) ? "" : ", ";
            formattedText += value.formattedMessage ? value.formattedMessage : value.message;

        });

        formattedText = formattedText.charAt(0).toUpperCase() + formattedText.slice(1);

        const changedDate = Utils_Date.localeFormat(itemSummary.changedDate, "ddd " + this.dtf.ShortDatePattern + " " + this.dtf.ShortTimePattern);
        const uid = this.props.item.workItem.getUniqueId() + "-item-" + actionSet.getRev();
        const changedByDetails = HistoryUtils.getChangedByDetails(actionSet);

        const showProfileCard = (
            this.state.showProfileCard &&
            FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.ReactProfileCard)
        );

        return (
            <div className="history-item-viewer-header"
                aria-describedby={uid}
                aria-label={WorkItemTrackingResources.HistoryControlChangesHeader}
                tabIndex={0}>
                <div className="history-item-viewer-header-container">
                    <div className="history-item-viewer-left">
                        <img src={imageUrl}
                            alt={identity.displayName}
                            className="history-image-icon cursor-hover-card"
                            role="presentation"
                            onClick={() => this._setProfileCardVisible(true)}
                            ref={(el) => { this._imageElement = el; }} />
                        {showProfileCard &&
                            <PersonaCard
                                uniqueAttribute={identity.descriptor || identity.uniqueName}
                                target={this._imageElement}
                                entityOperationsFacade={Service.getService(Picker_Controls.EntityOperationsFacade)}
                                consumerId={HistoryItemViewerHeader.ID_CARD_CONSUMER_ID}
                                onDismissCallback={() => this._setProfileCardVisible(false)}
                            />
                        }
                    </div>

                    <div className="history-item-viewer-right"
                        id={uid}>
                        <div className="history-item-viewer-right-container" ref={HistoryItemViewerHeader.REFS_ITEM_HEADER} >
                            {this._getUserHeader(changedByDetails)}
                            <span className="history-item-date"
                                ref={HistoryItemViewerHeader.REFS_DATETIME}>
                                {changedDate}
                            </span>
                        </div>
                        <div>
                            <div className="history-item-summary-text"
                                dangerouslySetInnerHTML={{ __html: formattedText }}>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    private _setProfileCardVisible(isVisible: boolean) {
        this.setState({
            showProfileCard: isVisible
        });
    }

    private _handleDOMUpdate() {
        const summaryText = ReactDOM.findDOMNode(this.refs[HistoryItemViewerHeader.REFS_SUMMARY_TEXT]) as HTMLElement;
        const dateTime = ReactDOM.findDOMNode(this.refs[HistoryItemViewerHeader.REFS_DATETIME]) as HTMLElement;

        if (summaryText && dateTime) {
            // Since the width of the date text is variable we calcuate it here.
            // If component is not rendered in actual DOM, bounding client width is 0, so take approx width
            let dateTimeWidth = dateTime.getBoundingClientRect().width;
            dateTimeWidth = dateTimeWidth === 0 ? 135 : dateTimeWidth;

            summaryText.setAttribute("style", "max-width: calc(100% - " + (dateTimeWidth) + "px);");
        }
    }

    private _onUserClicked(e) {
        if (!this.props.enableContactCard) {
            return;
        }

        const anchor = $(ReactDOM.findDOMNode(this.refs[HistoryItemViewerHeader.REFS_ITEM_HEADER]) as HTMLElement);
        const changedByIdentity = this.props.item.editActionSet.changedByIdentity.identityRef;

        const dialog = Controls.Enhancement.enhance(IdentitiesPickerControls.IdCardDialog, "<div/>", {
            uniqueIdentifier: changedByIdentity.descriptor || changedByIdentity.uniqueName,
            anchor: anchor,
            operationScope: { Source: true, IMS: true },
            identityType: { User: true },
            httpClient: null,
            leftValue: e.pageX - 20,
            topValue: e.pageY + 5,
            consumerId: HistoryItemViewerHeader.ID_CARD_CONSUMER_ID
        });
    }

    private _getUserHeader(changedByDetails: IChangedByDetails): JSX.Element {
        let viaBlock: JSX.Element[] = null;

        if (changedByDetails.hasValidImpersonation) {
            viaBlock = [
                <span className="history-item-name-via-text" key="0">{WorkItemTrackingResources.HistoryControlViaText}</span>,
                <span className={css("history-item-name-authorized-by", { "clickable": this.props.enableContactCard })}  key="1" onClick={(e) => this._onUserClicked(e)}>
                    {changedByDetails.authorizedAsDisplayName}
                </span>,
                <span className="history-item-name-end" key="2">{WorkItemTrackingResources.HistoryControlViaTextEnd}</span>
            ];
        }

        return (
            <div className="history-item-name" ref={HistoryItemViewerHeader.REFS_SUMMARY_TEXT}>
                <span className={css("history-item-name-changed-by", { "clickable": this.props.enableContactCard })} onClick={(e) => this._onUserClicked(e)}>
                    {changedByDetails.changedByDisplayName}
                </span>
                {viaBlock}
            </div>
        );
    }
}
