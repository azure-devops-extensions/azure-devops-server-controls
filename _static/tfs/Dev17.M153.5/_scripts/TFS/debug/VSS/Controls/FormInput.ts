
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import PopupContent = require("VSS/Controls/PopupContent");
import Diag = require("VSS/Diag");
import Dialogs = require("VSS/Controls/Dialogs");
import FormInput_Contracts = require("VSS/Common/Contracts/FormInput");
import Locations = require("VSS/Locations");
import Platform_Resources = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import Q = require("q");

var getErrorMessage = VSS.getErrorMessage;
var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

/**
* Options for the file input control.
*/
export interface FormInputControlOptions {
    inputsViewModel: InputsViewModel;
    headerLabel: string;
    comboControlMap: { [key: string]: Combos.Combo };
}

export interface ExtendedInputDescriptor extends FormInput_Contracts.InputDescriptor {
    /**
     * A list of functions to be called when this input is deleted.
     */
    deleteCallbacks: (() => void)[];
    /**
     * A list of functions, all of which must return true for this input to be considered valid
     */
    dependencies: InputViewModelDelegate<boolean>[];
    /**
     * A list of functions to be called when the state of all dependencies of this input being satisfied changes.
     */
    dependenciesSatisfiedCallbacks: ((satisfied: boolean) => void)[];
    /**
     * Gets whether this input should be invisible until all of its dependencies are satisfied or not.
     */
    hideUntilSatisfied: boolean;
    /**
     * Gets whether this input is deletable.
     */
    isDeletable: boolean;
    /**
     * Gets whether this input should be invalidated when one of its dependency's value changes or not.
     * Odd name is due to the fact that the default should be to invalidate (based on FormInput_Contracts.InputDescriptor).
     */
    noInvalidateOnDependencyChange: boolean;
    /**
     * Gets whether or not to display the valid icon for this input.
     */
    noValidIcon: boolean;
    /**
     * Information to use to validate this input's value
     */
    validation: ExtendedInputValidation;
    /**
     * A list of functions to be called when the value of this input is changed.
     */
    valueChangedCallbacks: InputViewModelDelegate<void>[];
}

export interface ExtendedInputValidation extends FormInput_Contracts.InputValidation {
    /**
     * A function called when checking input validity. Validation.isValid must be true for the input to be considered valid.
     */
    validateFunction: InputViewModelDelegate<Validation>;
}

export interface Validation {
    /**
     * True if input is valid, false otherwise.
     */
    isValid: boolean;
    /**
     * Error message if input is not valid
     */
    error: string;
}

export interface InputGroup {
    $header: JQuery;
    $table: JQuery;
    memberCount: number;
}

export interface InputViewModelDelegate<T> {
    (inputViewModel: InputViewModel): T;
}

//This module exists to ensure that FormInputControl doesn't add multiple listeners
//to a single InputViewModel. This can happen in ServiceHooks when the same InputViewModels
//are used across multiple FormInputControls. When this happens, the InputViewModel
//can call valueChangedCallbacks which were created by now destroyed FormInputControls.
//This module guarantees the expected behavior of an InputViewModel only having one
//FormInputControl callback.
module FormInputControlValueChangedCallbacks {

    interface ValueChangedCallback {
        inputViewModel: InputViewModel;
        valueChangedCallback: InputViewModelDelegate<void>;
    }


    var callbacks: ValueChangedCallback[] = [];

    export function addCallback(inputViewModel: InputViewModel, callback: InputViewModelDelegate<void>): void {
        for (var i = 0; i < callbacks.length; i++) {
            if (callbacks[i].inputViewModel === inputViewModel) {
                callbacks[i].inputViewModel.removeValueChangedCallback(callbacks[i].valueChangedCallback);
                callbacks.splice(i, 1);
                break;
            }
        }
        callbacks.push(<ValueChangedCallback> {
            inputViewModel: inputViewModel,
            valueChangedCallback: callback
        });
        inputViewModel.addValueChangedCallback(callback);
    }

}

export class FormInputControl extends Controls.Control<FormInputControlOptions> {
    
    private _$inputsContainer: JQuery;
    private _headerLabel: string;
    private _comboControlMap: { [key: string]: Combos.Combo };
    private _inputGroups: { [groupName: string]: InputGroup };
    private _$inputIdToElements: { [inputId: string]: JQuery[] };
    private _inputsViewModel: InputsViewModel;

    /*
    * Creates a FormInput control within the given container element
    *
    * @param $container Element to create the control in
    * @param options File input control options
    */
    public static createControl($container: JQuery, options: FormInputControlOptions): FormInputControl {
        var control = <FormInputControl>Controls.BaseControl.createIn(FormInputControl, $container, $.extend({}, options));
        return control;
    }

    public initializeOptions(options?): void {
        super.initializeOptions(<FormInputControlOptions>$.extend({
            coreCssClass: "core-form-input-control"
        }, options));
    }

    public initialize(): void {
        this._$inputsContainer = $("<div>").addClass("form-input-inputs-container").appendTo(this._element);
        this._headerLabel = this._options.headerLabel;
        this._comboControlMap = this._options.comboControlMap;
        this._inputGroups = {};
        this._$inputIdToElements = {};
        this._inputsViewModel = this._options.inputsViewModel;

        this._createGroup(this._headerLabel);

        if (this._inputsViewModel && this._inputsViewModel.getInputViewModels().length > 0) {
            $.each<InputViewModel>(this._inputsViewModel.getInputViewModels(),(indexInArray: number, inputViewModel: InputViewModel) => {
                this.addInputViewModel(inputViewModel);
            });
        }
    }

    public deleteControl(): void {
        this._$inputsContainer.remove();
    }

    private _createGroup(headerLabel: string): InputGroup {
        var group = <InputGroup> {
            $header: $("<div>").text(headerLabel)
                .addClass("form-input-inputs-group-header")
                .appendTo(this._$inputsContainer),
            $table: $("<table>").appendTo(this._$inputsContainer),
            memberCount: 1
        };
        this._inputGroups[headerLabel] = group;
        return group;
    }

    public addInputViewModel(inputViewModel: InputViewModel): void {
        var inputDescriptor = inputViewModel.getInputDescriptor();
        var groupName = inputDescriptor.groupName || this._headerLabel;
        var group = this._inputGroups[groupName];
        if (!group) {
            group = this._createGroup(groupName);
        } else {
            group.memberCount++;
        }
        this._createInputField(inputViewModel, group.$table, this._comboControlMap);

        if (inputDescriptor.hideUntilSatisfied) {
            var showHideFn = this._showHideInputViewModel.bind(this, inputViewModel);
            inputViewModel.addDependenciesSatisfiedCallback(showHideFn, true);
            showHideFn(inputViewModel.getDependenciesSatisfied());
        }
    }

    public removeInputViewModel(inputViewModel: InputViewModel, removeFromInputsViewModel = true): void {
        var id = inputViewModel.getId();
        $.each(this._$inputIdToElements[id], (i: number, element: JQuery) => {
            element.remove();
        });
        delete this._$inputIdToElements[id];

        var groupName = inputViewModel.getInputDescriptor().groupName || this._headerLabel;
        var group = this._inputGroups[groupName];
        if (!group) {
            return
        } else {
            group.memberCount--;
            if (group.memberCount <= 0) {
                group.$header.remove();
                group.$table.remove();
                delete this._inputGroups[groupName];
            }
        }

        if (removeFromInputsViewModel) {
            this._inputsViewModel.removeInputViewModel(inputViewModel);
        }
    }

    public showInputViewModel(inputViewModel: InputViewModel): void {
        this._showHideInputViewModel(inputViewModel, true);
    }

    public hideInputViewModel(inputViewModel: InputViewModel): void {
        this._showHideInputViewModel(inputViewModel, false);
    }

    private _showHideInputViewModel(inputViewModel: InputViewModel, show: boolean): void {
        var id = inputViewModel.getId();
        $.each(this._$inputIdToElements[id], (i: number, element: JQuery) => {
            if (show) {
                element.show();
            } else {
                element.hide();
            }
        });
    }

    private _createDeleteButton(inputViewModel: InputViewModel): JQuery {
        var $deleteIcon = $("<span>").addClass("icon icon-delete-grey-f1-background");
        $deleteIcon.hover(
            (evt) => {
                $deleteIcon.removeClass("icon-delete-grey-f1-background");
                $deleteIcon.addClass("icon-delete");
            },
            (evt) => {
                $deleteIcon.removeClass("icon-delete");
                $deleteIcon.addClass("icon-delete-grey-f1-background");
            });
        $deleteIcon.click((evt) => {
            this.removeInputViewModel(inputViewModel, true);
        });
        return $deleteIcon;
    }

    public getGroupHeader(groupName?: string): JQuery {
        var groupName = groupName || this._headerLabel;
        var group = this._inputGroups[groupName];
        if (group) {
            return group.$header;
        } else {
            return undefined;
        }
    }

    public getInputFieldById(id: string): JQuery {
        return $("#main-tr-" + id);
    }

    public createRowBeforeInput(id: string): JQuery {
        return $("<tr>").insertBefore(this.getInputFieldById(id));
    }

    public createRowAfterInput(id: string): JQuery {
        return $("<tr>").insertAfter(this.getInputFieldById(id));
    }

    private _addDescriptionIcon(description: string, $target: JQuery): void {
        var descriptionSpan = $("<span>")
            .css("vertical-align", "text-top")
            .attr({
                tabindex: "0",
                role: "note",
            })
            .addClass("icon icon-info-white form-input-description-icon")
            .appendTo($target);
        PopupContent.RichContentTooltip.add(description, descriptionSpan);
        descriptionSpan.attr("aria-label", description);
    }

    private _createInputField(inputViewModel: InputViewModel, $parent: JQuery, comboControlMap: { [key: string]: Combos.Combo }): void {
        var inputDescriptor: ExtendedInputDescriptor = inputViewModel.getInputDescriptor();
        var $elements: JQuery[] = [];
        this._$inputIdToElements[inputDescriptor.id] = $elements;

        if (inputDescriptor.noValidIcon === undefined) {
            if (inputDescriptor.inputMode === FormInput_Contracts.InputMode.RadioButtons ||
                inputDescriptor.inputMode === FormInput_Contracts.InputMode.CheckBox) {
                inputDescriptor.noValidIcon = true;
            }
        }

        // Create the label above the control.
        if (inputDescriptor.inputMode != FormInput_Contracts.InputMode.CheckBox) {
            var $trLabel = $("<tr>").appendTo($parent);
            var $tdLabel = $("<td>").appendTo($trLabel);
            var $tdEmpty = $("<td>").appendTo($trLabel);
            var $divLabel = $("<div>").addClass("form-input-label-above").appendTo($tdLabel);
            var requiredText: string = inputViewModel.isRequired() ? Platform_Resources.RequiredInput : Platform_Resources.OptionalInput;
            var id: string = "text-" + inputDescriptor.id;
            $("<label>").html(inputDescriptor.name).addClass("form-input-label").attr("for", id).appendTo($divLabel);
            if (inputDescriptor.description) {
                this._addDescriptionIcon(inputDescriptor.description, $divLabel);
            }
            if (inputDescriptor.isDeletable) {
                this._createDeleteButton(inputViewModel).appendTo($divLabel);
            }
            if (!inputDescriptor.noValidIcon) {
                $("<span>").addClass("form-input-label-right").text(requiredText).appendTo($divLabel);
            }
            FormInputControl._fixLinkTargets($divLabel);
            $elements.push($trLabel);
        }

        // Create a container for the input field.
        var $trField = $("<tr>").attr("id", "main-tr-" + inputDescriptor.id).appendTo($parent);
        var $divInput = $("<td>").addClass("form-input-input-container").attr("title", inputDescriptor.description).appendTo($trField);
        $elements.push($trField);

        //// Create the input field.
        if (inputDescriptor.inputMode == FormInput_Contracts.InputMode.TextBox) {
            var combo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $divInput, {
                mode: "text",
                change: () => {
                    inputViewModel.setValue(combo.getText());
                },
                blur: () => {
                    inputViewModel.onBlur();
                }
            });

            combo.setText(inputViewModel.getValue());
            var $comboInput = combo.getInput();
            $comboInput.attr("spellcheck", "false");
            $comboInput.attr("id", id);
            Utils_UI.Watermark($comboInput, { watermarkText: inputDescriptor.valueHint });

            FormInputControlValueChangedCallbacks.addCallback(inputViewModel, this._textInputValueChanged.bind(this, combo));
        }
        else if (inputDescriptor.inputMode == FormInput_Contracts.InputMode.PasswordBox) {
            var $input = $("<input type=password>").attr("spellcheck", "false").appendTo($divInput);
            $input.val(inputViewModel.getValue());
            $input.attr("id", id);
            Utils_UI.Watermark($input, { watermarkText: inputDescriptor.valueHint });

            Controls.Enhancement.enhance(Combos.Combo, $input, {
                mode: "text",
                change: () => {
                    $input[0].removeAttribute("title"); // don't show password in tooltip
                    inputViewModel.setValue($input.val());
                },
                blur: () => {
                    inputViewModel.onBlur();
                }
            });
        }
        else if (inputDescriptor.inputMode == FormInput_Contracts.InputMode.CheckBox) {
            var id: string = "check-" + inputDescriptor.id;
            var $label = $("<label>").attr("for", id).appendTo($divInput);
            var $checkbox = $("<input/>").attr("type", "checkbox").attr("id", id).appendTo($label);
            var $span = $("<span/>").css("vertical-align", "baseline").text(inputDescriptor.name).appendTo($label);
            if (inputDescriptor.description) {
                this._addDescriptionIcon(inputDescriptor.description, $label);
            }
            if (inputDescriptor.isDeletable) {
                this._createDeleteButton(inputViewModel).appendTo($label);
            }
            var isTrue = String(inputViewModel.getValue()).toLowerCase() === 'true';
            $checkbox.prop("checked", isTrue);
            $checkbox.change(() => {
                var checked: boolean = $checkbox.prop("checked");
                inputViewModel.setValue(checked);
            });
        }
        else if (inputDescriptor.inputMode == FormInput_Contracts.InputMode.TextArea) {
            var $textarea = $("<textarea/>").attr("rows", "3").addClass("form-input-input requiredInfoLight").appendTo($divInput)
            $textarea.text(inputViewModel.getValue());
            $textarea.attr("id", id);
            Utils_UI.Watermark($textarea, { watermarkText: inputDescriptor.valueHint });
            $textarea.bind("change keyup",() => {
                inputViewModel.setValue($textarea.val());
            });
        }
        else if (inputDescriptor.inputMode == FormInput_Contracts.InputMode.Combo) {
            // Get the drop down items for the combo.
            var displayValues: string[] = [];
            if (inputDescriptor.values && inputDescriptor.values.possibleValues) {
                $.each(inputDescriptor.values.possibleValues,(i: number, value: FormInput_Contracts.InputValue) => {
                    displayValues.push(value.displayValue ? value.displayValue : value.value);
                });
            }

            // Create the drop down combo.
            var combo = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $divInput, {
                source: displayValues,
                allowEdit: !inputViewModel.isDropList(),
                change: () => {
                    if (!inputViewModel.isDropList()) {
                        inputViewModel.setValue(combo.getText());
                    }
                },
                blur: () => {
                    if (!inputViewModel.isDropList()) {
                        inputViewModel.onBlur();
                    }
                },
                indexChanged: (index) => {
                    if (index >= 0) {
                        inputViewModel.setValue(inputViewModel.getPossibleValueAtIndex(index).value);
                    }
                    else {
                        inputViewModel.setValue(undefined);
                    }
                    inputViewModel.setSelectedIndex(index);
                }
            });

            // Set the initial value, either a selected index or the text depending on the combo type.
            if (inputViewModel.isDropList()) {
                if (inputViewModel.getSelectedIndex() != -1) {
                    combo.setSelectedIndex(inputViewModel.getSelectedIndex(), false);
                }
                if (displayValues.length == 1) {
                    combo.setSelectedIndex(0, false);
                    combo.setEnabled(false);
                }
            }
            else {
                combo.setText(inputViewModel.getValue());
            }

            // Turn off spell checker.
            var $comboInput = combo.getInput();
            $comboInput.attr("spellcheck", "false");
            $comboInput.attr("id", id);

            comboControlMap[inputDescriptor.id] = combo;
        }
        else if (inputDescriptor.inputMode == FormInput_Contracts.InputMode.RadioButtons) {
            if (inputDescriptor.values && inputDescriptor.values.possibleValues) {
                $.each(inputDescriptor.values.possibleValues,(i: number, value: FormInput_Contracts.InputValue) => {
                    var $radio = $("<input/>").attr("type", "radio").attr("name", inputDescriptor.id).attr("id", id).attr("value", value.value).appendTo($divInput);
                    var $label = $("<label/>").attr("for", id).text(value.displayValue).appendTo($divInput);

                    if (inputViewModel.getValue() === value.value) {
                        $radio.prop("checked", true);
                    }

                    $radio.change(() => {
                        var selectedValue = $("input[name=" + inputDescriptor.id + "]:checked").attr("value");
                        if (selectedValue === value.value) {
                            inputViewModel.setValue(selectedValue);
                        }
                    });

                    FormInputControlValueChangedCallbacks.addCallback(inputViewModel, this._radioInputValueChanged.bind(this, $radio, value.value));
                });
            }
        }

        var $td = $("<td>").addClass("form-input-valid-column").appendTo($trField);
        var $divIcon = $("<div>").appendTo($td);

        if (!inputDescriptor.noValidIcon) {
            // Create the validation icon for this field.
            var $iconValid = $("<span/>")                
                .addClass("icon icon-empty")
                .appendTo($divIcon);

            $iconValid.attr("id", "icon-valid-" + inputDescriptor.id);

            var tooltip = PopupContent.RichContentTooltip.add(inputViewModel.getValidationMessage(), $iconValid);
            this._setupTooltip($iconValid, tooltip, inputViewModel);
            FormInputControlValueChangedCallbacks.addCallback(inputViewModel, this._setupTooltip.bind(this, $iconValid, tooltip, inputViewModel));
        }

        // Create the progress icon if this field has dependent fields.
        if (inputDescriptor.dependencyInputIds) {
            var $progressIcon = $("<img align=absMiddle>")
                .attr("src", Locations.urlHelper.getVersionedContentUrl("spinner.gif"))
                .appendTo($divIcon);

            $progressIcon.attr("id", "icon-progress-" + inputDescriptor.id);
            $progressIcon.addClass("form-input-hide");
        }
    }

    private _textInputValueChanged(combo: Combos.Combo, inputViewModel: InputViewModel): void {
        combo.setText(inputViewModel.getValue());
    }

    private _radioInputValueChanged($radio: JQuery, radioValue: any, inputViewModel: InputViewModel): void {
        $radio.prop("checked", (inputViewModel.getValue() === radioValue));
    }

    private _setupTooltip($icon: JQuery, tooltip: PopupContent.RichContentTooltip, inputViewModel: InputViewModel) {
        if($icon && $icon.length > 0) {

            $icon.removeClass();
            $icon.removeAttr("title");
            $icon.removeAttr("tabindex");

            var iconStateClass: string = "icon-empty";
            var isOptionalAndEmpty: boolean = !inputViewModel.isRequired() && inputViewModel.isEmpty();
            var isCheckbox: boolean = inputViewModel.getInputDescriptor().inputMode == FormInput_Contracts.InputMode.CheckBox;

            if (!isOptionalAndEmpty && !isCheckbox) {
                if (inputViewModel.isValid()) {
                    iconStateClass = "icon-valid-field hooks-input-valid";
                }
                else {
                    iconStateClass = "icon-invalid-field hooks-input-invalid";
                }

                const validationMessage = inputViewModel.getValidationMessage();

                if (validationMessage) {
                    tooltip.setTextContent(validationMessage);
                    $icon.attr("tabindex", "0");
                    $icon.attr("aria-label", validationMessage);
                }
                else {
                    tooltip.resetContent();
                }

            }

            $icon.addClass("icon " + iconStateClass);
        }
    }

    private static _fixLinkTargets(element: JQuery): void {
        $("a", element).attr("target", "_blank");
    }

    public static getProgressIconForInput(inputId: string): JQuery {
        return $("#icon-progress-" + inputId);
    }

    public static getValidationIconForInput(inputId: string): JQuery {
        return $("#icon-valid-" + inputId);
    }
}

export class FormInputViewModel {
    protected _inputsViewModels: {
        [key: string]: InputsViewModel
    };

    protected _dependentInputsLoadingCallback: any;
    protected _dependentInputsLoadedCallback: any;
    protected _inputValidChangedCallback: any;
    protected _inputValuesChangedCallback: any;
    protected _queryForValuesCallback: any;
    protected _isDirty: boolean;
    public mapInputIdToComboControl: { [key: string]: Combos.Combo };

    constructor(
        dependentInputsLoadingCallback: any,
        dependentInputsLoadedCallback: any,
        inputValidChangedCallback: any,
        inputValuesChangedCallback: any,
        queryForValuesCallback?: any) {

        this._inputsViewModels = {};

        var emptyFn = (() => { });
        this._dependentInputsLoadedCallback = dependentInputsLoadedCallback || emptyFn;
        this._dependentInputsLoadingCallback = dependentInputsLoadingCallback || emptyFn;
        this._inputValidChangedCallback = inputValidChangedCallback || emptyFn;
        this._inputValuesChangedCallback = inputValuesChangedCallback || emptyFn;
        this._queryForValuesCallback = queryForValuesCallback;
        this.mapInputIdToComboControl = {};


        // Mark view model as not dirty.
        this._isDirty = false;
    }

    public addInputsViewModel(key: string, inputsViewModel: InputsViewModel): void {
        this._inputsViewModels[key] = inputsViewModel;
    }


    public isDirty(): boolean {
        if (!this._isDirty) {
            var dirtyValues:boolean[] = $.map(this._inputsViewModels,(value: InputsViewModel, index: any) => {
                return value.areDirty();
            });
            return dirtyValues.some((value: boolean, index: number, array: boolean[]) => {
                return value;
            });
        }
        return true;
    }

    public inputsAreValid(inputsKey: string): boolean {
        return this._inputsViewModels[inputsKey] ? this._inputsViewModels[inputsKey].areValid() : false;
    }

    public queryInputValues(inputsViewModel: InputsViewModel, inputsToQuery: InputViewModel[], callback: any, callbackContext: any): void {

        var inputValues: FormInput_Contracts.InputValues[] = [];
        var inputIds: string[] = [];

        $.each(inputsToQuery,(i: number, inputViewModel: InputViewModel) => {
            var inputDescriptor: FormInput_Contracts.InputDescriptor = inputViewModel.getInputDescriptor();
            if (inputDescriptor.hasDynamicValueInformation) {
                if (inputsViewModel.allDependentsSatisfied(inputViewModel)) {
                    inputValues.push(<FormInput_Contracts.InputValues>{ inputId: inputDescriptor.id });
                    inputIds.push(inputDescriptor.id);
                }
            }
        });

        if (!inputValues.length) {
            if ($.isFunction(callback)) {
                callback.call(this, inputsViewModel, callbackContext);
            }
            return;
        }

        $.each(inputIds,(i: number, inputId: string) => {
            this._showOrHideProgressIndicator(inputId, true);
        });

        this._dependentInputsLoadingCallback.call(this, inputIds);

        this._beginQueryForValues(inputValues, inputsViewModel).then(
            (newInputValues: FormInput_Contracts.InputValue[]) => {
                $.each(inputIds,(i: number, inputId: string) => {
                    this._showOrHideProgressIndicator(inputId, false);
                });

                this._dependentInputsLoadedCallback.call(this, inputIds);

                // Create a map of inputId > InputValues
                var map: { [key: string]: FormInput_Contracts.InputValues } = {};
                $.each(newInputValues,(i: number, entry: FormInput_Contracts.InputValues) => {
                    map[entry.inputId] = entry;
                });

                // Replace the values of the matching inputDescriptors
                $.each(inputsToQuery,(i: number, inputViewModel: InputViewModel) => {
                    var entry: FormInput_Contracts.InputValues = map[inputViewModel.getId()];
                    if (entry) {
                        inputViewModel.updateValues(entry);
                    }
                });

                if ($.isFunction(callback)) {
                    callback.call(this, inputsViewModel, callbackContext);
                }
            },
            (error) => {
                $.each(inputIds,(i: number, inputId: string) => {
                    this._showOrHideProgressIndicator(inputId, false);
                });

                this._dependentInputsLoadedCallback.call(this, inputIds);
				Dialogs.MessageDialog.showMessageDialog((error.message || error), {
					buttons: [Dialogs.MessageDialog.buttons.ok],
					title: Platform_Resources.FileInputErrorLabel
				});
            });
    }

    public onInputValuesChanged(inputViewModel: InputViewModel): void {
        // Get the list of display values to show in the drop down.
        var displayValues: string[] = [];
        if (inputViewModel.getInputDescriptor().values.possibleValues) {
            $.each(inputViewModel.getInputDescriptor().values.possibleValues,(i: number, value: FormInput_Contracts.InputValue) => {
                displayValues.push(value.displayValue ? value.displayValue : value.value);
            });
        }

        // Get the combo for this input.
        var combo: Combos.Combo = this.mapInputIdToComboControl[inputViewModel.getId()];

        if (combo && !combo.isDisposed()) {
            var selectedIndex: number = inputViewModel.getSelectedIndex();
            combo.setSource(displayValues);

            if (inputViewModel.isDropList()) {
                // Can only choose from the set of possible values.
                combo.setEnabled(displayValues.length > 1);
                if (selectedIndex >= 0) {
                    combo.setSelectedIndex(selectedIndex, true);
                }
                else if (displayValues.length > 0) {
                    combo.setSelectedIndex(0, true);
                }
                else {
                    combo.setText("");
                }
            }
            else {
                // Can choose from possible values or enter text.
                combo.setEnabled(true);
                if (selectedIndex != -1) {
                    combo.setSelectedIndex(selectedIndex, true);
                }
                else {
                    // The current value doesn't match a possible value.
                    var value: string = inputViewModel.getValue();
                    combo.setText(value ? value : "");
                }
            }
        }
    }

    protected _beginQueryForValues(inputValues: FormInput_Contracts.InputValues[], inputsViewModel: InputsViewModel): IPromise<FormInput_Contracts.InputValue[]> {
        if (this._queryForValuesCallback) {
            return this._queryForValuesCallback.call(this, inputValues, inputsViewModel);
        }
        else {
            return Q.resolve([]);
        }
    }

    protected _showOrHideProgressIndicator(inputId: string, show: boolean): void {
        var $progress = FormInputControl.getProgressIconForInput(inputId);
        var $valid = FormInputControl.getValidationIconForInput(inputId);

        if ($valid) {
            show ? $valid.addClass("form-input-hide") : $valid.removeClass("form-input-hide");
        }
        if ($progress) {
            show ? $progress.removeClass("form-input-hide") : $progress.addClass("form-input-hide");
        }
    }
}

export class InputsViewModel {
    private _inputViewModels: InputViewModel[];
    private _mapNameToInputViewModel: { [inputId: string]: InputViewModel };
    private _mapNameDependencyCount: { [inputid: string]: number };
    protected _satisfiedDependentInputs: InputViewModel[];
    private _valuesChangedCallback: InputViewModelDelegate<void>;
    private _formInputViewModel: FormInputViewModel;

    constructor(
        formInputViewModel: FormInputViewModel,
        inputDescriptors: FormInput_Contracts.InputDescriptor[],
        inputValues: { [key: string]: any },
        inputValidChangedCallback: InputViewModelDelegate<void>,
        valuesChangedCallback: InputViewModelDelegate<void>) {

        this._formInputViewModel = formInputViewModel;
        this._inputViewModels = [];
        this._mapNameToInputViewModel = {};
        this._mapNameDependencyCount = {};
        this._satisfiedDependentInputs = [];

        $.each(inputDescriptors, (i: number, inputDescriptor: ExtendedInputDescriptor) => {
            this.addInputViewModel(inputDescriptor, inputValues[inputDescriptor.id], inputValidChangedCallback, valuesChangedCallback);
        });
    }

    public addInputViewModel(inputDescriptor: ExtendedInputDescriptor, inputValue?: any,
        inputValidChangedCallback?: InputViewModelDelegate<void>,
        valuesChangedCallback?: InputViewModelDelegate<void>): InputViewModel {
        var valueChangedCallbacks = <InputViewModelDelegate<void>[]> [delegate(this, this._onValueChanged)];
        var descriptorValueChangedCallback = <InputViewModelDelegate<void>[]> inputDescriptor.valueChangedCallbacks;
        if (descriptorValueChangedCallback) {
            $.each(descriptorValueChangedCallback,(i: number, callback: InputViewModelDelegate<void>) => {
                valueChangedCallbacks.push(callback);
            });
        }

        var inputViewModel = new InputViewModel(
            inputDescriptor,
            inputValue,
            inputValidChangedCallback,
            delegate(this, this._onBlur),
            valueChangedCallbacks,
            delegate(this, valuesChangedCallback),
            inputDescriptor.dependencies,
            inputDescriptor.dependenciesSatisfiedCallbacks,
            inputDescriptor.deleteCallbacks);

        this._inputViewModels.push(inputViewModel);
        this._mapNameToInputViewModel[inputViewModel.getId()] = inputViewModel;

        if (inputDescriptor.dependencyInputIds) {
            $.each(inputDescriptor.dependencyInputIds, (i: number, name: string) => {
                if (!(name in this._mapNameDependencyCount)) {
                    this._mapNameDependencyCount[name] = 1;
                } else {
                    this._mapNameDependencyCount[name]++;
                }
            });
        }

        inputViewModel.suppressValidityChangeNotifications(true);
        this.allDependentsSatisfied(inputViewModel);
        this._updateDependencies(inputViewModel);
        inputViewModel.suppressValidityChangeNotifications(false);
        
        return inputViewModel;
    }

    public removeInputViewModel(inputViewModel: InputViewModel): void {
        this._inputViewModels.splice(this._inputViewModels.indexOf(inputViewModel), 1);
        delete this._mapNameToInputViewModel[inputViewModel.getId()];
        var inputDescriptor = inputViewModel.getInputDescriptor();
        if (inputDescriptor.dependencyInputIds) {
            $.each(inputDescriptor.dependencyInputIds, (i: number, name: string) => {
                if ((name in this._mapNameDependencyCount)) {
                    this._mapNameDependencyCount[name]--;
                    if (this._mapNameDependencyCount[name] <= 0) {
                        delete this._mapNameDependencyCount[name];
                    }
                }
            });
        }
        inputViewModel.deleteViewModel();
        this._invalidateDependencies(inputViewModel);
    }

    public areDirty(): boolean {
        var areDirty = false;
        $.each(this._inputViewModels,(i: number, inputViewModel: InputViewModel) => {
            if (inputViewModel.isDirty()) {
                areDirty = true;
                return false; // break
            }
        });
        return areDirty;
    }

    public areValid(): boolean {
        var areValid = true;
        $.each(this._inputViewModels,(i: number, inputViewModel: InputViewModel) => {
            if (!inputViewModel.isValid()) {
                areValid = false;
                return false; // break;
            }
        });
        return areValid;
    }

    public getInputViewModels(): InputViewModel[] {
        return this._inputViewModels;
    }

    public getInputViewModelById(id: string): InputViewModel {
        return this._mapNameToInputViewModel[id];
    }

    public getInputsAsDictionary(): { [inputId: string]: any; } {
        var dictionary: { [key: string]: any } = {};
        $.each(this._inputViewModels,(i: number, inputViewModel: InputViewModel) => {

            if (inputViewModel.isRequired() || (inputViewModel.isDropList()) || !inputViewModel.isEmpty()) {
                dictionary[inputViewModel.getId()] = inputViewModel.getValue();
            }
        });
        return dictionary;
    }

    public allDependentsSatisfied(inputViewModel: InputViewModel): boolean {

        var allDependentsValid = true;
        var inputDescriptor = inputViewModel.getInputDescriptor();

        if (inputDescriptor.dependencyInputIds) {
            $.each(inputDescriptor.dependencyInputIds,(i: number, dependent: string) => {
                var dependentViewModel = this._mapNameToInputViewModel[dependent];
                if (!dependentViewModel || !dependentViewModel.isValid()) {
                    allDependentsValid = false;
                    return false; // break;
                }
            });
        }

        if (inputViewModel.inputDependenciesSatisfied(allDependentsValid)) {
            this._updateDependencies(inputViewModel);
        }

        return allDependentsValid;
        
    }

    private _invalidateDependencies(changedInputViewModel: InputViewModel): void {

        if (!this._isADependent(changedInputViewModel)) {
            return;
        }

        $.each(this._inputViewModels,(i: number, inputViewModel: InputViewModel) => {
            if (inputViewModel.getId() != changedInputViewModel.getId()) {
                if (inputViewModel.dependsOn(changedInputViewModel.getId()) && inputViewModel.invalidateOnDependencyChange()) {
                    inputViewModel.invalidateValues();
                    this.allDependentsSatisfied(inputViewModel);
                }
            }
        });
    }

    private _updateDependencies(changedInputViewModel: InputViewModel): void {

        if (!this._isADependent(changedInputViewModel)) {
            return;
        }

        this._satisfiedDependentInputs = [];
        $.each(this._inputViewModels,(i: number, inputViewModel: InputViewModel) => {
            if (inputViewModel.getId() != changedInputViewModel.getId()) {
                if (inputViewModel.getInputDescriptor().hasDynamicValueInformation) {
                    if (this.allDependentsSatisfied(inputViewModel)) {
                        this._satisfiedDependentInputs.push(inputViewModel);
                    }
                }
                else {
                    if (inputViewModel.dependsOn(changedInputViewModel.getId())) {
                        inputViewModel.refresh();
                    }
                }
            }
        });

        if (changedInputViewModel.isDropList()) {
            this._querySatisfiedDependentInputValues();
        }
    }

    protected _querySatisfiedDependentInputValues(): void {
        if (this._satisfiedDependentInputs.length > 0) {
            this._formInputViewModel.queryInputValues(this, this._satisfiedDependentInputs, undefined, undefined);
            this._satisfiedDependentInputs = [];
        }
    } 

    private _isADependent(inputViewModel: InputViewModel): boolean {
        return inputViewModel.getId() in this._mapNameDependencyCount;

    }

    private _onValueChanged(inputViewModel: InputViewModel): void {
        this._invalidateDependencies(inputViewModel);
        this._updateDependencies(inputViewModel);
    }

    private _onBlur(inputViewModel: InputViewModel): void {
        if (inputViewModel.isValid()) {
            this._querySatisfiedDependentInputValues();
        }
    }
}

export class InputViewModel {

    private _inputDescriptor: ExtendedInputDescriptor;
    private _validation: ExtendedInputValidation;
    private _value: any;
    private _selectedIndex: number;
    private _isValid: boolean;
    private _isDirty: boolean;
    private _dependenciesSatisfied: boolean;
    private _validationError: string;
    private _dependencies: InputViewModelDelegate<boolean>[];
    private _validityDelegate: InputViewModel;
    private _validityFollowers: InputViewModel[];
    private _blurCallback: InputViewModelDelegate<void>;
    private _inputValidChangedCallback: InputViewModelDelegate<void>;
    private _valueChangedCallbacks: InputViewModelDelegate<void>[];
    private _valuesChangedCallback: InputViewModelDelegate<void>;
    private _dependenciesSatisfiedCallbacks: ((satisfied: boolean) => void)[];
    private _deleteCallbacks: (() => void)[];
    private _suppressValidityChangeNotifications: boolean;

    constructor(
        inputDescriptor: FormInput_Contracts.InputDescriptor,
        inputValue: any,
        inputValidChangedCallback: InputViewModelDelegate<void>,
        blurCallback: InputViewModelDelegate<void>,
        valueChangedCallbacks: InputViewModelDelegate<void>[],
        valuesChangedCallback: InputViewModelDelegate<void>,
        dependencies?: InputViewModelDelegate<boolean>[],
        dependenciesSatisfiedCallbacks?: ((satisfied: boolean) => void)[],
        deleteCallbacks?: (() => void)[]) {
        this._inputDescriptor = <ExtendedInputDescriptor> inputDescriptor;
        this._validation = <ExtendedInputValidation> inputDescriptor.validation;
        this._isDirty = false;
        this._value = inputValue || this._getDefaultValue();

        this._suppressValidityChangeNotifications = false;
        this._dependenciesSatisfied = false;
        this._computeSelectedIndex();
        this._validityFollowers = [];
        this._validate();

        this._blurCallback = blurCallback;
        this._inputValidChangedCallback = inputValidChangedCallback;
        this._valuesChangedCallback = valuesChangedCallback;
        
        this._valueChangedCallbacks = [];
        this._addFunctions(valueChangedCallbacks, this.addValueChangedCallback);
        this._dependencies = [];
        this._addFunctions(dependencies, this.addDependency);
        this._dependenciesSatisfiedCallbacks = [];
        this._addFunctions(dependenciesSatisfiedCallbacks, this.addDependenciesSatisfiedCallback);
        this._deleteCallbacks = [];
        this._addFunctions(deleteCallbacks, this.addDeleteCallback);
    }

    private _addFunctions(functions: any[], adder: (fn: any) => void): void {
        if (functions) {
            var inputViewModel = this;
            $.each(functions, (i: number, func: any) => {
                adder.call(inputViewModel, func);
            });
        }
    }

    public validate(): void {
        this._validate();
    }

    public isDirty(): boolean {
        return this._isDirty;
    }

    public isValid(): boolean {
        return this._isValid;
    }

    public isRequired(): boolean {
        return this._validation && this._validation.isRequired;
    }

    public isEmpty(): boolean {
        return this._value == undefined || this._value.length == 0;
    }

    public isDropList(): boolean {
        return this._inputDescriptor.values && this._inputDescriptor.values.isLimitedToPossibleValues;
    }

    public getId(): string {
        return this._inputDescriptor.id;
    }

    public getValue(): any {
        return this._value;
    }

    public getValidationMessage(): string {
        if (this._isValid) {
            return Platform_Resources.FieldIsValid;
        }
        else {
            return this._validationError;
        }
    }

    public getSelectedIndex(): number {
        return this._selectedIndex;
    }

    public setSelectedIndex(index: number): void {
        this._selectedIndex = index;
        this.setValue(this.getPossibleValueAtIndex(index).value);
    }

    public getInputDescriptor(): ExtendedInputDescriptor {
        return this._inputDescriptor;
    }

    public getPossibleValueAtIndex(index: number): FormInput_Contracts.InputValue {
        return this._inputDescriptor.values.possibleValues[index];
    }

    public setValue(value: any): void {
        this._setValue(value, false);
    }

    public refresh(): void {
        this._validate();
        this._setDirty(true);
        $.each(this._valueChangedCallbacks,(i: number, callback: InputViewModelDelegate<void>) => {
            callback.call(this, this);
        });
    }

    public dependsOn(inputValueId: string): boolean {
        return this._inputDescriptor.dependencyInputIds && $.inArray(inputValueId, this._inputDescriptor.dependencyInputIds) != -1;
    }

    public invalidateValues(): void {
        if (this._inputDescriptor.values) {
            this._inputDescriptor.values.possibleValues = [];
            this._selectedIndex = -1;
            this._invalidateValue();
            this._valuesChangedCallback.call(this, this);
        }
    }

    public invalidateOnDependencyChange(): boolean {
        return !this._inputDescriptor.noInvalidateOnDependencyChange;
    }

    public updateValues(values: FormInput_Contracts.InputValues): void {
        this._inputDescriptor.values = values;
        this._computeSelectedIndex();
        if (this.isDropList()) {
            this.setValue(this._selectedIndex == -1 ? undefined : values.possibleValues[this._selectedIndex].value);
        }
        if (values.error) {
            this._setValid(false, values.error.message);
            $.each(this._valueChangedCallbacks, (i: number, callback: InputViewModelDelegate<void>) => {
			    callback.call(this, this);
		    });
        }
        this._valuesChangedCallback.call(this, this);
    }

    public onBlur(): void {
        if (this._blurCallback) {
            this._blurCallback.call(this, this);
        }
    }

    public suppressValidityChangeNotifications(suppress: boolean): void {
        this._suppressValidityChangeNotifications = suppress;
    }

    public addValueChangedCallback(callback: InputViewModelDelegate<void>, addToFront?: boolean): void {
        if (addToFront) {
            this._valueChangedCallbacks.unshift(callback);
        } else {
            this._valueChangedCallbacks.push(callback);
        }
    }

    //Returns true if element was found
    public removeValueChangedCallback(callback: InputViewModelDelegate<void>): boolean {
        var index = this._valueChangedCallbacks.indexOf(callback);
        if (index >= 0) {
            this._valueChangedCallbacks.splice(index, 1);
        } else {
            return false;
        }
    }

    public setValidityDelegate(validityDelegate: InputViewModel): void {
        if (this._validityDelegate) {
            this._validityDelegate.removeValidityFollower(this);
        }
        if (validityDelegate) {
            validityDelegate.addValidityFollower(this);
        }
        this._validityDelegate = validityDelegate;
    }

    public addValidityFollower(follower: InputViewModel, addToFront = false): void {
        if (addToFront) {
            this._validityFollowers.unshift(follower);
        } else {
            this._validityFollowers.push(follower);
        }
    }

    public removeValidityFollower(follower: InputViewModel): void {
        var index;
        while ((index = this._validityFollowers.indexOf(follower)) >= 0) {
            this._validityFollowers.splice(index, 1);
        }
    }

    public addDependency(dependency: InputViewModelDelegate<boolean>, addToFront = false): void {
        if (addToFront) {
            this._dependencies.unshift(dependency);
        } else {
            this._dependencies.push(dependency);
        }
    }

    public checkDependenciesSatisfied(): boolean {
        var allSatisfied = true;
        $.each(this._dependencies,(i: number, dependency: InputViewModelDelegate<boolean>) => {
            if (!dependency(this)) {
                allSatisfied = false;
                return false; //break
            }
        });
        return allSatisfied;
    }

    public getDependenciesSatisfied(): boolean {
        return this._dependenciesSatisfied;
    }

    private _dependenciesSatisfiedChange(satisfied: boolean): boolean {
        if (satisfied != this._dependenciesSatisfied) {
            this._dependenciesSatisfied = satisfied;
            $.each(this._dependenciesSatisfiedCallbacks,(i: number, callback: (satisfied: boolean) => void) => {
                callback(satisfied);
            });
            this.validate();
            return true;
        } else {
            return false;
        }
    }

    //returns true if the value of _dependenciesSatisfied changes
    public inputDependenciesSatisfied(satisfied: boolean): boolean {
        if (satisfied) {
            satisfied = this.checkDependenciesSatisfied();
        }
        return this._dependenciesSatisfiedChange(satisfied);
    }

    public addDependenciesSatisfiedCallback(callback: (satisfied: boolean) => void, addToFront = false): void {
        if (addToFront) {
            this._dependenciesSatisfiedCallbacks.unshift(callback);
        } else {
            this._dependenciesSatisfiedCallbacks.push(callback);
        }
        if (!this._inputDescriptor.hasDynamicValueInformation) {
            this._inputDescriptor.hasDynamicValueInformation = true;
        }
    }

    public deleteViewModel(): void {
        $.each(this._deleteCallbacks, (i: number, callback: () => void) => {
            callback();
        });
    }

    public addDeleteCallback(callback: () => void, addToFront = false): void {
        if (addToFront) {
            this._deleteCallbacks.unshift(callback);
        } else {
            this._deleteCallbacks.push(callback);
        }
    }

    private _invalidateValue(): void {
        this._setValue(undefined, true);
    }

    private _setValue(value: any, force: boolean): void {
        if (this._value != value || force) {
            this._value = value;
            this.refresh();
        }
    }

    private _computeSelectedIndex(): void {
        this._selectedIndex = this._getSelectedIndex();
        if (this._selectedIndex == -1) {
            this._selectedIndex = this._getDefaultIndex();
        }
    }

    private _setDirty(isDirty: boolean): void {
        if (this._isDirty != isDirty) {
            this._isDirty = isDirty;
        }
    }

    private _setValid(isValid: boolean, error?: string): void {
        if (this._isValid != isValid || this._validationError != error) {
            this._isValid = isValid;
            this._validationError = error;

            if (this._inputValidChangedCallback && !this._suppressValidityChangeNotifications) {
                this._inputValidChangedCallback.call(this, this);
            }
        }
    }

    private _getDefaultIndex(): number {
        var defaultIndex: number = -1;
        var values: FormInput_Contracts.InputValues = this._inputDescriptor.values;

        if (values && values.possibleValues && values.defaultValue != undefined) {
            $.each(values.possibleValues,(i: number, value: FormInput_Contracts.InputValue) => {
                if (value.value == values.defaultValue) {
                    defaultIndex = i;
                    return false; // break
                }
            });

            // Choose the first one if the default doesn't match any possible value.
            if (defaultIndex == -1 && values.isLimitedToPossibleValues && values.possibleValues.length > 0) {
                defaultIndex = 0;
            }
        }
        return defaultIndex;
    }

    private _getSelectedIndex(): number {
        var selectedIndex = -1;
        if (this._inputDescriptor && this._inputDescriptor.values && this._inputDescriptor.values.possibleValues && this._value != undefined) {
            $.each(this._inputDescriptor.values.possibleValues,(i: number, value: FormInput_Contracts.InputValue) => {
                if (value.value == this._value) {
                    selectedIndex = i;
                    return false; // break
                }
            });
        }
        return selectedIndex;
    }

    private _getDefaultValue(): string {
        if (this._inputDescriptor && this._inputDescriptor.values) {
            return this._inputDescriptor.values.defaultValue;
        }
        else {
            return undefined;
        }
    }

    private _validate(): void {
        if (this._validityDelegate) {
            this._setValid(this._validityDelegate.isValid());
        } else if (!this._validation || (!this.isRequired() && this.isEmpty())) {
            this._setValid(true);
        } else {
            if (!this.getDependenciesSatisfied()) {
                this._setValid(false);
            } else if (this.isDropList() && this._value != undefined) {
                this._setValid(true);
            } else if (this.isEmpty()) {
                if (!this.isRequired()) {
                    this._setValid(true);
                }
                else {
                    this._setValid(false, Platform_Resources.StringValueIsRequired);
                }
            } else if (this._inputDescriptor.isConfidential && this._value == "********") {
                this._setValid(true);
            } else {
                switch (this._validation.dataType) {
                    case FormInput_Contracts.InputDataType.Boolean:
                        this._validateBoolean();
                        break;
                    case FormInput_Contracts.InputDataType.Guid:
                        this._validateGuid();
                        break;
                    case FormInput_Contracts.InputDataType.Number:
                        this._validateNumber();
                        break;
                    case FormInput_Contracts.InputDataType.String:
                        this._validateString();
                        break;
                    case FormInput_Contracts.InputDataType.Uri:
                        this._validateUri();
                        break;
                    default:
                        this._validateString();
                        break;
                }
            }
            if (this._validation.validateFunction && this.isValid()) {
                var validation = this._validation.validateFunction(this);
                this._setValid(validation.isValid, validation.error);
            }
        }
        $.each(this._validityFollowers,(i: number, follower: InputViewModel) => {
            follower.refresh();
        });
    }

    private _validateBoolean(): void {
        this._setValid(this._value != undefined);
    }

    private _validateGuid(): void {
        var guidMinLength: number = 36;
        if (!this._value || this._value.length < guidMinLength) {
            this._setValid(false, Platform_Resources.GuidValueIsRequired);
        }
        else {
            var trimmedValue = this._value.trim();
            if (trimmedValue.length === guidMinLength) {
                var pattern = this._validation.pattern || "^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$";
            }
            else {
                var pattern = this._validation.pattern || "^\{[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}\}$";
            }
            var regex = new RegExp(pattern);
            if (!regex.test(trimmedValue)) {
                this._setValid(false, Platform_Resources.GuidValueIsRequired);
            }
            else {
                this._setValid(true);
            }
        }
    }

    private _validateNumber(): void {
        var value: number = parseInt(this._value);
        if (isNaN(value)) {
            this._setValid(false, Platform_Resources.NumberValueIsRequired);
        }
        else if (value < this._validation.minValue) {
            this._setValid(false, Utils_String.format(Platform_Resources.NumberTooSmall, value, this._validation.minValue));
        }
        else if (value > this._validation.maxValue) {
            this._setValid(false, Utils_String.format(Platform_Resources.NumberTooLarge, value, this._validation.maxValue));
        }
        else {
            this._setValid(true);
        }
    }

    private _validateString(): void {
        var value: string = this._value;
        if (value == undefined) {
            this._setValid(false, Platform_Resources.StringValueIsRequired);
            return;
        }

        value = value.trim();
        if (this._validation.minLength && value.length < this._validation.minLength) {
            this._setValid(false, Utils_String.format(Platform_Resources.StringTooShort, value.length, this._validation.minLength));
        }
        else if (this._validation.maxLength && value.length > this._inputDescriptor.validation.maxLength) {
            this._setValid(false, Utils_String.format(Platform_Resources.StringTooLong, value.length, this._validation.maxLength));
        }
        else if (this._validation.pattern) {
            var regex = new RegExp(this._validation.pattern);
            if (!regex.test(value)) {
                var errorMessage;
                if (this._validation.patternMismatchErrorMessage) {
                    errorMessage = this._validation.patternMismatchErrorMessage;
                }
                else {
                    errorMessage = Utils_String.format(Platform_Resources.StringDoesNotMatchPattern, this._validation.pattern);
                }
                this._setValid(false, errorMessage);
            }
            else {
                this._setValid(true);
            }
        }
        else {
            this._setValid(true);
        }
    }

    private _validateUri(): void {
        if (this._value == undefined || this._value.length == 0) {
            this._setValid(false, Platform_Resources.UriValueIsRequired);
        } else {
            var trimmedValue = this._value.trim();
            var pattern = this._validation.pattern || "^https?://.+$";
            var regex = new RegExp(pattern);
            if (!regex.test(trimmedValue)) {
                this._setValid(false, Utils_String.format(Platform_Resources.StringDoesNotMatchPattern, pattern));
            } else {
                this._setValid(true);
            }
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.UI.Controls.FormInput", exports);
