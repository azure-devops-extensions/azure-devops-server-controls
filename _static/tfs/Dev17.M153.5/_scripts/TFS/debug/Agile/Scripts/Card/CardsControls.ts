///<amd-dependency path="jQueryUI/core"/>
/// <reference types="jquery" />


import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Services = require("VSS/Identities/Picker/Services");
import TreeView = require("VSS/Controls/TreeView");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import { KeyCode, domElem } from "VSS/Utils/UI";
import Validation = require("VSS/Controls/Validation");
import VSS_FeatureAvailability = require("VSS/FeatureAvailability/Services");

import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_UI_Controls_Identities = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");
import TFS_FormatUtils = require("Presentation/Scripts/TFS/FeatureRef/FormatUtils");
import TagConstants = require("WorkItemTracking/Scripts/TFS.UI.Tags.Constants");
import { WorkItemStateCellRenderer } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCellRenderer";

import WIT = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WorkItemUtility = require("WorkItemTracking/Scripts/Controls/WorkItemForm/Utils");
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WIT_UI_Tags = require("WorkItemTracking/Scripts/TFS.UI.Tags");

import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import Agile = require("Agile/Scripts/Common/Agile");
import { DatabaseCoreFieldRefName, BoardType, isUseNewIdentityControlsEnabled } from "Agile/Scripts/Common/Utils";
import Cards = require("Agile/Scripts/Card/Cards");
import StyleCustomization = require("Agile/Scripts/Card/CardCustomizationStyle");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import WITHelpers = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers");
import { WITIdentityHelpers } from "TfsCommon/Scripts/WITIdentityHelpers";
import Util_Cards = require("Agile/Scripts/Card/CardUtils");

import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";

export const CardRendererFactory = new TFS_Core_Utils.TypeFactory();

export interface IRenderCardContext {
    teamId: string;
    projectName: string;
    workItemTypeName: string;
}

export interface IFieldRenderer {
    render(value: string, cardField?: Cards.ICardFieldSetting, fieldDefinition?: Cards.CardFieldDefinition, $container?: JQuery, tooltip?: string, cardContext?: IRenderCardContext): JQuery;
}

export interface IFieldRendererManager {
    getFieldRenderer(fieldIdentifier?: string, fieldType?: Cards.CardFieldType): IFieldRenderer;
    renderField(value: string, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $container?: JQuery, isAdditional?: boolean, cardContext?: IRenderCardContext): JQuery;
}

export interface IRenderCardResult {
    hasEmptyFields: boolean;
}

export interface ICardRenderer {
    renderCard(
        $container: JQuery,
        cardSettings: Cards.CardSettings,
        fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition>,
        getFieldValue: (refName: string) => string,
        additionalCoreFieldIdentifier: string,
        boardType: string,
        styles: Cards.IStyleRule[],
        forceShowAllEditableFields: boolean,
        cardContext: IRenderCardContext,
        isNew?: boolean
    ): IRenderCardResult;

    /**
     * Renders the field in a card view based on the card fields settings
     * @param $fieldContainer Container in which the field should be drawn
     * @param field object that needs to be rendered
     * @param isEditable Indicating if the rendered field view should be editable by the user 
     * @param cardContext Context for the card in which we are rendering        
     * @returns the field view object
     */
    renderField($fieldContainer: JQuery, field: Cards.CardField, isEditable?: boolean, cardContext?: IRenderCardContext): CardFieldView;

    hideExtraFields($container: JQuery);

    getFieldView($fieldContainer: JQuery, field: Cards.CardField): CardFieldView;

    getFieldName($target: JQuery, $card: JQuery): string;

    getFieldContainer($card: JQuery, fieldRefName: string, $target?: JQuery): JQuery;

    isTargetEditable($target: JQuery): boolean;

    disposeCard($container: JQuery);
}

export interface ICardFieldEditControl {

    init($container: JQuery, value: string);
    tearDown();

    startEdit();
    endEdit();
    isEditInProgress(): boolean;

    onEditStart(handler: Function);
    onEditEnd(handler: Function);

    getValue(): string;
    setValue(value: string);
}

export interface ICardFieldComboControlOptions extends Combos.IComboOptions {
    maxLength?: number;
    allowClear?: boolean;
    onEditStart?: Function;
    onEditEnd?: Function;
    getDropdownValues?: (displayValue: string) => any;
    getDropdownValuesAsync?: (displayValue: string) => IPromise<any>;
}

export class CardFieldComboControl extends Combos.ComboO<ICardFieldComboControlOptions> implements ICardFieldEditControl {
    public static NON_COMBO_BEHAVIOR_CLASS = "non-combo-behavior";
    public static COMBO_BEHAVIOR_CLASS = "combo-behavior";

    private _changeCalled: boolean;
    private _exiting: boolean;
    private _$container: JQuery;
    private _suppressedEllipsis: boolean;
    private _getDropdownValuesAsyncPromise: IPromise<any>;
    private _customValidator: Validation.CustomValidator<Validation.CustomValidatorOptions>;

    public initializeOptions(options?: ICardFieldComboControlOptions) {
        super.initializeOptions($.extend({
            noDropButton: true,
            dropShow: Utils_Core.delegate(this, this._dropShow),
            dropHide: Utils_Core.delegate(this, this._dropHide),
            indexChanged: Utils_Core.delegate(this, this._indexChanged),
            change: Utils_Core.delegate(this, this._inputElementChanges),
            autoComplete: false,
            setTitleOnlyOnOverflow: true
        }, options));
    }

    /**
     * Initialize the control (out of bounds of regular control enhancement)
     * @param $container container in which control is being initialized
     * @param uniqueValue the unique value
     * @param displayValue optional value to be shown in input box, otherwise uniqueValue is used
     */
    public init($container: JQuery, uniqueValue: string, displayValue?: string) {
        this._$container = $container;

        displayValue = displayValue || uniqueValue;

        this._input.removeClass("invalid");

        if (!Utils_String.ignoreCaseComparer(this._options.type, "list") ||
            !Utils_String.ignoreCaseComparer(this._options.type, "tree")) {
            if (this._options.getDropdownValues) {
                this.setSource(this._options.getDropdownValues(displayValue));
            } else if (this._options.getDropdownValuesAsync) {
                this._getDropdownValuesAsyncPromise = this._options.getDropdownValuesAsync(displayValue).then((dropdownValues) => {
                    this.setSource(dropdownValues);
                });
            } else {
                // if there are no allowed values, set mode to text
                this.setMode("text");
                this._options.blur = this._onBlur;
            }
        }

        this.setText(uniqueValue);

        this._input.val(displayValue);
        this._currentText = displayValue;

        this._$container.removeClass(CardFieldComboControl.NON_COMBO_BEHAVIOR_CLASS)
            .addClass(CardFieldComboControl.COMBO_BEHAVIOR_CLASS)
            .removeClass("hover");

        this._suppressedEllipsis = this._$container.hasClass("ellipsis");
        this._$container.toggleClass("ellipsis", false);
    }

    public tearDown() {
        this.blockBlur();
        this._$container.removeClass(CardFieldComboControl.COMBO_BEHAVIOR_CLASS)
            .addClass(CardFieldComboControl.NON_COMBO_BEHAVIOR_CLASS);

        this._$container.toggleClass("ellipsis", this._suppressedEllipsis);
    }

    public _createIn(container: JQuery) {
        /// <summary> OVERRIDE: Creates the combo in the container and applies some additional settings </summary>
        /// <param name="container" type="jQuery"> The container to create the combo in </param>

        Diag.Debug.assertParamIsObject(container, "container");

        super._createIn(container);

        if ($.isNumeric(this._options.maxLength)) {
            this._input.attr("maxlength", this._options.maxLength);
        }

        this._input.addClass("validate custom");

        if (this._customValidator) {
            this._customValidator.dispose();
            this._customValidator = null;
        }
        this._customValidator = <Validation.CustomValidator<Validation.CustomValidatorOptions>>Controls.Enhancement.enhance(Validation.CustomValidator, this._input, { validate: this._options.validator });
    }

    public selectInput() {
        /// <summary> Selects the text in the input, so it can be easily edited </summary>
        this._input.select();
    }

    public startEdit() {
        this._options.onEditStart();

        this.selectInput();

        if (this.getMode() !== "text") {
            if (this._getDropdownValuesAsyncPromise) {
                this._getDropdownValuesAsyncPromise.then(() => this.showDropPopup());
            }
            else {
                this.showDropPopup();
            }
        }
    }

    public endEdit() {
        if (this.getMode() !== "text") {
            this.hideDropPopup();
        }
        else {
            this._onBlur();
        }
    }

    public isEditInProgress(): boolean {
        return this.getElement().is(":visible");
    }

    public _onInputKeyDown(e: JQueryEventObject) {
        /// <summary> OVERRIDE: overrides the default key functionality for certain special keys </summary>
        /// <param name="e" type="object"> The keydown event that was passed to the handler </param>

        Diag.Debug.assertParamIsObject(e, "e");

        // Handle the ENTER key event. Desired behavior: save the tile
        if (e.keyCode === KeyCode.ENTER) {
            e.stopPropagation();
            this._raiseOnEditEnd(e, this._isInputInvalid());
            return false;
        }
        // The TAB key event. Desired behavior: save the tile
        else if (e.keyCode === KeyCode.TAB) {
            e.preventDefault(); //Prevents tab from going to the next tile
            this._raiseOnEditEnd(e, this._isInputInvalid());
            return false;
        }
        // The ESCAPE key. Desired behavior: default back to the original value
        else if (e.keyCode === KeyCode.ESCAPE) {
            e.stopPropagation();
            this._raiseOnEditEnd(e, true);
            return false;
        }
        // Prevent further event handling after the keyboard up/down/pageup/pagedown events are handled by the base combo class
        else if (e.keyCode === KeyCode.UP || e.keyCode === KeyCode.DOWN || e.keyCode === KeyCode.PAGE_UP || e.keyCode === KeyCode.PAGE_DOWN) {
            super._onInputKeyDown(e);
            return false;
        }
        // Disable the left and right arrow keys if we aren't allowed to edit
        else if ((!this._options.allowEdit) && (e.keyCode === $.ui.keyCode.LEFT || e.keyCode === $.ui.keyCode.RIGHT)) {
            e.preventDefault();
        }
        else if ((!this._options.allowEdit) && (this._options.allowClear) && (e.keyCode === KeyCode.DELETE || e.keyCode === KeyCode.BACKSPACE)) {
            // clear value on backspace if no value is allowed
            this.setValue(null);
            e.preventDefault();
        }
        // If we aren't allowed to edit lists, use the letter typed to index into the dropdown
        else if (!this._options.allowEdit && !Utils_String.ignoreCaseComparer(this._options.type, "list")) {
            var character = String.fromCharCode(e.keyCode).toLowerCase(),
                itemsInDropdown = this.getBehavior().getDataSource().getItems(),
                l = itemsInDropdown.length,
                i: number;

            for (i = 0; i < l; i += 1) {
                if (itemsInDropdown[i].slice(0, 1).toLowerCase() === character) {
                    this.getBehavior().getDropPopup<Combos.ComboListDropPopup>().virtualizingListView.setSelectedIndex(i);
                    this.getBehavior<Combos.ComboListBehavior>().setSelectedIndex(i);
                    break;
                }
            }
        }
        else if (this._options.allowEdit) {
            // we want to wait till the text of input gets updated
            Utils_Core.delay(this, 0, () => {
                this._input.data("data-value", this._input.val());
            });
        }

        // If the base function had a return value, we should return that value
        return super._onInputKeyDown(e);
    }

    private _onBlur(e?: JQueryEventObject) {
        // called on blur when combo is in text mode
        if (!this._blockBlur) {
            this._raiseOnEditEnd(e, this._isInputInvalid());
        }
    }

    public getValue() {
        return this._input.data("data-value");
    }

    public setValue(text) {
        this.setInputText(text, null);
    }

    public setInputText(text: string, fireEvent: boolean, displayText?: string) {

        displayText = (displayText !== undefined) ? displayText : text;
        this._input.val(displayText);

        //Adding the original text to data
        this._input.data("data-value", text);

        // Updating aria-label
        this._input.attr("aria-label", text);

        if (fireEvent) {
            this.fireChangeIfNecessary(text);
        }
        else {
            this._currentText = text;
        }
    }

    protected _dropShow() {
        /// <summary> A function called when the dropdown shows </summary>
        this.selectInput();
    }

    private _indexChanged() {
        /// <summary> 
        ///     A function called when the index has changed. 
        ///     We should select the text to make it easily editable if the user wants to type values
        ///     This also fixes an IE9 bug, in which arrowing down moves the focus outside of the input, and thus causes backspace to go back a page
        /// </summary>
        this.selectInput();
    }

    private _isInputInvalid() {
        /// <summary> A function which returns true if the input element has the 'invalid' class </summary>
        return this._input.hasClass("invalid");
    }

    private _dropHide(dropdown) {
        /// <summary> A function called when the dropdown hides </summary>

        if (dropdown) {
            dropdown.dispose();
        }
        this._raiseOnEditEnd(null, this._isInputInvalid());

        // Returning false, since we just disposed the dropdown.
        return false;
    }

    private _raiseOnEditEnd(e: JQueryEventObject, discard: boolean) {
        if (!this._exiting && $.isFunction(this._options.onEditEnd)) {
            this._exiting = true;
            this._options.onEditEnd(e, discard);
        }
    }

    private _inputElementChanges() {
        /// <summary> Function called by the "change" option whenever the text in the input box changes </summary>

        // Workaround for the validator, since it is bound to the change event, which is unreliable.
        // The combo correctly registers the change event, and then calls it on the input element, thus
        // allowing the validator to work properly. The _changeCalled function is used to prevent the event from
        // bubbling back up from the input element and causing an infinite loop.
        // This is a hack, and the validator framework should be changed so this isn't necessary
        if (!this._changeCalled) {
            this._changeCalled = true;
            this._input.data("data-value", this._currentText);
            this._input.trigger("change");
        }
        this._changeCalled = false;
    }

    public onEditStart(handler: (e: JQueryEventObject, discard: boolean) => void) {
        this._options.onEditStart = handler;
    }

    public onEditEnd(handler: (e: JQueryEventObject, discard: boolean) => void) {
        this._options.onEditEnd = handler;
    }

    public dispose() {
        if (this._customValidator) {
            this._customValidator.dispose();
            this._customValidator = null;
        }

        super.dispose();
    }
}

export class IdentityComboControl extends CardFieldComboControl {

    public init($container: JQuery, value: string) {
        /// <summary> Control initialization </summary>
        /// <param name="container" type="JQuery"> container in which control is being initialized </param>
        /// <param name="value" type="string"> initial value</param>

        var uniqueValue: string = Utils_Core.convertValueToDisplayString(value);

        var assignedToIdentity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(uniqueValue);
        var displayValue = (assignedToIdentity && assignedToIdentity.displayName) ? assignedToIdentity.displayName : uniqueValue;

        super.init($container, uniqueValue, displayValue);
    }

    public setInputText(text: string, fireEvent: boolean) {

        var assignedToIdentity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(text);
        var displayName = (assignedToIdentity && assignedToIdentity.displayName) ? assignedToIdentity.displayName : text;

        super.setInputText(text, fireEvent, displayName);
    }

    protected _dropShow() {
        //for identity combo box adjust the width of the drop down on dropShow
        //set the width to size of the input combo box 
        var comboWidth = this.getElement().width();
        var $dropDown = this.getElement().find("." + "combo-drop-popup");
        if ($dropDown) {
            $dropDown.css("width", comboWidth);
        }
        super._dropShow();
    }
}

export class CardFieldTitleControl extends Controls.BaseControl implements ICardFieldEditControl {

    private _$textArea: JQuery;
    private _$fieldContainer: JQuery;
    private _blockBlur: boolean;
    private static DEFAULT_MAX_LENGTH = 255;

    constructor(options?: any) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "editableTitle"
        }, options));
    }

    public _createIn($container: JQuery) {
        super._createIn($container);
        this._$textArea = $(domElem("textarea"));

        var maxLength = this._options.maxLength ? this._options.maxLength : CardFieldTitleControl.DEFAULT_MAX_LENGTH;

        this._$textArea.attr("maxlength", maxLength);

        if (typeof this._options.value !== "undefined") {
            this._$textArea.val(this._options.value);
        }
        this._decorate();

        this._$textArea.addClass("validate custom");
        <Validation.CustomValidator<Validation.CustomValidatorOptions>>Controls.Enhancement.enhance(Validation.CustomValidator, this._$textArea, { validate: this._options.validator });
    }

    private _decorate() {
        var $textArea = this._$textArea;

        $textArea.addClass("editableTitleContent")
            .on("focusout blur click keydown keyup paste contextmenu", (event: JQueryEventObject) => {
                switch (event.type) {
                    case "blur":
                    case "focusout":
                        this._onBlur(event);
                        break;
                    case "click":
                        this._onClick(event);
                        break;
                    case "keydown":
                        this._onKeyDown(event);
                        break;
                    case "keyup":
                    case "paste":
                        this._onValueChanged();
                        break;
                    case "contextmenu":
                        this._onContextMenu(event);
                        break;
                }
            });
        this.getElement()[0].appendChild(this._$textArea[0]);
    }

    public dispose() {
        this._$textArea.off("blur click keydown keyup paste contextmenu");
        super.dispose();
    }

    public init($fieldContainer: JQuery, newValue: string) {
        this._$fieldContainer = $fieldContainer;

        this._$textArea.removeClass("invalid");
        this._$textArea.attr("aria-label", AgileControlsResources.EditTitle);

        this.setValue(newValue);

        //set the height of the control and to hide id (sibling to this control)
        $(this.getElement()).height($fieldContainer.parent().height());
        $fieldContainer.siblings().hide();

        $fieldContainer.closest("." + FieldRendererHelper.ID_TITLE_CONTAINER_CLASS).addClass(FieldRendererHelper.EDIT_MODE_CLASS);
    }

    public tearDown() {
        this.blockBlur();
        this._$fieldContainer.siblings().show();
        this._$fieldContainer.closest("." + FieldRendererHelper.ID_TITLE_CONTAINER_CLASS).removeClass(FieldRendererHelper.EDIT_MODE_CLASS);
    }

    public startEdit() {
        if (this._options.onEditStart) {
            this._options.onEditStart();
        }

        this.delayExecute("selectText", 30, true, () => {
            this._$textArea.select();
        });
    }

    public endEdit() {
        this._onBlur();
    }

    public isEditInProgress() {
        return this._$textArea.is(":visible");
    }

    private _onValueChanged() {
        this._$textArea.trigger("change");
    }

    private _onKeyDown(e?: JQueryKeyEventObject) {
        if (e.keyCode === KeyCode.ENTER) {
            e.stopPropagation();
            if ($.isFunction(this._options.onEditEnd)) {
                this._options.onEditEnd(e, this._isInputInvalid(), true);
            }
            return false;
        }
        else if (e.keyCode === KeyCode.TAB) {
            e.preventDefault(); //Prevents tab from going to the next tile
            if ($.isFunction(this._options.onEditEnd)) {
                this._options.onEditEnd(e, this._isInputInvalid());
            }
        }
        else if (e.keyCode === KeyCode.ESCAPE) {
            e.stopPropagation();
            if ($.isFunction(this._options.onEditEnd)) {
                this._options.onEditEnd(e, true);
            }
        }
    }

    private _onContextMenu(e?: JQueryEventObject) {
        e.stopPropagation();
    }

    private _isInputInvalid() {
        /// <summary> A function which returns true if the input element has a valid value </summary>
        // validate the input using the passed in validator 
        return !this._options.validator(this.getValue());
    }

    private _onClick(e?: JQueryEventObject) {
        e.stopPropagation();
    }

    private _onBlur(e?: JQueryEventObject) {
        if (!this._blockBlur && this._options.onEditEnd) {
            this._options.onEditEnd(e, this._isInputInvalid());
        }
    }

    public blockBlur() {
        this._blockBlur = true;
        this.delayExecute("blockBlur", 50, true, function () {
            this.cancelBlockBlur();
        });
    }

    public cancelBlockBlur() {
        this._blockBlur = false;
        this.cancelDelayedFunction("blockBlur");
    }

    public getValue(): string {
        return this._$textArea.val();
    }

    public setValue(value: string) {
        this._$textArea.val(value);
        this._onValueChanged();
    }

    public onEditStart(handler: (e: JQueryEventObject, discard: boolean) => void) {
        this._options.onEditStart = handler;
    }

    public onEditEnd(handler: (e: JQueryEventObject, discard: boolean) => void) {
        this._options.onEditEnd = handler;
    }
}

/*
 * The abstract class for field view representation
 */
export class CardFieldView {

    protected _field: Cards.CardField;
    protected _$fieldContainer: JQuery;

    /*
     * Returns the field corresponding to the view
     * @return CardField the field 
     */
    public field(): Cards.CardField {
        return this._field;
    }

    /**
     * Gets the element associated with this view.
     * @return JQuery
     */
    public getElement(): JQuery {
        return this._$fieldContainer;
    }

    /*
     * Sets/Returns value for the field view element
     * @param string the field value to be displayed
     */
    public value(fieldValue?: string): string {
        Diag.Debug.fail("value: IsAbstract");
        return null;
    }

    /*
     * Returns if the field view element supports user edit
     * @param boolean if the view allows user to change values
     */
    public isEditable(): boolean {
        Diag.Debug.fail("isEditable: IsAbstract");
        return false;
    }
}

/**
  * The readonly field view object created by a renderer
  */
export class CardFieldRenderedView extends CardFieldView {

    private _renderer: IFieldRenderer;
    private _fieldValue: string;

    /**
     * The readonly field view object created by a renderer
     * @param string Value of the field
     * @param Cards.CardField field model
     * @param renderer The renderer used to create the field view object
     */
    constructor($fieldContainer: JQuery, field: Cards.CardField, renderer: IFieldRenderer) {
        Diag.Debug.assertParamIsJQueryObject($fieldContainer, "$fieldContainer");
        Diag.Debug.assertParamIsObject(field, "field");
        Diag.Debug.assertParamIsObject(renderer, "renderer");

        super();

        this._field = field;
        this._renderer = renderer;
        this._$fieldContainer = $fieldContainer;
    }

    /**
     * Sets the field value to be displayed. 
     * Read of field is not expected in a rendered view as user cannot change the value
     * @param string The field value
     */
    public value(fieldValue: string): string {

        if (fieldValue !== undefined) {
            this._fieldValue = fieldValue;

            //TODO: normalization of value
            this._renderer.render(fieldValue, this._field.fieldSetting(), this._field.definition(), this._$fieldContainer);
        }
        return this._fieldValue;
    }

    /**
     * Returns if the field view element supports user edit
     * @param boolean if the view allows user to change values
     */
    public isEditable(): boolean {
        // the rendered view is only an html element and does not support edit by itself
        return false;
    }
}

/**
 * An editable field view object 
 */
export class EditableCardFieldView extends CardFieldView {

    private _fieldControl: ICardFieldEditControl;

    /**
     * The editable field view constructor
     * @param string Value of the field
     * @param Cards.CardField? Settings for the field
     * @param renderer The renderer used to create the field view object
     */
    constructor($fieldContainer: JQuery, field: Cards.CardField, fieldControl: ICardFieldEditControl) {
        Diag.Debug.assertParamIsJQueryObject($fieldContainer, "$fieldContainer");
        Diag.Debug.assertParamIsObject(field, "field");
        Diag.Debug.assertParamIsObject(fieldControl, "fieldControl");
        super();

        this._field = field;
        this._fieldControl = fieldControl;
        this._$fieldContainer = $fieldContainer;
    }

    /**
     * updates the model based on the view value. 
     */
    public updateField(): boolean {
        var value = this._fieldControl.getValue();
        var oldValue = this._field.definition().convertToExternal(this._field.value());
        var valueChanged = Utils_String.localeComparer(oldValue, value) ? true : false;

        var normalizedValue = this._field.definition().convertToInternal(value);

        try {
            this._field.value(normalizedValue);
        } catch (error) {
        }
        // return true if value has changed
        return valueChanged;
    }

    /**
     * Gets/Sets the field value to be displayed. 
     * @param string The field value
     */
    public value(fieldValue?: string): string {
        if (fieldValue !== undefined) {
            this._fieldControl.setValue(fieldValue);
        }
        else {
            fieldValue = this._fieldControl.getValue();
        }
        return fieldValue;
    }

    /**
     * Returns if the field view element supports user edit
     * @returns boolean if the view allows user to change values
     */
    public isEditable(): boolean {
        return true;
    }

    /**
     * Returns if the field view element is currently being edited
     * @returns boolean 
     */
    public isEditInProgress(): boolean {
        return this._fieldControl.isEditInProgress();
    }

    /**
     * Initiates edit on the field control
     */
    public startEdit() {
        this._fieldControl.startEdit();
    }

    /**
     * Registers handler to be called on edit start
     * @param Function handler
     */
    public onEditStart(handler: Function) {
        this._fieldControl.onEditStart(handler);
    }

    /**
     * Ends edit on the field control
     */
    public endEdit() {
        this._fieldControl.endEdit();
    }

    /**
     * Registers handler to be called on edit end
     * @param Function handler
     */
    public onEditEnd(handler: Function) {
        this._fieldControl.onEditEnd(handler);
    }

    public tearDown() {
        this._fieldControl.tearDown();
        this._$fieldContainer.children().detach();

        var control = <any>this._fieldControl;
        if ($.isFunction(control.dispose)) {
            control.dispose();
        }
    }
}

export interface ICardEditController {
    beginFieldEdit(fieldView: CardFieldView, onEditStart: Function, onEditEnd: Function, onEditDiscard: Function, cardContext?: IRenderCardContext): EditableCardFieldView;
    activeFieldView(): EditableCardFieldView;
    endActiveEdit();
}

/**
 * Controller that manages edit for a board card
 */
export class CardEditController implements ICardEditController {
    protected _cardRenderer: ICardRenderer;
    protected _activeFieldView: EditableCardFieldView;

    constructor(renderer: ICardRenderer) {
        this._cardRenderer = renderer;
        this._activeFieldView = null;
    }

    /**
     * initiates edit of the specified card field
     * @param CardFieldView the field view on which edit needs to be initiated
     * @param Function the edit start handler
     * @param Function the edit end handler
     * @param Function the edit discard handler, called when the edit value need not be saved
     * @returns EditableCardFieldView
     */

    public beginFieldEdit(fieldView: CardFieldView, onEditStartHandler?: Function, onEditEndHandler?: Function, onEditDiscardHandler?: Function, cardContext?: IRenderCardContext): EditableCardFieldView {
        Diag.Debug.assertParamIsObject(fieldView, "fieldView");
        if (!fieldView.isEditable()) {
            //update the field view to render an editable field in place of the readonly view
            this._activeFieldView = <EditableCardFieldView>this.cardRenderer().renderField(fieldView.getElement(), fieldView.field(), true);

            if (this._activeFieldView) {
                if ($.isFunction(onEditStartHandler)) {
                    this._activeFieldView.onEditStart(onEditStartHandler);
                }
                if ($.isFunction(onEditEndHandler)) {
                    const onEditEnd = (event: JQueryEventObject, discard: boolean) => {
                        if (this._activeFieldView) {
                            this._onEditComplete(this._activeFieldView, onEditEndHandler, onEditDiscardHandler, event, discard, cardContext);
                        }
                    };
                    this._activeFieldView.onEditEnd(onEditEnd);
                }
            }
        } else {
            this._activeFieldView = <EditableCardFieldView>fieldView;
        }

        if (this._activeFieldView) {
            this._activeFieldView.startEdit();
        }
        Diag.logTracePoint("OnTileEditControl._attachAndShowCombo.complete");
        return this._activeFieldView;
    }

    /**
     * Ends the active edit (if any)
     */
    public endActiveEdit() {
        if (this._activeFieldView && this._activeFieldView.isEditInProgress()) {
            this._activeFieldView.endEdit();
        }
    }

    /**
     * returns the active field view being edited
     * @return EditableCardFieldView
     */
    public activeFieldView(): EditableCardFieldView {
        return this._activeFieldView;
    }

    protected cardRenderer(): ICardRenderer {
        return this._cardRenderer;
    }

    private _onEditComplete(editableFieldView: EditableCardFieldView, editEndHandler: Function, editDiscardHandler: Function, event: JQueryEventObject, discard: boolean, cardContext?: IRenderCardContext) {
        Diag.Debug.assertParamIsObject(editableFieldView, "editableFieldView");

        if (!editableFieldView) {
            return;
        }

        if (!discard) {
            discard = !editableFieldView.updateField();
        }

        editableFieldView.tearDown();
        // After tearing down the editable control, render the non-editable control back (with the updated field value) to avoid a flicker.
        // The absence of any control (either editable or non-editable) for a field till the tile contents refresh cause a flicker.
        this.cardRenderer().renderField(editableFieldView.getElement(), editableFieldView.field(), false, cardContext);

        if ($.isFunction(editEndHandler)) {
            editEndHandler(editableFieldView, event, discard);
        }

        if (discard) {
            if ($.isFunction(editDiscardHandler)) {
                editDiscardHandler(editableFieldView);
            }
        }

        if (this._activeFieldView === editableFieldView) {
            this._activeFieldView = null;
        }
    }
}

/**
 * Controller that manages edit for a board card.
 * This class manages the state to ensure only a single card field
 * can be edited at a give time
 */
export class BoardCardEditController extends CardEditController {

    constructor(renderer: ICardRenderer) {
        super(renderer);
    }

    /*
     * registers handler to be called on edit end
     * @param CardFieldView the field view on which edit needs to be initiated
     * @param Function the edit start handler
     * @param Function the edit end handler
     * @param Function the edit discard handler, called when the edit value need not be saved
     * @param EditableCardFieldView
     */
    public beginFieldEdit(fieldView: CardFieldView, onEditStart?: Function, onEditEnd?: Function, onEditDiscard?: Function, cardContext?: IRenderCardContext): EditableCardFieldView {
        Diag.Debug.assertParamIsObject(fieldView, "fieldView");

        // End any in-progress edit before starting a new one
        this.endActiveEdit();

        this._activeFieldView = super.beginFieldEdit(fieldView, onEditStart, onEditEnd, onEditDiscard, cardContext);
        return this._activeFieldView;
    }
}

export class WITFieldRenderer implements IFieldRenderer {
    /**
     * Renders the contents for a wit field, default behavior is to show label along with value.
     * @param value the value to be rendered
     * @param cardField the card field settings
     * @param fieldDefinition the card field definition
     * @param $fieldContainer optional container to contain the rendered value
     * @param tooltip optional tooltip to be set on the rendered value, otherwise the value will be used
     * @param cardContext optional cardContext (of type IRenderCardContext) to render WIT field
     * @return JQuery object for the rendered field
     */
    public render(value: string | number | any, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $fieldContainer?: JQuery, tooltip?: string, cardContext?: IRenderCardContext): JQuery {
        Diag.Debug.assertParamIsNotNull(cardField, "cardField");
        var isEditable = TFS_Core_Utils.BoolUtils.parse(cardField["isEditable"]);
        var showLabel = !(TFS_Core_Utils.BoolUtils.parse(cardField["hideLabel"]));
        var displayValue = Utils_Core.convertValueToDisplayString(value) || "";

        if (!tooltip) {
            tooltip = displayValue;
        }

        var $fieldContainer = FieldRendererHelper.buildFieldContainer(cardField[Cards.CardSettings.FIELD_IDENTIFIER], "", isEditable, showLabel, $fieldContainer);

        if (showLabel) {
            let displayName = fieldDefinition.displayName();
            this._renderFieldName($fieldContainer, displayName);
        }

        this._renderFieldValue($fieldContainer, displayValue, tooltip, cardContext);

        return $fieldContainer;
    }

    // Renders the field label for a wit field
    protected _renderFieldName($fieldContainer: JQuery, displayName: string) {
        let $label: JQuery = $fieldContainer.find("." + FieldRendererHelper.FIELD_LABEL);
        Diag.Debug.assert($label.length > 0, "The field container does not have an element to populate the field label");
        $label.text(displayName);
    }

    // Renders the field value for a wit field
    protected _renderFieldValue($fieldContainer: JQuery, displayValue: string, tooltip: string, cardContext?: IRenderCardContext) {
        let $innerElement: JQuery = $fieldContainer.find("." + FieldRendererHelper.FIELD_INNER_ELEMENT);
        Diag.Debug.assert($innerElement.length > 0, "The field container does not have an inner element to populate the value");
        $innerElement.text(displayValue);
    }
}

export class DateTimeFieldRenderer extends WITFieldRenderer {
    /**
     * Renders the contents for a Date Time field, default behavior is to show only Date value.
     * It uses toLocaleDateString method to get the display strings from the provided value,
     * so it automatically handles dateTime
     * @param value the value to be rendered
     * @param cardField the card field settings
     * @param fieldDefinition the card field definition
     * @param $fieldContainer optional container to contain the rendered value
     * @param tooltip optional tooltip to be set on the rendered value, otherwise the value will be used
     * @return JQuery object for the rendered field
     */
    public render(value: any, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $fieldContainer?: JQuery): JQuery {
        Diag.Debug.assertParamIsNotNull(cardField, "cardField");
        var dateObject: Date;
        var toolTip: string;

        if (value) {
            dateObject = new Date(value);
            toolTip = Utils_Core.convertValueToDisplayString(dateObject);
            value = Utils_Core.convertValueToDisplayString(dateObject, "d");
        }

        return super.render(value, cardField, fieldDefinition, $fieldContainer, toolTip);
    }
}

export class IdentityFieldRenderer extends WITFieldRenderer {
    protected _size: Identities_Picker_Controls.IdentityPickerControlSize = Identities_Picker_Controls.IdentityPickerControlSize.Small; // 16px
    protected _showLabel: boolean = true;
    protected _format: Cards.CardFieldDisplayFormats.AssignedToFieldFormats = Cards.CardFieldDisplayFormats.AssignedToFieldFormats.AvatarAndFullName;

    /**
     * Renders the contents for a identity field, default behavior is to show label along with value.
     * @param value the value to be rendered
     * @param cardField the card field settings
     * @param fieldDefinition the card field definition
     * @param $fieldContainer optional container to contain the rendered value
     * @param tooltip optional tooltip to be set on the rendered value, otherwise the value will be used
     * @return JQuery object for the rendered field
     */
    public render(value: any, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $fieldContainer?: JQuery): JQuery {
        if (!isUseNewIdentityControlsEnabled()) {
            return this._render(value, cardField, fieldDefinition, $fieldContainer);
        }
        else {
            Diag.Debug.assertParamIsNotNull(cardField, "cardField");

            var isEditable = TFS_Core_Utils.BoolUtils.parse(cardField["isEditable"]);
            var showLabel = this._showLabel && !(TFS_Core_Utils.BoolUtils.parse(cardField["hideLabel"]));

            $fieldContainer = FieldRendererHelper.buildFieldContainer(cardField[Cards.CardSettings.FIELD_IDENTIFIER], FieldRendererHelper.IDENTITY_CLASS, isEditable, showLabel, $fieldContainer);

            if (showLabel) {
                var $label: JQuery = $fieldContainer.find("." + FieldRendererHelper.FIELD_LABEL);
                Diag.Debug.assert($label.length > 0, "The field container does not have an element to populate the field label");
                var displayName = fieldDefinition.displayName();
                $label.text(displayName);
            }

            var $innerElement: JQuery = $fieldContainer.find("." + FieldRendererHelper.FIELD_INNER_ELEMENT);
            Diag.Debug.assert($innerElement.length > 0, "The field container does not have an inner element to populate the value");

            var user: TFS_OM_Identities.IIdentityReference = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(value);
            var options: Identities_Picker_Controls.IIdentityDisplayOptions = Util_Cards.setupCommonIdentityDisplayControlOptions(user, this._size, this._getEDisplayControlType(this._format));
            options.consumerId = Agile.IdentityControlConsumerIds.CardFieldDisplayControl;

            if (!user || !user.displayName) {
                $innerElement.addClass("unassigned");
            }

            Controls.create(Identities_Picker_Controls.IdentityDisplayControl, $innerElement, options);

            return $fieldContainer;
        }
    }

    protected _render(value: any, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $fieldContainer?: JQuery): JQuery {
        Diag.Debug.assertParamIsNotNull(cardField, "cardField");
        var toolTip: string;
        if (value) {
            toolTip = value;
            value = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(value).displayName;
        }
        return super.render(value, cardField, fieldDefinition, $fieldContainer, toolTip);
    }

    private _getEDisplayControlType(format: Cards.CardFieldDisplayFormats.AssignedToFieldFormats): Identities_Picker_Controls.EDisplayControlType {
        switch (format) {
            case Cards.CardFieldDisplayFormats.AssignedToFieldFormats.AvatarAndFullName:
                return Identities_Picker_Controls.EDisplayControlType.AvatarText;
            case Cards.CardFieldDisplayFormats.AssignedToFieldFormats.AvatarOnly:
                return Identities_Picker_Controls.EDisplayControlType.AvatarOnly;
            case Cards.CardFieldDisplayFormats.AssignedToFieldFormats.FullName:
                return Identities_Picker_Controls.EDisplayControlType.TextOnly;
            default:
                return Identities_Picker_Controls.EDisplayControlType.AvatarText;
        }
    }
}

export class TitleFieldRenderer extends WITFieldRenderer {

    public render(value: string, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $title?: JQuery) {
        Diag.Debug.assertParamIsString(value, "value");
        Diag.Debug.assertIsNotNull(cardField, "cardField");

        var $titleText: JQuery;
        if (!$title || $title.length === 0) {
            $title = $(domElem("div", FieldRendererHelper.TITLE_CLASS + " " + FieldRendererHelper.ELLIPSIS_CLASS));
        }
        else {
            $title.empty();
        }
        $title.attr(FieldRendererHelper.FIELD_DATA, cardField[Cards.CardSettings.FIELD_IDENTIFIER]);

        $titleText = $(domElem("span", FieldRendererHelper.CLICKABLE_TITLE_CLASS)).text(value).attr("role", "button");
        $title[0].appendChild($titleText[0]);

        return $title;
    }
}

export class StateFieldRenderer extends WITFieldRenderer {

    protected _renderFieldValue($fieldContainer: JQuery, displayValue: string, tooltip: string, cardContext?: IRenderCardContext) {
        if (!cardContext) {
            super._renderFieldValue($fieldContainer, displayValue, tooltip)
        }
        else {
            let $innerElement: JQuery = $fieldContainer.find("." + FieldRendererHelper.FIELD_INNER_ELEMENT);
            if (!$innerElement.length) {
                Diag.logError("The field container does not have an inner element to populate the state field value");
            }

            $innerElement.append(WorkItemStateCellRenderer.getAutoUpdatingColorCell(cardContext.projectName, cardContext.workItemTypeName, displayValue));
            $innerElement.find("*").addClass(FieldRendererHelper.TILE_EDIT_TEXT_CLASS);
        }
    }
}

export class AssignedToFieldRenderer extends IdentityFieldRenderer {
    public static cache: IDictionaryStringTo<string>;

    public static initializeCache() {
        AssignedToFieldRenderer.cache = {};
    }

    /**
     * Fills the field container for assigned to with identity view created based on passed value
     */
    public render(value: string, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $fieldContainer?: JQuery): JQuery {
        if (!isUseNewIdentityControlsEnabled()) {
            return this._render(value, cardField, fieldDefinition, $fieldContainer);
        }
        else {
            Diag.Debug.assertParamIsNotNull(cardField, "cardField");

            this._size = Identities_Picker_Controls.IdentityPickerControlSize.Medium;
            this._showLabel = false;
            this._format = cardField["displayFormat"] ? Cards.CardFieldDisplayFormats.AssignedToFieldFormats[cardField["displayFormat"]] : this._format;

            return super.render(value, cardField, fieldDefinition, $fieldContainer);
        }
    }

    // Legacy identity control
    protected _render(value: string, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $fieldContainer?: JQuery): JQuery {
        /// <summary> Fills the field container for assigned to with identity view created based on passed value </summary>
        Diag.Debug.assertParamIsNotNull(cardField, "cardField");

        $fieldContainer = FieldRendererHelper.buildFieldContainer(cardField[Cards.CardSettings.FIELD_IDENTIFIER], FieldRendererHelper.ASSIGNED_TO_CLASS, TFS_Core_Utils.BoolUtils.parse(cardField["isEditable"]), false, $fieldContainer);

        var $innerElement: JQuery = $fieldContainer.find("." + FieldRendererHelper.FIELD_INNER_ELEMENT);
        Diag.Debug.assert($innerElement.length > 0, "The field container does not have an inner element to populate the value");

        var assignedToFormat = Cards.CardFieldDisplayFormats.AssignedToFieldFormats.AvatarAndFullName;
        var assignedToFormats = Cards.CardFieldDisplayFormats.AssignedToFieldFormats;
        if (cardField["displayFormat"]) {
            assignedToFormat = assignedToFormats[cardField["displayFormat"]];
        }

        var textInner: string = AssignedToFieldRenderer.getCachedIdentityViewHtml(value, assignedToFormat);
        $innerElement.html(textInner);

        return $fieldContainer;
    }

    public static getCachedIdentityViewHtml(value: string,
        assignedToFormat: Cards.CardFieldDisplayFormats.AssignedToFieldFormats = Cards.CardFieldDisplayFormats.AssignedToFieldFormats.AvatarAndFullName
    ): string {
        /// <summary> Gets a cached copy of the identity view html if it exists; otherwise, retrieve it from buildIdentityViewHtml </summary>
        /// <param name="value"> The value for which identity view is to be generated </param>
        /// <param name="assignedToFormat"> Display format for identity view </param>
        if (!AssignedToFieldRenderer.cache) {
            AssignedToFieldRenderer.initializeCache();
        }

        var assignedToKey: string = value + "#" + assignedToFormat;
        var textInner: string = AssignedToFieldRenderer.cache[assignedToKey];

        if (!textInner) {
            textInner = Util_Cards.buildIdentityViewHtml(value, assignedToFormat, TFS_OM_Identities.IdentityImageSize.Small);
            AssignedToFieldRenderer.cache[assignedToKey] = textInner;
        }

        return textInner;
    }

}

export class EffortFieldRenderer extends WITFieldRenderer {

    public render(value: string, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $fieldContainer?: JQuery): JQuery {
        Diag.Debug.assertParamIsNotNull(cardField, "cardField");
        var tooltip: string;
        value = TFS_FormatUtils.FormatUtils.formatRemainingWorkForDisplay(value);
        if (fieldDefinition) {
            if (value) {
                tooltip = Utils_String.format("{0}: {1}", fieldDefinition.displayName(), value);
            }
            else {
                tooltip = fieldDefinition.displayName();
            }
        }
        var effortFieldSetting: Cards.ICardFieldSetting = {};
        var $fieldContainer = super.render(value, <Cards.ICardFieldSetting>($.extend(effortFieldSetting, cardField, { "hideLabel": "true" })), fieldDefinition, $fieldContainer, tooltip);
        $fieldContainer.addClass(FieldRendererHelper.EFFORT_CLASS + " " + FieldRendererHelper.REMAINING_WORK_CLASS);
        return $fieldContainer;
    }
}

export class TagsFieldRenderer extends WITFieldRenderer {
    public static TAGS_CLASS = "tags";
    private static MAX_TAGS = 10;
    private static TAG_CHARACTER_LIMIT = 20;

    public render(value: string, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $container?: JQuery): JQuery {
        var tags = value ? value.split(TagConstants.TAG_SPLITTING_SEPARATOR) : [];
        var maxTags = parseInt(cardField[FieldRendererHelper.MAX_TAGS_SETTING]) || TagsFieldRenderer.MAX_TAGS;
        var tagCharacterLimit = parseInt(cardField[FieldRendererHelper.TAG_CHARACTER_LIMIT_SETTING]) || TagsFieldRenderer.TAG_CHARACTER_LIMIT;

        $.each(tags, (i: number, str: string) => {
            tags[i] = $.trim(str);
        });

        var $container = $(domElem("div", TagsFieldRenderer.TAGS_CLASS + " " + FieldRendererHelper.FIELD_CONTAINER));
        $container.attr(FieldRendererHelper.FIELD_DATA, cardField[Cards.CardSettings.FIELD_IDENTIFIER]);

        if (tags && tags.length > 0) {
            <WIT_UI_Tags.TagControl>Controls.BaseControl.createIn(WIT_UI_Tags.TagControl, $container,
                {
                    tags: tags,
                    readOnly: true,
                    type: "card",
                    maxTags: maxTags,
                    tagCharacterLimit: tagCharacterLimit
                });
            return $container;
        }
        return null;
    }
}

export class IdFieldRenderer extends WITFieldRenderer {

    public render(value: string, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $container?: JQuery): JQuery {
        Diag.Debug.assertParamIsNotNull(cardField, "cardField");
        var id: number = parseInt(value) || 0;
        if (id > 0) {
            var $idField = $(domElem("div", FieldRendererHelper.ID_CLASS)).text(value);
            $idField.attr(FieldRendererHelper.FIELD_DATA, cardField[Cards.CardSettings.FIELD_IDENTIFIER]);

            return $idField;
        }
    }
}

export class TreePathFieldRenderer extends WITFieldRenderer {
    private _includeRoot: boolean;

    public constructor(includeRoot: boolean = true) {
        super();
        // if root node value should be displayed
        this._includeRoot = includeRoot;
    }

    public render(value: string, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $fieldContainer?: JQuery): JQuery {
        Diag.Debug.assertParamIsNotNull(cardField, "cardField");
        var displayValue = this.getDisplayValue(value),
            tooltip = Utils_Core.convertValueToDisplayString(value);

        var $fieldContainer = super.render(displayValue, cardField, fieldDefinition, $fieldContainer, tooltip);
        $fieldContainer.addClass(FieldRendererHelper.TYPE_TREE_CLASS);
        return $fieldContainer;
    }

    protected getDisplayValue(value: string): string {
        var leafNodeValue = "";
        if (value) {
            var leafNodeIndex = value.lastIndexOf("\\");
            if (this._includeRoot || leafNodeIndex > 0) {
                // Extract the leaf node
                leafNodeValue = value.substring(leafNodeIndex + 1);
            }
        }
        return leafNodeValue;
    }
}


export class ComboEditControlRenderer {
    private static DEFAULT_COMBO_MAX_LENGTH = 255;

    public render($fieldContainer: JQuery, field: Cards.CardField): EditableCardFieldView {

        var options = this.getControlOptions(field);

        var control = this.getComboControl(options);

        control.init($fieldContainer, field.definition().convertToExternal(field.value()));

        if (!$fieldContainer || $fieldContainer.length !== 1) {
            $fieldContainer = control.getElement();
        }
        else {
            var $fieldInner = $fieldContainer.find("." + FieldRendererHelper.FIELD_INNER_ELEMENT);
            if ($fieldInner && $fieldInner.length > 0) {
                $fieldInner.empty();
                $fieldInner[0].appendChild(control.getElement()[0]);
            }
        }

        return new EditableCardFieldView($fieldContainer, field, control);
    }

    protected getControlOptions(field: Cards.CardField): ICardFieldComboControlOptions {
        var allowedValues = () => {
            return field.getAllowedValues(field.value());
        };

        return {
            allowEdit: !field.isLimitedToAllowedValues(),
            getDropdownValues: field.hasAllowedValues() ? allowedValues : null,
            validator: Utils_Core.delegate(field.definition(), field.definition().isValid),
            allowClear: !field.isRequired(),
            maxLength: ComboEditControlRenderer.DEFAULT_COMBO_MAX_LENGTH,
            label: field.definition().displayName(),
            id: TFS_Core_Utils.GUIDUtils.newGuid()
        };
    }

    protected getComboControl(options: ICardFieldComboControlOptions): CardFieldComboControl {
        return Controls.Control.create(CardFieldComboControl, $("<div>"), options);
    }
}

//this is just a quick fix. There is a User Story #566620 to implement proper checkbox control
//for both read and edit modes
export class BooleanEditControlRenderer extends ComboEditControlRenderer {

    protected getControlOptions(field: Cards.CardField): any {
        return {
            allowEdit: !field.isLimitedToAllowedValues(),
            getDropdownValues: () => ["True", "False"],
            validator: Utils_Core.delegate(field.definition(), field.definition().isValid),
            allowClear: !field.isRequired(),
            maxLength: 5,
            label: field.definition().displayName(),
            id: TFS_Core_Utils.GUIDUtils.newGuid()
        };
    }
}

export class WITTreePathEditControlRenderer extends ComboEditControlRenderer {
    protected getControlOptions(field: Cards.CardField): any {
        return {
            allowEdit: false,
            getDropdownValuesAsync: function () {

                var node: INode;
                var uiNode: TreeView.TreeNode;
                var _witManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WIT.WorkItemStore>(WIT.WorkItemStore));
                var project: WIT.Project = _witManager.getWorkItem(field.itemId()).project;
                return project.nodesCacheManager.beginGetNodes().then(() => {
                    if (field.fieldSetting()[Cards.CardSettings.FIELD_IDENTIFIER] === DatabaseCoreFieldRefName.AreaPath) {
                        node = project.nodesCacheManager.getAreaNode(true);
                    }
                    else {
                        node = project.nodesCacheManager.getIterationNode(true);
                    }

                    uiNode = WorkItemUtility.populateUINodes(node, null, 1);
                    uiNode.text = project.name;
                    return [uiNode];
                });
            },
            type: "tree",
            label: field.definition().displayName(),
            id: TFS_Core_Utils.GUIDUtils.newGuid()
        };
    }
}

export class IdentityEditControlRenderer {
    public static IDENTITY_COMBO_CLASS = "identityCombo";

    /**
     * Render the identity field edit control.
     * @params $fieldContainer The container where the control will be created in.
     * @params field The identity field.
     */
    public render($fieldContainer: JQuery, field: Cards.CardField): EditableCardFieldView {
        var identityControlEnabled = isUseNewIdentityControlsEnabled();
        var control: any;
        if (!$fieldContainer || $fieldContainer.length !== 1) {
            control = identityControlEnabled ? this._createIdentityFieldEditControl(field) : this._createIdentityComboControl(field);
            control.init($fieldContainer, field.definition().convertToExternal(field.value()));
            $fieldContainer = control.getElement();
        }
        else {
            var $fieldInner = $fieldContainer.find("." + FieldRendererHelper.FIELD_INNER_ELEMENT);
            if ($fieldInner && $fieldInner.length > 0) {
                var isAdditional = $fieldContainer.hasClass(FieldRendererHelper.ADDITIONAL_FIELD_CLASS_NAME);
                control = identityControlEnabled ? this._createIdentityFieldEditControl(field, isAdditional) : this._createIdentityComboControl(field);
                $fieldInner.empty();
                $fieldInner[0].appendChild(control.getElement()[0]);
                control.init($fieldContainer, field.definition().convertToExternal(field.value()));
            }
        }
        return new EditableCardFieldView($fieldContainer, field, control);
    }

    private _createIdentityComboControl(field: Cards.CardField): IdentityComboControl {
        var allowedValues = () => {
            return field.getAllowedValues(field.value());
        };

        var options: any = {
            allowEdit: false,
            getDropdownValues: allowedValues,
            dropOptions: {
                getItemContents: (identityItem: string) => {
                    return TFS_UI_Controls_Identities.IdentityViewControl.getIdentityViewElement(identityItem);
                }
            }
        };
        var control = Controls.Control.create(IdentityComboControl, $("<div>"), options);
        control.getElement().addClass(IdentityEditControlRenderer.IDENTITY_COMBO_CLASS);
        return control;
    }

    private _createIdentityFieldEditControl(field: Cards.CardField, isAdditional?: boolean): IdentityFieldEditControl {
        return Controls.Control.create(IdentityFieldEditControl, $("<div>"), {
            field: field,
            isAdditional: isAdditional,
            consumerId: Agile.IdentityControlConsumerIds.CardFieldSearchControl
        });
    }
}

export interface IIdentityFieldEditControlOptions extends Identities_Picker_Controls.IIdentityPickerSearchOptions {
    /**
     * field: The field for the identity control, used to get allowed values
     */
    field: Cards.CardField;
    /**
     * onEditStart: Optional: Callback on beginning the edit action.
     */
    onEditStart?: IArgsFunctionR<any>;
    /**
     * onEditEnd: Optional: Callback on completing the edit action.
     */
    onEditEnd?: IArgsFunctionR<any>;
    /**
     * isAdditional: Optional: Indicate whether the control is for additional field or not.
     */
    isAdditional?: boolean;
}

export class IdentityFieldEditControl extends Controls.Control<IIdentityFieldEditControlOptions> implements ICardFieldEditControl {
    public static IDENTITY_CONTROL_CLASS = "identityControl"; // public for unit test

    private _identityPickerSearchControl: Identities_Picker_Controls.IdentityPickerSearchControl;
    private _$fieldContainer: JQuery;
    private _isAdditional: boolean;
    private _isFiltered: boolean;
    private _field: Cards.CardField;

    public initializeOptions(options?: IIdentityFieldEditControlOptions) {
        this._isAdditional = options.isAdditional;
        this._field = options.field;
        super.initializeOptions(options);
    }

    /**
     * Identity picker Control initialization.
     * @param $fieldContainer The container in which identity control is being initialized
     * @param value The initial value
     */
    public init($fieldContainer: JQuery, value: string) {
        this._$fieldContainer = $fieldContainer;
        this._isFiltered = false;
        this._$fieldContainer.removeClass(CardFieldComboControl.NON_COMBO_BEHAVIOR_CLASS)
            .addClass(CardFieldComboControl.COMBO_BEHAVIOR_CLASS)
            .removeClass("hover");
        this._createControl(value);
        this.getElement().addClass(IdentityFieldEditControl.IDENTITY_CONTROL_CLASS);
    }

    private _createControl(value: string) {
        var allowedNonIdentityValues = () => {
            // If the control has not been initialized, return [], otherwise, if we have set the non identity values return the nonIdentityValues
            // If we haven't set the nonIdentityValues, and there are available additional values, lets get them and set them as the nonIdentityValues
            // Otherwise return just the unassigned values
            if (this._identityPickerSearchControl) {
                if (this._field.getFilterByScope()) {
                    return [WITResources.AssignedToEmptyText].concat(this._field.getFilterByScope().nonIdentities);
                }
                else if (this._field.getAdditionalValues()) {
                    return [WITResources.AssignedToEmptyText].concat(this._field.getAdditionalValues());
                }
                return [WITResources.AssignedToEmptyText];
            }
            return [];
        };

        var getPrefix = () => {
            return this._identityPickerSearchControl.getDropdownPrefix();
        };

        var options = WITHelpers.WITIdentityControlHelpers.setupCommonIdentityPickerOptions(
            false,
            true,
            VSS_FeatureAvailability.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WorkItemTrackingAADSupport),
            null,
            (item: Identities_Picker_RestClient.IEntity) => {
                this._raiseOnEditEnd(false);
            },
            getPrefix,
            () => this._field.getFilterByScope()
        );

        options.highlightResolved = true;
        options.size = this._isAdditional ? Identities_Picker_Controls.IdentityPickerControlSize.Small : Identities_Picker_Controls.IdentityPickerControlSize.Medium;
        options.showContactCard = true;
        options.consumerId = Agile.IdentityControlConsumerIds.CardFieldSearchControl;
        options.callbacks.onInputBlur = () => {
            this._raiseOnEditEnd(true);
        };
        options.callbacks.onKeyPress = (keyCode: number) => {
            if (keyCode === KeyCode.ESCAPE) {
                this._raiseOnEditEnd(true);
            }
        };

        options.callbacks.preDropdownRender = (entityList: Identities_Picker_RestClient.IEntity[]) => {

            let scope = this._field.getFilterByScope();
            let filteredEntityList = entityList;
            if (scope && scope.excludeGroups) {
                filteredEntityList = entityList.filter(e => !Utils_String.equals(e.entityType, Identities_Services.ServiceHelpers.GroupEntity, true));
            }

            let additionalEntities: Identities_Picker_RestClient.IEntity[] = [];
            let nonIdentityValues = allowedNonIdentityValues();
            if (nonIdentityValues && nonIdentityValues.length > 0) {
                let prefix = getPrefix();
                $.each(nonIdentityValues, (i: number, value: string) => {
                    var entity: Identities_Picker_RestClient.IEntity = Identities_Picker_Controls.EntityFactory.createStringEntity(value);

                    if (!this._isFiltered && Utils_String.localeIgnoreCaseComparer(WITResources.AssignedToEmptyText, value) === 0) {
                        // Always show unassigned on unFiltered mode.
                        additionalEntities.unshift(entity);
                    }

                    else if (prefix != null && entity.displayName && entity.displayName.trim().toLowerCase().indexOf(prefix) === 0) {
                        additionalEntities.push(entity);
                    }
                });
                this._isFiltered = true;
            }
            return additionalEntities.concat(filteredEntityList);
        };

        this._identityPickerSearchControl = Controls.create(Identities_Picker_Controls.IdentityPickerSearchControl, this.getElement(), options);
        Utils_Core.delay(this, 0, () => {
            // HACK: to force the highlightResolved option put the resolved identity into edit mode.
            $("span.identity-picker-resolved-name", this.getElement()).click();
        });

        if (value) {
            var entity = WITIdentityHelpers.parseUniquefiedIdentityName(value);
            this._identityPickerSearchControl.setEntities([entity], []);
        }
    }

    /**
     * Set the callback on beginning the edit action
     * @param handler The Callback on beginning the edit action
     */
    public onEditStart(handler: (e: JQueryEventObject, discard: boolean) => void) {
        this._options.onEditStart = handler;
    }

    /**
     * Set the callback on completing the edit action
     * @param handler The callback on completing the edit action
     */
    public onEditEnd(handler: (e: JQueryEventObject, discard: boolean) => void) {
        this._options.onEditEnd = handler;
    }

    /**
     * Indicates whether the control is in edit mode.
     */
    public isEditInProgress(): boolean {
        return this.getElement().is(":visible");
    }

    /**
     * Actions taken before dispose.
     */
    public tearDown() {
        this._$fieldContainer.removeClass(CardFieldComboControl.COMBO_BEHAVIOR_CLASS)
            .addClass(CardFieldComboControl.NON_COMBO_BEHAVIOR_CLASS);
        if (this._identityPickerSearchControl) {
            this._identityPickerSearchControl.dispose();
            this._identityPickerSearchControl = null;
        }
    }

    /**
     * Start the edit action
     */
    public startEdit() {
        if ($.isFunction(this._options.onEditStart)) {
            this._options.onEditStart();
        }
    }

    /**
     * Complete the edit action
     */
    public endEdit() {
        this._raiseOnEditEnd(true);
    }

    /**
     * Get the field value from identity picker control.
     * @returns The field value.
     */
    public getValue(): string {
        var resolvedEntities = this._identityPickerSearchControl.getIdentitySearchResult().resolvedEntities;
        if (resolvedEntities && resolvedEntities.length === 1) {
            return WITIdentityHelpers.getUniquefiedIdentityName(resolvedEntities[0]);
        }
        else {
            var searchResult = this._identityPickerSearchControl.getIdentitySearchResult();
            return searchResult.unresolvedQueryTokens[0];
        }
    }

    /**
     * Set the value to the control
     * @param value The field value
     */
    public setValue(value: string) {
        if (value) {
            this._identityPickerSearchControl.setEntities([WITIdentityHelpers.parseUniquefiedIdentityName(value)], []);
        }
        else {
            this._identityPickerSearchControl.clear();
        }
    }

    private _raiseOnEditEnd(discard: boolean) {
        if ($.isFunction(this._options.onEditEnd)) {
            this._options.onEditEnd({ keyCode: KeyCode.ENTER }, discard);
        }
    }
}

export class DateTimeEditControlRenderer extends ComboEditControlRenderer {

    protected getControlOptions(field: Cards.CardField): any {
        return {
            allowEdit: false,
            allowClear: !field.isRequired(),
            type: "date-time",
            validator: Utils_Core.delegate(field.definition(), field.definition().isValid),
            label: field.definition().displayName(),
            id: TFS_Core_Utils.GUIDUtils.newGuid()
        };
    }
}

export class TitleEditControlRenderer {

    public render($fieldContainer: JQuery, field: Cards.CardField): EditableCardFieldView {
        Diag.Debug.assertIsObject($fieldContainer, "$fieldContainer");
        Diag.Debug.assertIsObject(field, "field");

        var options = {
            allowEdit: true,
            validator: function (value) {
                return Boolean(value);
            }
        };
        var control: CardFieldTitleControl = Controls.Control.create(CardFieldTitleControl, $("<div>"), options);
        control.init($fieldContainer, field.definition().convertToExternal(field.value()));

        $fieldContainer.empty();
        $fieldContainer[0].appendChild(control.getElement()[0]);

        return new EditableCardFieldView($fieldContainer, field, control);
    }
}

export class FieldRendererHelper {
    public static TILE_EDIT_TEXT_CLASS = "onTileEditTextDiv";
    public static EDIT_DIV_CLASS = "onTileEditDiv";
    public static FIELD_INNER_ELEMENT = "field-inner-element";
    public static FIELD_LABEL = "field-label";
    public static FIELD_CONTAINER = "field-container";
    public static FIELD_DATA = "field";
    public static ASSIGNED_TO_CLASS: string = "assignedTo";
    public static IDENTITY_CLASS: string = "identity";
    public static EFFORT_CLASS: string = "effort";
    public static ELLIPSIS_CLASS: string = "ellipsis";
    public static TITLE_CLASS: string = "title";
    public static CLICKABLE_TITLE_CLASS: string = "clickable-title";
    public static ICON_EDIT_CLASS: string = "editIcon";
    public static EDIT_MODE_CLASS: string = "editMode";
    public static CONTAINER_CLASS: string = "container";
    public static ID_TITLE_CONTAINER_CLASS = "id-title-container";
    public static ID_CLASS = "id";
    public static EFFORT_FIELD: string = "Effort";
    public static ADDITIONAL_FIELD_CLASS_NAME = "additional-field";
    public static MAX_TAGS_SETTING = "maxTags";
    public static TAG_CHARACTER_LIMIT_SETTING = "tagCharacterLimit";
    public static TYPE_TREE_CLASS = "tree";


    //TODO: In additional fields story, the special renderer for state should be removed and it should be drawn using the WITFieldRenderer.
    //Right now for WITFIeldRenderer we dont have editing capability, so thats why we have treated State as a special field
    //witRemainingWork - is specific to taskboard and is used in summary rows as well. After refactoring the edit provider for this, name consistency should be brought in.
    //witExtra - is being used to provide hover and edit behavior for the core fields. When editProviderer refactoring is done, this can be removed and only additional fields can be used.
    public static STATE_CLASS: string = "witState";
    public static REMAINING_WORK_CLASS: string = "witRemainingWork";
    public static WITEXTRA_CLASS = "witExtra";

    /**
     * Builds the field container element. This container element will be used for editing if the field is editable
     * @param string Class name to be added on the field (to identify which field is being edited)
     * @param boolean? True if the field should have a label
     * @param boolean? True if the field is editable
     * @param JQuery? The field container to build if already exists
     * @return JQuery The field container
     */
    public static buildFieldContainer(fieldRefName: string, fieldClass: string, isEditable = true, showLabel = false, $fieldContainer?: JQuery): JQuery {
        Diag.Debug.assertParamIsString(fieldClass, "fieldClass");

        var $fieldInner: JQuery;

        if (!$fieldContainer || $fieldContainer.length === 0) {
            var tileEditContainerClass = FieldRendererHelper.FIELD_CONTAINER + " " + FieldRendererHelper.EDIT_DIV_CLASS + " non-combo-behavior " + FieldRendererHelper.ELLIPSIS_CLASS + " " + fieldClass;
            $fieldContainer = $(domElem("div", tileEditContainerClass));
        }
        else {
            $fieldContainer.empty();
        }
        $fieldContainer.attr(FieldRendererHelper.FIELD_DATA, fieldRefName);

        var tileEditInnerElementClass = FieldRendererHelper.FIELD_INNER_ELEMENT + " " + FieldRendererHelper.ELLIPSIS_CLASS;
        if (isEditable) {
            tileEditInnerElementClass = tileEditInnerElementClass + " " + FieldRendererHelper.TILE_EDIT_TEXT_CLASS;
        }
        $fieldInner = $(domElem("div", tileEditInnerElementClass));

        if (showLabel) {
            $fieldContainer[0].appendChild(domElem("div", FieldRendererHelper.FIELD_LABEL + " " + FieldRendererHelper.ELLIPSIS_CLASS));
        }
        $fieldContainer[0].appendChild($fieldInner[0]);

        return $fieldContainer;
    }
}

export class WITFieldRendererManager implements IFieldRendererManager {

    private static FIELD_ID_PREFIX: string = "refName_";
    private static FIELD_TYPE_PREFIX: string = "type_";

    private _fieldRenderers: IDictionaryStringTo<WITFieldRenderer>;
    private _fieldControlRenderers: IDictionaryStringTo<any>;

    constructor() {
        this._fieldRenderers = {};
        this._fieldControlRenderers = {};

        this._registerRenderers();
    }

    private _registerRenderers() {

        var witFieldRenderer = new WITFieldRenderer();
        this._fieldRenderers[WITFieldRendererManager.FIELD_ID_PREFIX + DatabaseCoreFieldRefName.Title] = new TitleFieldRenderer();
        this._fieldRenderers[WITFieldRendererManager.FIELD_ID_PREFIX + DatabaseCoreFieldRefName.AssignedTo] = new AssignedToFieldRenderer();
        this._fieldRenderers[WITFieldRendererManager.FIELD_ID_PREFIX + FieldRendererHelper.EFFORT_FIELD] = new EffortFieldRenderer();
        this._fieldRenderers[WITFieldRendererManager.FIELD_ID_PREFIX + DatabaseCoreFieldRefName.Tags] = new TagsFieldRenderer();
        this._fieldRenderers[WITFieldRendererManager.FIELD_ID_PREFIX + DatabaseCoreFieldRefName.Id] = new IdFieldRenderer();
        this._fieldRenderers[WITFieldRendererManager.FIELD_ID_PREFIX + DatabaseCoreFieldRefName.IterationPath] = new TreePathFieldRenderer(false);
        this._fieldRenderers[WITFieldRendererManager.FIELD_ID_PREFIX + DatabaseCoreFieldRefName.State] = new StateFieldRenderer();

        this._fieldRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.TreePath]] = new TreePathFieldRenderer();
        this._fieldRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.Double]] = witFieldRenderer;
        this._fieldRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.Integer]] = witFieldRenderer;
        this._fieldRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.PlainText]] = witFieldRenderer;
        this._fieldRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.String]] = witFieldRenderer;
        this._fieldRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.Boolean]] = witFieldRenderer;
        this._fieldRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.Identity]] = new IdentityFieldRenderer();
        this._fieldRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.DateTime]] = new DateTimeFieldRenderer();

        this._fieldControlRenderers[WITFieldRendererManager.FIELD_ID_PREFIX + DatabaseCoreFieldRefName.Title] = new TitleEditControlRenderer();

        var comboControlRenderer = new ComboEditControlRenderer();
        this._fieldControlRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.Boolean]] = new BooleanEditControlRenderer();
        this._fieldControlRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.Double]] = comboControlRenderer;
        this._fieldControlRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.Integer]] = comboControlRenderer;
        this._fieldControlRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.PlainText]] = comboControlRenderer;
        this._fieldControlRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.String]] = comboControlRenderer;
        this._fieldControlRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.Identity]] = new IdentityEditControlRenderer();
        this._fieldControlRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.DateTime]] = new DateTimeEditControlRenderer();
        this._fieldControlRenderers[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[Cards.CardFieldType.TreePath]] = new WITTreePathEditControlRenderer();

    }

    /**
     * Gets the field renderer based on fieldRefName or fieldType. First the method tries to get the renderer based on the refName.
     * If there is no specific renderer for the refName, renderer will be fetched based on the fieldType.
     * If there is no renderer for the particular type then the general WITFieldRenderer is returned.
     * @param string RefName of the field
     * @param string Type of the field
     * @return any WITFieldRenderer The field renderer
     */
    public getFieldRenderer(fieldRefName: string, fieldType?: Cards.CardFieldType, editable: boolean = false): any {

        if (!editable) {
            return this._lookupRenderer(this._fieldRenderers, fieldRefName, fieldType);
        } else {
            return this._lookupRenderer(this._fieldControlRenderers, fieldRefName, fieldType);
        }
    }

    /**
     * Renders the contents for a field
     * @param string, number, or any Value of the field
     * @param Cards.ICardFieldSetting Settings for the field
     * @param Cards.CardFieldDefinition cards field definition
     * @param JQuery field container for the field
     * @param boolean flag to check if the field is an additional field
     * @param IRenderCardContext card context for rendering the field
     * @return JQuery The field contents that have been created
     */
    public renderField(value: string | number | any, cardField: Cards.ICardFieldSetting, fieldDefinition: Cards.CardFieldDefinition, $fieldContainer?: JQuery, isAdditional?: boolean, cardContext?: IRenderCardContext): JQuery {

        var fieldRenderer: WITFieldRenderer;

        if ($fieldContainer && $fieldContainer.length) {
            //if field container already exists, override isAdditional based on the container
            isAdditional = $fieldContainer.hasClass(FieldRendererHelper.ADDITIONAL_FIELD_CLASS_NAME);
        }

        if ($fieldContainer && $fieldContainer.filter("." + FieldRendererHelper.EFFORT_CLASS).length === 1) {
            // this is to ensure we use the effort renderer if the container is already marked as effort
            fieldRenderer = this.getFieldRenderer(FieldRendererHelper.EFFORT_FIELD);
        } else {
            // fetch renderer based on type (and not refname) for additional fields
            // this is so that the core field renderer is not retrieved if the core field is being displayed as additional
            var fieldRefName = (isAdditional && Util_Cards.isCoreField(cardField[Cards.CardSettings.FIELD_IDENTIFIER])) ? "" : cardField[Cards.CardSettings.FIELD_IDENTIFIER];
            if (fieldDefinition) {
                fieldRenderer = this.getFieldRenderer(fieldRefName, fieldDefinition.type());
            }
            else {
                fieldRenderer = this.getFieldRenderer(fieldRefName);
            }
        }
        if (fieldRenderer) {
            return fieldRenderer.render(value, cardField, fieldDefinition, $fieldContainer, null, cardContext);
        }
        return null;
    }

    private _lookupRenderer(rendererMap: IDictionaryStringTo<any>, fieldRefName: string, fieldType: Cards.CardFieldType): any {

        // look up based on field ref name
        var fieldRenderer = rendererMap[WITFieldRendererManager.FIELD_ID_PREFIX + fieldRefName];
        if (!fieldRenderer && fieldType) {
            // if not found, look up field type based on both enum and string
            fieldRenderer = rendererMap[WITFieldRendererManager.FIELD_TYPE_PREFIX + fieldType];
            if (!fieldRenderer) {
                fieldRenderer = rendererMap[WITFieldRendererManager.FIELD_TYPE_PREFIX + Cards.CardFieldType[fieldType]];
            }
        }
        if (!fieldRenderer) {
            fieldRenderer = null;
        }
        return fieldRenderer;
    }
}

export class WITCardRenderer implements ICardRenderer {
    public static itemSourceType: string = "wit";
    private static _cardFieldRendererManager: WITFieldRendererManager;

    // TODO: BoardType can be removed once Additional fields are supported on Taskboard, so there wont be any need of a special State renderer.
    public boardType: string;

    private _emptySections: number; // Keeps track of how many sections are empty. A section is a display-able area of the card. E.g. Assigned To + Effort = 1 section

    constructor() {
        if (!WITCardRenderer._cardFieldRendererManager) {
            WITCardRenderer._cardFieldRendererManager = new WITFieldRendererManager();
        }
    }

    /**
     * Renders the contents of a card based on the card fields settings 
     * @param $container: JQuery Container in which the cardshould be drawn
     * @param cardSettings: TFS.Agile.CardSettings CardSettings which has the list of fields and their formats to be displayed
     * @param fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition> A dictionary to card field definition.
     * @param getFieldValue: (refName: string) => string A function which provides field value based on the field refNem
     * @param additionalCoreFieldIdentifier?: string This is an additional core field that can be drawn in the core section of the field, next to assignedTo. This can be an effort or workrollup field.
     * @param boardType?: string "TASKBOARD" or "KANBAN". By default it is treated as "KANBAN"
     * @param styles?: Cards.IStyleRule[] Array of card style rules.
     * @param forceShowAllEditableFields?: If set to true will show editable fields, ignoring the global settings
     * @param cardContext?: card context to be used for state rendering
     * @param isNew?: Indicates if the card is in new state (ID < 0)
     */
    public renderCard(
        $container: JQuery,
        cardSettings: Cards.CardSettings,
        fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition>,
        getFieldValue: (refName: string) => string,
        additionalCoreFieldIdentifier: string,
        boardType: string,
        styles: Cards.IStyleRule[],
        forceShowAllEditableFields: boolean,
        cardContext: IRenderCardContext,
        isNew: boolean = false): IRenderCardResult {
        // TODO: BoardType can be removed once Additional fields are supported on Taskboard, so there wont be any need of a special State renderer.
        // Right now only one additional core field is possible and this field will be placed next to assignedTo.
        Diag.Debug.assert($container.length > 0, "");
        Diag.Debug.assertParamIsType(cardSettings, Cards.CardSettings, "cardSettings");
        Diag.Debug.assertIsNotNull(cardSettings);

        this._emptySections = 0;

        this.boardType = boardType;

        this._renderIdAndTitleSection($container, cardSettings, fieldDefinitions, getFieldValue, cardContext);

        // If this is a new work item only render the id/title (to prevent people from trying to edit fields on a non-existent work item)
        if (!isNew) {

            // Get the general field settings
            var generalSettings = cardSettings.getField("");
            var showEmptyFields = boardType === BoardType.Kanban ? false : true;
            if (generalSettings) {
                showEmptyFields = Util_Cards.getBoolShowEmptyFieldsFromString(generalSettings[Cards.CardSettings.SHOW_EMPTY_FIELDS], showEmptyFields);
            }

            // Render assigned to section and 
            this._renderAssignedToSection($container, cardSettings, fieldDefinitions, getFieldValue, forceShowAllEditableFields || showEmptyFields, additionalCoreFieldIdentifier);

            // Render the additional fields
            var $field: JQuery = null;
            var coreFields = Util_Cards.getCoreFieldNames(additionalCoreFieldIdentifier);
            cardSettings.fields.forEach((field: Cards.ICardFieldSetting, index: number) => {
                if (Util_Cards.shouldRenderAsAdditionalField(field, coreFields)) {
                    var showEmptyField = showEmptyFields || (forceShowAllEditableFields && TFS_Core_Utils.BoolUtils.parse(field["isEditable"]));
                    var value = getFieldValue(field[Cards.CardSettings.FIELD_IDENTIFIER]);
                    var isEmptyValue = this._isNullOrEmpty(value);

                    if (isEmptyValue) {
                        this._emptySections++;
                    }

                    if (showEmptyField ||
                        (!isEmptyValue && !(Utils_String.localeComparer(field[Cards.CardSettings.FIELD_IDENTIFIER], DatabaseCoreFieldRefName.IterationPath) === 0 && value.lastIndexOf("\\") <= 0))) {

                        $field = WITCardRenderer._cardFieldRendererManager.renderField(value, field, fieldDefinitions[field[Cards.CardSettings.FIELD_IDENTIFIER].toUpperCase()], null, true, cardContext);
                        if ($field) {
                            $field.addClass(FieldRendererHelper.ADDITIONAL_FIELD_CLASS_NAME);
                            $container[0].appendChild($field[0]);
                        }
                    }
                }
            });
            // The last additional field
            if ($field) {
                $field.addClass("lastAdditionalField");
            }

            this._renderTags($container, cardSettings, fieldDefinitions, getFieldValue);

            this._applyStyleCustomization($container, cardContext.teamId, fieldDefinitions, getFieldValue, styles);
        }

        return {
            hasEmptyFields: this._emptySections > 0
        };
    }

    public disposeCard($container: JQuery) {
        if ($container) {
            let $iconElements = $container.find(`.${FieldRendererHelper.ID_TITLE_CONTAINER_CLASS}`);

            $iconElements.each((i, $iconElement) => {
                WorkItemTypeIconControl.unmountWorkItemTypeIcon($iconElement);
            });

            let $identityElements = $container.find(`.${FieldRendererHelper.IDENTITY_CLASS}`);
            $identityElements.each((i, identityElement) => {
                $(identityElement).remove();
            });

        }
    }

    private _isNullOrEmpty(value: string): boolean {
        return value === null || value === undefined || value === "";
    }

    /**
     * Renders the field in a card view based on the card fields settings
     * @param $fieldContainer JQuery Container in which the field should be drawn
     * @param field the field object that needs to be rendered
     * @param editable boolean indicating if the rendered field view should be editable by the user 
     * @returns the field view object
     */
    public renderField($fieldContainer: JQuery, field: Cards.CardField, editable?: boolean, cardContext?: IRenderCardContext): CardFieldView {
        Diag.Debug.assertParamIsNotNull(field, "field");

        var fieldView: CardFieldView;
        if (!editable) {
            var $fieldContainer = WITCardRenderer._cardFieldRendererManager.renderField(field.value(), field.fieldSetting(), field.definition(), $fieldContainer, null, cardContext);
            if ($fieldContainer) {
                fieldView = new CardFieldRenderedView($fieldContainer, field, WITCardRenderer._cardFieldRendererManager.getFieldRenderer(field.referenceName(), field.definition().type()));
            }
        }
        else {
            var controlRenderer = WITCardRenderer._cardFieldRendererManager.getFieldRenderer(field.referenceName(), field.definition().type(), true);
            if (controlRenderer) {
                fieldView = controlRenderer.render($fieldContainer, field);
            }
        }
        return fieldView;
    }

    /**
     * Gets the FieldView representation associated with the element in the specified card
     * @param $fieldContainer element that is the current target
     * @param field the field object that is expected at the current element
     * @returns the field view object
     */
    public getFieldView($fieldContainer: JQuery, field: Cards.CardField): CardFieldView {
        Diag.Debug.assertParamIsNotNull(field, "field");
        Diag.Debug.assertParamIsJQueryObject($fieldContainer, "$fieldContainer");

        var fieldView: CardFieldView = null;
        if ($fieldContainer && $fieldContainer.length === 1) {
            var renderer = WITCardRenderer._cardFieldRendererManager.getFieldRenderer(field.referenceName(), field.definition().type());
            if (renderer) {
                fieldView = new CardFieldRenderedView($fieldContainer, field, renderer);
            }
        }
        return fieldView;
    }

    /**
     * Gets the field name associated with the element in the specified card
     * @param $target element that is the current target
     * @param $card the card element in which the target exists 
     * @returns string the field reference name
     */
    public getFieldName($target: JQuery, $card: JQuery): string {

        var $fieldContainer = this.getFieldContainer($card, null, $target);
        if ($fieldContainer && $fieldContainer.length === 1) {
            return $fieldContainer.attr(FieldRendererHelper.FIELD_DATA);
        }
        return null;
    }

    /**
     * Gets the field container associated with the element in the specified card
     * @param $card the card element in which the target exists 
     * @param fieldRefName string the field reference name
     * @param $target element that is the current target
     * @returns JQuery the field container element
     */
    public getFieldContainer($card: JQuery, fieldRefName: string, $target?: JQuery): JQuery {
        Diag.Debug.assertParamIsJQueryObject($card, "$card");

        var $fieldContainer: JQuery = null;
        if ($target) {
            if ($target.hasClass(FieldRendererHelper.ICON_EDIT_CLASS)) {
                $fieldContainer = $card.find("." + FieldRendererHelper.TITLE_CLASS).first();
            }
            else {
                $fieldContainer = $target.closest("." + FieldRendererHelper.FIELD_CONTAINER, $card[0]);
            }
        }
        else {
            if (!Utils_String.ignoreCaseComparer(fieldRefName, DatabaseCoreFieldRefName.Title)) {
                $fieldContainer = $card.find("." + FieldRendererHelper.TITLE_CLASS).first();
            }
            else {
                $fieldContainer = $card.find("." + FieldRendererHelper.FIELD_CONTAINER + "[" + FieldRendererHelper.FIELD_DATA + "='" + fieldRefName + "']");
            }
        }
        return $fieldContainer;
    }

    /**
     * Hides all the fields on the card except the id and the title,
     * Also hides the edit icon for the title
     * @param $card the card from which the extra fields need to be removed
     */
    public hideExtraFields($card: JQuery) {
        // Hide the area where extra fields for wit (e.g. remaining work and assigned to) are shown
        $("." + FieldRendererHelper.WITEXTRA_CLASS, $card).css("visibility", "hidden");
        // Hide the additional fields and tags
        $("." + FieldRendererHelper.FIELD_CONTAINER + "." + FieldRendererHelper.ADDITIONAL_FIELD_CLASS_NAME, $card).css("visibility", "hidden");
        $("." + FieldRendererHelper.FIELD_CONTAINER + "." + TagsFieldRenderer.TAGS_CLASS, $card).css("visibility", "hidden");
        // The edit icon for the title should not be shown
        $("." + FieldRendererHelper.ICON_EDIT_CLASS, $card).css("visibility", "hidden");
    }

    /**
     * Determines if the current tile element is editable
     * @param $target The target element to check 
     * @returns boolean if the field view is editable
     */
    public isTargetEditable($target: JQuery): boolean {
        var isEditable = false;
        var $fieldContainer = $target.closest('.field-inner-element.ellipsis.onTileEditTextDiv');
        // We need to handle assigned to specially because of it's non-rectangular layout(Assigned to text is narrower than the avatar)
        if ($target.parent().parent().hasClass(FieldRendererHelper.ASSIGNED_TO_CLASS) ||
            $target.hasClass(FieldRendererHelper.TILE_EDIT_TEXT_CLASS) && !($target.parent().hasClass(FieldRendererHelper.ASSIGNED_TO_CLASS))) {
            isEditable = true;
        }
        else if (!$fieldContainer.children().first().hasClass(IdentityFieldEditControl.IDENTITY_CONTROL_CLASS) &&
            ($fieldContainer.length === 1 && $fieldContainer.parent().hasClass(FieldRendererHelper.IDENTITY_CLASS))) {
            // New IdentityDisplayControl
            isEditable = true;
        }
        else if ($target.hasClass(FieldRendererHelper.ICON_EDIT_CLASS)) {
            isEditable = true;
        }

        return isEditable;
    }

    private _applyStyleCustomization(
        $container: JQuery,
        teamId: string,
        fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition>,
        getFieldValue: (refName: string) => string,
        styles: Cards.IStyleRule[]): void {
        if (styles && styles.length > 0) {
            new StyleCustomization.StyleRuleHelper().applyCustomStyle($container, teamId, fieldDefinitions, getFieldValue, styles);
        }
    }

    private _renderIdAndTitleSection($container: JQuery, cardSettings: Cards.CardSettings, fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition>, getFieldValue: (refName: string) => any, cardContext?: IRenderCardContext) {
        const id: number | string = getFieldValue(DatabaseCoreFieldRefName.Id);
        const title: string = getFieldValue(DatabaseCoreFieldRefName.Title);
        const $idAndTitle = $(domElem("div", FieldRendererHelper.ID_TITLE_CONTAINER_CLASS));

        // Icon
        if (cardContext && (typeof id === 'number')) {
            if (id > 0) {
                WorkItemTypeIconControl.renderWorkItemTypeIcon(
                    $idAndTitle[0],
                    cardContext.workItemTypeName,
                    cardContext.projectName);
            }
            else {
                WorkItemTypeIconControl.renderWorkItemTypeIcon(
                    $idAndTitle[0],
                    null,
                    {
                        color: WorkItemTypeColorAndIcons.DEFAULT_UNPARENTED_WORKITEM_COLOR,
                        icon: WorkItemTypeColorAndIcons.DEFAULT_UNPARENTED_WORKITEM_BOWTIE_ICON
                    },
                    { tooltip: title } as WorkItemTypeIconControl.IIconAccessibilityOptions);
            }
        }

        const idFieldSettings = cardSettings.getField(DatabaseCoreFieldRefName.Id);
        if (idFieldSettings && Util_Cards.shouldRenderAsCoreField(idFieldSettings, Util_Cards.getCoreFieldNames())) {
            var $id = WITCardRenderer._cardFieldRendererManager.renderField(id, idFieldSettings, fieldDefinitions[DatabaseCoreFieldRefName.Id.toUpperCase()]);

            if ($id) {
                $idAndTitle[0].appendChild($id[0]);
            }
        }

        var titleFieldSettings = cardSettings.getField(DatabaseCoreFieldRefName.Title);
        const $title = WITCardRenderer._cardFieldRendererManager.renderField(title, titleFieldSettings, fieldDefinitions[DatabaseCoreFieldRefName.Title.toUpperCase()]);
        $idAndTitle[0].appendChild($title[0]);

        $container[0].appendChild($idAndTitle[0]);
        var isEditable = TFS_Core_Utils.BoolUtils.parse(titleFieldSettings["isEditable"]);
        if (isEditable) {
            $container[0].appendChild(domElem("div", FieldRendererHelper.ICON_EDIT_CLASS));
            $container.find("." + FieldRendererHelper.ICON_EDIT_CLASS).prop('title', AgileControlsResources.EditTitle);
        }
    }

    private _renderAssignedToSection(
        $container: JQuery,
        cardSettings: Cards.CardSettings,
        fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition>,
        getFieldValue: (refName: string) => string,
        displayEmptyFields: boolean,
        additionalCoreFieldName?: string) {

        let sectionHasValue = false;

        let coreFieldRefNames = Util_Cards.getCoreFieldNames(additionalCoreFieldName);
        let $assignedTo: JQuery;
        let $effort: JQuery;


        let assignedToValue;
        let effortValue;

        // Determine if the assigned to field has a value
        const assignedToFieldSettings = cardSettings.getField(DatabaseCoreFieldRefName.AssignedTo);
        if (assignedToFieldSettings && Util_Cards.shouldRenderAsCoreField(assignedToFieldSettings, coreFieldRefNames)) {
            assignedToValue = getFieldValue(DatabaseCoreFieldRefName.AssignedTo);

            if (assignedToValue) {
                sectionHasValue = true;
            }
        }

        // Determine if the effort field has a value
        let effortFieldSettings;
        if (additionalCoreFieldName) {
            // Right now there can be only one additional core field in AssignedToSection , which is Effort or Remaining work field
            effortFieldSettings = cardSettings.getField(additionalCoreFieldName);

            if (effortFieldSettings && Util_Cards.shouldRenderAsCoreField(effortFieldSettings, coreFieldRefNames)) {
                effortValue = getFieldValue(additionalCoreFieldName);

                if (effortValue) {
                    sectionHasValue = true;
                    effortValue = TFS_FormatUtils.FormatUtils.formatRemainingWorkForDisplay(effortValue);
                }

                // WORK_ROLLUP is a placeholder for PBI items which is later updated with cummulative work of its children
                // hence need to allow rendering WORK_ROLLUP even if it does not have any value
                if (Utils_String.equals(additionalCoreFieldName, ".WORK_ROLLUP", true)) {
                    sectionHasValue = true;
                }
            }
        }


        // If either of the fields have value, or we are displaying empty fields, render both fields
        if (sectionHasValue || displayEmptyFields) {
            // Render the assigned to field
            if (assignedToFieldSettings && Util_Cards.shouldRenderAsCoreField(assignedToFieldSettings, coreFieldRefNames)) {
                $assignedTo = WITCardRenderer._cardFieldRendererManager.renderField(assignedToValue, assignedToFieldSettings, fieldDefinitions[DatabaseCoreFieldRefName.AssignedTo.toUpperCase()]);
            }

            // Render the effort field
            if (additionalCoreFieldName && effortFieldSettings && Util_Cards.shouldRenderAsCoreField(effortFieldSettings, coreFieldRefNames)) {
                let effortRenderer: WITFieldRenderer = WITCardRenderer._cardFieldRendererManager.getFieldRenderer(FieldRendererHelper.EFFORT_FIELD);
                $effort = effortRenderer.render(effortValue, effortFieldSettings, fieldDefinitions[additionalCoreFieldName.toUpperCase()]);
            }
        }

        if ($assignedTo || $effort) {
            // Render the container
            let $assignedToAndEffortContainer = $(domElem("div", FieldRendererHelper.CONTAINER_CLASS)).addClass(FieldRendererHelper.WITEXTRA_CLASS);

            // Layout the rendered fields
            if ($effort) {
                $assignedToAndEffortContainer[0].appendChild($effort[0]);
            }
            if ($assignedTo) {
                $assignedToAndEffortContainer[0].appendChild($assignedTo[0]);
            }
            $container[0].appendChild($assignedToAndEffortContainer[0]);
        }

        if (!sectionHasValue) {
            this._emptySections++;
        }
    }


    private _renderTags($container: JQuery, cardSettings: Cards.CardSettings, fieldDefinitions: IDictionaryStringTo<Cards.CardFieldDefinition>, getFieldValue: (refName: string) => string) {
        var tagsFieldSettings = cardSettings.getField(DatabaseCoreFieldRefName.Tags);
        if (tagsFieldSettings) {
            var value = getFieldValue(DatabaseCoreFieldRefName.Tags);
            var $field = WITCardRenderer._cardFieldRendererManager.renderField(value, tagsFieldSettings, fieldDefinitions[DatabaseCoreFieldRefName.Tags.toUpperCase()]);
            if ($field) {
                $container[0].appendChild($field[0]);
            }
        }
    }
}

CardRendererFactory.registerConstructor(WITCardRenderer.itemSourceType, WITCardRenderer);


