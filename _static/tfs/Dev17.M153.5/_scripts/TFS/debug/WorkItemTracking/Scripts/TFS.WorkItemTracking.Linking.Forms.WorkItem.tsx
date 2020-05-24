import "VSS/LoaderPlugins/Css!WorkItemArea";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Enhancement } from "VSS/Controls";
import * as Utils_String from "VSS/Utils/String";
import { Debug } from "VSS/Diag";
import { VssIcon, VssIconType } from "VSSUI/VssIcon";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { LinkForm } from "WorkItemTracking/Scripts/LinkForm";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { TopologyType, LinkDirection, TopologyOptions } from "WorkItemTracking/Scripts/Controls/LinksVisualization/Interfaces";
import {
    LinksTopologyVisualizationControl,
    ILinksTopologyVisualizationControlProps
} from "WorkItemTracking/Scripts/Controls/LinksVisualization/LinksTopologyVisualizationControl";
import { WorkItemLinkValidator } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.LinkValidator";
import { LinkFilterHelper, StyleConstants } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking";
import { MentionPickerEnhancement } from "Mention/Scripts/TFS.Mention.Controls.Picker";
import { IAutocompleteOptions } from "Mention/Scripts/TFS.Mention.Autocomplete.Controls";
import { MentionType, IAutocompleteReplacement } from "Mention/Scripts/TFS.Mention.Autocomplete";
import { WorkItemAutocompletePlugin } from "Mention/Scripts/WorkItem/WorkItemAutocompletePlugin";
import * as LinkingUtils from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Linking.Utils";
import { WorkItem, Link, WorkItemLink } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IWorkItemLinkTypeEnd } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";

export class WorkItemLinkForm extends LinkForm {
    private _currentLinkType: string;
    private _currentLinkTypeInfo: any;
    private _workItemPickerInputControl: JQuery;
    private _workItemPickerEnhancement: Enhancement<IAutocompleteOptions>;
    private _messageBarContainer: JQuery;
    private _linkFilterHelper: LinkFilterHelper;
    private _selectedWorkItemIds: number[];
    private $container: JQuery;

    public initialize() {
        super.initialize();

        this._selectedWorkItemIds = [];
        this._linkFilterHelper = this._options.workItemTypeFilters ? new LinkFilterHelper(this._options) : null;
        this._validator = new WorkItemLinkValidator(this._options);

        const workItemIdsID = "work-item-ids";

        const $workItemLinkInputContainer = $("<div>")
            .addClass("work-item-link-container")
            .appendTo(this._element)
            .append(LinkForm.createTitleElementWithIconClass(Resources.LinkDialogWorkItemIdsTitle, workItemIdsID, StyleConstants.CSS_CLASS_TARGET_ICON));

        this._workItemPickerInputControl = $("<input>")
            .attr("id", workItemIdsID)
            .attr("type", "text")
            .attr("role", "combobox")
            .attr("aria-label", "picker")
            .attr("placeholder", Resources.LinkDialogWorkItemPickerInputWatermark)
            .appendTo($workItemLinkInputContainer);

        this._workItemPickerEnhancement = Enhancement.enhance(MentionPickerEnhancement,
            this._workItemPickerInputControl,
            {
                mentionType: MentionType.WorkItem,
                select: (replacement: IAutocompleteReplacement) => {
                    // Validate input and select the work item
                    const rawIdInput = replacement.getPlainText().textBeforeSelection; // e.g. #213 (refers to a Work Item Id).
                    this._validateInputAndSelectWorkitem(rawIdInput);

                    // Highlight the text
                    this._workItemPickerInputControl.val("");
                },
                pluginConfigs: [{
                    factory: o => new WorkItemAutocompletePlugin({...o, workItemIdsToIgnore: this._workItem ? [this._workItem.id] : []})
                }]
            }
        );

        // Adding message bar container to display messages
        this._messageBarContainer = $("<div>").addClass("bowtie-style").appendTo(this._element);

        // Adding link visualization
        this.$container = $("<div/>").appendTo(this._element);
        this.renderLinkTopologyVisualization();

        // Adding comment field
        this._createComment();

        this.fireLinkFormValidationEvent(false);
    }

    public renderLinkTopologyVisualization(partialProps: Partial<ILinksTopologyVisualizationControlProps> = {}) {
        if (this.isDisposed()) {
            return;
        }

        const linkTopology = this._currentLinkTypeInfo && this._currentLinkTypeInfo.topology;
        const isForwardLink = this._currentLinkTypeInfo && this._currentLinkTypeInfo.isForward;
        const defaultProps: ILinksTopologyVisualizationControlProps = {
            topologyOptions: LinkingUtils.getLinkTopologyOptions(linkTopology, isForwardLink),
            tfsContext: TfsContext.getDefault(),
            workItemIds: (this._selectedWorkItemIds && this._selectedWorkItemIds.slice()) || [],
            workItem: this._workItem,
            isVisible: true,
            showLinks: true,
            showLinkImage: true,
            readOnly: false,
            onRemove: (removedId: number) => {
                const index = this._selectedWorkItemIds.indexOf(removedId);
                if (index >= 0) {
                    this._selectedWorkItemIds.splice(index, 1);
                }
                this._renderSelectedWorkItems();
                this._updateDialogState();
            }
        };

        ReactDOM.render(
            React.createElement(
                LinksTopologyVisualizationControl,
                {...defaultProps, ...partialProps}),
            this.$container[0]);
    }

    private unmountLinkTopologyVisualization() {
        ReactDOM.unmountComponentAtNode(this.$container[0]);
    }

    private _renderMessage(message: string): void {
        const messageBar = <div className="input-message-bar-container">{
            message ?
                <div className="input-message-bar">
                    <VssIcon className="input-message-icon" iconName="Info" iconType={VssIconType.fabric} />
                    <span className="input-message">{message}</span>
                    <div
                        className="dismiss-message-button"
                        role="button"
                        onClick={(e) => this._renderMessage("")}
                        onKeyDown={(e) => {
                            // TODO
                        }}
                    >
                        <VssIcon iconName="Clear" iconType={VssIconType.fabric} />
                    </div>
                </div> : null
        }</div>;

        ReactDOM.render(messageBar, this._messageBarContainer[0]);
    }

    private _isCurrentLinkTypeParent(): boolean {
        return this._isTreeLinkType() && !this._currentLinkTypeInfo.isForward;
    }

    private _isTreeLinkType(): boolean {
        return this._currentLinkTypeInfo && this._currentLinkTypeInfo.topology === "Tree";
    }

    private _isDependencyLinkType(): boolean {
        return this._currentLinkTypeInfo && this._currentLinkTypeInfo.topology === "Dependency";
    }

    private _validateInputAndSelectWorkitem(rawInput: string): void {
        Debug.assert(!!rawInput, `Invalid raw text input of selected work item from mention: '${rawInput}'.`);

        const targetId: number = rawInput[0] === "#" ? +rawInput.substr(1) : +rawInput;
        Debug.assert(!isNaN(targetId) && targetId > 0, `Unexpected raw text input of selected work item from mention: '${rawInput}'.`);

        const validator = this._validator as WorkItemLinkValidator;
        Debug.assert(this._validator instanceof WorkItemLinkValidator, `Invalid validator for work item link form.`);

        if (this._selectedWorkItemIds.indexOf(targetId) > -1) {
            const message = Utils_String.format(Resources.LinkDialog_QueuedLinkDuplicateWorkItemsError, targetId);
            this._renderMessage(message);
            return;
        }

        const validation = new Promise<number>((resolve: (value: number) => void, reject: (message: string) => void) => {
            if (validator.isSelf(targetId)) {
                // Reject if attempt to link to self.
                reject(Utils_String.format(Resources.LinkDialog_LinkSelfWorkItemError, targetId));
            } else if (validator.isDuplicate(targetId)) {
                // Reject if attempt to link to a work item that is already linked to the current one.
                reject(Utils_String.format(Resources.LinkDialog_LinkDuplicateWorkItemsError, this._currentLinkType, "" + targetId));
            } else if (this._isCurrentLinkTypeParent() && this._selectedWorkItemIds.length > 0) {
                // Reject if attempt to link more than work item as parent.
                reject(Utils_String.format(Resources.LinkDialog_LinkMultipleWorkItemsAsParentsError));
            }

            this._workItem.store.beginGetWorkItem(
                targetId,
                (target: WorkItem) => {
                    const isSameProject = !Utils_String.ignoreCaseComparer(this._workItem.project.name, target.project.name);
                    if (this._linkFilterHelper && this._linkFilterHelper.isWitFilteredOut(target.workItemType.name, isSameProject)) {
                        reject(Utils_String.format(Resources.LinkDialog_LinkUnsupportWorkItemTypeError, target.workItemType.name, this._currentLinkType));
                    } else if (this._isTreeLinkType() || this._isDependencyLinkType()) {
                        const targetLinks: WorkItemLink[] = target.getLinks()
                            .map((link: Link) => Link.createFromLinkData(target, link.linkData))
                            .filter((link: Link) => !link.isRemoved() && link instanceof WorkItemLink) as WorkItemLink[];

                        for (const targetLink of targetLinks) {
                            const sourceId: number = this._workItem.id;
                            const currentLinkTypeImmutableName: string = this._currentLinkTypeInfo.immutableName;
                            const linkTypeEnd: IWorkItemLinkTypeEnd = targetLink.getLinkTypeEnd();

                            if (currentLinkTypeImmutableName === linkTypeEnd.immutableName && targetLink.getTargetId() === sourceId) {
                              reject(Utils_String.format(Resources.LinkDialog_CircularWorkItemRelationshipError, this._currentLinkType, "" + sourceId, "" + targetId));
                              break;
                            }
                            else if (this._isTreeLinkType() && linkTypeEnd.oppositeEnd && currentLinkTypeImmutableName === linkTypeEnd.oppositeEnd.immutableName) {
                              const isParentLink: boolean = linkTypeEnd.oppositeEnd.linkType.isOneToMany && !linkTypeEnd.oppositeEnd.isForwardLink;
                              if (false === isParentLink) {
                                reject(Utils_String.format(Resources.LinkDialog_LinkChildWorkItemWhichHasAParentError, "" + targetId, this._currentLinkType));
                                break;
                              }
                            }
                        }
                    }
                    resolve(targetId);
                },
                (error) => reject(Utils_String.format(Resources.LinkDialog_WorkItemNotFoundError, targetId)),
                false,
                false);
        });

        validation.then((value: number) => {
            this._selectedWorkItemIds.push(value);
            this._renderSelectedWorkItems();
            this._renderMessage("");
            this._updateDialogState();
        }).catch((message: string) => {
            this._renderMessage(message);
        });
    }

    private _renderSelectedWorkItems() {
        this.renderLinkTopologyVisualization();
    }

    public linkTypeChanged(linkType) {
        if (linkType !== this._currentLinkType) {
            const validator = this._validator as WorkItemLinkValidator;

            // Setting new link type as the current link type
            this._currentLinkType = linkType;

            // Setting current link type end details
            this._currentLinkTypeInfo = this._getLinkTypeInfo(linkType);
            validator.setLinkTypeEnd(this._currentLinkTypeInfo);

            this._selectedWorkItemIds = [];
            this._renderSelectedWorkItems();
            this._renderMessage("");
            this._updateDialogState();
        }
    }

    private _updateDialogState(): void {
        const canSubmit = this._selectedWorkItemIds.length > 0;
        this.fireLinkFormValidationEvent(canSubmit);
    }

    public getLinkResult() {
        const result = {
            linkType: "WorkItemLink",
            linkTypeEnd: this._currentLinkTypeInfo,
            comment: this.getComment(),
            links: this._selectedWorkItemIds.map((workItemId) => { return { id: workItemId }; })
        };

        return result;
    }

    /**
     * Overrides unload function from base class
     */
    public unload() {
        super.unload();

        this._selectedWorkItemIds = [];
        this._linkFilterHelper = null;
        this._workItemPickerEnhancement.dispose();
        this._workItemPickerEnhancement = null;
        this._workItemPickerInputControl.remove();
        this._workItemPickerInputControl = null;
        this.unmountLinkTopologyVisualization();
        this._messageBarContainer.remove();
        this._messageBarContainer = null;
    }

    private _getLinkTypeInfo(linkType: string): any {
        /// <summary>Gets the link type details such as topology and isForwardLink of specified
        /// work item link type</summary>
        /// <param name="linkType" type="String">Link type end name</param>
        /// <returns type="Object">immutableName(String), topology(String) and isForward(Boolean)</returns>

        const workItem = this._workItem,
            linkTypeEnd = workItem.store.findLinkTypeEnd(linkType);

        return {
            immutableName: linkTypeEnd.immutableName,
            topology: linkTypeEnd.linkType.topology,
            isForward: linkTypeEnd.isForwardLink
        };
    }
}