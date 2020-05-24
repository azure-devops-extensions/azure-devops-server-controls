import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Controls = require("VSS/Controls");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { copyWorkItemTitleToClipboard } from "WorkItemTracking/Scripts/Utils/WorkItemTitleUtils";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import CustomerIntelligenceConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");

class CopyWorkItemLinkControl extends Controls.BaseControl {
    private _workItemChangedDelegate: Function;
    private _workItem: WITOM.WorkItem;
    private _boundControl: JQuery;
    private _iconControl: JQuery;

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        super.initializeOptions($.extend({
            coreCssClass: "copy-workitem-title-container",
        }, options));
    }

    public initialize() {
        this._boundControl = this._options.boundControl;

        this._element.attr("role", "button");
        this._element.attr("aria-label", WITResources.CopyWorkItemTitle);
        this._iconControl = $("<span>").addClass("bowtie-icon bowtie-edit-copy").appendTo(this._element);

        this._element.click(() => {
            this.copyWorkItemLink();
        });

        Utils_UI.accessible(this._element);

        this._element.bind("focusin mouseenter", (e: JQueryEventObject) => {
            if (this.showElement()) {
                this._element.addClass("bowtie-tooltipped bowtie-tooltipped-sw");
                this._element.addClass(e.type === "focusin" ? "focus" : "hover");
                this._element.attr("aria-label", WITResources.CopyWorkItemTitle);
                if (this._boundControl) {
                    this._boundControl.addClass(e.type === "focusin" ? "copy-focus" : "copy-hover");
                }
            }
        }).bind("focusout mouseleave", (e: JQueryEventObject) => {
            this._element.removeClass("bowtie-tooltipped bowtie-tooltipped-sw bowtie-tooltipped-transient");
            this._element.removeClass(e.type === "focusout" ? "focus" : "hover");
            this.hideElement();
            if (this._boundControl) {
                this._boundControl.removeClass(e.type === "focusout" ? "copy-focus" : "copy-hover");
            }
        });

        if (this._boundControl) {
            this._boundControl.bind("focusin mouseenter", (e: JQueryEventObject) => {
                if (this.showElement()) {
                    this._boundControl.addClass(e.type === "focusin" ? "copy-focus" : "copy-hover");
                }
            }).bind("focusout mouseleave", (e: JQueryEventObject) => {
                this._boundControl.removeClass(e.type === "focusout" ? "copy-focus" : "copy-hover");
                this.hideElement();
            });
        }
    }

    public copyWorkItemLink() {
        copyWorkItemTitleToClipboard(this._workItem);

        // in IE the element loses focus after calling copy to clipboard, so manually put focus back to the control.
        Utils_Core.delay(this, 0, () => {
            this._element.focus();
            this._element.attr("aria-label", VSS_Resources_Platform.CopiedContentDialogTitle);
            this._element.addClass("bowtie-tooltipped-transient");
        });

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
            CustomerIntelligenceConstants.WITCustomerIntelligenceFeature.CLIENTSIDEOPERATION_COPY_WORKITEM_LINK,
            {
                "Action": "Copy the link of work item"
            }));
    }

    public showElement(): boolean {
        // do not show when in read only mode and get rid of borders
        if (this._workItem && !this._workItem.isNew() && !this._workItem.isReadOnly()) {
            this._iconControl.css("display", "block");
            return true;
        }

        return false;
    }

    public hideElement() {
        Utils_Core.delay(this, 0, () => {
            if (!this._element.hasClass("hover") && !this._element.hasClass("focus")) {
                if (!this._boundControl || (!this._boundControl.hasClass("copy-hover") && !this._boundControl.hasClass("copy-focus"))) {
                    this._iconControl.hide();
                }
            }
        });
    }

    public bind(workItem: WITOM.WorkItem) {
        if (!this._workItemChangedDelegate) {
            this._workItemChangedDelegate = (sender, args) => {
                if (args.change === WorkItemChangeType.SaveCompleted) {
                    this._element.attr("tabindex", "0");
                }
            };
        }

        if (this._workItem) {
            this._workItem.detachWorkItemChanged(this._workItemChangedDelegate);
        }

        this._workItem = workItem;
        this._workItem.attachWorkItemChanged(this._workItemChangedDelegate);

        if (this._workItem && !this._workItem.isNew() && !this._workItem.isReadOnly()) {
            this._element.attr("tabindex", "0");
        }
        else {
            this._element.removeAttr("tabindex");
        }
    }

    public unbind() {
        if (this._workItem && this._workItemChangedDelegate) {
            this._workItem.detachWorkItemChanged(this._workItemChangedDelegate);
        }
        this._workItem = null;
    }
}

export = CopyWorkItemLinkControl;
