/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Controls_PopupContent = require("VSS/Controls/PopupContent");
import Culture = require("VSS/Utils/Culture");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Validation = require("VSS/Controls/Validation");
import Virtualization = require("VSS/Controls/Virtualization");

const delegate = Utils_Core.delegate;
const domElem = Utils_UI.domElem;
const keyCode = Utils_UI.KeyCode;

module Measurement {

    export let _PROBE_ID: string = "tfs-measurement-probe";

    export function _createProbe($parent) {
        // Creating Measurement div for em and ex
        const $probe = $("<div/>")
            .attr("id", _PROBE_ID)
            .css("position", "absolute")
            .css("left", "-50000px")
            .css("top", "-50000px")
            .css("width", "9em")
            .css("height", "18ex")
            .css("overflow", "auto")
            .appendTo($parent);

        // Creating Measurement div for in and scrollbars
        $("<div></div>")
            .css("width", "3in")
            .css("height", "36ex")
            .appendTo($probe);

        return $probe;
    }

    /**
     * Get a probe element to use to measure
     * 
     * @param $parent Parent element to create a probe under (null for document body)
     * @return 
     */
    export function _getProbe($parent?: JQuery): JQuery {

        // If no parent specified, adding the probe to document.body
        $parent = $parent || $(document.body);
        let $probe = $parent.children("#" + _PROBE_ID);

        // Checking the probe already exists. If not exists creating one
        if ($probe.length === 0) {
            $probe = Measurement._createProbe($parent);
        }

        return $probe;
    }

    /**
     * Get the pixel equivalent for em's
     * 
     * @return 
     */
    export function getUnitEm(): number {
        return Measurement._getProbe().width() / 9;
    }

    /**
     * Get the pixel equivalent for ex's
     * 
     * @return 
     */
    export function getUnitEx(): number {
        return Measurement._getProbe().height() / 18;
    }

    /**
     * Get the pixel equivalent for inches
     * 
     * @return 
     */
    export function getUnitIn(): number {
        return $("div", Measurement._getProbe()).width() / 3;
    }

    /**
     * Get the scrollbar width in pixels
     * 
     * @param $parent The element to measure
     * @return 
     */
    export function getScrollbarWidth($parent: JQuery): number {
        const $probe = Measurement._getProbe($parent);
        return $probe.width() - $probe[0].clientWidth;
    }

    /**
     * Get the scrollbar height in pixels
     * 
     * @param $parent The element to measure
     * @return 
     */
    export function getScrollbarHeight($parent: JQuery): number {
        const $probe = Measurement._getProbe($parent);
        return $probe.height() - $probe[0].clientHeight;
    }

    /**
     * Get the number of pixels for the given measurement
     * 
     * @param unit Measurement (e.g. "14.5 px" or "2 em")
     * @return 
     */
    export function getUnitAsPixel(unit: string): number {

        unit = unit.toLowerCase();
        let result = parseInt(unit, 10);

        if (unit.indexOf("px") > 0) {
            result = Math.round(parseFloat(unit));
        }
        else if (unit.indexOf("em") > 0) {
            result = Math.round(parseFloat(unit) * Measurement.getUnitEm());
        }
        else if (unit.indexOf("ex") > 0) {
            result = Math.round(parseFloat(unit) * Measurement.getUnitEx());
        }
        else if (unit.indexOf("in") > 0) {
            result = Math.round(parseFloat(unit) * Measurement.getUnitIn());
        }
        else if (unit.indexOf("mm") > 0) {
            result = Math.round(parseFloat(unit) * Measurement.getUnitIn() / 25.4);
        }
        else if (unit.indexOf("cm") > 0) {
            result = Math.round(parseFloat(unit) * Measurement.getUnitIn() / 2.54);
        }
        return result;
    }
}

export function extendWithout(options?: any, toDelete?: any): any {
    const result = $.extend({}, options);
    if (toDelete) {
        $.each(toDelete, function (i, v) {
            delete result[v];
        });
    }

    return result;
}

export class ListDataSource extends Controls.BaseDataSource {
}

export class BaseComboBehavior {

    public combo: Combo;

    protected _options: any;
    protected _dataSource: Controls.BaseDataSource;


    private _onForceHideDropPopupDelegate: (e: JQueryEventObject) => boolean | void;
    private _onParentsScrollDelegate: (e: JQueryEventObject) => boolean | void;
    private _onWheelDelegate: (e: JQueryEventObject) => boolean | void;
    private _dropPopup: BaseComboDropPopup;

    constructor(combo, options?) {
        this.combo = combo;
        this._options = options || {};
        this._onForceHideDropPopupDelegate = delegate(this, this.onForceHideDropPopup);
        this._onParentsScrollDelegate = delegate(this, this.onParentsScroll);
        // Edge sometimes leaks scroll events out of the drop popup. Just having this event listener
        // is enough to fix it even though it does nothing. Bug 969813
        this._onWheelDelegate = () => { };
    }

    public initialize(): void {
        if (this._options.source) {
            this.setSource(this._options.source);
        }
    }

    public dispose(): void {
        this.hideDropPopup();
    }

    public setMode(value): void {
        this._options.mode = value;
    }

    public canType(): boolean {
        return true;
    }

    /**
     * Get value for aria-autocomplete attribute of parent.
     */
    public getAriaAutocomplete(): string {
        return this._options.autoComplete === false ? "none" : "both";
    }

    /**
     * Get additional text to use to label the control for screen reader users.
     */
    public getAriaDescription(): string {
        return null;
    }

    public getValue<TNever = never>(): any {
        return null;
    }

    public getDropPopup<TDropPopup extends BaseComboDropPopup>(): TDropPopup {
        return <TDropPopup>this._dropPopup;
    }

    public getDataSource<TDataSource extends Controls.BaseDataSource>(): TDataSource {
        return <TDataSource>this._dataSource;
    }

    /**
     * @return 
     */
    public getDropOptions(): any {
        return $.extend({
            combo: this.combo,
            anchor: this.combo.getElement(),
            host: this.combo.getElement(),
            width: this.getDropWidth(),
            dropElementAlign: "left-top",
            dropBaseAlign: "left-bottom",
            dataSource: this._dataSource,
            setTitleOnlyOnOverflow: this._options.setTitleOnlyOnOverflow,
        }, this._options.dropOptions);
    }

    public getDropWidth(): number {
        // get precise inner width of the combo element (excluding borders), as we dont want to include border width while computing drop width
        return this.combo.getElement().innerWidth();
    }

    public showDropPopup(): boolean {
        let dropControlType = this._options.dropControlType, dropOptions;

        if (this._dropPopup) {
            this.hideDropPopup();
        }

        if (dropControlType) {
            dropOptions = this.getDropOptions();

            // Width should be set late because at this point the data source is ready and
            // some of the behaviors need to find max length item in the data source in order
            // to find the min drop width
            dropOptions.width = this.getDropWidth();

            this._attachGlobalEvents();

            this._dropPopup = <BaseComboDropPopup>Controls.BaseControl.createIn(dropControlType, dropOptions.host || $(document.body), dropOptions);

            // Fires the dropShow option in the combo control whenever the dropdown shows
            if (this._options.dropShow) {
                this._options.dropShow(this._dropPopup);
            }

            return true;
        }

        return false;
    }

    public hideDropPopup(): boolean {
        if (this._dropPopup) {
            this._detachGlobalEvents();

            // Fires the dropHide option in the combo control whenever the dropdown hides
            // Dispose if the option doesn't exist, or if the function returns true
            if (!this._options.dropHide || this._options.dropHide(this._dropPopup)) {
                this._dropPopup.dispose();
                this._dropPopup = null;
                return true;
            }
            // Even if we have disposed of it, we still need to set it to null
            this._dropPopup = null;
        }

        return false;
    }

    public toggleDropDown(): void {
        if (this._dropPopup) {
            this.hideDropPopup();
        }
        else {
            this.showDropPopup();
        }
    }

    public isDropVisible(): boolean {
        return Boolean(this._dropPopup);
    }

    public setSource(source) {
        if (this._dataSource) {
            this._dataSource.setSource(source);
        }
    }

    /**
     * @return 
     */
    public getSelectedIndex(): number {
        return -1;
    }

    public setSelectedIndex(selectedIndex, fireEvent) {
    }

    /**
     * @return 
     */
    public getText(): string {

        return this.combo.getInputText();
    }

    /**
     * @param value 
     * @param fireEvent 
     */
    public setText(value: string, fireEvent?: boolean) {
        if (typeof value !== "undefined") {
            this.combo.setInputText(value, fireEvent);
        }
    }

    /**
     * @param e 
     * @return 
     */
    public upKey(e?: JQueryEventObject): any {
        if (e.altKey) {
            if (this.isDropVisible()) {
                this.hideDropPopup();
            }
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public downKey(e?: JQueryEventObject): any {
        if (e.altKey) {
            if (!this.isDropVisible()) {
                this.showDropPopup();
            }
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public pageUpKey(e?: JQueryEventObject): any {
    }

    /**
     * @param e 
     * @return 
     */
    public pageDownKey(e?: JQueryEventObject): any {
    }

    /**
     * @param e 
     * @return 
     */
    public leftKey(e?: JQueryEventObject): any {
    }

    /**
     * @param e 
     * @return 
     */
    public rightKey(e?: JQueryEventObject): any {
    }

    /**
     * @param e 
     * @return 
     */
    public keyDown(e?: JQueryEventObject): any {
    }

    /**
     * @param e 
     * @return 
     */
    public keyPress(e?: JQueryEventObject): any {
    }

    /**
     * @param e 
     * @return 
     */
    public keyUp(e?: JQueryEventObject): any {
    }

    /**
     * @param e 
     * @return 
     */
    public onForceHideDropPopup(e?: JQueryEventObject): any {

        this.hideDropPopup();
    }

    public onParentsScroll(e: JQueryEventObject): any {
        if (e && e.target) {
            const $target = $(e.target);
            // Safari will sometimes fire scroll events for elements that cannot scroll
            // Check to make sure the target is scrollable before closing the dropdown
            if ($target.css("overflow-x") === "hidden" && $target.css("overflow-y") === "hidden" && $target.css("overflow") === "hidden") {
                e.stopPropagation();
                return;
            }
        }

        this.onForceHideDropPopup(e);
    }

    /**
     * Gets the text of the given index based on allItems in datasource. Default behavior returns datasource getItemText
     * Can be overridden by the getItemText option
     * @param index
     * @param all - Search allItems from data source 
     */
    protected getItemText(index: number, all?: boolean): string {
        if ($.isFunction(this._options.getItemText)) {
            return this._options.getItemText(this._dataSource.getItem(index, true));
        }
        else {
            return this._dataSource.getItemText(index, all);
        }
    }

    private _attachGlobalEvents() {
        this.combo._bind(this.combo.getElement().parents(), "scroll resize", this._onParentsScrollDelegate);
        // Edge sometimes leaks scroll events out of the drop popup. Just having this event listener
        // is enough to fix it even though it does nothing. Bug 969813
        this.combo._bind(this.combo.getElement().parents(), "wheel", this._onWheelDelegate);
        Events_Services.getService().attachEvent("dialog-move", this._onForceHideDropPopupDelegate);
    }

    private _detachGlobalEvents() {
        this.combo._unbind(this.combo.getElement().parents(), "scroll resize", this._onForceHideDropPopupDelegate);
        this.combo._unbind(this.combo.getElement().parents(), "wheel", this._onWheelDelegate);
        Events_Services.getService().detachEvent("dialog-move", this._onForceHideDropPopupDelegate);
    }
}

export interface IBaseComboDropPopup {
    /**
     * Returns the selected index of the drop popup. If nothing is selected return -1
     */
    getSelectedIndex(): number;
    getSelectedValue(): string;
    setSelectedValue(value: string): void;
    selectNext(page?: boolean): boolean;
    selectPrev(page?: boolean): boolean;

    /**
     * Updates drop popup rendering based on current data
     */
    update(): void;
    dispose();
}

export class BaseComboDropPopup extends Controls.BaseControl implements IBaseComboDropPopup {

    public combo: Combo;

    constructor(options?) {
        super(options);
        this.combo = <Combo>this._options.combo;
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            coreCssClass: "combo-drop-popup"
        }, options));
    }

    public initialize(): void {
        this._bind("mousedown", delegate(this, this._onMouseDown));
        this.setPosition();

        // set blank title to prevent inheritance of parent's title
        this.getElement().attr("title", "");

        super.initialize();
    }

    public setPosition(): void {
        Utils_UI.Positioning.position(this.getElement(), this._options.anchor, {
            elementAlign: this._options.dropElementAlign,
            baseAlign: this._options.dropBaseAlign
        });
        this.getElement().css("opacity", "1");
    }

    /**
     * Returns selected index of drop popup
     * Base implementation, should be overridden
     */
    public getSelectedIndex(): number {
        return -1;
    }

    public getSelectedValue(): string {
        return "";
    }

    public getSelectedItem(): JQuery {
        return undefined;
    }

    public setSelectedValue(value: string): void {
    }

    public selectNext(page?: boolean): boolean {
        return false;
    }

    public selectPrev(page?: boolean): boolean {
        return false;
    }

    /**
     * Updates drop popup rendering based on current data
     * Base implementation, should be overridden
     */
    public update(): void {
    }

    public dispose(): void {
        if (this.isDisposed()) {
            return;
        }
        const elem = this.getElement();
        if (elem[0] && !elem[0].style.transition) {
            super.dispose();
        } else {
            this.getElement().css("opacity", "0").on("transitionend", () => {
                super.dispose();
            });
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onMouseDown(e: JQueryEventObject): any {
        this.combo.blockBlur();
    }
}

const behaviors = {};

/**
 * @publicapi
 */
export interface IComboOptions {
    /**
     * Id added to the underlying input for accessibility.
     */
    id?: string;

    /**
     * Type of the combo. It can be 'list', 'date-time', 'multi-value', 'tree' or 'treeSearch'.
     * Refer to ComboTypeOptionsConstants for type value.
     * @defaultvalue "list"
     */
    type?: string;

    /**
     * Mode of the combo. It can be 'text' or 'drop'. Used by the combo of 'list' type. Determines whether to show drop icon or not.
     */
    mode?: string;

    /**
     * Sets the initial value for the combo.
     */
    value?: string;

    /**
     * Allows screen readers to read combo value. Should be used along with id.
     */
    label?: string;

    /**
     * Data source of the combo.
     */
    source?: any[];

    /**
     * Determines whether the combo is enabled or not. 
     */
    enabled?: boolean;

    /**
     * Obsolete, this is not being used. 
     */
    dropWidth?: string | number;

    /**
     * Indicates whether or not the dropdown should be able to expand past the input control.
     */
    fixDropWidth?: boolean;

    /**
     * Specifies the max size when auto-expand drop bigger than combo
     */
    maxAutoExpandDropWidth?: number;

    /**
     * Specifies whether the combo can be edited or not. The difference from enabled is items in the dropdown can be selected.
     */
    allowEdit?: boolean;
    noDropButton?: boolean;
    validator?: any;

    /**
     * Extra css class applied to combo.
     */
    cssClass?: string;

    /**
     * Css class for drop icon.
     */
    iconCss?: string;

    /**
     * Css class for the input.
     */
    inputCss?: string;

    /**
     * Css class applied for invalid state.
     */
    invalidCss?: string;

    /**
     * Css class applied for disabled state.
     */
    disabledCss?: string;

    /**
     * Css class applied to drop button when hovered.
     */
    dropButtonHoverCss?: string;

    /**
     * Set to 'true' to disable selecting all text in the combobox when it gets focus from another app
     */
    disableTextSelectOnFocus?: boolean;

    /**
     * Set to 'true' to enable filtering of dropdown items
     */
    enableFilter?: boolean;

    /**
     * Enable or disable autocomplete
     */
    autoComplete?: boolean;

    /**
     * Enable custom compare delegate for filtering and autocomplete behavior
     * if sorted, needs to implement -1 textInput for lower value, 0 for matching, 1 for greater value
     * if not sorted, can return 0 for matching and not zero (-1 or 1) for not matching.
     * Parameter matchPartial determines if the input text is to be compared with full or part of the item text
     */
    compareInputToItem?: (item: any, textInput: string, matchPartial?: boolean) => number;

    /**
     * Override getItemText from datasource in combos
     */
    getItemText?: (item: any) => string;

    /**
     * Called when the text of the combo changes.
     */
    change?: () => any;
    focus?: (e: JQueryEventObject) => any;
    blur?: (e: JQueryEventObject) => any;

    /**
     * Called when selected item changes. Argument is the index of the selected item.
     */
    indexChanged?: (index: number) => void;
    onKeyDown?: (e: JQueryEventObject) => any;

    /**
     * Options passed to the ComboDropPopup
     */
    dropOptions?: IComboDropOptions;

    /**
     * Placeholder text shown on input.
     */
    placeholderText?: string;

     /**
     * Called when the drop popup shows.
     */
    dropShow?: (dropPopup: BaseComboDropPopup) => void;

    /**
     * Called when the drop popup hides.
     * Return true to close drop popup.
     */
    dropHide?: (dropPopup: BaseComboDropPopup) => boolean;

    /**
     * Error message for accessibility purpose, i.e. for screen reader to recognize the error message
     */
    errorMessage?: string;

    /**
     * Obsolete. No effect.
     */
    setTitleOnlyOnOverflow?: boolean;


    /**
    * Aria attributes
    */
    ariaAttributes?: Controls.AriaAttributes;
    
    isFocusableWhenDisabled?: boolean;
}

/**
* Constant for Combo type options
*/
export module ComboTypeOptionsConstants {
    /**
    * list type
    */
    export let ListType = "list";
    /**
    * date time type
    */
    export let DateTimeType = "date-time";
    /**
    * multi value type
    */
    export let MultiValueType = "multi-value";
    /**
    * tree type
    */
    export let TreeType = "tree";
    /**
    * tree search type
    */
    export let TreeSearchType = "treesearch";
}

export interface IComboDropOptions {
    /**
     * Parent combo behavior. Gives access to behavior public functions to drop popup
     */
    combo?: BaseComboBehavior;

    /**
     * Element that drop popup will be anchored to for display
     */
    anchor?: JQuery;

    /**
     * Used for position of the drop popup in relation to the anchor. (eg. "right-top", "right-bottom")
     */
    dropElementAlign?: string;
    dropBaseAlign?: string;

    /**
     * Element that drop popup will be created in
     */
    host?: JQuery;

    /**
     * Width of the drop popup 
     */
    width?: number;

    /**
     * Datasource of drop popup items
     */
    dataSource?: Controls.BaseDataSource;

    /**
     * Initial selected index of drop popup
     */
    selectedIndex?: number;

    /**
     * Delegate for on selection. Invoked with .call(this, selectedIndex, accept)
     * selectedIndex - selected index of drop popup
     * accept - When set to true user has clicked and selected an item
     */
    selectionChange?: (selectedIndex: number, accept: any) => void;

    /**
     * Max number of rows to appear in the drop down
     */
    maxRowCount?: number;

    /**
     * CSS to apply to drop popup items
     */
    itemCss?: string;

    /**
     * Delegate for on click event
     */
    itemClick?: (e?: JQueryEventObject, itemIndex?: number, $target?: JQuery, $li?: JQuery) => void;

    /**
     * Render a drop popup item, return value will be appended to drop popup li item
     */
    getItemContents?: (item: string) => any;

    /**
     * Only set the HTML title attribute if the contents overflow the visible area.
     */
    setTitleOnlyOnOverflow?: boolean;

    /**
     * DEPRECATED - Alternate renderer for a drop popup item
     */
    createItem?: (index: any) => JQuery;
}

/**
 * @publicapi
 */
export class ComboO<TOptions extends IComboOptions> extends Controls.Control<TOptions> {
    public static invalidAttribute = "aria-invalid";
    public static enhancementTypeName: string = "tfs.combo";
    public static registerBehavior(behaviorMode, behaviorType) {
        behaviors[behaviorMode] = behaviorType;
    }

    public static attachBehavior(combo, options?) {
        let behaviorType = behaviors[combo._options.type];

        if (combo._options.type) {
            behaviorType = behaviors[combo._options.type];
        }
        else {
            behaviorType = BaseComboBehavior;
        }

        if (behaviorType) {
            return new behaviorType(combo, options);
        }
        else {
            return null;
        }
    }

    public focus() {
        this._input.focus();
    }

    protected _input: JQuery;
    protected _currentText = "";
    protected _blockBlur: boolean;

    private _dropButton: JQuery;
    private _behavior: BaseComboBehavior;

    private _ariaDescription: JQuery;
    private _errorAriaDescription: JQuery;
    private _tooltip: Controls_PopupContent.RichContentTooltip;

    // Added to prevent stack overflow when a modal dialog is open
    private _onInputFocusInProgress: boolean;

    /**
     * @param options 
     */
    public initializeOptions(options?: any): void {
        options = $.extend({
            allowEdit: true,
            type: "list",
            treeLevel: 1,
            mode: "drop", // text, drop, delayed-drop
            dropWidth: "dynamic", // dynamic, fixed
            dropCount: 8,
            invalidCss: "invalid",
            disabledCss: "disabled",
            dropButtonHoverCss: "hover",
            inputCss: undefined,
            coreCssClass: "combo input-text-box", // adding the input-text-box class to specify use of bowtie styles
            enabled: true,
        }, options);

        const oldDropHide: (dropPopup: BaseComboDropPopup) => boolean = options.dropHide;
        options.dropHide = (dropPopup: BaseComboDropPopup) => {
            let closing = true;
            if (oldDropHide) {
                closing = oldDropHide(dropPopup);
            }
            if (closing) {
                this.updateAriaAttributes(false);
                Utils_Core.delay(this, 1, this._updateTooltip);
            }

            return closing;
        }

        const oldDropShow: (dropPopup: BaseComboDropPopup) => void = options.dropShow;
        options.dropShow = (dropPopup: BaseComboDropPopup) => {
            if (oldDropShow) {
                oldDropShow(dropPopup);
            }
            Utils_Core.delay(this, 1, this._updateTooltip);
            this.updateAriaAttributes(true);
        }

        super.initializeOptions(options);
    }

    public _dispose(): void {
        this._disposeBehavior();
        super._dispose();
    }

    private _disposeBehavior(): void {
        if (this._behavior) {
            if (typeof (this._behavior.dispose) === "function") {
                this._behavior.dispose();
            }

            this._behavior = null;
        }
    }

    public _createIn(container): void {
        super._createIn(container);
        this._input = $(domElem("input")).attr("type", "text");
        if (this._options.id) {
            this._input.attr("id", this._options.id + "_txt");
        }

        if (typeof this._options.value !== "undefined") {
            this._input.val(this._options.value);
            this._currentText = this.getInputText();
        }

        this._decorate();
    }

    /**
     * @param element 
     */
    public _enhance(element: JQuery): void {

        this._createElement();
        this._input = element;

        // With JQuery 1.8.3, we override the $.after() method in jquery-fixes.js
        element.after(this.getElement());

        this._decorate(); //this will reparent our element
        this._currentText = this.getInputText();
    }

    public initialize(): void {
        this._ensureBehavior();
        super.initialize();
    }

    public getBehavior<TBehavior extends BaseComboBehavior>(): TBehavior {
        return <TBehavior>this._behavior;
    }

    /**
     * Gets the current text value of the combo.
    
     * @returns {string}
     * @publicapi 
     */
    public getText(): string {
        return this._behavior.getText();
    }

    /**
     * Sets the text of the combo.
     *
     * @param text New value to set.
     * @param fireEvent Determines whether to fire change event or not (default false).
     * @publicapi 
     */
    public setText(text: string, fireEvent?: boolean): void {
        if (this._behavior) {
            this._behavior.setText(text, fireEvent);
        }
    }

    public getDropButton(): JQuery {
        return this._dropButton;
    }

    /**
     * Gets the input element of combo
     * 
     * @return 
     */
    public getInput(): JQuery {
        return this._input;
    }

    public getInputText(): string {
        return this._input.val();
    }

    private _updateTooltip() {
        // only enable tooltip when the contents overflow and the drop popup is not visible
        if (this._input && this._input[0] && !(this._behavior && this._behavior.isDropVisible())) {
            if (!this._tooltip) {
                this._tooltip = Controls_PopupContent.RichContentTooltip.addIfOverflow("", this._input[0]);
            }
            this._tooltip.enable();
            this._tooltip.setTextContent((<HTMLInputElement>this._input[0]).value);
        }
        else if (this._tooltip) {
            this._tooltip.disable();
        }
    }

    public setInputText(text: string, fireEvent?: boolean) {

        // To prevent moving the cursor at end of line in chrome, we just need to check if input.val == curVal
        if (this._input.val() !== text) {
            this._input.val(text);
        }

        // Updating tooltip
        this._updateTooltip();

        if (fireEvent) {
            this.fireChangeIfNecessary(text);
        }
        else {
            this._currentText = text;
        }

        this.updateAriaActiveDescendant();
        this._updateStyles();
    }

    /**
     * @return 
     */
    public getSelectedIndex(): number {
        return this._behavior.getSelectedIndex();
    }

    public setSelectedIndex(selectedIndex: number, fireEvent?: boolean): void {
        this._behavior.setSelectedIndex(selectedIndex, fireEvent);
    }

    /**
     * Gets the underlying value of the combo. If the type is 'list', value is string. If the type is 'date-time', value is Date. If the type is 'multi-value', value is string[].
     * 
     * @returns {<TValue>}
     * @publicapi 
     */
    public getValue<TValue>(): TValue {
        return this._behavior.getValue();
    }

    /**
     * @param newValue 
     */
    public fireChangeIfNecessary(newValue?: string): any {

        if (typeof newValue === "undefined") {
            newValue = this.getText();
        }

        if (this._currentText !== newValue) {
            // Setting new text
            this._currentText = newValue;

            // Updating tooltip
            this._updateTooltip();

            return this._fireChange();
        }
    }

    /**
     * Programmatically toggles the dropdown.
     * @publicapi
     */
    public toggleDropDown(): void {
        this._behavior.toggleDropDown();

        // Setting the focus to the input to accept the keys
        this._input.focus();

        const element = this.getElement();

        if (element) {
            this._fire('dropDownToggled', {
                isDropVisible: this.isDropVisible(),
                target: element
            });
        }
    }

    /**
     * @param e 
     * @return 
     */
    public showDropPopup(e?: JQueryEventObject): void {
        this._behavior.showDropPopup();

        // Setting the focus to the input to accept the keys
        this._input.focus();
    }

    public hideDropPopup(): any {
        const result = this._behavior.hideDropPopup();

        return result;
    }

    public isDropVisible(): boolean {
        return this._behavior ? this._behavior.isDropVisible() : false;
    }

    public isBlockingBlur(): boolean {
        return this._blockBlur;
    }

    public blockBlur(): void {
        this._blockBlur = true;
        this.delayExecute("blockBlur", 200, true, function () {
            this.cancelBlockBlur();
        });
    }

    public cancelBlockBlur(): void {
        this._blockBlur = false;
        this.cancelDelayedFunction("blockBlur");
    }

    /**
     * @param e 
     * @return 
     */
    public _onInputKeyDown(e?: JQueryEventObject): any {

        if (this._options.onKeyDown) {
            this._options.onKeyDown.call(this, e);
        }

        if (this._behavior.keyDown(e) === false) {
            return false;
        }

        switch (e.keyCode) {
            // This is for non editable combo specific to IE.
            // preventing navigating to back page if backspace is pressed on non-editable combo
            case keyCode.BACKSPACE:
                if (!this._options.allowEdit) {
                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                }
                break;
            case keyCode.PAGE_UP:
                return this._options.enabled ? this._behavior.pageUpKey(e) : false;
            case keyCode.UP:
                return this._options.enabled ? this._behavior.upKey(e) : false;
            case keyCode.PAGE_DOWN:
                return this._options.enabled ? this._behavior.pageDownKey(e) : false;
            case keyCode.DOWN:
                return this._options.enabled ? this._behavior.downKey(e) : false;
            case keyCode.LEFT:
                return this._options.enabled ? this._behavior.leftKey(e) : false;
            case keyCode.RIGHT:
                return this._options.enabled ? this._behavior.rightKey(e) : false;
            case keyCode.TAB:
                this.cancelBlockBlur();
                break;
            case keyCode.ENTER:
            case keyCode.ESCAPE:
                this.fireChangeIfNecessary();
                if (this.hideDropPopup()) {
                    return false;
                }
                break;
            default:
                if (!this._behavior.canType()) {
                    return false;
                }
                break;
        }
    }

    public setTextSelection(selectionStart: number): void {
        const input = <HTMLInputElement>this._input[0];
        if (input.setSelectionRange) {
            input.setSelectionRange(selectionStart, input.value.length);
        }
        else if ((<any>input).createTextRange) {
            const range = (<any>input).createTextRange();
            range.moveStart("character", selectionStart);
            range.select();
        }
    }

    /**
     * Sets a new source for the combo.
     *
     * @param source New source for the combo.
     * @publicapi 
     */
    public setSource(source: any[] | Function): void {
        // Component might have disposed due to some aync operation. 
        // Check the existence of the behavior first.
        if (this._behavior) {
            this._behavior.setSource(source);
        }
    }

    /**
     * Gets the enabled state of the combo.
     *
     * @returns {boolean}
     * @publicapi 
     */
    public getEnabled(): boolean {
        return this._options.enabled === true;
    }

    /**
     * Sets the enabled state of the combo.
     *
     * @param value True for enabled, false for disabled.
     * @publicapi 
     */
    public setEnabled(value: boolean): void {
        this._options.enabled = value === true;
        this._updateStyles();
    }

    /**
     * Gets the mode of the combo.
     *
     * @returns {string}
     * @publicapi 
     */
    public getMode(): string {
        return this._options.mode;
    }

    /**
     * Sets the mode of the combo.
     *
     * @param value 'drop' or 'text'.
     * @publicapi 
     */
    public setMode(value: string): void {
        this._options.mode = value;
        this._behavior.setMode(value);
        this._updateStyles();
    }

    /**
     * Sets the type of the combo.
     *
     * @param value 'list', 'date-time', 'multi-value', TreeView.ComboTreeBehaviorName or TreeView.SearchComboTreeBehaviorName.
     * @publicapi 
     */
    public setType(type: string): void {
        if (this._options.type !== type) {
            this.hideDropPopup();

            this.getElement().removeClass(this._options.type);
            this._options.type = type;
            this._ensureBehavior();
            this._updateStyles();
        }
    }

    /**
     * Gets the type of the combo.
     *
     * @returns {string}
     * @publicapi 
     */
    public getComboType(): string {
        return this._options ? this._options.type : null;
    }

    /**
     * Sets the invalid state of the combo.
     *
     * @param value True for invalid, false for valid.
     * @publicapi 
     */
    public setInvalid(value: boolean): void {
        this.getElement().toggleClass(this._options.invalidCss, value);
        this._input.attr(ComboO.invalidAttribute, value ? "true" : "false");
        if (this._options.errorMessage) {
            if (this._errorAriaDescription) {
                this._errorAriaDescription.remove();
            }

            if (value) {
                const id = String(Controls.getId());
                this._errorAriaDescription = $("<div />")
                    .attr("id", id)
                    .attr("role", "alert")
                    .hide()
                    .text(this._options.errorMessage)
                    .appendTo(this._element);
                this._input.attr("aria-describedby", id);
            }
        }
    }

    /**
     * Return true if the combo is in valid state. Otherwise return false.
     */
    public isValid(): Boolean {
        return Utils_String.ignoreCaseComparer(this._input.attr(ComboO.invalidAttribute), "true") !== 0;
    }

    private _ensureBehavior(): void {
        // Dispose existing behavior first
        this._disposeBehavior();

        // Attach new behavior
        this._behavior = Combo.attachBehavior(this, this._options);

        if (!this._behavior) {
            throw new Error(Utils_String.format("Unsupported combo behavior '{0}'.", this._options.type));
        }

        this._behavior.initialize();

        const description = this._behavior.getAriaDescription();
        if (description) {
            if (this._ariaDescription) {
                this._ariaDescription.remove();
            }
            const id = String(Controls.getId());
            this._ariaDescription = $("<div />")
                .attr("id", id)
                .hide()
                .text(description)
                .appendTo(this._element);
            this._input.attr("aria-describedby", id);
        }
        else {
            this._input.attr("aria-describedby", null);
        }

        this._input.attr("aria-autocomplete", this._options.mode != "text" ? this._behavior.getAriaAutocomplete() : null);
    }

    private _decorate(): void {
        let that = this,
            options = this._options,
            $element = this.getElement(),
            $input = this._input, $inputWrap;

        (<any>$element).val = function (): any {
            if (!arguments.length) {
                return that.getText();
            }
            else {
                return that.setText(arguments[0], false);
            }
        };

        $input.attr("autocomplete", "off");

        this._setAriaAttributes();

        this._bind("mousedown", delegate(this, this._onMouseDown));
        this._bind($input, "keydown", delegate(this, this._onInputKeyDown));
        this._bind($input, "keypress", delegate(this, this._onInputKeyPress));
        this._bind($input, "keyup", delegate(this, this._onInputKeyUp));
        this._bind($input, "focus", delegate(this, this._onInputFocus));
        this._bind($input, "blur", delegate(this, this._onInputBlur));
        this._bind($input, "click", delegate(this, this._onInputClick));

        // Bowtie class - remove these when this functionality is no longer control-specific
        this._bind($input, "focus", () => {
            // Enable focus style one when the control is enabled
            if (this.getEnabled()) {
                $element.addClass("focus");
            }
        });

        // Bowtie class - remove these when this functionality is no longer control-specific
        this._bind($input, "blur", () => {
            $element.removeClass("focus");
        });

        if (!options.allowEdit) {
            $input.attr("readonly", "readonly");
            $element.addClass("no-edit");
        }

        if (options.inputCss) {
            $input.addClass(options.inputCss);
        }

        if (options.placeholderText) {
            $input.attr("placeholder", options.placeholderText);
        }

        $input.bind("change input", function () {
            return that.fireChangeIfNecessary();
        });

        this._input.attr("title", ""); // set blank title to prevent inheritance of parent's title
        this._updateTooltip();

        if (options.noDropButton) {
            $element.addClass("no-background");
        }

        $inputWrap = $(domElem("div", "wrap"));
        $inputWrap.append($input);
        if (this._options.label) {
            // add aria-label attribute for screen readers use
            $input.attr("aria-label", this._options.label);
        }

        if (options.iconCss) {
            $(domElem("div", "preWrapIcon")).addClass(options.iconCss).appendTo($element);
            $inputWrap.addClass("withIcon");
        }

        $element.append($inputWrap);

        this._dropButton = $(domElem("div", "drop"));
        this._dropButton.attr({
            role: "button"
        });
        this._bind(this._dropButton, "mouseenter", function (e) { $(this).addClass(options.dropButtonHoverCss); });
        this._bind(this._dropButton, "mouseleave", function (e) { $(this).removeClass(options.dropButtonHoverCss); });
        this._bind(this._dropButton, "click", delegate(this, this._onDropButtonClick));

        $element.append(this._dropButton);

        this._updateStyles();
    }

    protected _setAriaAttributes() {
        // default is to set it on this._element, but we want it on the input element.
        if (this._input) {
            // input might not be created yet, we'll call this function again later
            super._setAriaAttributes(this._input);
        }
    }

    private _updateStyles(): void {
        const $element = this.getElement();
        const $input = this._input;

        $element.addClass(this._options.type);

        this._dropButton.removeClass(Utils_String.localeIgnoreCaseComparer(this._options.type, "date-time") === 0 ? "bowtie-icon bowtie-chevron-down-light" : "bowtie-icon bowtie-calendar");
        this._dropButton.addClass(Utils_String.localeIgnoreCaseComparer(this._options.type, "date-time") === 0 ? "bowtie-icon bowtie-calendar" : "bowtie-icon bowtie-chevron-down-light");
        this._dropButton.attr("aria-label", Utils_String.localeIgnoreCaseComparer(this._options.type, "date-time") === 0 ? Resources_Platform.CalendarComboExpandButtonLabel : Resources_Platform.ComboExpandButtonLabel);

        const enabled = this._options.enabled;
        // Enabling/disabling input according to the config.
        // Use the 'readonly' attribute (with disabled style) instead of the disabled attribute here
        // so that the text can be selected and due to an Chrome and firefox issues with selecting text in disabled
        // input controls (similar to IE9 issue, see vstspioneer Bug 803369)
        if (enabled && this._options.allowEdit) {
            $input.removeAttr("readonly");
        }
        else {
            $input.attr("readonly", "readonly");
        }

        $input.toggleClass(this._options.disabledCss, !enabled);
        // Apply the same css class to the parent div so that they look the same
        $element.children("div").toggleClass(this._options.disabledCss, !enabled);

        // This is needed at the combo container level to apply correct bowtie styling
        if (enabled) {
            $element.removeAttr("readonly");
            $input.removeAttr("disabled");  // remove attribute disabled when enabled

            if (!this._options.isFocusableWhenDisabled ) {
                $input.removeAttr("tabindex");
                $input.removeAttr("aria-disabled");
            }
        }
        else {
            // for current combo box which is disabled if the field is empty and readonly then change attribute to disabled
            // this change is because of accessibility bug 1212018 under agile\witz
            if (this._currentText === "") 
            {
                $input.removeAttr("readonly");
                $input.attr("disabled", "disabled");
            }
            else
            {
                $input.removeAttr("disabled");
                $input.attr("readonly", "readonly");
            }

            $element.attr("readonly", "readonly");
            if (!this._options.isFocusableWhenDisabled ) { // remove disabled comboboxes from the taborder if they are meant to be ignored
                $input.attr({ tabindex: -1, "aria-disabled": true }); 
            }
        }

        // Hiding/showing dropbutton according to the mode
        const dropAvailable = enabled && (this._options.mode === "drop");
        $element.toggleClass("drop", dropAvailable && !this._options.noDropButton);
        $element.toggleClass("text", !dropAvailable);

        if (this._options.mode === "text") {
            this._input.attr({
                "aria-autocomplete": null,
                "aria-expanded": null,
                "role": null,
            });
        }
        else {
            this._input.attr({
                "aria-expanded": "false"
            });

            if (this._input.attr("role") !== "combobox") {
                this._input.attr({
                    "role": "combobox"
                });
            }

            if (this._behavior) {
                this._input.attr("aria-autocomplete", this._behavior.getAriaAutocomplete());
            }
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onDropButtonClick(e?: JQueryEventObject): any {

        this.toggleDropDown();
        return false;
    }

    /**
     * @param e 
     * @return 
     */
    protected _onInputClick(e?: JQueryEventObject): any {

        if (!this._options.allowEdit && this._options.enabled) {
            this.toggleDropDown();
        }

        return false;
    }

    /**
     * @param e 
     * @return 
     */
    protected _onInputFocus(e?: JQueryEventObject): any {
        if (!this._onInputFocusInProgress) {
            try {
                this._onInputFocusInProgress = true;

                if (!this._blockBlur && !this._options.disableTextSelectOnFocus) {
                    this._input.select();
                }

                if ($.isFunction(this._options.focus)) {
                    this._options.focus.apply(this, arguments);
                }
            }
            finally {
                this._onInputFocusInProgress = false;
            }
        }
    }

    /**
     * @param e 
     * @return 
     */
    protected _onInputBlur(e?: JQueryEventObject): any {

        if (!this._disposed) {
            this.fireChangeIfNecessary();
            if (this._blockBlur) {
                this._input.focus(10);
            }
            else {
                this.hideDropPopup();
            }

            if ($.isFunction(this._options.blur)) {
                this._options.blur.apply(this, arguments);
            }
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onMouseDown(e?: JQueryEventObject): any {

        this.blockBlur();
    }

    /**
     * @param e 
     * @return 
     */
    private _onInputKeyPress(e?: JQueryEventObject): any {

        return this._behavior.keyPress(e);
    }

    /**
     * @param e 
     * @return 
     */
    private _onInputKeyUp(e?: JQueryEventObject): any {

        const result = this._behavior.keyUp(e);
        this.fireChangeIfNecessary();

        const popup = this._behavior && this._behavior.getDropPopup();
        if (popup) {
            popup.setPosition();
        }

        return result;
    }

    public updateAriaAttributes(isDropVisible = this.isDropVisible()) {
        if (isDropVisible) {
            const popup = this._behavior.getDropPopup();

            this._input.attr({
                "aria-expanded": "true",
                "aria-owns": popup ? popup.getId() : null,
            });

            this.updateAriaActiveDescendant();
        }
        else {
            this._input.attr({
                "aria-expanded": "false",
                "aria-owns": null,
                "aria-activedescendant": null,
            });
        }
    }

    public updateAriaActiveDescendant() {
        const popup = this._behavior.getDropPopup();
        const selectedItem = popup && popup.getSelectedItem();

        this._input.attr("aria-activedescendant", selectedItem ? selectedItem.attr("id") : null);
    }
}
export class Combo extends ComboO<IComboOptions> { }

Controls.Enhancement.registerJQueryWidget(Combo, "comboList", { type: "list" })
Controls.Enhancement.registerJQueryWidget(Combo, "comboTree", { type: "tree" })

export class ComboListDropPopup extends BaseComboDropPopup {

    public virtualizingListView: Virtualization.VirtualizingListView;
    protected _dataSource: Controls.BaseDataSource;

    /**
     * @param options 
     */
    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            itemCss: ""
        }, options));
    }

    public initialize(): void {
        this._dataSource = this._options.dataSource;
        this._initializeVirtualization();
        super.initialize();
    }

    protected _initializeVirtualization() {
        let options =  $.extend(extendWithout(this._options, ["coreCssClass"]), {
            maxRowCount: this._options.dropCount,
            itemsUpdated: () => {
                this.combo.updateAriaAttributes();
            },
        });
        // Copy aria-label from combobox to dropdown (to be read by Narrator once it is opened)
        const comboAriaAttributes = this._options.combo._enhancementOptions.ariaAttributes;
        if (comboAriaAttributes && comboAriaAttributes.label) {
            if (!options.ariaAttributes) {
                options.ariaAttributes = {};
            }
            options.ariaAttributes.label = comboAriaAttributes.label;
        }
        this.virtualizingListView = <Virtualization.VirtualizingListView>Controls.Enhancement.enhance(
            Virtualization.VirtualizingListView,
            this.getElement(),
            options
        );
    }

    /**
     * @param page 
     * @return 
     */
    public selectPrev(page?: boolean): boolean {
        return this.virtualizingListView.selectPrev(page);
    }

    /**
     * @param page 
     * @return 
     */
    public selectNext(page?: boolean): boolean {
        return this.virtualizingListView.selectNext(page);
    }

    /**
     * Returns selected index of internal list view
     * @return 
     */
    public getSelectedIndex(): number {
        return this.virtualizingListView.getSelectedIndex();
    }

    public getSelectedValue(): string {
        return this._dataSource.getItemText(this.virtualizingListView.getSelectedIndex());
    }

    public setSelectedValue(value): void {
        const selectedIndex = value ? this._dataSource.getItemIndex(value) : -1;
        this.virtualizingListView.setSelectedIndex(selectedIndex);
    }

    public getSelectedItem() {
        return this.virtualizingListView.getSelectedItem();
    }

    public getDataSource<TDataSource extends Controls.BaseDataSource>(): TDataSource {
        return <TDataSource>this._dataSource;
    }

    /**
     * Update internal list view to display current data
     */
    public update(): void {
        this.virtualizingListView.update();
    }
}

export class ComboListBehavior extends BaseComboBehavior {

    private _enableAutoFill: boolean;
    protected _maxItemLength: number;

    constructor(combo, options?) {
        super(combo, $.extend({
            dropControlType: ComboListDropPopup
        }, options));
    }

    public initialize(): void {
        this._dataSource = this._createDataSource();
        super.initialize();
    }

    public setSource(source): void {
        super.setSource(source);
        this._maxItemLength = null;
    }

    public getDropOptions(): any {
        return $.extend(super.getDropOptions(), {
            selectedIndex: this._dataSource.getItemIndex(this.combo.getText()),
            selectionChange: delegate(this, this._dropSelectionChanged)
        });
    }

    public getValue<TNever>(): any {
        return this.getText();
    }

    /**
     * Finds the max item length inside the data source
     */
    public getMaxItemLength(): number {
        if (this._maxItemLength === null) {
            const itemCount = this._dataSource.getCount(true);
            let text: string;
            let maxItemLength = 0;
            for (let i = 0; i < itemCount; i++) {
                text = this.getItemText(i, true);
                maxItemLength = Math.max(text.length, maxItemLength);
            }
            this._maxItemLength = maxItemLength;
        }

        return this._maxItemLength;
    }

    /**
     * Gets the drop width of this behavior
     */
    public getDropWidth(): number {
        const defaultWidth = super.getDropWidth();

        // If we are fixing the drop width, just return the default width
        if (this._options.fixDropWidth) {
            return defaultWidth;
        }

        // Calculating the suggested width
        let desiredMinWidth = this.getMaxItemLength() * Measurement.getUnitEx();

        // Increasing the width by 20% just in case
        desiredMinWidth *= 1.2;

        let width: number;

        if (this._options.maxAutoExpandDropWidth != null && desiredMinWidth > defaultWidth) {
            // We are auto-expanding drop wider than combo, make sure we comply with max width setting to ensure it not growing too wide. 
            width = Math.min(Math.max(this._options.maxAutoExpandDropWidth, defaultWidth), desiredMinWidth);
        }
        else {
            width = Math.max(defaultWidth, desiredMinWidth);
        }

        return width;
    }

    /**
     * @param value 
     * @return 
     */
    public getSelectedIndex(value?: string, all?: any): number {
        return this._dataSource.getItemIndex(value || this.getText(), false, all);
    }

    public setSelectedIndex(selectedIndex: number, fireEvent?: boolean): void {
        this._setSelectedIndex(selectedIndex, fireEvent);
    }

    /**
     * @param value 
     * @param fireEvent 
     */
    public setText(value: string, fireEvent?: boolean): void {

        const changed: boolean = value !== this.getText();
        const dropPopup = this.getDropPopup();

        super.setText(value, fireEvent);

        if (fireEvent && changed) {
            if (this._options.indexChanged) {
                this._options.indexChanged.call(this, this.getSelectedIndex(value, true));
            }
        }

        if (dropPopup && changed) {
            dropPopup.update();
        }
    }

    /**
     * @param e 
     * @return 
     */
    public upKey(e?: JQueryEventObject): any {

        if (this._options.mode !== "text") {
            if (super.upKey(e) === false) {
                return false;
            }

            return this.selectPrev();
        }
    }

    /**
     * @param e 
     * @return 
     */
    public downKey(e?: JQueryEventObject): any {

        if (this._options.mode !== "text") {
            if (super.downKey(e) === false) {
                return false;
            }

            return this.selectNext();
        }
    }

    /**
     * @param e 
     * @return 
     */
    public pageUpKey(e?: JQueryEventObject): any {

        if (this._options.mode !== "text") {
            if (super.pageUpKey(e) === false) {
                return false;
            }

            return this.selectPrev(true);
        }
    }

    /**
     * @param e 
     * @return 
     */
    public pageDownKey(e?: JQueryEventObject): any {

        if (this._options.mode !== "text") {
            if (super.pageDownKey(e) === false) {
                return false;
            }

            return this.selectNext(true);
        }
    }

    /**
     * @param e 
     * @return 
     */
    public keyDown(e?: JQueryEventObject): any {

        if (this._options.mode !== "text") {
            if (e.keyCode === 229) { //IME enabled
                this._enableAutoFill = false;
            }
            else if (e.ctrlKey && (e.keyCode === 89 || e.keyCode === 90)) { //CTRL + Z or CTRL + Y disable undo/redo
                return false;
            }
        }
    }

    /**
     * @param e 
     * @return 
     */
    public keyPress(e?: JQueryEventObject): any {

        if (this._options.mode !== "text") {
            // safari fires keyPress on command+key, we don't want to handle any command+key actions
            // since they're similar to cntrl+key actions, and other browsers do not fire keyPress for cntrl+key
            if (!e.metaKey) {
                // default behavior for autofill
                if (typeof this._options.autoComplete === 'undefined') {
                    this._enableAutoFill = true;
                }
                else {// If there is an option specified, used that value
                    this._enableAutoFill = this._options.autoComplete;
                }
            }

            return true;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public keyUp(e?: JQueryEventObject): any {

        let key;

        if (this._options.mode !== "text") {
            key = e.keyCode || e.charCode;

            if (this._options.enableFilter === true) {
                if (key >= 47 || key === keyCode.SPACE || key === keyCode.BACKSPACE || key === keyCode.DELETE) {
                    this._applyFilter();
                }
            }

            if (this._enableAutoFill) {
                if (key >= 47 || key === keyCode.SPACE) {
                    this._tryAutoFill();
                }

                this._enableAutoFill = false;
            }

            if (this._options.keyUp) {
                this._options.keyUp.call(this);
            }

            return true;
        }
    }

    /**
     * @param page 
     * @return 
     */
    public selectPrev(page?: boolean): boolean {
        const dropPopup = this.getDropPopup();
        if (dropPopup) {
            if (dropPopup.selectPrev(page)) {
                return false;
            }
        }
        else if (!page) {
            const selectedIndex = this._dataSource.nextIndex(this.getSelectedIndex(null, true), -1, true);
            if (selectedIndex >= 0) {
                // set selected index and fire event that it changed
                this._setSelectedIndex(selectedIndex, true);
                return false;
            }
        }
    }

    /**
     * @param page 
     * @return 
     */
    public selectNext(page?: boolean): any {
        const dropPopup = this.getDropPopup();
        if (dropPopup) {
            if (dropPopup.selectNext(page)) {
                return false;
            }
        }
        else if (!page) {
            const selectedIndex = this._dataSource.nextIndex(this.getSelectedIndex(null, true), 1, true);
            if (selectedIndex >= 0) {
                // set selected index and fire event that it changed
                this._setSelectedIndex(selectedIndex, true);
                return false;
            }
        }
    }

    public _createDataSource(): Controls.BaseDataSource {
        return new ListDataSource(this._options);
    }

    /**
     * Called on drop selection changed
     * @param selectedIndex - Represents index in datasource._items
     * @param accept - User has performed a click action 
     */
    public _dropSelectionChanged(selectedIndex, accept) {
        this.setText(this.getItemText(selectedIndex, false), true);

        if (accept) {
            this.hideDropPopup();
        }
    }

    /**
     * Set selected index
     * 
     * @param selectedIndex new selected index
     * @param fireEvent flag to whether to fire index changed
     */
    protected _setSelectedIndex(selectedIndex: number, fireEvent?: boolean) {
        this.setText(this.getItemText(selectedIndex, true), fireEvent);
    }

    private _tryAutoFill() {
        Diag.logTracePoint("Combo._tryAutoFill.start");

        let itemText: string;
        const currentText = this.combo.getText();
        const index = this._dataSource.getItemIndex(currentText, true, true);

        // Selecting text if the input text matches any value
        if (index >= 0) {
            itemText = this.getItemText(index, true);
        }

        if (itemText) {
            this.combo.setText(itemText, true);
            this.combo.setTextSelection(currentText.length);
        }

        const dropPopup = this.getDropPopup();
        if (dropPopup) {
            dropPopup.setSelectedValue(itemText);
        }

        Diag.logTracePoint("Combo._tryAutoFill.complete");
    }

    /**
     * Limit what is shown in the dropdown based on text entry in combobox
     */
    private _applyFilter(): void {
        Diag.logTracePoint("Combo._applyFilter.start");

        this._filterData(this.combo.getText());

        const dropPopup = this.getDropPopup();
        if (dropPopup) {
            dropPopup.update();
        }

        Diag.logTracePoint("Combo._applyFilter.complete");
    }

    protected _filterData(inputText: string) {
        if (inputText) {
            const indexes = this._dataSource.getItemIndexes(inputText, true, true);
            const visibleItems = indexes.map(idx => this._dataSource.getItem(idx, true));
            this._dataSource.setItems(visibleItems, this._dataSource.getItems(true));
        }
        else {
            // no search text, reset to all items
            this._dataSource.setItems(this._dataSource.getItems(true));
        }
    }
}

Combo.registerBehavior("list", ComboListBehavior);

export class ComboControlValidator extends Validation.BaseValidator<Validation.BaseValidatorOptions> {
    /**
     * @param options 
     */
    public initializeOptions(options?: any): void {

        super.initializeOptions($.extend({
            message: "Input value is not allowed!"
        }, options));
    }

    /**
     * @return 
     */
    public isValid(): boolean {
        let text = $.trim(this.getValue()), combo;
        if (text) {
            combo = <Combo>Controls.Enhancement.getInstance(Combo, this.getElement());
            if (combo) {
                return combo.getSelectedIndex() >= 0;
            }
        }

        return true;
    }
}

export interface IDateTimeComboOptions extends IComboOptions {
    dateTimeFormat?: string;
    defaultTimeOfDay?: number;
}

class CalendarDate {

    public static DAY_IN_MILLISECONDS: number = 86400000;
    public static DAYS_IN_A_WEEK: number = 7;

    /**
     * Creates a date object using the specified date parts by trying to use current culture's
     * calendar converter.
     */
    public static toGregorian(year, month, day) {
        const convert = Culture.getDateTimeFormat().Calendar.convert;
        if (convert) {
            return convert.toGregorian(year, month, day);
        }
        return new Date(year, month, day);
    }

    /**
     * Creates a converted date using the specified gregorian date by trying to use current
     * culture's calendar converter.
     */
    public static fromGregorian(date) {
        const convert = Culture.getDateTimeFormat().Calendar.convert;
        if (convert) {
            return convert.fromGregorian(date);
        }
    }

    private _baseDate: Date;
    private _convertedDate: any;

    /**
     * Represents a date object which takes different calendar types other than
     * GregorianCalendar in to account as well (like HijriCalendar, ThaiBuddhistCalendar)
     * 
     * If the calendar of current culture is other than GregorianCalendar, it tries to convert
     * the date into appropriate calendar using converter if any exists. If there is no need
     * for conversion, it falls back to the base Date object.
     * 
     * @param date Base date object. If nothing specified, DateTime.Now is used.
     */
    constructor(date: Date) {
        this._setDate(date || new Date());
    }

    /**
     * Gets the base date
     * 
     * @return 
     */
    public getBaseDate(): Date {
        return this._baseDate;
    }

    /**
     * Sets a new time using the specified date value
     * 
     * @param date Date can be date object or ticks
     */
    public setTime(date): void {
        date = (date instanceof Date) ? date : new Date(date);
        this._setDate(date);
    }

    /**
     * Gets the base date in ticks
     */
    public getTime(): number {
        return this.getBaseDate().getTime();
    }

    public getDay(): number {
        /// Gets the day of the week (from 0 to 6) of this calendar date
        return this.getBaseDate().getDay();
    }

    /**
     * Gets the year of this calendar date
     * 
     * @param converted If specified true, uses converted date. Otherwise, it uses the base date.
     */
    public getFullYear(converted?: boolean): number {
        if (converted === true && this._convertedDate) {
            return this._convertedDate[0];
        }
        return this.getBaseDate().getFullYear();
    }

    /**
     * Gets the month of this calendar date
     * 
     * @param converted If specified true, uses converted date. Otherwise, it uses the base date.
     */
    public getMonth(converted?: boolean): number {
        if (converted === true && this._convertedDate) {
            return this._convertedDate[1];
        }
        return this.getBaseDate().getMonth();
    }

    /**
     * Gets the day of this calendar date in existing month
     * 
     * @param converted If specified true, uses converted date. Otherwise, it uses the base date.
     */
    public getDate(converted?: boolean): number {
        if (converted === true && this._convertedDate) {
            return this._convertedDate[2];
        }
        return this.getBaseDate().getDate();
    }

    /**
     * Jumps to the start of the month using the converted date
     */
    public jumpToMonthStart(): CalendarDate {
        const year = this.getFullYear();
        const month = this.getMonth();
        const date = this.getDate();

        const monthStart = new CalendarDate(new Date(year, month, date, 12)); //first day of the month 12 PM to address daylight saving
        this.setTime(monthStart.getTime() - CalendarDate.DAY_IN_MILLISECONDS * (monthStart.getDate(true) - 1));
        return this;
    }

    /**
     * Jumps to the start of the week using the converted date
     */
    public jumpToWeekStart(): CalendarDate {
        const firstDayOfWeek = Culture.getDateTimeFormat().FirstDayOfWeek;
        const dayDiff = (CalendarDate.DAYS_IN_A_WEEK - firstDayOfWeek + this.getDay()) % CalendarDate.DAYS_IN_A_WEEK;
        this.setTime(this.getTime() - dayDiff * CalendarDate.DAY_IN_MILLISECONDS);
        return this;
    }

    /**
     * Advances current date to the next day
     */
    public nextDay(): CalendarDate {
        this.setTime(this.getTime() + CalendarDate.DAY_IN_MILLISECONDS);
        return this;
    }

    /**
     * Advances current date to the previous month
     */
    public prevMonth(): CalendarDate {
        this._increment(0, -1);
        return this;
    }

    /**
     * Advances current date to the next month
     */
    public nextMonth(): CalendarDate {
        this._increment(0, 1);
        return this;
    }

    /**
     * Advances current date to the previous year
     */
    public prevYear(): CalendarDate {
        this._increment(-1, 0);
        return this;
    }

    /**
     * Advances current date to the next year
     */
    public nextYear(): CalendarDate {
        this._increment(1, 0);
        return this;
    }

    /**
     * Checks whether the specified date and current date correspond to the same day
     * 
     * @param date Date object to check
     * @return 
     */
    public equals(date: Date): boolean {
        return (this.getFullYear() === date.getFullYear() &&
            this.getMonth() === date.getMonth() &&
            this.getDate() === date.getDate());
    }

    private _setDate(date: Date): void {
        this._baseDate = date;
        this._convertedDate = CalendarDate.fromGregorian(date);
    }

    private _increment(yearIncrement: number, monthIncrement: number): void {
        let month = this.getMonth(true),
            year = this.getFullYear(true);

        if (monthIncrement > 0) {
            if (++month > 11) {
                month = 0;
                year++;
            }
        }
        else if (monthIncrement < 0) {
            if (--month < 0) {
                month = 11;
                year--;
            }
        }

        year += yearIncrement;

        this.setTime(CalendarDate.toGregorian(year, month, 1));
    }
}

export class DatePanel extends Controls.BaseControl {

    private _date: Date;
    private _selectedDate: Date;
    private _$selectedItem: JQuery

    /**
     * @param options 
     */
    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            coreCssClass: "date-panel",
            canTakeFocus: false
        }, options));
    }

    public initialize(): void {
        this._selectedDate = this._options.selectedDate;
        this._date = this._selectedDate || Utils_Date.getNowInUserTimeZone();

        this._bind("click", delegate(this, this._onClick));
        this._bind("keydown", delegate(this, this._onKeyDown));

        this._draw(this._date, "prev-month");

        super.initialize();
    }

    public prevMonth(): void {
        const calendarDate = new CalendarDate(this._date);
        this._date = calendarDate.prevMonth().getBaseDate();
        this._draw(this._date, "prev-month");
    }

    public nextMonth(): void {
        const calendarDate = new CalendarDate(this._date);
        this._date = calendarDate.nextMonth().getBaseDate();
        this._draw(this._date, "next-month");
    }

    public prevYear(): void {
        const calendarDate = new CalendarDate(this._date);
        this._date = calendarDate.prevYear().getBaseDate();
        this._draw(this._date, "prev-year");
    }

    public nextYear(): void {
        const calendarDate = new CalendarDate(this._date);
        this._date = calendarDate.nextYear().getBaseDate();
        this._draw(this._date, "next-year");
    }

    public selectDate(date: Date): void {
        this.setSelectedDate(date);
        if (this._options.onSelectDate) {
            this._options.onSelectDate();
        }
    }

    public setSelectedDate(date: Date): void {
        this._selectedDate = this._date = date;
        this._draw(this._selectedDate);
        this._fireChange();
    }

    public getSelectedDate(): Date {
        return this._selectedDate;
    }

    public getSelectedItem(): JQuery {
        return this._$selectedItem;
    }

    private _draw(date: Date, focusElementClass?: string): void {

        const element = this.getElement();
        const todayFormat = this._options.todayFormat || "d";

        const $table = $("<table />").attr("cellSpacing", 0).attr("cellPadding", 0).attr("border", 0);
        let $row = $("<tr />").addClass("quick-nav");

        $("<a />")
            .addClass("prev-month")
            .attr("href", "#")
            .attr("tabindex", -1)
            .append($("<span/>").addClass("icon icon-drop-left"))
            .appendTo($("<td/>")
                .addClass("prev-month")
                .appendTo($row));

        let $cell = $("<td/>").addClass("month-year").appendTo($row);

        // Rendering date in year-month pattern ("MMMM yyyy")
        $cell.text(Utils_Date.localeFormat(date, "y", true));

        $("<a />")
            .addClass("next-month")
            .attr("href", "#")
            .attr("tabindex", -1)
            .append($("<span/>").addClass("icon icon-drop-right"))
            .appendTo($("<td/>")
                .addClass("next-month")
                .appendTo($row));

        $table.append($row);

        $row = $("<tr />");
        $cell = $("<td />").attr("colspan", 6).addClass("days");
        $cell.append(this._drawCalendarTable(date));
        $row.append($cell);

        $table.append($row);

        $row = $("<tr />");
        $cell = $("<td />").attr("colspan", 6).addClass("legend");

        // Rendering today link. Default is ShortDatePattern ("dd/MM/yy")
        $("<span/>").addClass("today").appendTo($cell);
        $("<a />")
            .addClass("today")
            .attr("href", "#")
            .attr("tabindex", -1)
            .append(Utils_String.format(Resources_Platform.TodayTitle, Utils_Date.localeFormat(new Date(), todayFormat)))
            .appendTo($cell);

        $row.append($cell);
        $table.append($row);

        element.empty().append($table);
        if (focusElementClass && this._options.canTakeFocus) {
            $("." + focusElementClass).focus();
        }
    }

    private _drawCalendarTable(date: Date): JQuery {
        const today = Utils_Date.getTodayInUserTimeZone();
        const dtf = Culture.getDateTimeFormat();

        const calendarDate = new CalendarDate(date);

        // Keeping the month value to check later on to see whether we are in the same month or not
        const month = calendarDate.getMonth(true);

        // Jumping to month start
        calendarDate.jumpToMonthStart();

        // Jumping to week start
        calendarDate.jumpToWeekStart();

        const $calendarTable = $("<table />").attr("cellSpacing", 0).attr("border", 0);
        let $row = $("<tr />").addClass("day-names");

        for (let i = 0; i < 7; i++) {
            const $cell = $("<th />");
            const dayIndex = (dtf.FirstDayOfWeek + i) % CalendarDate.DAYS_IN_A_WEEK;
            $cell.text(dtf.ShortestDayNames[dayIndex]);
            $cell.attr("aria-label", dtf.DayNames[dayIndex])
            $row.append($cell);
        }

        $calendarTable.append($row);

        for (let i = 0; i < 6; i++) {
            $row = $("<tr />").addClass("days");

            for (let j = 0; j < CalendarDate.DAYS_IN_A_WEEK; j++) {
                const $cell = $("<td />")
                    .addClass("date-cell")
                    .attr({
                        id: Controls.getId(),
                        "aria-label": Utils_Date.localeFormat(calendarDate.getBaseDate(), dtf.LongDatePattern, true)
                    });

                $("<span />")
                    .addClass("date")
                    .attr("href", "#")
                    .attr("tabindex", -1)
                    .data("date", calendarDate.getTime())
                    .text(calendarDate.getDate(true))
                    .appendTo($cell);

                if (calendarDate.getMonth(true) !== month) {
                    $cell.addClass("other-month");
                }

                if (calendarDate.equals(today)) { // date equals today?
                    $cell.addClass("today");
                }

                if (this._selectedDate instanceof Date) { // date equals selected date?
                    if (calendarDate.equals(this._selectedDate)) {
                        $cell.addClass("selected");
                        if (this._options.canTakeFocus) {
                            $cell.focus();
                        }
                        this._$selectedItem = $cell;
                    }
                }
                else if (calendarDate.equals(date)) { // date equals month start
                    if (this._options.canTakeFocus) {
                        $cell.focus();
                    }
                    $cell.addClass("selected");
                }

                $row.append($cell);

                // Advance to next day
                calendarDate.nextDay();
            }

            $calendarTable.append($row);
        }

        return $calendarTable;
    }

    /**
     * @param e 
     * @return 
     */
    private _onKeyDown(e?: JQueryEventObject): any {

        if (e.keyCode === keyCode.ENTER || e.keyCode === keyCode.SPACE) {
            return this._onClick(e);
        }
        else if (e.keyCode === keyCode.LEFT || e.keyCode === keyCode.RIGHT ||
            e.keyCode === keyCode.UP || e.keyCode === keyCode.DOWN) {
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onClick(e?: JQueryEventObject): any {

        const $target = $(e.target);
        const $link = $target.closest("a");

        if ($link.length) {
            if ($link.hasClass("prev-month")) {
                this.prevMonth();
            }
            else if ($link.hasClass("next-month")) {
                this.nextMonth();
            }
            else if ($link.hasClass("prev-year")) {
                this.prevYear();
            }
            else if ($link.hasClass("next-year")) {
                this.nextYear();
            }
            else if ($link.hasClass("today")) {
                this.selectDate(Utils_Date.getNowInUserTimeZone());
            }

            return false;
        }
        const $span = $target.closest("span");
        if ($span.length) {
            if ($span.hasClass("date")) {
                this.selectDate(new Date($span.data("date")));
            }

            return false;
        }
        else {
            const $dateCell = $target.closest(".date-cell");
            if ($dateCell.length) {
                this.selectDate(new Date($dateCell.find("span").data("date")));

                return false;
            }
        }
    }
}

export class ComboDateDropPopup extends BaseComboDropPopup {

    private _datePanel: DatePanel;
    private _selectedDate: Date;

    public initialize(): void {
        this._selectedDate = this._options.selectedDate;
        this._datePanel = <DatePanel>Controls.BaseControl.createIn(DatePanel, this.getElement(), $.extend(extendWithout(this._options, ["coreCssClass"]), {
            change: delegate(this, this._onChange)
        }));

        super.initialize();
    }

    public getSelectedDate(): Date {
        return this._selectedDate;
    }

    public getSelectedItem(): JQuery {
        return this._datePanel.getSelectedItem();
    }

    public setSelectedDate(date: Date): void {
        this._selectedDate = date;
        if (this._datePanel) {
            this._datePanel.setSelectedDate(date);
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onChange(e?: JQueryEventObject): any {
        this._selectedDate = this._datePanel.getSelectedDate();
        this._fireChange();
        return false;
    }
}

export class ComboDateBehavior extends BaseComboBehavior {

    private _timeValue: number;

    constructor(combo, options?) {
        super(combo, $.extend({
            dropControlType: ComboDateDropPopup,
            dateTimeFormat: Culture.getDateTimeFormat().ShortDatePattern
        }, options));
    }

    public initialize(): void {
        super.initialize();
        this._timeValue = this._options.defaultTimeOfDay || 0;
    }

    public canType(): boolean {
        return !this.isDropVisible();
    }

    public getAriaAutocomplete() {
        return "none";
    }

    public getAriaDescription() {
        return Resources_Platform.ComboDateScreenReaderHelp;
    }

    public getValue(): Date {
        return this.getSelectedDate();
    }

    /**
     * @return 
     */
    public getDropOptions(): any {

        let that = this,
            selectedDate = this.getSelectedDate();

        if (!selectedDate && this._options.getInitialDate) {
            selectedDate = this._options.getInitialDate(this.combo);
        }

        return $.extend(super.getDropOptions(), {
            dropElementAlign: "right-top",
            dropBaseAlign: "right-bottom",
            selectedDate: selectedDate,
            onSelectDate: function () {
                that.hideDropPopup();
            },
            change: delegate(this, this._onChange)
        });
    }

    public getDropWidth(): number {
        return undefined;
    }

    /**
     * Get's the current value as a date or null if there is no (valid) date.
     * 
     * @return 
     */
    public getSelectedDate(): Date {

        let text = $.trim(this.combo.getText()),
            selectedDate = null,
            selectedDateDayStart;

        if (text) {
            selectedDate = Utils_Date.parseDateString(text, this._options.parseFormat, true);

            if (selectedDate) {
                // Trying to figure out the time difference to keep the time value when a new date is selected
                selectedDateDayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                if (this._options.defaultTimeOfDay && selectedDate.getTime() === selectedDateDayStart.getTime()) {

                    // No time value provided - use the default time of day (if provided)
                    // we need locale format here because format uses culture invariant which cause the date displayed to be UTC
                    selectedDate = new Date(selectedDate.getTime() + this._options.defaultTimeOfDay);
                    this.setText(Utils_Date.localeFormat(selectedDate, this._options.dateTimeFormat, true), false);
                }
                else {
                    this._timeValue = selectedDate - selectedDateDayStart;
                }
            }
        }

        return selectedDate;
    }

    /**
     * Sets a date value on the combo using the behavior's dateTime format
     * 
     * @param selectedDate The date value to set
     */
    public setSelectedDate(selectedDate: Date, fireChange: boolean = true): void {
        Diag.Debug.assertParamIsDate(selectedDate, "selectedDate");

        // Trying to set the time value
        selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        selectedDate = new Date(selectedDate.getTime() + (this._timeValue || 0));

        // we need locale format here because format uses culture invariant which cause the date displayed to be UTC
        this.setText(Utils_Date.localeFormat(selectedDate, this._options.dateTimeFormat, true), fireChange);
    }

    /**
     * @param e 
     * @return 
     */
    public upKey(e?: JQueryEventObject): any {
        const dropPopup = this.getDropPopup<ComboDateDropPopup>();
        if (dropPopup) {
            dropPopup.setSelectedDate(this._addDays(this._getSelectedDate(), -7));
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public keyDown(e?: JQueryEventObject): any {
        if (e && e.keyCode === keyCode.ENTER) {
            const dropPopup = this.getDropPopup<ComboDateDropPopup>();
            if (!dropPopup) {
                this.combo.toggleDropDown();
                return false;
            } else {
                // Make sure the current date is selected, but don't prevent other handlers from executing.
                dropPopup.setSelectedDate(this._getSelectedDate());
            }
        }
    }

    /**
     * @param e 
     * @return 
     */
    public downKey(e?: JQueryEventObject): any {
        if (super.downKey(e) === false) {
            return false;
        }

        const dropPopup = this.getDropPopup<ComboDateDropPopup>();
        if (dropPopup) {
            dropPopup.setSelectedDate(this._addDays(this._getSelectedDate(), 7));
            return false;
        } else {
            this.combo.toggleDropDown();
        }
    }

    /**
     * @param e 
     * @return 
     */
    public pageUpKey(e?: JQueryEventObject): any {
        const dropPopup = this.getDropPopup<ComboDateDropPopup>();
        if (dropPopup) {
            const date = this._getSelectedDate();
            dropPopup.setSelectedDate(this._addDays(date, -1 * this._getMonthLength(date.getMonth() - 1, date.getFullYear())));
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public pageDownKey(e?: JQueryEventObject): any {
        const dropPopup = this.getDropPopup<ComboDateDropPopup>();
        if (dropPopup) {
            const date = this._getSelectedDate();
            dropPopup.setSelectedDate(this._addDays(date, this._getMonthLength(date.getMonth(), date.getFullYear())));
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public leftKey(e?: JQueryEventObject): any {
        const dropPopup = this.getDropPopup<ComboDateDropPopup>();
        if (dropPopup) {
            dropPopup.setSelectedDate(this._addDays(this._getSelectedDate(), -1));
            return false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public rightKey(e?: JQueryEventObject): any {
        const dropPopup = this.getDropPopup<ComboDateDropPopup>();
        if (dropPopup) {
            dropPopup.setSelectedDate(this._addDays(this._getSelectedDate(), 1));
            return false;
        }
    }

    private _onChange() {
        const dropPopup = this.getDropPopup<ComboDateDropPopup>();
        const selectedDate = dropPopup.getSelectedDate();
        if (selectedDate) {
            this.setSelectedDate(selectedDate);
        }

        return false;
    }

    private _getSelectedDate(): Date {
        const dropPopup = this.getDropPopup<ComboDateDropPopup>();
        return dropPopup.getSelectedDate() || new Date();
    }

    private _addDays(date: Date, days: number): Date {
        const newDate = new Date();
        newDate.setTime(date.getTime() + days * 86400000);
        return newDate;
    }

    private _getMonthLength(month, year) {
        month = (month + 12) % 12 + 1; // switch to one based to make the function more readable. add 12 to fix any negative numbers
        switch (month) {
            case 4:
            case 6:
            case 9:
            case 11:
                return 30;
            case 2:
                if (year % 4 === 0) {
                    const date = new Date(year, 1, 29);
                    // check if this date has 1 as the month then it is really 29 days
                    if (date.getMonth() === 1) {
                        return 29;
                    }
                }

                return 28;
            default:
                return 31;

        }
    }
}

Combo.registerBehavior("date-time", ComboDateBehavior);

Controls.Enhancement.registerJQueryWidget(Combo, "comboDateTime", { type: "date-time" })

export class DatePicker extends Combo {
    /**
     * @param options 
     */
    public initializeOptions(options?: any): void {

        super.initializeOptions($.extend({
            type: "date-time"
        }, options));
    }
}

Controls.Enhancement.registerJQueryWidget(DatePicker, "datePicker")

export class ComboMultiValueDropPopup extends ComboListDropPopup {

    private _checkStates: { [id: string]: boolean; };

    constructor(options?) {
        super(options);

        this._checkStates = {};

        if (!this._options.id) {
            this._options.id = "cmvdp_" + Controls.getId();
        }
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            cssClass: "multi-value",
            createItem: delegate(this, this._createItem),
            itemClick: delegate(this, this._onItemClick)
        }, options));
    }

    public initialize() {
        const parts = this.combo.getText().split(this._options.sepChar);
        const self = this;
        $.each(parts, function (i: number, v: string) {
            v = $.trim(v);
            if (v) {
                self._checkStates[v] = true;
            }
        });

        super.initialize();
    }

    public getCheckedItems(): string[] {
        const self = this;
        return $.map(this._dataSource.getItems(), function (itemText) {
            if (self._checkStates[itemText]) {
                return itemText;
            }
        });
    }

    public getValue(): string {
        return this.getCheckedItems().join(this._options.joinChar || (this._options.sepChar + " "));
    }

    public toggleCheckbox(selectedIndex): void {
        let id = this._options.id + "_cb" + selectedIndex, $cb, itemText;

        itemText = this._dataSource.getItemText(selectedIndex);
        $cb = $("#" + id);

        if ($cb.prop("checked")) {
            $cb.prop("checked", false);
            this._checkStates[itemText] = false;
        }
        else {
            $cb.prop("checked", true);
            this._checkStates[itemText] = true;
        }
    }

    private _createItem(index): JQuery {
        const itemText = this._dataSource.getItemText(index);
        const id = this._options.id + "_cb" + index;

        const $li = $(domElem("li", this._options.nodeCss)).attr("id", this._options.id + "_li" + index);
        const $cb = $("<input />")
            .data("value", itemText)
            .attr("type", "checkbox")
            .attr("id", id)
            .data("index", index)
            .appendTo($li);

        if (this._checkStates[itemText]) {
            $cb.prop("checked", true);
        }

        $li.append($(domElem("label")).attr("for", id).text(itemText || ""));

        return $li;
    }

    private _onItemClick(e?: JQueryEventObject, itemIndex?: number, $target?: JQuery, $li?: JQuery): void {
        let oldValue, newValue,
            itemText = this._dataSource.getItemText(itemIndex);

        oldValue = Boolean(this._checkStates[itemText]);
        newValue = Boolean($li.find("input").prop("checked"));
        this._checkStates[itemText] = newValue;

        if (oldValue !== newValue) {
            this._fireChange();
        }
    }
}

export class ComboMultiValueBehavior extends ComboListBehavior {
    // default character used to seperate values for the combo.
    public static Default_Seperate_Char = ",";
    // default character used to join values for the combo.
    public static Default_Join_Char = ", ";

    constructor(combo, options?) {
        super(combo, $.extend({
            dropControlType: ComboMultiValueDropPopup,
            sepChar: ComboMultiValueBehavior.Default_Seperate_Char,
            joinChar: ComboMultiValueBehavior.Default_Join_Char
        }, options));
    }

    public canType(): boolean {
        return !this.isDropVisible();
    }

    public getValue(): string[] {
        const dropPopup = this.getDropPopup<ComboMultiValueDropPopup>();
        return dropPopup.getCheckedItems();
    }

    /**
     * @return 
     */
    public getDropOptions(): any {

        return $.extend(super.getDropOptions(), {
            sepChar: this._options.sepChar,
            joinChar: this._options.joinChar,
            selectedIndex: -1,
            selectionChange: () => {
                this.combo.updateAriaActiveDescendant();
            },
            change: delegate(this, this._onChange)
        });
    }

    /**
     * @param e 
     * @return 
     */
    public keyDown(e?: JQueryEventObject): any {
        const dropPopup = this.getDropPopup<ComboMultiValueDropPopup>();
        if (dropPopup) {
            if (e.keyCode === keyCode.SPACE) {
                const selectedIndex = dropPopup.getSelectedIndex();
                if (selectedIndex >= 0) {
                    dropPopup.toggleCheckbox(selectedIndex);
                    this.setText(dropPopup.getValue(), true);
                }
            }
        }
    }

    private _onChange(): boolean {
        const dropPopup = this.getDropPopup<ComboMultiValueDropPopup>();
        this.setText(dropPopup.getValue(), true);
        return false;
    }
}

Combo.registerBehavior("multi-value", ComboMultiValueBehavior);
