import Controls = require("VSS/Controls");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import VSS = require("VSS/VSS");
import Events_Services = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { WorkItemThrottleControl } from "WorkItemTracking/Scripts/Controls/WorkItemThrottleControl";
import { IWorkItemInfoText } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { HubsService } from "VSS/Navigation/HubsService";
import { getLocalService } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { getWorkItemsHubId } from "WorkItemTracking/Scripts/Utils/WorkItemsHubIdHelper";
const delegate = Utils_Core.delegate;
const eventSvc = Events_Services.getService();

export class WorkItemInfoBar extends WorkItemThrottleControl {
    public static TRIAGE_DETAILS_LOADING_CSS_CLASS: string = "loading";
    public static ACTION_INFOBAR_SHOW_INFO = "workitem-infobar-show-info";

    private _workItemsNavigator: any;
    private _triageDetails: JQuery;
    private _infoTextWrapper: JQuery;
    private _showTitle: boolean;
    private _isLoadingTriageDetails: boolean;
    private _showInfoMessageDelegate: IArgsFunctionR<any>;

    constructor(options?) {

        super(options);
    }

    public bind(workItem: WITOM.WorkItem): void {
        super.bind(workItem);

        if (workItem) {
            if (!this._showInfoMessageDelegate) {
                this._showInfoMessageDelegate = (sender: any, args: { workItemId: number; info: IWorkItemInfoText }) => {
                    if (workItem.id === args.workItemId) {
                        this.updateThrottle(args.info);
                    }
                };
            }
            eventSvc.attachEvent(WorkItemInfoBar.ACTION_INFOBAR_SHOW_INFO, this._showInfoMessageDelegate);
        }
    }

    public unbind(noUpdate?: boolean) {
        super.unbind(noUpdate);

        if (this._showInfoMessageDelegate) {
            eventSvc.detachEvent(WorkItemInfoBar.ACTION_INFOBAR_SHOW_INFO, this._showInfoMessageDelegate);
            this._showInfoMessageDelegate = null;
        }

        if (this._infoTextWrapper && this._infoTextWrapper.length) {
            WorkItemTypeIconControl.unmountWorkItemTypeIcon(this._infoTextWrapper[0]);
        }
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        if (options && options.showTitle) {
            this._showTitle = options.showTitle;
        }

        super.initializeOptions($.extend({
            coreCssClass: "workitem-info-bar workitem-header-bar"
        }, options));
    }

    public initialize() {
        this._workItemsNavigator = this._options.workItemsNavigator;
        if (this._workItemsNavigator) {
            this._workItemsNavigator.attachEvent("navigate-index-changed", delegate(this, this._onNavigated));
        }
    }

    public updateInternal(args?: any) {
        var workItem = this.workItem, element = this.getElement(),
            href, infoText, statusIndicator, $caption;
        
        if (super.updateInternal() === false) {
            return false;
        }

        var $currInfoTextElement = element.find(".info-text");
        if ($currInfoTextElement.length === 1) {
            var currInfoText = $currInfoTextElement.text();
        }

        this._clearElement();

        if (workItem) {

            this._infoTextWrapper = $("<div>").addClass("info-text-wrapper");

            WorkItemTypeIconControl.renderWorkItemTypeIcon(
                this._infoTextWrapper[0],
                workItem.workItemType.name,
                workItem.project.name);

            if (workItem.isNew() || workItem.isDeleted()) {
                $caption = $("<span>");
            } else {
                const context = this._getTfsContext();
                const project = context.contextData.project;
                // Url to this workitem for copy paste
                href = context.getActionUrl(
                    "edit",
                    "workitems",
                    {
                        project: workItem.project.name,
                        team: null,
                        area: "",
                        parameters: [workItem.id]
                    });

                $caption = $("<a>").attr("href", href);

                if (project && Utils_String.equals(workItem.project.guid, project.id, true)){
                    $caption.click(getLocalService(HubsService).getHubNavigateHandler(getWorkItemsHubId(), href));
                }
            }

            $caption.text(workItem.getCaption(true, true));

            $caption.addClass("caption");
            this._infoTextWrapper.append($caption);


            // If supplied args contain WorkItemInfoText, use it to render infoText
            if (args && args.text && args.invalid) {
                infoText = <IWorkItemInfoText>args;
            }
            else {
                infoText = workItem.getInfoText();
            }

            if (infoText.invalid) {
                element.addClass("invalid");
            }
            else {
                element.removeClass("invalid");
            }

            let $infotext;
            if (this._showTitle || infoText.invalid) {
                $infotext = $("<span></span>").addClass("info-text").text(infoText.text || "");

                if (infoText.text) {
                    RichContentTooltip.addIfOverflow(infoText.text, $infotext);
                }

                this._infoTextWrapper.append($infotext);
            }

            if (workItem.isSaving()) {
                statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._infoTextWrapper);
                statusIndicator.start();
            }

            element.append(this._infoTextWrapper);

            // When there is error text to read, tell the screenreader to read it
            // As long as explicitly told to or if the error text has changed
            if (infoText.invalid && (element.data("read-error-text") ||
                ($infotext && currInfoText !== infoText.text))) {
                this._alertScreenreadersToText($infotext);
            }
        }
        else {
            element.removeClass("invalid");
        }
    }

    private _alertScreenreadersToText($infotext: JQuery) {
        // There is an IE bug that doesn't detect role-alert except when an element is hidden and shown
        // this is a workaround for that bug. IT hides the element before adding role: alert
        // so that Chrome does not read the text twice.
        $infotext.hide();
        $infotext.attr("role", "alert");
        $infotext.css("display", "inline");

        // Clean up in case this was set
        this.getElement().data("read-error-text", false);
    }

    /**
     * Show loading indicator instead of triage details on update
     */
    public showLoadingIndicator(): void {
        this._isLoadingTriageDetails = true;
        this._updateTriageDetails();
    }

    /**
     * Hide loading indicator and show triage details on update
     */
    public hideLoadingIndicator(): void {
        this._isLoadingTriageDetails = false;
        this._updateTriageDetails();
    }

    private _onNavigated() {
        this._updateTriageDetails();
    }

    private _updateTriageDetails() {
        if (this._triageDetails) {
            if (this._isLoadingTriageDetails) {
                this._triageDetails.empty();
                this._triageDetails.addClass(WorkItemInfoBar.TRIAGE_DETAILS_LOADING_CSS_CLASS);
            }
            else {
                this._triageDetails.removeClass(WorkItemInfoBar.TRIAGE_DETAILS_LOADING_CSS_CLASS);
                this._triageDetails.text(this._workItemsNavigator.getStatusText() || "");
            }
        }
    }

    private _clearElement() {
        if (this._infoTextWrapper && this._infoTextWrapper.length) {
            WorkItemTypeIconControl.unmountWorkItemTypeIcon(this._infoTextWrapper[0]);
        }
        this.getElement().empty();
    }
}

VSS.initClassPrototype(WorkItemInfoBar, {
    _workItemsNavigator: null,
    _triageDetails: null
});
