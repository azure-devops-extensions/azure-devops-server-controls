import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import Q = require("q");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemDiscussionFactory } from "WorkItemTracking/Scripts/OM/History/Discussion"
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");

class DiscussionAdornmentControl extends Controls.BaseControl {
    private static MAXIMUM_DISPLAY_NUMBER: number = 9999;

    private _workItemChangedDelegate: IEventHandler;
    private _workItem: WITOM.WorkItem;
    private _iconControl: JQuery;
    private _numberControl: JQuery;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        super.initializeOptions($.extend({ coreCssClass: "discussion-adornment-control", }, options));
    }

    public initialize() {
        this._element.attr("role", "button");

        this._iconControl = $("<span>").addClass("bowtie-icon bowtie-comment-discussion").appendTo(this._element);
        this._numberControl = $("<span>").addClass("text").appendTo(this._element);

        this._element.click(() => {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                "WorkItem.DiscussionAdornment",
                {
                    "URL": location.href
                }));
        });

        Utils_UI.accessible(this._element);

        this._calculateAndSetNumberOfComments();
    }

    public onClick(handler: () => void): void {
        Diag.Debug.assertIsNotNull(handler, "Handler should not be null");
        Diag.Debug.assertIsNotNull(this._element, "onClick called when _element is null");

        this._element.off("click", handler);
        this._element.click(handler);
    }

    public bind(workItem: WITOM.WorkItem): void {
        if (!this._workItemChangedDelegate) {
            this._workItemChangedDelegate = (sender, args) => {
                if (args.change === WorkItemChangeType.SaveCompleted
                    || args.change === WorkItemChangeType.Refresh) {
                    this._calculateAndSetNumberOfComments();
                }
            };
        }

        if (this._workItem) {
            this._workItem.detachWorkItemChanged(this._workItemChangedDelegate);
        }

        this._workItem = workItem;
        if (this._workItem) {
            this._workItem.attachWorkItemChanged(this._workItemChangedDelegate);
        }

        this._calculateAndSetNumberOfComments();
    }

    public unbind(): void {
        if (this._workItem && this._workItemChangedDelegate) {
            this._workItem.detachWorkItemChanged(this._workItemChangedDelegate);
        }
        this._workItem = null;
        this._calculateAndSetNumberOfComments();
    }

    private _calculateNumberOfComments(): IPromise<number> {
        if (this._workItem) {
            // Getting work item history

            var discussionIterator = WorkItemDiscussionFactory.getDiscussionIterator(this._workItem);

            return discussionIterator.count();
        }

        return Q(0);
    }

    private _setNumberOfComments(numberOfComments: number) {
        if (this._element && this._numberControl) {
            var tooltipText: string;
            var numberText: string;
            const usesCommandKey = Utils_UI.KeyUtils.shouldUseMetaKeyInsteadOfControl();

            if (numberOfComments >= 0) {
                tooltipText = numberOfComments == 1 ? WorkItemTrackingResources.WorkItemDiscussionAdornmentTooltipSingular :
                    Utils_String.format(WorkItemTrackingResources.WorkItemDiscussionAdornmentTooltip, numberOfComments);
                tooltipText += " " + (usesCommandKey ? WorkItemTrackingResources.GoToDiscussionShortcutWithCommand : WorkItemTrackingResources.GoToDiscussionShortcutWithControl);
                
                if (numberOfComments > DiscussionAdornmentControl.MAXIMUM_DISPLAY_NUMBER) {
                    numberText = Utils_String.format(
                        WorkItemTrackingResources.WorkItemDiscussionAdornmentOverLimitNumberDisplay,
                        DiscussionAdornmentControl.MAXIMUM_DISPLAY_NUMBER);
                } else if (numberOfComments === 1) {
                    numberText = WorkItemTrackingResources.DiscussionViewNumberOfCommentsSingle;
                } else {
                    numberText = Utils_String.format(WorkItemTrackingResources.DiscussionViewNumberOfComments, numberOfComments);
                }   
            } else {
                // Error condition, don't show any count
                tooltipText = "";
                numberText = "";
            }

            RichContentTooltip.add(tooltipText, this._element);
            this._element.data("title", tooltipText);
            this._element.attr("aria-label", tooltipText);

            this._numberControl.text(numberText);
        }
    }

    private _calculateAndSetNumberOfComments(): void {
        var workItem = this._workItem;

        this._calculateNumberOfComments().then(
            (count: number) => {
                if (this._workItem == workItem) {
                    this._setNumberOfComments(count);
                }
            },
            () => {
                if (this._workItem == workItem) {
                    this._setNumberOfComments(-1);
                }
            });
    }
}

export = DiscussionAdornmentControl;