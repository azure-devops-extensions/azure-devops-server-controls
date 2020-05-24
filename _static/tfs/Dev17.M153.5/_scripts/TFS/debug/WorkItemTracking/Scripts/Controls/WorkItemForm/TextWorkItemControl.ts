import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import Q = require("q");
import { IContainedFieldControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/Interfaces";
import { FieldType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

var delegate = Utils_Core.delegate;

export interface ITextWorkItemControlOptions {
    dropSourceGeneratorAsync?: (field: WITOM.Field) => IPromise<any[]>;
    disableSpellCheck?: boolean;
    allowEmpty?: boolean;
}

export class TextWorkItemControl implements IContainedFieldControl {
    private static CONTROL_MAX_WIDTH = 300;
    private static COMBO_SHOW_HIDE_TIMEOUT = 100;

    protected _workItemControl: WorkItemControl;
    private _options: ITextWorkItemControlOptions;
    private _control: Combos.Combo;
    private _showComboTimeout;
    private _disableShowOnFocus: boolean;
    private _showDrop: boolean;
    private _onWorkItemChangedDelegate: (workitem: WITOM.WorkItem, eventData: WITOM.IWorkItemChangedArgs) => void;
    private _isEmptyBorder: boolean;
    private _isReadOnly: boolean;
    private _isInvalid: boolean;

    constructor(workItemControl: WorkItemControl, options?: ITextWorkItemControlOptions, comboOptions?) {
        this._disableShowOnFocus = false;
        this._showDrop = true;
        this._onWorkItemChangedDelegate = delegate(this, this._onWorkItemChanged);
        this._showComboTimeout = null;
        this._isEmptyBorder = null;
        this._isReadOnly = null;
        this._isInvalid = null;

        this._workItemControl = workItemControl;
        this._control = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, workItemControl._container, $.extend({
            mode: "text",
            disableTextSelectOnFocus: true,
            maxAutoExpandDropWidth: TextWorkItemControl.CONTROL_MAX_WIDTH,
            setTitleOnlyOnOverflow: true,
            isFocusableWhenDisabled: true,
            change: () => {
                this._control.delayExecute("combo change", 150, true, () => {
                    if (workItemControl && !this._control.isDisposed()) {
                        workItemControl.flush();
                    }
                });
                return false;
            },
            id: workItemControl._options.controlId,
            focus: () => {
                this._setEmptyBorder(false);
                this._showDropPopup();
            },
            blur: () => {
                this._setEmptyBorder();

                this._cancelDropShowTimeout();
                this._showDrop = false;
                Utils_Core.delay(this, TextWorkItemControl.COMBO_SHOW_HIDE_TIMEOUT, () => {
                    this._showDrop = true;
                });
            }
        } as Combos.IComboOptions, comboOptions));

        // when drop button is clicked, it again puts focus back to input, thus preventing us to ever close the dropdown
        // So we need to disable showing dropdown on focus if user clicked on drop button
        this._control._bind("dropDownToggled", () => {
            this._disableShowOnFocus = true;
            Utils_Core.delay(this, TextWorkItemControl.COMBO_SHOW_HIDE_TIMEOUT, () => {
                this._disableShowOnFocus = false;
            });
        });
        this._control.getInput().click(() => {
            this._showDropPopup();
        });

        if (workItemControl._options.emptyText) {
            Utils_UI.Watermark($("input", this._control.getElement()), { watermarkText: workItemControl._options.emptyText });
        }

        this._setEmptyBorder();

        // Do not set maxlength on text control if it is HTML or PlainText field type
        const field = this._workItemControl.getFieldDefinition(this._workItemControl._fieldName);
        if (!field || !(field.type === FieldType.Html || field.type === FieldType.PlainText)) {
            let maxLength = Math.min(workItemControl._options.maxLength || WITOM.WorkItem.MAX_TITLE_LENGTH, WITOM.WorkItem.MAX_TITLE_LENGTH);
            $("input", this._control.getElement()).attr("maxlength", maxLength);
        }

        if (comboOptions && comboOptions.ariaLabel) {
            $("input", this._control.getElement()).attr("aria-label", comboOptions.ariaLabel);
        }

        this._options = $.extend({
            dropSourceGeneratorAsync: (field: WITOM.Field) => {
                if (field.hasList()) {
                    return Q(() => field.getAllowedValues().map(v => {
                        // if a field has allowed values, it can only be either string or numeric field here.
                        // allowed values always comes down as string, so we need to cast them properly.
                        if (field.fieldDefinition.type === FieldType.Integer) {
                            return Utils_Core.convertValueToDisplayString(parseInt(v));
                        } else if (field.fieldDefinition.type === FieldType.Double) {
                            return Utils_Core.convertValueToDisplayString(parseFloat(v));
                        } else {
                            return v;
                        }
                    }));
                }
                return Q(null);
            }
        }, options);

        if (options && options.disableSpellCheck) {
            $("input", this._control.getElement()).attr("spellcheck", "false");
        }
    }

    public dispose() {
        if (this._control) {
            this._control.dispose();
            this._control = null;
        }
    }

    public onResize(): void {
        //if not hide dropdown on resize, it will remain there after resize
        this._control.hideDropPopup();
    }


    private _setEmptyBorder(enabled: boolean = null) {
        if (enabled == null) {
            var text = this._workItemControl._getFieldTextValue();
            enabled = ($.trim(text) === "");
        }

        if (this._isEmptyBorder === enabled) {
            return;
        }

        this._isEmptyBorder = enabled;
        this._control.getElement().toggleClass("emptyBorder", enabled);
    }

    private _setReadOnly(readOnly: boolean) {
        if (this._isReadOnly === readOnly) {
            return;
        }

        this._isReadOnly = readOnly;
        this._control.getElement().toggleClass("readonly", readOnly);
    }

    private _setMode(mode: string) {
        if (this._control.getMode() === mode) {
            return;
        }

        this._control.setMode(mode);
    }

    private _cancelDropShowTimeout() {
        if (this._showComboTimeout) {
            clearTimeout(this._showComboTimeout);
            this._showComboTimeout = null;
        }
    }

    private _showDropPopup() {
        if (!this._workItemControl.isReadOnly() && this._control.getMode() === "drop"
            // An existing feature in DateTime Combo control prohibits user to type in the control if the date picker is open.
            // So we dont want to open dropdown (date picker) on focus on DateTime control as we want users to be able to type once they put focus on it
            && this._control.getComboType() !== "date-time"
            && !this._control.isDropVisible() && this._showDrop) {

            this._cancelDropShowTimeout();

            this._showComboTimeout = setTimeout(() => {
                if (!this._disableShowOnFocus) {
                    this._control.showDropPopup();
                }
            }, TextWorkItemControl.COMBO_SHOW_HIDE_TIMEOUT);
        }
    }

    public invalidate(flushing: boolean, field: WITOM.Field) {
        const control = this._control;
        const witControl = this._workItemControl;
        const that = this;

        if (field) {
            const invalid = this._options.allowEmpty ? !field.isValidValueOrEmpty() : !field.isValid();
            if (!flushing) {
                const readOnly = witControl.isReadOnly();
                if (!readOnly && this._options.dropSourceGeneratorAsync) {
                    this._options.dropSourceGeneratorAsync(field).then(function (dropSource: any[]) {
                        if (control && !control.isDisposed()) {
                            if (dropSource) {
                                that._setMode("drop");
                                control.setSource(dropSource);
                            }
                            else {
                                that._setMode("text");
                            }
                        }
                    });
                }
                else {
                    this._setMode("text");
                }
                this._setReadOnly(readOnly);
                let text = witControl._getFieldTextValue(field);
                let wasEmpty: boolean = ($.trim(this.getValue()) === "");
                this.setValue(text);
                this.setInvalid(invalid);
                this.setEnabled(!readOnly);

                if ($.trim(text) === "") {
                    // keep this nested if for readability (always blur if reduce DOM update FF is not on or
                    // if it is, previous value must be non-empty
                    if (!wasEmpty) {
                        // trigger is expensive, only call it when text has changed (previously not empty)
                        this._control.getInput().trigger("blur");
                    }
                }
                this._setEmptyBorder();
            }
            else {
                this.setInvalid(invalid);
            }
        }
        else {
            this._setMode("text");
            this.clear();
            this.setEnabled(false);
        }
    }

    public getValue() {
        return this._control.getText(); // value can be changed by user, so don't cache
    }

    public setValue(value: string) {
        return this._control.setText(value);
    }

    public clear() {
        if (this.getValue() === "") {
            return; // if value is already cleared, just exit since trigger("blur") is expensive
        }

        this.setValue("");
        // we need to fire blur event on the input to force show the watermark when we set empty text using val() function.
        this._control.getInput().trigger("blur");
    }

    public setInvalid(invalid: boolean) {
        // cache isInvalid ourselves, since _control.getInvalid reads from DOM
        if (this._isInvalid === invalid) {
            return;
        }

        this._isInvalid = invalid;
        this._control.setInvalid(invalid);
    }

    public setEnabled(enabled: boolean) {
        // _control.getEnabled() has caching
        if (this._control.getEnabled() === enabled) {
            return;
        }

        this._control.setEnabled(enabled);
    }

    public setAdditionalValues(allowedValues: string[]): void {
        // Not implemented for text controls.
    }

    public onBind(workItem: WITOM.WorkItem): void {
        this._workItemControl._workItem.attachWorkItemChanged(this._onWorkItemChangedDelegate);
    }

    public onUnbind(): void {
        this._workItemControl._workItem.detachWorkItemChanged(this._onWorkItemChangedDelegate);
    }

    private _onWorkItemChanged(workitem: WITOM.WorkItem, eventData: WITOM.IWorkItemChangedArgs) {
        if (eventData && eventData.change === WorkItemChangeType.PreSave) {
            if (this._control.isDropVisible()) {
                this._control.hideDropPopup();
            }
        }
    }
}
