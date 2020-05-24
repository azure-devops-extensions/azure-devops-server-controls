import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Combos = require("VSS/Controls/Combos");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_String = require("VSS/Utils/String");
import AdminControlFactory = require("Admin/Scripts/Common/ControlFactory");
import AdminResources = require("Admin/Scripts/Resources/TFS.Resources.Admin");
import ProcessContracts = require("TFS/WorkItemTracking/ProcessContracts");
import WitStateCategories = require("Presentation/Scripts/TFS/FeatureRef/WorkItemStateCategories");
import ColorPicker = require("Presentation/Scripts/TFS/TFS.UI.Controls.ColorPicker");
import { WorkItemStateCellRenderer } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCellRenderer";
import GroupedComboBox = require("VSSPreview/Controls/GroupedComboBox");
// opportunistically migrate over to this base class:
import WorkItemDialogBase = require("Admin/Scripts/Dialogs/WorkItemDialogBase");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import * as NavigationServices from "VSS/Navigation/Services";
import Utils_Core = require("VSS/Utils/Core");

/**
 * Options for WorkItemStateDialog
 */
export interface IWorkItemStateDialogOptions extends Dialogs.IModalDialogOptions {
    /**
     * model to initialize the dialog with
     */
    value?: ProcessContracts.WorkItemStateInputModel;

    /**
     * List of states to show in drop down
     */
    suggestedStates?: ProcessContracts.WorkItemStateResultModel[];

    /**
     * List of states that are not allowed because it would cause conflict
     */
    existingStates?: string[];

    /**
     * Callback once the user clicks 'save'
     */
    okCallback?: (value: ProcessContracts.WorkItemStateInputModel) => IPromise<any>;

    /**
     * Mode of the dialog
     */
    mode: WorkItemDialogBase.WorkItemDialogBaseMode;
}

/**
 *  Dialog for displaying and editing a work item state
 */
export class WorkItemStateDialog extends Dialogs.ModalDialogO<IWorkItemStateDialogOptions> {
    public static STATE_NAME_CONTROL_ID = "StateName";
    public static STATE_CATEGORY_CONTROL_ID = "StateCategory";
    public static STATE_COLOR_CONTROL_ID = "StateColor";
    public static MAX_STATE_NAME_LENGTH = 128;

    // Matches any of these characters .,;'`:/\*|?"&%$!+=()[]{}<>
    private _invalidStateNameCharacters: RegExp = /[\.,;'`:\/\\\*|\?\"&%$!+=\(\)\[\]\{\}<>]/;

    private _model: ProcessContracts.WorkItemStateInputModel;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _$loadingOverlay: JQuery;
    private _$settingsMessageArea: JQuery;
    private _$settingsMessageTextArea: JQuery;
    private _navDelegate: IArgsFunctionR<any>;

    protected _$contentContainerElement: JQuery;
    protected _stateNameControl: Combos.Combo;
    protected _stateCategoryControl: Combos.Combo;
    protected _stateColorControl: StateColorPicker;
    protected _suggestedStateCategories: WitStateCategories.IWorkItemStateCategory[];
    protected _suggestedStates: GroupedComboBox.IGroupedDataItem<string>[];
    protected _existingStates: IDictionaryStringTo<boolean>;
    protected _idToWorkItemStateMap: IDictionaryStringTo<ProcessContracts.WorkItemStateResultModel>;

    constructor(options?: Dialogs.IModalDialogOptions) {
        super(options);
    }

    public initializeOptions(options?: IWorkItemStateDialogOptions) {
        Diag.Debug.assertIsNotNull(options.mode, "Mode should be specified");

        if (options.mode === WorkItemDialogBase.WorkItemDialogBaseMode.Add) {
            Diag.Debug.assertIsNotNull(options.suggestedStates, "Suggested States should be provided for Add Mode");
            Diag.Debug.assertIsNotNull(options.existingStates, "Existing States should be provided for Add Mode");
        }

        // Populate existing states
        this._existingStates = {};
        for (let state of options.existingStates) {
            this._existingStates[state] = true;
        }

        options = $.extend(<IWorkItemStateDialogOptions>{
            minWidth: 640,
            minHeight: 400,
            useBowtieStyle: true,
            bowtieVersion: 2,
            okText: options && options.mode === WorkItemDialogBase.WorkItemDialogBaseMode.Add ? AdminResources.Create : AdminResources.Save,
            suggestedStates: [],
            existingStates: [],

            mode: WorkItemDialogBase.WorkItemDialogBaseMode.Add
        }, options);

        if (options.mode == WorkItemDialogBase.WorkItemDialogBaseMode.View) {
            options.buttons = [{
                text: AdminResources.Close,
                click: () => {
                    this.close();
                }
            }];
        }

        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this._initializeStateDialogInternal();
        // Set initial focus to name if we are adding a new item
        if (this._options.mode === WorkItemDialogBase.WorkItemDialogBaseMode.Add) {
            this.setInitialFocus();
        }
        else if (this._options.mode === WorkItemDialogBase.WorkItemDialogBaseMode.View) {
            this._element.siblings().find("button.cta").focus();
        }

        // Exits our of dialog when navigating away from states tab
        let varHist = NavigationServices.getHistoryService();
        this._navDelegate = Utils_Core.delegate(this, this.dispose);
        varHist.attachNavigate("*", this._navDelegate, true);
    }

    public dispose() {
        let varHist = NavigationServices.getHistoryService();
        varHist.detachNavigate("*", this._navDelegate);
        super.dispose();
    }

    /**
     * Internal initialize method
     * Override for testing
     */
    protected _initializeStateDialogInternal() {
        if (this._options.value) {
            this._model = $.extend({}, this._options.value);
            this._model.order = null; //The dialog should not update the order e.g. this order will be invalid incase of category change
        }
        else {
            let defaultWorkItemStateCategory = WitStateCategories.WorkItemStateCategoryNames.DefaultWorkItemStateCategory;
            this._model = {
                name: "",
                stateCategory: defaultWorkItemStateCategory,
                color: WitStateCategories.WorkItemStateCategoryData[defaultWorkItemStateCategory].defaultColor,
                order: null
            };
        }

        this._$contentContainerElement = $("<div>").addClass("state-edit-dialog-container bowtie");
        this.getElement()
            .addClass(WorkItemDialogBase.WorkItemDialogBase.BASE_DIALOG_CLASS_NAME)
            .append(this._$contentContainerElement);
        this._createStateNameInput();
        this._createStateCategoryInput();
        this._createStateColorInput();

        AdminControlFactory.createLearnMoreLinkBlock(
            this._$contentContainerElement,
            AdminResources.NewWitDialogLearnMoreLink,
            null,
            AdminResources.NewWitDialogLearnMoreLinkTitle);
        this.setInitialFocus();
    }

    /**
     * Handle onOkClick event
     * @param e
     */
    public onOkClick(e?: JQueryEventObject) {
        this._hideError(); // Ensure error message dialog is hidden
        if ($.isFunction(this._options.okCallback)) {
            this._showLoadingOverlay();
            this.updateOkButton(false); // disable 'save' button
            this._options.okCallback(this._model).then(
                () => {
                    this._hideLoadingOverlay();
                    this.close();
                },
                (reason: Error) => {
                    this._hideLoadingOverlay();
                    this._showError(reason.message);
                });
        }
        else {
            this.close();
        }
    }

    /**
     * Display message as error in Dialog Message area
     * @param message
     */
    private _showError(message: string) {
        if (!this._$settingsMessageArea) {
            this._createMessageArea(this.getElement());
        }

        this._$settingsMessageTextArea.text(message);
        this._$settingsMessageArea.show();
    }

    /**
     * Hide dialog message area
     */
    private _hideError() {
        if (this._$settingsMessageArea) {
            this._$settingsMessageArea.hide();
        }
    }

    /**
     * Add message area to start of dialog
     * @param $element
     */
    private _createMessageArea($element: JQuery) {

        // Create message area
        this._$settingsMessageArea = $("<div>").addClass("state-edit-dialog error-message-area settings-message-area");
        this._$settingsMessageArea.append($("<div>").addClass("icon bowtie-icon bowtie-status-error"));

        // Create Message text area to show the error message
        this._$settingsMessageTextArea = $("<div>").addClass("error-message");
        this._$settingsMessageArea.append(this._$settingsMessageTextArea);
        this._$settingsMessageArea.hide();

        $element.prepend(this._$settingsMessageArea);
    }

    /**
     * Create label and grouped combo box for state name input
     */
    private _createStateNameInput() {
        let editable: boolean = this._options.mode === WorkItemDialogBase.WorkItemDialogBaseMode.Add;
        let suggestedStates = editable ? this._getSuggestedStates() : [];

        let $fieldSet = $("<fieldset></fieldset>");

        // Setup label
        $fieldSet.append($(`<label>${AdminResources.WorkItemStateDialog_Name}</label>`).attr("for", `${WorkItemStateDialog.STATE_NAME_CONTROL_ID}_txt`));

        // Register grouped behavior on the combo box to enable "grouped" type
        GroupedComboBox.GroupedComboBehavior.registerBehavior();
        // Setup groupedComboBox
        let options: GroupedComboBox.IGroupedComboOptions = {
            type: "grouped",
            id: WorkItemStateDialog.STATE_NAME_CONTROL_ID,
            allowEdit: editable,
            enabled: editable,
            value: this._model.name,
            source: suggestedStates,
            enableFilter: true,
            autoComplete: true,
            dropOptions: {
                // Renderer for items passed into combo box, use state renderer
                getItemContents: (item) => {
                    let state = this._getStateFromStateId(item);
                    if (state) {
                        return WorkItemStateCellRenderer.getColorCell("#" + state.color, state.name);
                    }
                },
                // Display when all items have been filtered out
                emptyRenderer: () => {
                    return $("<div/>").addClass("state-edit-dialog-no-suggested-states").text(AdminResources.StateEditDialog_NoSuggestedStates);
                },
                // Renderer for groups in combo box
                groupRenderer: (groupTitle) => {
                    return $("<div/>").addClass("state-edit-dialog-group-title").text(groupTitle);
                },
            },
            // Text that will be sent to combo text box on item selection
            getItemText: (item) => { // item is key
                return item ? this._getStateFromStateId(item).name : "";
            },
            // Used to compare input text to items in the combobox
            compareInputToItem: (key, compareText): number => {
                if (!!this._getStateFromStateId(key)) {
                    return Utils_String.localeIgnoreCaseComparer(compareText, this._getStateFromStateId(key).name.substr(0, compareText.length));
                }
                return -1;
            },
            // React to selection changes, update dialog category and color
            indexChanged: (index: number) => {
                if (index >= 0) {
                    this._hideError();
                    let selectedItem = this._stateNameControl.getValue();
                    if (selectedItem !== null) {
                        let state = this._getStateFromStateId(<string>selectedItem);
                        if (state !== null) {
                            this._model.name = state.name;
                            this._model.color = state.color;
                            this._model.stateCategory = state.stateCategory;
                        }
                    }
                    this._updateControlText();
                    this.updateOkButton(this._isValid());
                }
            },
            // React to text entry change
            change: () => {
                this._hideError();
                this._model.name = this._stateNameControl.getText();
                this._updateControlText();
                this.updateOkButton(this._isValid());
            }
        }

        // Create grouped combobox
        this._stateNameControl = <Combos.Combo>Controls.BaseControl.createIn(Combos.Combo, $fieldSet, options);
        // Set state name max input length
        this._stateNameControl.getInput().attr("maxLength", WorkItemStateDialog.MAX_STATE_NAME_LENGTH);

        this._$contentContainerElement.append($fieldSet);
    }

    /**
     * Create label and combobox for state category
     */
    private _createStateCategoryInput() {
        let editable: boolean = this._options.mode !== WorkItemDialogBase.WorkItemDialogBaseMode.View;
        let suggestedStateCategories = editable ? this._getSuggestedStateCategories() : [];

        let $fieldSet = $("<fieldset></fieldset>");
        $fieldSet.append($(`<label>${AdminResources.WorkItemStateDialog_StateCategory}</label>`).attr("for", `${WorkItemStateDialog.STATE_CATEGORY_CONTROL_ID}_txt`));
        this._stateCategoryControl = <Combos.Combo>Combos.Combo.createIn<Combos.IComboOptions>(Combos.Combo, $fieldSet, {
            allowEdit: false,
            enabled: editable,
            source: suggestedStateCategories,
            id: WorkItemStateDialog.STATE_CATEGORY_CONTROL_ID,
            label: WorkItemStateDialog.STATE_CATEGORY_CONTROL_ID,
            value: WitStateCategories.WorkItemStateCategoryData[this._model.stateCategory].displayName,
            change: () => {
                this._hideError();
                var selectedMetaState: WitStateCategories.IWorkItemStateCategory = this._stateCategoryControl.getBehavior().getDataSource().getItem(this._stateCategoryControl.getSelectedIndex());
                this._model.stateCategory = selectedMetaState.refName;
                this._model.color = WitStateCategories.WorkItemStateCategoryData[this._model.stateCategory].defaultColor;
                this._updateControlText();
                this.updateOkButton(this._isValid());
            }
        });

        this._$contentContainerElement.append($fieldSet);
    }

    /**
     * Create label and color picker for state color
     */
    private _createStateColorInput() {
        let $fieldSet = $("<fieldset></fieldset>");
        $fieldSet.append($(`<label>${AdminResources.WorkItemStateDialog_Color}</label>`).attr("for", `${WorkItemStateDialog.STATE_COLOR_CONTROL_ID}_txt`));

        let options = <ColorPicker.DefinedPaletteColorPickerControlOptions>{
            tagName: "div",
            template: ColorPicker.PaletteTemplate.Full,
            onColorSelected: (source: ColorPicker.IColorPickerControl, color: ColorPicker.AccessibilityColor) => {
                this._hideError();
                this._model.color = color.asHex().replace('#', '');
                this.updateOkButton(this._isValid());
            },
            defaultColor: new ColorPicker.AccessibilityColor(this._model.color),
            allowNonPaletteDefaultColor: true,
            ariaLabelPrefix: AdminResources.StateColorCombo
        };
        this._stateColorControl = <StateColorPicker>Controls.Control.createIn
            <ColorPicker.DefinedPaletteColorPickerControlOptions>(StateColorPicker, $fieldSet, options);

        // If dialog is in readonly mode, disable control
        if (this._options.mode === WorkItemDialogBase.WorkItemDialogBaseMode.View) {
            this._stateColorControl.enableElement(false);
        }

        this._$contentContainerElement.append($fieldSet);
    }

    /**
     * Get suggesteed state categories
     */
    protected _getSuggestedStateCategories(): WitStateCategories.IWorkItemStateCategory[] {
        // Generate array based off of WorkItemStateCategoryData if not populated
        if (!this._suggestedStateCategories) {
            Diag.Debug.assertIsNotNull(WitStateCategories.WorkItemStateCategoryData, "State category cannot be empty");
            this._suggestedStateCategories = [];
            this._suggestedStateCategories = Object.keys(WitStateCategories.WorkItemStateCategoryData)
                .map((key) => WitStateCategories.WorkItemStateCategoryData[key])
                .sort((a, b) => a.order - b.order);
        }
        return this._suggestedStateCategories;
    }

    /**
     * Get suggested states. States based off of all states on all work items
     */
    protected _getSuggestedStates(): GroupedComboBox.IGroupedDataItem<string>[] {
        if (!this._suggestedStates) {
            this._suggestedStates = [];
            let dedupedStates: IDictionaryStringTo<ProcessContracts.WorkItemStateResultModel> = {};
            let states = this._options.suggestedStates;

            // Generate a list of all unique states
            for (let state of states) {
                let key = `${state.stateCategory} - ${state.name} - ${state.color}`;

                if (!dedupedStates[key] && !this._existingStates[state.name]) {
                    dedupedStates[key] = state;
                }
            }

            let items = Object.keys(dedupedStates).sort().map((item) => dedupedStates[item]);

            let categoryToIdMap: IDictionaryStringTo<string[]> = {};
            for (let key of items) {
                if (!categoryToIdMap[key.stateCategory]) {
                    categoryToIdMap[key.stateCategory] = [key.id];
                }
                else {
                    categoryToIdMap[key.stateCategory].push(key.id);
                }
            }

            for (let category of this._getSuggestedStateCategories()) {
                let title = category.displayName;
                let items = categoryToIdMap[category.refName];
                if (!!title && !!items) {
                    this._suggestedStates.push({
                        title: title,
                        items: items
                    });
                }
            }
        }

        return this._suggestedStates;
    }

    /**
     * Retrieve state based on id
     * @param stateId
     */
    protected _getStateFromStateId(stateId: string): ProcessContracts.WorkItemStateResultModel {
        if (!this._idToWorkItemStateMap) {
            this._idToWorkItemStateMap = {};
            for (let state of this._options.suggestedStates) {
                this._idToWorkItemStateMap[state.id] = state;
            }
        }
        return this._idToWorkItemStateMap[stateId] || null;
    }

    /**
     * Show loading overlay
     */
    private _showLoadingOverlay() {
        if (!this._$loadingOverlay) {
            this._$loadingOverlay = $("<div></div>").addClass("control-busy-overlay work-item-dialog-overlay").appendTo(this.getElement());
        }
        this._$loadingOverlay.show();

        var statusOptions: StatusIndicator.IStatusIndicatorOptions = {
            center: true,
            imageClass: "big-status-progress",
            throttleMinTime: 0
        };
        this._statusIndicator = Controls.Control.create(StatusIndicator.StatusIndicator, this._$loadingOverlay, statusOptions);
        this._statusIndicator.start();
    }

    /**
     * Hide loading overlay
     */
    private _hideLoadingOverlay() {
        if (this._$loadingOverlay) {
            this._statusIndicator.complete();
            this._$loadingOverlay.hide();
            this._$loadingOverlay.empty();
        }
    }

    /**
     * Check if form is valid for saving
     */
    private _isValid(): boolean {
        // Should not allow save in view mode
        // Also there is additional validation on server side that enforces at least one complete and one proposed state
        // We did not want to duplicate that logic here so that we can keep this relatively simple
        // Check if form is dirty
        return this._options.mode !== WorkItemDialogBase.WorkItemDialogBaseMode.View
            && this._model.name !== Utils_String.empty
            && this._isDirty()
            && !!WitStateCategories.WorkItemStateCategoryData[this._model.stateCategory];
    }

    /**
     * Check if input has changed from original model
     */
    private _isDirty(): boolean {
        // Value in options is our original passed in value
        if (this._options.value && this._model &&
            this._options.value.name === this._model.name &&
            this._options.value.stateCategory === this._model.stateCategory &&
            this._options.value.color === this._model.color) {
            return false;
        }
        return true;
    }

    /**
     * Update the dialog based on current model settings
     */
    private _updateControlText() {
        this._stateCategoryControl.setText(WitStateCategories.WorkItemStateCategoryData[this._model.stateCategory].displayName);
        this._stateColorControl.setColor(new ColorPicker.AccessibilityColor(this._model.color));
    }
}

/**
 * Adds a default no color option to bottom of color palette. This option returns white (#ffffff)
 */
export class StateColorPicker extends ColorPicker.DefinedPaletteColorPickerControl {

    public initialize(): void {
        super.initialize();
    }

    /**
     * Override base class and create state color palette view
     * @param $colorPickerDiv
     */
    protected _createPaletteView($colorPickerDiv: JQuery) {
        this._paletteView = <ColorPicker.ColorPaletteView>Controls.Control.createIn<ColorPicker.ColorPaletteViewOptions>(StateColorPaletteView, $colorPickerDiv,
            <ColorPicker.ColorPaletteViewOptions>{ paletteControl: this, paletteControlOptions: (ColorPicker.DefinedPaletteColorPickerControl.getPaletteColorPickerControlOptions(this._options)) });
    }
}

class StateColorPaletteView extends ColorPicker.ColorPaletteView {
    public static STATE_NO_COLOR_CLASS = "state-color-picker-no-color";
    private static _noColorValue: string = "#ffffff";
    private _$noColorListItem: JQuery;
    private _currentColumn: number = 0;


    /**
     * Create the View of the ColorPalette. No events are added at that point and the palette is not visible on creation.
     */
    protected createHtml(): void {
        super.createHtml();
        // Set up no color option
        // Wrapping list item
        this._$noColorListItem = $("<li>").addClass(StateColorPaletteView.STATE_NO_COLOR_CLASS)
            .attr("data-hex-color", StateColorPaletteView._noColorValue)
            .attr("aria-label", AdminResources.StateColorPickerNoColor);
        // Empty color square
        var $noColorSquare = $("<div>").addClass(ColorPicker.ColorPaletteView.CssNameSingleColor + " state-color-picker-no-color-square")
            .attr("data-hex-color", StateColorPaletteView._noColorValue);
        this._$noColorListItem.append($noColorSquare);
        // Text container
        this._$noColorListItem.append($("<div>")
            .addClass("state-color-picker-no-color-text")
            .text(AdminResources.StateColorPickerNoColor));

        // Find the color palette list and add the new item
        var $listElement = this.getElement().find("ul");
        $listElement.append(this._$noColorListItem);
    }

    /**
     * Override for no color item
     *
     * Get from the palette the JQuery element of the left color from the current selected one
     * @param {JQuery} $currentSelectedColor - Html Element of the selected item. This one is inside the next parameter
     * @param {JQuery[]} $allColorsInPalette - Array of Html Element which represent all colors in the palette.
     * @returns {JQuery} The previous available color 
     */
    public _getLeftSingleColor($currentSelectedColor: JQuery, $allColorsInPalette: JQuery): JQuery {
        // We must specify class to get the correct element
        var $itemToMoveTo = $currentSelectedColor.prev("." + ColorPicker.ColorPaletteView.CssNameSingleColor);
        if ($itemToMoveTo.length === 0) { //Nothing is returned, we reached the first one
            $itemToMoveTo = $(".state-color-picker-no-color"); // Go to no color item
        }
        return $itemToMoveTo;
    }

    /**
     * Override for no color item
     *
     * Get from the palette the JQuery element of the color down from the current selected one
     * @param {JQuery} $currentSelectedColor - Html Element of the selected item. This one is inside the next parameter
     * @param {JQuery[]} $allColorsInPalette - Array of Html Element which represent all colors in the palette.
     * @returns {JQuery} The color under the currentSelected
     */
    public _getDownSingleColor($currentSelectedColor: JQuery, $allColorsInPalette: JQuery): JQuery {
        var $itemToMoveTo;
        // Check to see if we are on no color element
        if ($currentSelectedColor.hasClass(StateColorPaletteView.STATE_NO_COLOR_CLASS)) {
            $itemToMoveTo = $($allColorsInPalette.get(this._currentColumn)); // First row
        }
        // We are on a regular row
        else if ($currentSelectedColor.nextAll().length - 1 >= this.paletteColorPickerControlOptions.maximumColumns) {
            $itemToMoveTo = $currentSelectedColor.nextAll().slice(this.paletteColorPickerControlOptions.maximumColumns - 1, this.paletteColorPickerControlOptions.maximumColumns);
        }
        // We are on the row before no color item
        else {
            if ($currentSelectedColor.length > 0) {
                this._currentColumn = $allColorsInPalette.index($currentSelectedColor) % this.paletteColorPickerControlOptions.maximumColumns;
            }
            $itemToMoveTo = this._$noColorListItem;
        }
        return $itemToMoveTo;
    }

    /**
     * Override for no color item
     *
     * Get from the palette the JQuery element of the color top from the current selected one
     * @param {JQuery} $currentSelectedColor - Html Element of the selected item. This one is inside the next parameter
     * @param {JQuery[]} $allColorsInPalette - Array of Html Element which represent all colors in the palette.
     * @returns {JQuery} The color above the currentSelected
     */
    public _getUpSingleColor($currentSelectedColor: JQuery, $allColorsInPalette: JQuery): JQuery {
        var $itemToMoveTo;
        // We are on no color section, move up
        if ($currentSelectedColor.hasClass(StateColorPaletteView.STATE_NO_COLOR_CLASS)) {
            var moveUpIndex = $allColorsInPalette.length - 1 - (this.paletteColorPickerControlOptions.maximumColumns - this._currentColumn);
            $itemToMoveTo = $($allColorsInPalette.get(moveUpIndex));
        }
        // regular row, move up
        else if ($currentSelectedColor.prevAll().length >= this.paletteColorPickerControlOptions.maximumColumns) {
            $itemToMoveTo = $currentSelectedColor.prevAll().slice(this.paletteColorPickerControlOptions.maximumColumns - 1, this.paletteColorPickerControlOptions.maximumColumns);
        }
        // We are on first row, move to no color item
        else {
            if ($currentSelectedColor.length > 0) {
                this._currentColumn = $allColorsInPalette.index($currentSelectedColor) % this.paletteColorPickerControlOptions.maximumColumns;
            }
            $itemToMoveTo = this._$noColorListItem;
        }
        return $itemToMoveTo;
    }

}
