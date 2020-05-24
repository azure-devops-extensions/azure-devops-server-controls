import { Control } from "VSS/Controls";

import { ErrorMessageControl, ErrorMessageControlOptions } from "Dashboards/Scripts/ErrorMessageControl";
import { BowTieClassNames } from "Dashboards/Scripts/Generated/Constants";
import { SettingsUtilities } from "Dashboards/Scripts/SettingsUtilities";

class JQueryControlWrapperOptions {
    $element: JQuery;
}

/**
 * {SettingsField} requires a VSS Control. However many existing callers have JQuery elements instead. This class wraps
 * the JQuery element with a VSS Control so that we can use {SettingsField}. The details of this mechanism is hidden 
 * from callers — they simply call {SettingsField.createSettingsFieldForJQueryElement}.
 */
class JQueryControlWrapper extends Control<JQueryControlWrapperOptions> {
    public initialize() {
        this.getElement().append(this._options.$element);
    }
    public static Wrap($element: JQuery): JQueryControlWrapper {
        return Control.create<JQueryControlWrapper, JQueryControlWrapperOptions>(
                JQueryControlWrapper, null, { $element: $element }
        );
    }
}

export interface SettingsFieldOptionsForJQueryElement {
    /**
     * If provided, a <label> element will be created with this value. 
     * 
     * This label is automatically applied to one of the following, in order of precedence:
     * - {labelTargetElement}
     * - the first <input> element in this control
     * - the control itself
     */
    labelText?: string;

    /**
     * If provided, {labelText} will be applied to this element.
     *
     * In most cases this element can be determined automatically and does not need to be provided. See the
     * documentation of {labelText} for more details.
     */
    labelTargetElement?: JQuery;
    
    /**
     * The container of the control.
     */
    controlElement?: JQuery;

    /**
     * In order to display errors on this control, this must be true.
     * Note: If {initialErrorMessage} is provided, {hasErrorField} is implicitly assumed.
     */
    hasErrorField?: boolean;
    
    initialErrorMessage?: string;

    /**
     * collapse the error region, reclaiming its space when no errorMessage needs to be displayed
     */
    collapseOnHide?: boolean;

    toolTipText?: string;
}

export interface SettingsFieldOptions<T> extends SettingsFieldOptionsForJQueryElement {
    control: T;
    layout?: string;
}

export interface ISettingsField<T>  {    
    /**
     * Shows an error below the control if the settings field was created with hasErrorField set to true.
     * @param errorMessage - The message to show. If omitted, the previously set error message is shown.
     */
    showError(errorMessage?: string): void;    

    hideError(): void;

    toggleError(showError: boolean);
    
    getLabelId(): string;
    
    /**
     * Set the error message in the setting field.
     * @param errorMessage - The error message to display
     * @param isHtml - True if you want to present the text as html element.
     */
    setErrorMessage(errorMessage: string, isTrustedHtml?: boolean): void;

    getControl(): T;
    
    /**
     * Toggles the visibility of the busy overlay for the control wrapped by this settings field.
     * @param isEnabled shows the busy overlay if true, hides if false.
     */
    toggleControlBusyOverlay(isEnabled: boolean): void;
}

/**
 * Used in Widget Configurations to visualize a setting. 
 */
export class SettingsField<T extends Control<any>> extends Control<SettingsFieldOptions<T>> implements ISettingsField<T>{

    public static readonly DOM_CLASS_NAME = "config-settings-field";

    // Used to provide unique DOM ids to labels
    private static labelIdCount = 0;

    public get control(): T {
        if(this._options) {
            return this._options.control;
        }
        else { //Handle this path to allow SettingsField to be safely sinon.stub()'bed
            return null;
        }
        
    }
    
    private _errorMessageControl: ErrorMessageControl;
    private _labelId: string;

    public static createSettingsField<U extends Control<any>>(options: SettingsFieldOptions<U>, $parent?: JQuery): SettingsField<U> {
        return <SettingsField<U>>Control.createIn<SettingsFieldOptions<U>>(
            SettingsField,
            $parent,
            options
        );
    }

    /**
     * [OBSOLETE] - New code should use an appropriate VSS Control instead of jQuery elements.
     */
    public static createSettingsFieldForJQueryElement(
        options: SettingsFieldOptionsForJQueryElement, 
        $element: JQuery, 
        $parent: JQuery = null
    ) : SettingsField<Control<any>> {
        let control = JQueryControlWrapper.Wrap($element);
        let controlOptions = $.extend({
            control: control,
        }, options) as SettingsFieldOptions<JQueryControlWrapper>;
        let settingsField = SettingsField.createSettingsField(controlOptions, $parent);
        return settingsField;
    }

    public initializeOptions(options?: SettingsFieldOptions<T>) {
        var cssClass: string = SettingsField.DOM_CLASS_NAME;

        if (options.layout) {
            cssClass = cssClass + " " + options.layout;
        }
        
        super.initializeOptions($.extend({
            coreCssClass: cssClass,
            cssClass: BowTieClassNames.Bowtie,
            hasErrorField: options.hasErrorField || options.initialErrorMessage
        }, options));
    }

    public initialize() {
        super.initialize();

        this._labelId = null;
        if (this._options.labelText) {
            this._labelId = `widget-configuration-settings-field-label-${SettingsField.labelIdCount++}`;
            var $labelContainer = SettingsUtilities.createConfigurationLabel({
                labelText: this._options.labelText,
                id: this._labelId,
                tooltipText: this._options.toolTipText,
            });
            this.getElement().append($labelContainer);
        }

        if (this._options.control || this._options.controlElement) {
            let $control = null;
            if (this._options.control) {
                $control = this._options.control.getElement();
            }

            var $controlElement = this._options.controlElement || $control;

            if (this._options.labelText) {
                let $labelledElement = this.getLabelledElement();
                if ($labelledElement) {
                    $labelledElement.attr('aria-labelledby', this._labelId);
                }
            }
            
            this.getElement().append($controlElement);
        }

        if (this._options.hasErrorField) {
            this._errorMessageControl = <ErrorMessageControl>Control.createIn<ErrorMessageControlOptions>(
                ErrorMessageControl, 
                this.getElement(), {
                    errorMessage: this._options.initialErrorMessage,
                    collapseOnHide: this._options.collapseOnHide
                }
            );
        }
    }

    private getLabelledElement(): JQuery {
        let $labelledElement = this._options.labelTargetElement;
        let $control = null;
        if (this._options.control) {
            $control = this._options.control.getElement();
        }
        if (!$labelledElement && $control) {
            let $inputElement = $control.find('input');
            if ($inputElement && $inputElement.length == 1) {
                $labelledElement = $inputElement;
            }
        }
        if (!$labelledElement) {
            $labelledElement = $control;
        }
        return $labelledElement;
    }

    /**
     * Shows an error below the control if the settings field was created with hasErrorField set to true.
     * @param errorMessage - The message to show. If omitted, the previously set error message is shown.
     */
    public showError(errorMessage?: string): void {
        if (this.hasErrorField()) {
            this.setErrorMessage(errorMessage);
            this._errorMessageControl.showElement();
        }
    }

    public hideError(): void {
        if (this.hasErrorField()) {
            this._errorMessageControl.hideElement();
        }
    }

    public toggleError(showError: boolean) {
        if (showError) {
            this.showError()
        } else {
            this.hideError();
        }
    }

    public getLabelId(): string {
        return this._labelId;
    }

    private hasErrorField(): boolean {
        return this._options.hasErrorField;
    }

    /**
     * Set the error message in the setting field.
     * @param errorMessage - The error message to display
     * @param isHtml - True if you want to present the text as html element.
     */
    public setErrorMessage(errorMessage: string, isTrustedHtml?: boolean): void {
        if (this.hasErrorField()) {
            this._errorMessageControl.setErrorMessage(errorMessage, isTrustedHtml);
        }
    }

    public getControl(): T {
        return this.control;
    }

    /**
     * Toggles the visibility of the busy overlay for the control wrapped by this settings field.
     * @param isEnabled shows the busy overlay if true, hides if false.
     */
    public toggleControlBusyOverlay(isEnabled: boolean): void {
        if (isEnabled) {
            this._options.control.showBusyOverlay();
        } else {
            this._options.control.hideBusyOverlay();
        }
    }

    public hasError(): boolean {
        return this.hasErrorField() && this.getElement().hasClass(ErrorMessageControl.CssConfigurationErrorClass);
    }
}