import * as VSS from "VSS/VSS";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_UI from "VSS/Utils/UI";
import * as Combos from "VSS/Controls/Combos";

/**
 * Options for the OpenDropDownOnFocusCombo control
 */
export interface IOpenDropDownOnFocusComboOptions extends Combos.IComboOptions {
    /**
     * Option to not open the dropdown on keyboard focus. Would still open the dropdown on clicking into the control.
     * Set this to true in case you want the control to be accessible for users with mobility impairment and screen readers.
     */
    disableOpenOnKeyboardFocus?: boolean;
}

const COMBO_SHOW_HIDE_TIMEOUT: number = 200;

/** Extension of the common combo picker control with the functionality to open the drop down when the input gets focus. Uses a set of flags to control event flow of subclass */
export class OpenDropDownOnFocusComboO<TOptions extends IOpenDropDownOnFocusComboOptions> extends Combos.ComboO<TOptions> {
    private _showComboTimeout: number | null = null;
    private _disablePopupOnFocus: boolean;
    private _disableToggleOnJustFocused: boolean;
    private _$errorArea: JQuery;
    private _showPopup: boolean = true;

    public initializeOptions(options?: TOptions): void {
        super.initializeOptions(
            {
                focus: () => {
                    if (this.getEnabled() && !this._options.disableOpenOnKeyboardFocus) {
                        this._showDropPopup();
                    }
                },
                blur: () => {
                    this._cancelDropShowTimeout();
                    this._showPopup = false;
                    Utils_Core.delay(this, COMBO_SHOW_HIDE_TIMEOUT, () => {
                        this._showPopup = true;
                    });
                },
                onKeyDown: (e?: JQueryEventObject) => {
                    if (Utils_UI.KeyCode.TAB === e.keyCode) {
                        // Make sure the dropdown is collapsed so tab chooses next element from parent input
                        this.hideDropPopup();
                    }
                },
                ...(options as object)
            },
        );
    }

    private _showDropPopup() {
        if (!this.isDropVisible() && this._showPopup) {
            this._cancelDropShowTimeout();

            this._showComboTimeout = setTimeout(
                () => {
                    if (!this._disablePopupOnFocus) {
                        this.showDropPopup();
                    }
                },
                COMBO_SHOW_HIDE_TIMEOUT
            );
        }
    }

    private _cancelDropShowTimeout() {
        if (this._showComboTimeout) {
            clearTimeout(this._showComboTimeout);
            this._showComboTimeout = null;
        }
    }

    public initialize() {
        super.initialize();

        this.getInput().click(() => {
            if (this.getEnabled() && !this._options.disableOpenOnKeyboardFocus) {
                this._showDropPopup();
            }
        });

        this._bind("dropDownToggled", () => {
            this._disablePopupOnFocus = true;
            Utils_Core.delay(this, COMBO_SHOW_HIDE_TIMEOUT, () => {
                this._disablePopupOnFocus = false;
            });
        });
    }

    public disablePopupOnFocus(): void {
        this._disablePopupOnFocus = true;
    }

    public enablePopupOnFocus(): void {
        this._disablePopupOnFocus = false;
    }

    public toggleDropDown() {
        this._disablePopupOnFocus = this.isDropVisible();
        if (this._disableToggleOnJustFocused) {
            this._disableToggleOnJustFocused = false;
            return;
        }
        this.getBehavior().toggleDropDown();

        // Setting the focus to the input to accept the keys
        this._input.focus();
    }

    /**
     * Create error area for the combo.
     */
    public createErrorArea() {
        this._$errorArea = $("<div>").addClass("input-error-tip").insertAfter(this.getElement());
        this._$errorArea.hide();
    }

    /**
     * OVERRIDE: Dispose the control.
     */
    public dispose() {
        if (this._$errorArea) {
            this._$errorArea.remove();
            this._$errorArea = null;
        }

        if (this._element) {
            this._element.remove();
            this._element = null;
        }

        super._dispose();
    }

    /**
     * OVERRIDE: Sets the invalid state of the combo, and show message if any.
     *
     * @param isInvalid True for invalid, false for valid.
     * @param message Message to show.
     */
    public setInvalid(isInvalid: boolean, message?: string): void {
        super.setInvalid(isInvalid);
        this._setErrorMessageArea(isInvalid, message);
    }

    private _setErrorMessageArea(visible: boolean, message: string) {
        if (this._$errorArea) {
            this._$errorArea.text(message);
            this._$errorArea.attr("title", message);
            if (visible && message) {
                this._$errorArea.show();
            }
            else {
                this._$errorArea.hide();
            }
        }
    }
}

/** Extension of the common combo picker control with the functionality to open the drop down when the input gets focus. Uses a set of flags to control event flow of subclass */
export class OpenDropDownOnFocusCombo extends OpenDropDownOnFocusComboO<IOpenDropDownOnFocusComboOptions> { }

VSS.tfsModuleLoaded("TFS.UI.Controls.OpenDropDownCombo", exports);
