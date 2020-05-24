import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { publishErrorToTelemetry } from "VSS/Error";
import { PlainTextControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/PlainTextControl";
import { IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

export enum FreshnessIndicatorDisplayMode {
    None,
    Minimal,
    Full
}

export interface IFreshnessIndicatorOptions extends IWorkItemControlOptions {
    getDisplayMode: (fullWidth: number, minimalWidth: number) => FreshnessIndicatorDisplayMode;
}

export class FreshnessIndicatorControl extends PlainTextControl {
    public _options: IFreshnessIndicatorOptions;
    private _fullIndicator: JQuery;
    private _minimalIndicator: JQuery;
    private _fullIndicatorWidth: number = 0;
    private _minimalIndicatorWidth: number = 0;

    constructor(container, options?: IFreshnessIndicatorOptions, workItemType?) {
        super(container, options, workItemType);
    }

    public _init() {
        super._init();
        this._control = $("<div />").appendTo(this._container);
        this._fullIndicator = $("<span />").addClass("freshness-indicator").appendTo(this._control);
        this._minimalIndicator = $("<span />").addClass("freshness-indicator").appendTo(this._control);
    }

    protected _renderFieldValue(field: WITOM.Field) {
        const changedByField = this._workItem.getField(WITConstants.CoreFieldRefNames.ChangedBy);
        const changedDateField = this._workItem.getField(WITConstants.CoreFieldRefNames.ChangedDate);
        let fullText = "";
        let minimalText = "";

        if (!this._workItem.isNew()) {
            const changedDateFieldValue = changedDateField.getValue();
            const identity = changedByField.getIdentityValue();

            if (identity) {
                fullText = WorkItemTrackingResources.LastUpdatedLabel + identity.displayName;
            } else {
                fullText = WorkItemTrackingResources.LastUpdatedLabel;
            }

            if (changedDateFieldValue) {
                minimalText = Utils_String.format("{0} {1}", WorkItemTrackingResources.LastUpdatedDateLabel, this._getFriendlyDataValue(changedDateFieldValue));
            }

            fullText = Utils_String.format("{0} {1}", fullText, changedDateFieldValue ? this._getFriendlyDataValue(changedDateFieldValue) : "");

            // Display control to get initial width
            this._control.show();

            this._fullIndicator.text(fullText);
            this._fullIndicatorWidth = this._fullIndicator.outerWidth();
            this._minimalIndicator.text(minimalText);
            RichContentTooltip.add(fullText, this._minimalIndicator);
            this._minimalIndicatorWidth = this._minimalIndicator.outerWidth();

            this._adjustDisplay();
        }
        else {
            // Hide control when this is new work item
            this._adjustDisplay(true);
        }
    }

    private _getFriendlyDataValue(date: Date): string {
        try {
            return Utils_Date.friendly(date);
        } catch (ex) {
            publishErrorToTelemetry({
                name: "UnableToGetFriendlyDate",
                message: `${this._workItem.id}:${date};`
            });

            throw ex;
        }
    }

    protected onControlResized() {
        this._adjustDisplay(this._workItem.isNew());
    }

    private _adjustDisplay(forceHide?: boolean): void {
        let displayMode = FreshnessIndicatorDisplayMode.None;

        if (this._options && $.isFunction(this._options.getDisplayMode)) {
            displayMode = this._options.getDisplayMode(this._fullIndicatorWidth, this._minimalIndicatorWidth);
        }

        if (forceHide) {
            this._control.hide();
        }

        if (displayMode === FreshnessIndicatorDisplayMode.Full) {
            this._control.show();
            this._fullIndicator.show();
            this._minimalIndicator.hide();
        }
        else if (displayMode === FreshnessIndicatorDisplayMode.Minimal) {
            this._control.show();
            this._fullIndicator.hide();
            this._minimalIndicator.show();
        }
        else {
            this._control.hide();
        }
    }

    public clear() {
        this._fullIndicator.text("");
        this._minimalIndicator.text("");
        this._fullIndicatorWidth = 0;
        this._minimalIndicatorWidth = 0;
    }
}
