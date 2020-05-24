import * as Q from "q";
import Events_Services = require("VSS/Events/Services");
import * as LinkRendering from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/LinkRendering";
import React = require("react");
import Utils_String = require("VSS/Utils/String");
import Utils_Core = require("VSS/Utils/Core");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITHelpers = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

import { autobind, getId, KeyCodes } from "OfficeFabric/Utilities";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { Link } from "OfficeFabric/Link";
import { HistoryUtils } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/HistoryUtils";
import { HistoryControlActionsCreator } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Actions/HistoryControlActionsCreator";
import { IHistoryItem, LinkChange, IFieldChange, ILinkChanges, IAttachmentChanges } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";
import { IHostArtifact } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { WorkItemFormTabsControl } from "WorkItemTracking/Scripts/Form/Tabs";
import WorkItemFormEvents = require("WorkItemTracking/Scripts/Form/Events");
import { Component } from "Presentation/Scripts/TFS/Components/Contribution";
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");

import Telemetry = require("VSS/Telemetry/Services");
import Service = require("VSS/Service");
import Contributions_Services = require("VSS/Contributions/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import VSS = require("VSS/VSS");

export interface IHistoryItemDetailProps {
    item: IHistoryItem;
    actionCreator: HistoryControlActionsCreator;
    enableContactCard: boolean;
}

export interface IHistoryItemDetailState {
    contributions: Contribution[];
    isContributionsLoaded: boolean;
}

export interface IHistoryItemContributionProps {
    fieldChange?: IFieldChange;
    attachmentChanges?: IAttachmentChanges;
    linkChanges?: ILinkChanges;
    hostArtifact?: IHostArtifact;
}

class HistoryItemContributionComponent extends Component<IHistoryItemContributionProps> {
}

export class HistoryItemDetail extends React.Component<IHistoryItemDetailProps, IHistoryItemDetailState> {

    private _fieldElement: HTMLElement;
    private _historyLinks: HTMLElement;
    private _tabSelectedHandler: IEventHandler;
    private _extensionService: Contributions_Services.ExtensionService;
    private _contributionFieldMap: IDictionaryStringTo<Contribution> = {};
    private _cancelable: Utils_Core.Cancelable;

    private static _historyFieldContributionIdString: string = "ms.vss-work-web.work-item-history-view";

    private _updateFieldWidths() {
        const $element = $(this._fieldElement);
        if ($element.length < 1) {
            return;
        }

        const $fields = $element.find(".field-name");
        const $fieldText = $fields.find(">span");
        const parentWidth = $element.width();
        const fieldMaxWidth = 33 / 100 * parentWidth;

        var maxWidth = 0;

        $fields.each(function () {
            $(this).css({ "width": "auto" });
        });

        $fieldText.each(function () {
            maxWidth = Math.max($(this).width(), maxWidth);
        });

        maxWidth = Math.min(fieldMaxWidth, maxWidth);

        $fields.each(function () {
            $(this).width(maxWidth + 1);
        });

        const $fieldValues = $element.find(".field-values");
        const maxValuesWidth = "calc(100% - " + (maxWidth + 5) + "px)";
        $fieldValues.each(function () {
            $(this).css("max-width", maxValuesWidth);
        });
    }

    private _updateLinksWidths() {
        const $element = $(this._historyLinks);
        if ($element.length < 1) {
            return;
        }

        const $links = $element.find(".link-display-name");
        const $linkDisplayName = $links.find(">span");
        let maxWidth = 0;

        $linkDisplayName.each(function () {
            maxWidth = Math.max($(this).width(), maxWidth);
        });
        $links.each(function () {
            $(this).width(maxWidth);
        });
    }

    constructor(props, context?: any) {
        super(props, context);

        this.state = {
            contributions: [],
            isContributionsLoaded: false
        };
    }

    public componentDidMount() {
        this._tabSelectedHandler = () => {
            this.forceUpdate();
        }

        Events_Services.getService().attachEvent(WorkItemFormTabsControl.TAB_ACTIVATED_EVENT, this._tabSelectedHandler);
        Events_Services.getService().attachEvent(WorkItemFormEvents.FormEvents.GroupExpandStateChangedEvent(), this._tabSelectedHandler);

        this._updateFieldWidths();
        this._updateLinksWidths();
        this._loadContributions();
    }

    public componentWillUnmount() {

        if (this._cancelable) {
            this._cancelable.cancel();
        }
        if (this._tabSelectedHandler) {
            Events_Services.getService().detachEvent(WorkItemFormTabsControl.TAB_ACTIVATED_EVENT, this._tabSelectedHandler);
            Events_Services.getService().detachEvent(WorkItemFormEvents.FormEvents.GroupExpandStateChangedEvent(), this._tabSelectedHandler);
            this._tabSelectedHandler = null;
        }
    }

    public componentDidUpdate() {
        this._updateFieldWidths();
        this._updateLinksWidths();
    }

    public render(): JSX.Element {

        if (!this.state.isContributionsLoaded) {
            return (<div />);
        }
        var historyItem = this.props.item;
        var itemSummary = historyItem.summaryCache;
        var customFieldStackRank = WITConstants.OobFieldRefNames.StackRank;

        if (!itemSummary) {
            itemSummary = HistoryUtils.getRevisionSummary(historyItem.workItem, historyItem.editActionSet);
            historyItem.summaryCache = itemSummary;
        }

        let commentSection: JSX.Element = null;
        if (itemSummary.comment) {
            const tfsContext = historyItem.workItem.store.getTfsContext();
            const commentPng = tfsContext.configuration.getResourcesFile("gfx-comment-8bit.png");

            const commentContentId = getId("history-comment");
            commentSection = (
                <FocusZone isInnerZoneKeystroke={this._isInnerZoneKeystroke} className="history-comment-container">
                    <div data-is-focusable="true" aria-label={WITResources.HistoryControlCommentAriaLabel} aria-describedby={commentContentId}>
                        <div className="comment-arrow">
                            <img src={commentPng}
                                alt={WITResources.HistoryControlCommentText}
                                className="comment-arrow-image">
                            </img>
                        </div>
                        <FocusZone className="history-comment" id={commentContentId}>
                            <div className="history-item-comment"
                                ref={(c) => HistoryUtils.renderMessageContent(itemSummary.comment, $(c), this.props.enableContactCard)}></div>
                        </FocusZone>
                    </div>
                </FocusZone>
            );
        }

        var fieldChanges = historyItem.fieldChangesCache;

        if (!fieldChanges) {
            fieldChanges = HistoryUtils.getFieldChanges(historyItem.workItem, historyItem.editActionSet);
            historyItem.fieldChangesCache = fieldChanges;
        }

        var linkChanges = null;

        var attachmentChanges = historyItem.attachmentChangesCache;

        if (!attachmentChanges) {
            attachmentChanges = HistoryUtils.getAttachmentChanges(historyItem.workItem, historyItem.editActionSet);
            historyItem.attachmentChangesCache = attachmentChanges;
        }

        let relationLinkAdditions: JSX.Element[] = [];
        let resourceLinkAdditions: JSX.Element[] = [];
        let relationLinkDeletions: JSX.Element[] = [];
        let resourceLinkDeletions: JSX.Element[] = [];
        let attachmentAdditions: JSX.Element[] = [];
        let attachmentDeletions: JSX.Element[] = [];
        let hostArtifact = null;

        let linksSection: JSX.Element = null;
        if (historyItem.resolvedLinkChanges) {
            linkChanges = historyItem.resolvedLinkChanges;
            hostArtifact = HistoryUtils.getHostArtifact(historyItem.workItem);

            this._createLinkChangeComponents(hostArtifact, linkChanges.relationLinkAdds, relationLinkAdditions);
            this._createLinkChangeComponents(hostArtifact, linkChanges.relationLinkDeletes, relationLinkDeletions);
            this._createLinkChangeComponents(hostArtifact, linkChanges.resourceLinkAdds, resourceLinkAdditions);
            this._createLinkChangeComponents(hostArtifact, linkChanges.resourceLinkDeletes, resourceLinkDeletions);

            const linksTitleId = getId("links-title");
            const linksContentId = getId("links-content");
            linksSection = (
                <FocusZone isInnerZoneKeystroke={this._isInnerZoneKeystroke}>
                    <div className="history-links"
                        data-is-focusable="true"
                        ref={(d) => this._historyLinks = d}
                        aria-labelledby={linksTitleId}
                        aria-describedby={linksContentId}>
                        <div key="links-title" id={linksTitleId}>
                            <span className="links-title history-section">{WITResources.HistoryControlLinksTitle}</span>
                        </div>
                        <FocusZone key="links-content" id={linksContentId}>
                            {relationLinkAdditions}
                            {resourceLinkAdditions}
                            {relationLinkDeletions}
                            {resourceLinkDeletions}
                        </FocusZone>
                    </div>
                </FocusZone>
            );
        } else {
            linkChanges = historyItem.editActionSet.getLinkChanges();
            if (linkChanges && linkChanges.length > 0) {
                this.props.actionCreator.resolveLinks(historyItem, historyItem.editActionSet);
            }
        }

        let contributionProps: IHistoryItemContributionProps = {
            attachmentChanges: attachmentChanges,
            linkChanges: linkChanges,
            hostArtifact: hostArtifact
        };
        let coreAndCustomFieldsSection: JSX.Element = null;
        if (fieldChanges.coreAndCustomFieldChanges) {
            let coreAndCustomFields: JSX.Element[] = [];
            fieldChanges.coreAndCustomFieldChanges.forEach((value, index, array) => {
                if (!this._findAndSetContributionField(coreAndCustomFields, value, contributionProps)) {
                    const fieldNameId = getId("field-name");
                    const fieldValuesId = getId("field-values");
                    let element = null;

                    if (value.referenceName === WITConstants.CoreFieldRefNames.Tags) {
                        const tagsChanges = HistoryUtils.getTagsDiff(value.oldValue, value.newValue);

                        const newTags = tagsChanges.added;
                        const oldTags = tagsChanges.removed;

                        element = (
                            <div key={value.name} data-is-focusable="true" aria-labelledby={fieldNameId} aria-describedby={fieldValuesId}>
                                <div className="field-name" id={fieldNameId}>
                                    <span>{value.name}</span>
                                </div>
                                <div className="field-values" id={fieldValuesId}>
                                    {
                                        newTags.map((newValue, index) => {
                                            return (
                                                <ins key={1 + index}>
                                                    <span className="visually-hidden">{WITResources.HistoryControlNewValueText}</span>
                                                    <span className="field-new-value">{newValue}</span>
                                                </ins>
                                            )
                                        })
                                    }
                                    {
                                        oldTags.map((oldValue, index) => {
                                            return (
                                                <del key={(index + 1) * -1}>
                                                    <span className="visually-hidden">{WITResources.HistoryControlOldValueText}</span>
                                                    <span className="field-old-value">{oldValue}</span>
                                                </del>
                                            )
                                        })
                                    }
                                </div>
                            </div>
                        );
                    }
                    else {
                        let iconElement = this._getFieldIcon(value, customFieldStackRank);
                        element = (
                            <div key={value.name} data-is-focusable="true" aria-labelledby={fieldNameId} aria-describedby={fieldValuesId}>
                                <div className="field-name" id={fieldNameId}>
                                    <span>{value.name}</span>
                                </div>
                                <div className="field-values" id={fieldValuesId}>
                                    {
                                        value.newValue &&
                                        <ins>
                                            <span className="visually-hidden">{WITResources.HistoryControlNewValueText}</span>
                                            {iconElement &&
                                                iconElement}
                                            <span className="field-new-value">{value.newValue}</span>
                                        </ins>
                                    }
                                    {
                                        value.oldValue &&
                                        <del>
                                            <span className="visually-hidden">{WITResources.HistoryControlOldValueText}</span>
                                            <span className="field-old-value">{value.oldValue}</span>
                                        </del>
                                    }
                                </div>
                            </div>
                        );
                    }
                    coreAndCustomFields.push(element);
                }
            });

            if (coreAndCustomFields.length > 0) {
                coreAndCustomFieldsSection = (
                    <div className="fields" ref={(d) => this._fieldElement = d}>
                        <FocusZone direction={FocusZoneDirection.vertical}>
                            {coreAndCustomFields}
                        </FocusZone>
                    </div>
                );
            }
        }

        let htmlFieldsSection: JSX.Element = null;
        if (fieldChanges.htmlFieldChanges) {
            let htmlFields: JSX.Element[] = [];
            fieldChanges.htmlFieldChanges.forEach((value, index, array) => {
                if (!this._findAndSetContributionField(htmlFields, value, contributionProps)) {
                    const fieldNameId = getId("html-field-name");
                    const newValueId = value.newValue ? getId("html-field-new-value") : null;
                    const oldValueId = value.oldValue ? getId("html-field-old-value") : null;

                    let element = (
                        <FocusZone isInnerZoneKeystroke={this._isInnerZoneKeystroke} key={value.name}>
                            <div className="html-field"
                                data-is-focusable="true"
                                aria-labelledby={fieldNameId}
                                aria-describedby={this._joinIdsForAria(newValueId, oldValueId)}>
                                <div>
                                    <div className="html-field-name history-section" id={fieldNameId}>{value.name}</div>
                                </div>
                                <FocusZone>
                                    {value.newValue &&
                                        <div>
                                            <div className="html-field-new-value-container" id={newValueId}>
                                                <ins>
                                                    <span className="visually-hidden">{WITResources.HistoryControlNewValueText}</span>
                                                    <span className="html-field-new-value"
                                                        dangerouslySetInnerHTML={{ __html: value.newValue }} ref={(c) => HistoryUtils.processImages($(c))}></span>
                                                </ins>
                                            </div>
                                        </div>
                                    }
                                    {value.oldValue &&
                                        <div>
                                            <div className="html-field-old-value-container" id={oldValueId}>
                                                <del>
                                                    <span className="visually-hidden">{WITResources.HistoryControlOldValueText}</span>
                                                    <span className="html-field-old-value" dangerouslySetInnerHTML={{ __html: value.oldValue }} ref={(c) => HistoryUtils.processImages($(c))}></span>
                                                </del>
                                            </div>
                                        </div>
                                    }
                                </FocusZone>
                            </div>
                        </FocusZone>
                    );
                    htmlFields.push(element);
                }
            });

            if (htmlFields.length > 0) {
                htmlFieldsSection = (
                    <div className="html-fields">
                        {htmlFields}
                    </div>
                );
            }
        }

        let plainTextFieldsSection: JSX.Element = null;
        if (fieldChanges.plainTextFieldChanges) {
            let plainTextFields: JSX.Element[] = [];
            fieldChanges.plainTextFieldChanges.forEach((value, index, array) => {
                if (!this._findAndSetContributionField(plainTextFields, value, contributionProps)) {
                    const fieldNameId = getId("plaintext-field-name");
                    const newValueId = value.newValue ? getId("plaintext-field-new-value") : null;
                    const oldValueId = value.oldValue ? getId("plaintext-field-old-value") : null;

                    var element = (
                        <FocusZone isInnerZoneKeystroke={this._isInnerZoneKeystroke} key={value.name}>
                            <div className="plaintext-field"
                                data-is-focusable="true"
                                aria-labelledby={fieldNameId}
                                aria-describedby={this._joinIdsForAria(newValueId, oldValueId)}>
                                <div>
                                    <div className="plaintext-field-name history-section" id={fieldNameId}>
                                        <span>{value.name}</span>
                                    </div>
                                </div>
                                {value.newValue &&
                                    <div id={newValueId}>
                                        <ins>
                                            <span className="visually-hidden">{WITResources.HistoryControlNewValueText}</span>
                                            <pre className="plaintext-field-new-value">{value.newValue}</pre>
                                        </ins>
                                    </div>
                                }
                                {value.oldValue &&
                                    <div id={oldValueId}>
                                        <del>
                                            <span className="visually-hidden">{WITResources.HistoryControlOldValueText}</span>
                                            <pre className="plaintext-field-old-value">{value.oldValue}</pre>
                                        </del>
                                    </div>
                                }
                            </div>
                        </FocusZone>
                    );
                    plainTextFields.push(element);
                }
            });

            if (plainTextFields.length > 0) {
                plainTextFieldsSection = (
                    <div className="plaintext-fields">
                        {plainTextFields}
                    </div>
                );
            }
        }

        attachmentChanges.attachmentAdds.forEach((value, index, array) => {
            let name = value.linkData.OriginalName;
            let iconClasses = WITHelpers.WITFileHelper.getMatchingIcon(name) + " icon-attach";
            var element = (
                <div key={value.linkData.FilePath} className="attachment">
                    <ins>
                        <span className={iconClasses}></span>
                        <span className="visually-hidden">{WITResources.HistoryControlAttachmentAddedText}</span>
                        <Link className="attachment-text attachment-add" onClick={value.open.bind(value)}>{name}</Link>
                    </ins>
                </div>
            );
            attachmentAdditions.push(element);
        });

        attachmentChanges.attachmentDeletes.forEach((value, index, array) => {
            let name = value.linkData.OriginalName;
            let iconClasses = WITHelpers.WITFileHelper.getMatchingIcon(name) + " icon-attach";
            var element = (
                <div key={value.linkData.FilePath} className="attachment">
                    <del>
                        <span className={iconClasses}></span>
                        <span className="visually-hidden">{WITResources.HistoryControlAttachmentDeletedText}</span>
                        <Link className="attachment-text attachment-delete" onClick={value.open.bind(value)}>{name}</Link>
                    </del>
                </div>
            );
            attachmentDeletions.push(element);
        });

        let attachmentsSection: JSX.Element = null;
        if (attachmentChanges.attachmentAdds.length > 0 || attachmentChanges.attachmentDeletes.length > 0) {
            const attachmentsTitleId = getId("attachments-title");
            const attachmentsContentId = getId("attachments-content");
            attachmentsSection = (
                <FocusZone isInnerZoneKeystroke={this._isInnerZoneKeystroke}>
                    <div className="history-attachments"
                        data-is-focusable="true"
                        aria-labelledby={attachmentsTitleId}
                        aria-describedby={attachmentsContentId}>
                        <div key={"attachments"} id={attachmentsTitleId}>
                            <span className="attachment-title history-section">{WITResources.AttachmentsTitle}</span>
                        </div>
                        <FocusZone direction={FocusZoneDirection.vertical} id={attachmentsContentId}>
                            {attachmentAdditions}
                            {attachmentDeletions}
                        </FocusZone>
                    </div>
                </FocusZone>
            );
        }

        return (
            <div className="history-item-detail">
                {commentSection}
                {coreAndCustomFieldsSection}
                {htmlFieldsSection}
                {plainTextFieldsSection}
                {linksSection}
                {attachmentsSection}
            </div>
        );
    }

    @autobind
    private _isInnerZoneKeystroke(ev: React.KeyboardEvent<HTMLElement>) {
        return ev.keyCode === KeyCodes.down;
    }

    private _joinIdsForAria(...ids: string[]) {
        const result = ids.filter(id => id).join(" ");

        return result.length > 0 ? result : null;
    }

    private _createLinkChangeComponents(hostArtifact: IHostArtifact, linkChanges: LinkChange[], elements: JSX.Element[]) {
        if (!linkChanges || linkChanges.length === 0) {
            return;
        }

        linkChanges.forEach((change, index) => {
            elements.push(
                <LinkRendering.ArtifactLinkComponent
                    hostArtifact={hostArtifact}
                    linkChange={change}
                    key={index} />);
        });
    }

    private _getFieldIcon(value, fieldName) {
        if (value.referenceName === fieldName && value.newValue !== "" && value.oldValue !== "") {
            let newStackrank = parseFloat(value.newValue) || 0;
            let oldStackrank = parseFloat(value.oldValue) || 0;
            let className = "icon bowtie-icon " + (newStackrank > oldStackrank ? "bowtie-arrow-up" : "bowtie-arrow-down");
            return (<span className={className}></span>);
        }
        return null;
    }

    // filling fields array using all contribution details and configs
    // making protected for unit testing
    protected _findAndSetContributionField(fieldArray: JSX.Element[], fieldChange: IFieldChange, config: IHistoryItemContributionProps): boolean {

        let clonedConfig: IHistoryItemContributionProps = {
            attachmentChanges: config.attachmentChanges,
            linkChanges: config.linkChanges,
            hostArtifact: config.hostArtifact
        };
        if (fieldChange.referenceName && this._contributionFieldMap[fieldChange.referenceName.toLowerCase()]) {
            let contribution = this._contributionFieldMap[fieldChange.referenceName.toLowerCase()]
            clonedConfig.fieldChange = fieldChange;
            fieldArray.push(
                <div className="contribution-field" key={Utils_String.generateUID()}>
                    <HistoryItemContributionComponent
                        contribution={contribution}
                        initialConfig={clonedConfig} />
                </div>
            );

            return true;
        }

        return false;
    }

    // making protected for unit testing
    protected _loadContributions(): IPromise<void> {
        let startTime = Date.now();
        const historyViewExtensionEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessWorkItemTrackingHistoryViewExtension);
        let setState = (contributions, isContributionsLoaded) => {
            this.setState({
                contributions: contributions,
                isContributionsLoaded: isContributionsLoaded
            });
        };
        let defer = Q.defer<void>();
        if (historyViewExtensionEnabled) {
            if (!this._extensionService) {
                this._extensionService = Service.getService(Contributions_Services.ExtensionService);
            }

            let contributionPromise = this._extensionService.getContributionsForTarget(HistoryItemDetail._historyFieldContributionIdString);

            let cancelable: any = new Utils_Core.Cancelable(this);
            this._cancelable = cancelable;
            contributionPromise.then(cancelable.wrap((contributions) => {

                //adding telemetry to measure perf impact
                let loadTime = Date.now() - startTime;
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                    CIConstants.WITPerformanceScenario.HISTORYVIEW_EXTENSION_LOAD,
                    {
                        "loadTimeInMs": loadTime
                    }));

                this._setContributionFieldMap(contributions);
                setState(contributions, true);
                defer.resolve(null);
            }), cancelable.wrap((error) => {
                VSS.handleError(error);
                // to support default rendering in error scenario
                setState([], true);
                defer.reject(error);
            }));
        } else {
            setState([], true);
            defer.resolve(null);
        }

        return defer.promise;
    }

    // making protected for unit testing
    protected _setContributionFieldMap(contributions: Contribution[]) {
        contributions.forEach((value) => {
            if (value.properties && value.properties.fieldName) {
                this._contributionFieldMap[value.properties.fieldName.toLowerCase()] = value;
            }
        });
    }

}
