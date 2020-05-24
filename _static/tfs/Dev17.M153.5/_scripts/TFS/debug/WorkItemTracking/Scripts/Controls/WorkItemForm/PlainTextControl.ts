import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemControl, IWorkItemControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import Utils_UI = require("VSS/Utils/UI");

export interface IPlainTextControlOptions extends IWorkItemControlOptions {
    hyperlink?: any;
    textFormatter?: any;
}

export class PlainTextControl extends WorkItemControl {
    public _options: IPlainTextControlOptions;
    protected _control: JQuery;
    private _isHidden: boolean = false;

    constructor(container, options?, workItemType?) {
        super(container, options, workItemType);
    }

    public _init() {
        super._init();

        if (this._options.hyperlink) {
            this._control = $("<a />").attr("target", "_blank").appendTo(this._container);
        }
        else {
            //If no link is present then just add the text
            this._control = $("<span></span>").appendTo(this._container);
            if (this._options.ariaLabel) {
                this._control.attr("aria-label", this._options.ariaLabel);
            }
        }
    }

    public invalidate(flushing) {
        super.invalidate(flushing);

        if (!flushing) {
            var field = this._getField();
            if (field) {
                this._renderFieldValue(field);
            }
        }
    }

    protected _renderFieldValue(field: WITOM.Field) {
        var fieldValue = field.getValue();
        var fieldTextValue = this._getFieldTextValue();
        var text = $.isFunction(this._options.textFormatter) ? this._options.textFormatter(field, fieldTextValue, fieldValue) : fieldTextValue;
        this._control.text(text);
        Utils_UI.tooltipIfOverflow(this._control[0], { titleText: fieldTextValue });

        if (this._options.hyperlink) {
            var hyperlink = $.isFunction(this._options.hyperlink) ? this._options.hyperlink(field.workItem) : this._options.hyperlink;
            this._control.attr("href", hyperlink);
        }

        if (text) {
            this._isHidden && this._container.show();
            this._isHidden = false;
        }
        else {
            this._container.hide();
            this._isHidden = true;
            this._control.attr("href", "");
        }
    }

    public _getControlValue(): any {
        /// <returns type="any" />
        return this._control.text();
    }

    public clear() {
        this._control.text("");
        this._control.attr("href", "");
        this._container.hide();
        this._isHidden = true;
    }
}
