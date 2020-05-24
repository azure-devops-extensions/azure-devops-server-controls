/// <reference types="jquery" />
/// <reference types="knockout" />



import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import AgileUtils = require("Agile/Scripts/Common/Utils");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import Cards = require("Agile/Scripts/Card/Cards");
import Controls_Combos = require("VSS/Controls/Combos");
import Diag = require("VSS/Diag");
import ko = require("knockout");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Culture = require("VSS/Utils/Culture");
import Utils_Number = require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import Validation = require("VSS/Controls/Validation");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Work_Contracts = require("TFS/Work/Contracts");
import Util_Cards = require("Agile/Scripts/Card/CardUtils");
import TFS_TabStrip_ViewModels = require("Presentation/Scripts/TFS/TFS.ViewModels.TabStripControl");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

TFS_Knockout.overrideDefaultBindings()

var DatabaseCoreFieldRefName = AgileUtils.DatabaseCoreFieldRefName;
var assignedToFormats = Cards.CardFieldDisplayFormats.AssignedToFieldFormats;
var delegate = Utils_Core.delegate;
var FIELD_IDENTIFIER = Cards.CardSettings.FIELD_IDENTIFIER;
var FIELD_DISPLAY_TYPE = Cards.CardSettings.FIELD_DISPLAY_TYPE;
var DISPLAY_FORMAT = Cards.CardSettings.DISPLAY_FORMAT;

/**
 * View model for swimlane tab.
 */
export class SwimlaneTabViewModel extends TFS_TabStrip_ViewModels.TabViewModel {

    public tabName: KnockoutObservable<string>;
    public isLaneNameEditable: KnockoutObservable<boolean>;
    public isDefault: boolean;
    public title: string;
    public subtitle: string;
    public warningMessage: KnockoutObservable<string>;
    /**
     * Return true if the swimlane is a default swimlane.
     */
    public static isDefaultSwimlane(swimlane: Work_Contracts.BoardRow): boolean {
        return Utils_String.isEmptyGuid(swimlane.id);
    }

    constructor(swimlane: Work_Contracts.BoardRow) {
        super(swimlane);

        this.isLaneNameEditable = ko.observable(true);
        this.tabName = ko.observable(swimlane.name);
        this.title = AgileControlsResources.Swimlane_Settings_Tab_Title_Default;
        this.warningMessage = ko.observable("");

        var titleSubscription = ko.computed(() => {
            // When lane name editable flag changed, set appropriate title and subtitle for the tab.
            if (this.isLaneNameEditable()) {
                this.subtitle = AgileControlsResources.Swimlane_Settings_Tab_Subtitle_Default;
            }
            else {
                this.subtitle = AgileControlsResources.Swimlane_Settings_DefaultLane_Subtitle;
            }
        });
        this._disposables.push(titleSubscription);

        if (SwimlaneTabViewModel.isDefaultSwimlane(swimlane)) {
            // default swimlane.
            this.isDefault = true;
            this.title = AgileControlsResources.Swimlane_Settings_Tab_Title_Default;
            this.subtitle = AgileControlsResources.Swimlane_Settings_Tab_Subtitle_Default;
        }
        else {
            this.isDefault = false;
            this.title = AgileControlsResources.Swimlane_Settings_Tab_Title;
            this.subtitle = Utils_String.empty;
        }

        var nameChangedSubscription = ko.computed(() => {
            var result = SwimlaneTabValidator.validateSwimlaneName(this.name(), this.tabCollection.tabs(), this.isDefault);
            this.isValid(result.isValid);
            this.message(result.message);
        });
        this._disposables.push(nameChangedSubscription);

        var tabNameSubscription = ko.computed(() => {
            // When name changed, set appropriate display tab name.
            if (this.isDefault && Utils_String.localeComparer(this.name(), "") === 0) {
                this.tabName(AgileControlsResources.Swimlane_Settings_DefaultLaneName);
            }
            else {
                this.tabName(this.name());
            }
        });
        this._disposables.push(tabNameSubscription);
    }

    /**
     * @return True if it is not a default tab.
     */
    public canDelete(): boolean {
        return !this.isDefault;
    }

    /**
     * Reset the view model.
     * @param options - data used to reset the view model.
     */
    public reset(options: IColumnTabViewModelOptions) {
        super.reset(options);
        this.warningMessage("");
    }

}

/**
 * View model for swimlane tab collection.
 */
export class SwimlaneTabCollectionViewModel extends TFS_TabStrip_ViewModels.TabCollectionViewModel<SwimlaneTabViewModel> {
    private _activeTabSubscription: KnockoutComputed<void>;

    constructor(swimlanes: Work_Contracts.BoardRow[]) {
        super(SwimlaneTabViewModel, swimlanes);

        this._activeTabSubscription = ko.computed(() => {
            this._activeTabSubscriptionHandler();
        });
        this._disposables.push(this._activeTabSubscription);
    }

    /**
     * Insert tab.
     * @param newTab Tab to be inserted.
     * @param start Index to be inserted.
     */
    public insertTab(tabViewModel: SwimlaneTabViewModel, start: number) {
        if (this.tabs().length === 1 && this.tabs()[0].isDefault) {
            this.tabs()[0].isLaneNameEditable(true);
            this.tabs()[0].warningMessage("");
        }
        super.insertTab(tabViewModel, start);
    }

    /**
     * Generate new tab view model.
     * @param referenceTabIndex a reference tab index to be used for cloning a new tab view model.
     * @param name (optional) the name to be used for the tab view model.
     * @return new tab view model.
     */
    public createTabViewModel(referenceTabIndex: number, name?: string): SwimlaneTabViewModel {
        var options = {
            id: null,
            name: name || AgileControlsResources.Swimlane_Settings_Default_Lane_Name,
            tabCollection: this
        };

        return new SwimlaneTabViewModel(options);
    }

    /**
     * Reset the view model.
     * @param options data used to reset the view model.
     */
    public reset(options: Work_Contracts.BoardRow[]) {
        // dispose the subscription.
        this._activeTabSubscription.dispose();

        super.reset(options);

        // reactivate the subscription.
        this._activeTabSubscription = ko.computed(() => {
            this._activeTabSubscriptionHandler();
        });
        this._disposables.push(this._activeTabSubscription);
    }

    private _activeTabSubscriptionHandler() {
        var message = this.message();
        var tabs = this.tabs();
        if (tabs.length === 1 && tabs[0].isDefault) {
            var defaultTab = tabs[0];
            defaultTab.isLaneNameEditable(false);
            if (Utils_String.localeComparer(defaultTab.name(), "") !== 0) {
                message = Utils_String.format(AgileControlsResources.Swimlane_Settings_DefaultLaneWithNameDeleted,
                    defaultTab.name());
                defaultTab.warningMessage(message);
                defaultTab.name("");
            }
        }
        this.message(message);
    }
}

/**
 * Validator for swimlane tab collection view model.
 */
export class SwimlaneTabValidator {
    /**
     * Validates that swimlane name is not empty, has a length less than 256, and does not contain invalid characters.
     * Swimlane name can be empty if it is the default lane.
     * @return A result containing valid state and message to be displayed.
     */
    public static validateSwimlaneName(name: string, tabs: TFS_TabStrip_ViewModels.TabViewModel[], isDefault: boolean): TFS_TabStrip_ViewModels.ITabValidateResult {
        var valid = true;
        var message = "";
        var name = name.trim();
        var isLaneNameEmpty = (Utils_String.localeComparer(name, "") === 0);

        if (!isDefault || (isDefault && !isLaneNameEmpty)) {
            if (isLaneNameEmpty) {
                valid = false;
                message = AgileControlsResources.Swimlane_Settings_EmptyLaneName;
            }
            else if (name.length > 255) {
                // Length limit
                valid = false;
                message = AgileControlsResources.Swimlane_Settings_LongLaneName;
            }
            else if (Utils_String.containsControlChars(name) || Utils_String.containsMismatchedSurrogateChars(name)) {
                // Invalid character
                valid = false;
                message = AgileControlsResources.Swimlane_Settings_InvalidCharactersLaneName;
            }
            else {
                // Duplicate name
                var result = SwimlaneTabValidator.validateNoDuplicateSwimlanes(name, tabs);
                valid = result.isValid;
                message = result.message;
            }
        }
        return {
            isValid: valid,
            message: message
        };
    }

    private static validateNoDuplicateSwimlanes(name: string, tabs: TFS_TabStrip_ViewModels.TabViewModel[]): TFS_TabStrip_ViewModels.ITabValidateResult {
        var result = {
            isValid: true,
            message: ""
        };

        var duplicatedLaneNames = this._getDuplicateSwimlanesNames(tabs);
        if (duplicatedLaneNames.length > 0 && Utils_Array.contains(duplicatedLaneNames, name, Utils_String.localeIgnoreCaseComparer)) {
            result.isValid = false;
            result.message = AgileControlsResources.Swimlane_Settings_DuplicateLaneName;
        }
        return result;
    }

    private static _getDuplicateSwimlanesNames(tabs: TFS_TabStrip_ViewModels.TabViewModel[]): string[] {
        var duplicates: string[] = [];
        var names = {};

        $.each(tabs, (index: number, tabViewModel: TFS_TabStrip_ViewModels.TabViewModel) => {
            var name = tabViewModel.name().toLocaleLowerCase().trim();
            if (names.hasOwnProperty(name)) {
                duplicates.push(name);
            }
            else {
                names[name] = true;
            }
        });

        return duplicates;
    }
}

/**
 * @interface 
 * Interface for column state mapping.
 */
export interface IColumnStateMapping {
    /**
     * State name.
     */
    stateName: KnockoutObservable<string>;
    /**
     * State value.
     */
    stateValue: KnockoutObservable<string>;
    /**
     * Original state value.
     */
    originalValue: string;
    /**
     * IsValid state.
     */
    isValid: KnockoutObservable<boolean>;
    /**
     * Error or warning message.
     */
    message: KnockoutObservable<string>;
    /**
    * Allowed values.
    */
    allowedValues: KnockoutObservableArray<string>;
    /**
     * Allow editing. If it is true, we will bind it with dropdown,
     * Otherwise, we showed it as text input.
     */
    allowEditing?: KnockoutObservable<boolean>;
    /**
     * Dynamic shows the text for options caption.
     */
    dynamicOptionsCaption?: KnockoutComputed<string>;

    /**
     * Options to be used for vssCombo ko.bindinghandler.
     */
    getComboOptions?: () => any;
}

export interface IColumnTabViewModelOptions extends TFS_TabStrip_ViewModels.ITabViewModelOptions {
    itemLimit: string;
    columnType: Work_Contracts.BoardColumnType;
    isSplit: boolean;
    description: string;
    stateMappings: IDictionaryStringTo<string>;
}

export class BoardColumnType {
    public static INCOMING = "Incoming";
    public static INPROGRESS = "InProgress";
    public static OUTGOING = "Outgoing";
}

/**
 * View model for column tab.
 */
export class ColumnTabViewModel extends TFS_TabStrip_ViewModels.TabViewModel {
    public static MAX_COLUMN_NAME_LENGTH = 255;
    // This constant matches the "DefaultMemberLimit" value defined in KanbanUtils.cs
    public static BOARDCOLUMN_DEFAULT_MEMBER_LIMIT = "5";
    public static MIN_INPROGRESS_LIMIT = 0;
    public static MAX_INPROGRESS_LIMIT = 999;
    public static MAX_DESCRIPTION_LENGTH = 2000;
    public static DESCRIPTION_LENGTH_THRESHOLD = 30;
    public static UPPER_LIMIT_DESCRIPTION_LENGTH = 4000;

    // Stores initial view model value.
    private _initialState: string;

    // Properties
    public tabName: KnockoutObservable<string>;
    public itemLimit: KnockoutObservable<string>;
    public stateMappings: KnockoutObservableArray<IColumnStateMapping>;
    public isSplit: KnockoutObservable<boolean>;
    public description: KnockoutObservable<string>;
    public columnType: KnockoutObservable<Work_Contracts.BoardColumnType>;
    public columnTypeName: string;

    // Error or warning message
    public nameMessage: KnockoutObservable<string> = ko.observable("");
    public itemLimitMessage: KnockoutObservable<string> = ko.observable("");
    public descriptionMessage: KnockoutObservable<string> = ko.observable("");
    public stateMappingsDescription: KnockoutObservable<string> = ko.observable("");

    // Valid state for each property
    public nameIsValid: KnockoutObservable<boolean> = ko.observable(true);
    public itemLimitIsValid: KnockoutObservable<boolean> = ko.observable(true);
    public descriptionIsValid: KnockoutObservable<boolean> = ko.observable(true);

    constructor(column: IColumnTabViewModelOptions) {
        super(column);
        this.tabName = ko.observable(column.name);
        this.columnType = ko.observable(column.columnType);
        this.setProportiesByColumnType();
        this.itemLimit = ko.observable(column.itemLimit.toString());
        this.isSplit = ko.observable(column.isSplit);
        this.description = ko.observable(column.description ? column.description : "");
        this.stateMappings = column.stateMappings ? this._bindStateMappings(column.stateMappings) : ko.observableArray([]);
        this._initialState = this._serialize();
        this.initializeSubscriptions();
    }

    public initializeSubscriptions() {
        // Column Name
        var nameChangedSubscription = ko.computed(() => {
            var name = this.name();
            this.tabName(name);
            var validateResult = BoardColumnValidator.validateColumnName(name, this.tabCollection.tabs());
            this.nameIsValid(validateResult.isValid);
            this.nameMessage(validateResult.message);
        });
        this._disposables.push(nameChangedSubscription);

        // Item Limit
        var itemLimitChangedSubscription = ko.computed(() => {
            var itemLimit = this.itemLimit();
            var validateResult = BoardColumnValidator.validateItemLimit(itemLimit);
            this.itemLimitIsValid(validateResult.isValid);
            this.itemLimitMessage(validateResult.message);
        });
        this._disposables.push(itemLimitChangedSubscription);

        // State Mappings
        $.each(this.stateMappings(), (index: number, stateMapping: IColumnStateMapping) => {
            var stateMappingChangedSubscription = ko.computed(() => {
                var validateResult = BoardColumnValidator.validateStateMapping(this.id, stateMapping);
                stateMapping.isValid(validateResult.isValid);
                stateMapping.message(validateResult.message);
            });
            this._disposables.push(stateMappingChangedSubscription);
        });

        // Definition of Done.
        // This computed will trigger on 'keyup' event, the description typically 
        var descriptionSubscription = ko.computed(() => {
            var validateResult = BoardColumnValidator.validateDescription(this.description);
            this.descriptionIsValid(validateResult.isValid);
            this.descriptionMessage(validateResult.message);
        }).extend({ throttle: 150 });
        this._disposables.push(<any>descriptionSubscription);

        // Valid State
        var isValidSubscription = ko.computed(() => {
            var isValid = true;
            $.each(this.stateMappings.peek(), (index: number, stateMapping: IColumnStateMapping) => {
                isValid = isValid && stateMapping.isValid();
            });
            isValid = isValid && this.nameIsValid() && this.itemLimitIsValid() && this.descriptionIsValid();
            this.isValid(isValid);
        });
        this._disposables.push(isValidSubscription);

        // Dirty State
        var isDirtySubscription = ko.computed(() => {
            var isDirty = !Utils_String.equals(this._initialState, this._serialize(), false);
            this.isDirty(isDirty);
        });
        this._disposables.push(isDirtySubscription);
    }

    /**
     * @return True if it can be deleted.
     */
    public canDelete(): boolean {
        return this.isInProgressColumn();
    }

    public isInProgressColumn(): boolean {
        return this.columnType() === Work_Contracts.BoardColumnType.InProgress;
    }

    public isIncomingColumn(): boolean {
        return this.columnType() === Work_Contracts.BoardColumnType.Incoming;
    }

    public isOutgoingColumn(): boolean {
        return this.columnType() === Work_Contracts.BoardColumnType.Outgoing;
    }

    public isSortable(): boolean {
        return this.isInProgressColumn();
    }

    public getStateMappings(): IDictionaryStringTo<string> {
        var stateMappingJson: IDictionaryStringTo<string> = {};
        $.each(this.stateMappings(), (index: number, stateMapping: IColumnStateMapping) => {
            stateMappingJson[stateMapping.stateName()] = stateMapping.stateValue();
        });
        return stateMappingJson;
    }

    /**
     * Reset the view model.
     * @param options - data used to reset the view model.
     */
    public reset(options: IColumnTabViewModelOptions) {
        super.reset(options);
        var stateMappings = this.stateMappings();
        var index = 0;
        $.each(options.stateMappings, (stateName: string, stateValue: string) => {
            var stateMapping = stateMappings[index];
            stateMapping.message("");
            stateMapping.originalValue = stateValue;
            stateMapping.stateValue(stateValue);
            stateMapping.stateName(stateName);
            stateMapping.allowedValues(this._getAllowedMappings(stateName));
            index++;
        });

        this._initialState = this._serialize();
    }

    private setProportiesByColumnType(): void {
        if (this.isIncomingColumn()) {
            this.stateMappingsDescription(AgileControlsResources.Column_Settings_Incoming_State_Mapping_Subtitle);
            this.columnTypeName = BoardColumnType.INCOMING;
        }
        else if (this.isOutgoingColumn()) {
            this.stateMappingsDescription(AgileControlsResources.Column_Settings_Outgoing_State_Mapping_Subtitle);
            this.columnTypeName = BoardColumnType.OUTGOING;
        }
        else {
            this.stateMappingsDescription(AgileControlsResources.Column_Settings_State_Mapping_Subtitle);
            this.columnTypeName = BoardColumnType.INPROGRESS;
        }
    }

    private _bindStateMappings(stateMappings: IDictionaryStringTo<string>): KnockoutObservableArray<IColumnStateMapping> {
        var array: IColumnStateMapping[] = [];

        // Create state mappings for each work item type
        $.each((<ColumnTabCollectionViewModel>this.tabCollection).getWorkItemTypeNames(), (index: number, workItemTypeName: string) => {
            var stateValue = stateMappings[workItemTypeName];
            var stateAllowedValues = this._getAllowedMappings(workItemTypeName);
            var stateMapping = <IColumnStateMapping>{
                stateName: ko.observable(workItemTypeName),
                stateValue: ko.observable(stateValue),
                originalValue: stateValue,
                isValid: ko.observable(true),
                message: ko.observable(""),
                allowedValues: ko.observableArray(stateAllowedValues),
                allowEditing: ko.observable(true),
                getComboOptions: (): any => {
                    var options = {
                        allowEdit: false,
                        mode: "drop",
                        value: stateMapping.stateValue(),
                        source: stateMapping.allowedValues(),
                        enabled: stateMapping.allowEditing(),
                        label: workItemTypeName,
                        change: (combo: Controls_Combos.Combo) => {
                            stateMapping.stateValue(combo.getInputText());
                        }
                    };
                    return options;
                }
            };
            this._setOptionsCaption(stateMapping);
            if (this.isIncomingColumn() || this.isOutgoingColumn()) {
                // Allow the first/last column to be editable if there is more that one allowed meta-state
                // or if the state mappings is invalid.
                // NOTE: The incoming column type will only allow the initial state for each work item, so the only
                //       way it can be editable is if its invalid (the work item type definition states changed).
                stateMapping.allowEditing(stateAllowedValues.length > 1 || !BoardColumnValidator.validateStateMapping(this.id, stateMapping).isValid);
            }
            array.push(stateMapping);
        });
        return ko.observableArray(array);
    }

    private _setOptionsCaption(stateMapping: IColumnStateMapping) {
        stateMapping.dynamicOptionsCaption = ko.computed(() => {
            var stateValue = stateMapping.stateValue();
            if (Utils_Array.contains(stateMapping.allowedValues.peek(), stateValue, Utils_String.localeIgnoreCaseComparer)) {
                return null; // Show valid allowed values only.
            }
            return stateValue || stateMapping.originalValue || " "; // Show invalid/original value.
        });
    }

    private _getAllowedMappings(stateName: string): string[] {
        var allowedValues: string[] = [];
        if (ColumnTabCollectionViewModel.allowedMappings[this.columnType()]) {
            // The allowed mapping got from old API, this condition should be removed when we replaced it with REST API.
            allowedValues = ColumnTabCollectionViewModel.allowedMappings[this.columnType()][stateName];
        }
        else {
            // The allowed mapping got from REST API.
            allowedValues = ColumnTabCollectionViewModel.allowedMappings[this.columnTypeName][stateName];
        }
        return allowedValues;
    }

    private _serialize(): string {
        var coreObject = {
            id: this.id,
            name: this.tabName(),
            tabName: this.name(),
            itemLimit: this.itemLimit(),
            columnType: this.columnType(),
            isSplit: this.isSplit(),
            description: this.description(),
            stateMappings: this.getStateMappings()
        } as IColumnTabViewModelOptions;
        return JSON.stringify(coreObject);
    }

    public dispose() {
        $.each(this.stateMappings(), (index: number, stateMapping: IColumnStateMapping) => {
            stateMapping.dynamicOptionsCaption.dispose();
        });
        super.dispose();
    }
}

/**
 * Validator for column tab view model.
 */
export class BoardColumnValidator {
    /**
      * Validates that column name is not empty, has a length less than 256, and does not contain invalid characters.
      * @return A result containing valid state and message to be displayed.
      */
    public static validateColumnName(name: string, tabs: TFS_TabStrip_ViewModels.TabViewModel[]): TFS_TabStrip_ViewModels.ITabValidateResult {
        var isValid = true;
        var message = "";
        if (name) {
            name = name.trim();
        }
        if (!name || Utils_String.localeComparer(name, "") === 0) {
            isValid = false;
            message = AgileControlsResources.CustomizeColumnsEmptyColumnName;
        }
        else if (name.length > ColumnTabViewModel.MAX_COLUMN_NAME_LENGTH) {
            // Length limit
            isValid = false;
            message = AgileControlsResources.CustomizeColumns_LongColumnName;
        }
        else if (Utils_String.containsControlChars(name) || Utils_String.containsMismatchedSurrogateChars(name)) {
            // Invalid character
            isValid = false;
            message = AgileControlsResources.CustomizeColumnsInvalidCharactersColumnName;
        }
        else {
            // Check duplicate column name
            var duplicatedColumnNames = BoardColumnValidator.getDuplicateColumnsNames(tabs);
            if (duplicatedColumnNames.length > 0 && Utils_Array.contains(duplicatedColumnNames, name, Utils_String.localeIgnoreCaseComparer)) {
                isValid = false;
                message = AgileControlsResources.CustomizeColumnsDuplicateColumnName;
            }
        }
        return {
            isValid: isValid,
            message: message
        };
    }

    public static getDuplicateColumnsNames(tabs: TFS_TabStrip_ViewModels.TabViewModel[]): string[] {
        var duplicates: string[] = [];
        var names = {};

        $.each(tabs, (index: number, tabViewModel: ColumnTabViewModel) => {
            var name = tabViewModel.name().toLocaleLowerCase().trim();
            if (names.hasOwnProperty(name)) {
                duplicates.push(name);
            }
            else {
                names[name] = true;
            }
        });

        return duplicates;
    }

    /**
      * Validates that item limit's value is between MIN_INPROGRESS_LIMIT and MAX_INPROGRESS_LIMIT
      * @return A result containing valid state and message to be displayed.
      */
    public static validateItemLimit(itemLimit: any): TFS_TabStrip_ViewModels.ITabValidateResult {
        var integerRangeValidator = new Validation.IntegerRangeValidator();
        var isValid = integerRangeValidator.isWithinBounds(itemLimit.toString(), ColumnTabViewModel.MAX_INPROGRESS_LIMIT, ColumnTabViewModel.MIN_INPROGRESS_LIMIT);
        var message = isValid ? "" : AgileControlsResources.CustomizeColumnsInvalidWipLimit;

        return {
            isValid: isValid,
            message: message
        };
    }

    /**
      * If state value changed, show warning message. If state value is not one of the allowedValues, show error message, and set invalid state.
      * @return A result containing valid state and message to be displayed.
      */
    public static validateStateMapping(id: string, stateMapping: IColumnStateMapping): TFS_TabStrip_ViewModels.ITabValidateResult {
        /// <summary>Validates that the current state mappings is in the allowed state mappings.</summary>
        var message = "";
        var originalValue = stateMapping.originalValue;
        var currentValue = stateMapping.stateValue();
        var workItemTypeName = stateMapping.stateName.peek();
        if (id) { // This is an existing column.
            var isChanged = Utils_String.localeIgnoreCaseComparer(originalValue, currentValue) !== 0;
            var originalIsValid = Utils_Array.contains(stateMapping.allowedValues.peek(), originalValue, Utils_String.localeIgnoreCaseComparer);
            if (originalIsValid && isChanged) {
                // Warning message.
                message = Utils_String.format(AgileControlsResources.CustomizeColumnsChangeStateWarning, workItemTypeName, originalValue, currentValue);
            }
        }

        var isValid = Utils_Array.contains(stateMapping.allowedValues.peek(), currentValue, Utils_String.localeIgnoreCaseComparer);
        if (!isValid) {
            message = Utils_String.format(AgileControlsResources.CustomizeColumnsInvalidStateForColumnType, workItemTypeName, originalValue);
        }
        return {
            isValid: isValid,
            message: message
        };
    }

    /**
      * Validates that description length is below MAX_DESCRIPTION_LENGH, and auto cut the description when it exceeds UPPER_LIMIT_DESCRIPTION_LENGTH
      * @return A result containing valid state and message to be displayed.
      */
    public static validateDescription(description: KnockoutObservable<string>): TFS_TabStrip_ViewModels.ITabValidateResult {
        var isValid = true;
        var message = "";
        if (description) {
            var maxLength = ColumnTabViewModel.MAX_DESCRIPTION_LENGTH;
            var threshold = ColumnTabViewModel.DESCRIPTION_LENGTH_THRESHOLD;
            var upperLimit = ColumnTabViewModel.UPPER_LIMIT_DESCRIPTION_LENGTH;

            var contentLength = description().length;
            isValid = contentLength <= maxLength;
            var showWarning = (contentLength >= (maxLength - threshold));

            if (contentLength >= upperLimit) {
                description(description().substring(0, upperLimit));
                contentLength = upperLimit;
            }

            if (showWarning) {
                //Ensuring that both the maxLength and contentLength are formatted per the current culture and not including 2 precision points in IE automatically
                var maxLengthFormatted = Utils_Number.toDecimalLocaleString(maxLength, true, Utils_Culture.getCurrentCulture());
                var contentLengthFormatted = Utils_Number.toDecimalLocaleString(contentLength, true, Utils_Culture.getCurrentCulture());
                message = Utils_String.format(AgileControlsResources.DefinitionOfDoneCharacterCount, contentLengthFormatted, maxLengthFormatted);
                if (!isValid) {
                    message = AgileControlsResources.Column_Settings_Definition_of_Done_Prefix + " " + message;
                }
            }
        }
        return {
            isValid: isValid,
            message: message
        };
    }
}

/**
 * View model for column tab collection.
 */
export class ColumnTabCollectionViewModel extends TFS_TabStrip_ViewModels.TabCollectionViewModel<ColumnTabViewModel> {
    public static allowedMappings: Boards.IWorkItemTypeToState[];

    constructor(columns: Work_Contracts.BoardColumn[], allowedMappings: Boards.IWorkItemTypeToState[]) {
        ColumnTabCollectionViewModel.allowedMappings = allowedMappings;
        super(ColumnTabViewModel, columns);
    }

    /**
     * Delete tab.
     * @param start Index to be deleted.
     */
    public deleteTab(start: number) {
        if (start === 0 || start === this.tabs().length - 1) {
            // invalid delete tab.
            throw new Error("Non inprogress column can not be deleted");
        }
        super.deleteTab(start);
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if it is inProgress column and not the first one.
     */
    public canMoveBefore(tabIndex: number): boolean {
        var length = this.tabs().length;
        return length > 2 && tabIndex > 1 && tabIndex < length - 1;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if it is inProgress column and not the last one.
     */
    public canMoveAfter(tabIndex: number): boolean {
        var length = this.tabs().length;
        return length > 2 && tabIndex > 0 && tabIndex < length - 2;
    }

    /**
    * @params tabIndex - the current tabIndex
    * @return True if the tab is allowed to be insert before.
   */
    public canInsertBefore(tabIndex: number): boolean {
        var length = this.tabs().length;
        return length > 1 && tabIndex > 0 && tabIndex < length;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be insert after.
    */
    public canInsertAfter(tabIndex: number): boolean {
        var length = this.tabs().length;
        return length > 1 && tabIndex >= 0 && tabIndex < length - 1;
    }

    /**
     * Move tab from fromIndex to toIndex
     * @param fromIndex the index of the tab that needs to move.
     * @param toIndex the index of the tab that needs to move to.
     */
    public moveTab(fromIndex: number, toIndex: number) {
        if (fromIndex === 0 || fromIndex === this.tabs().length - 1) {
            // invalid move tab.
            return;
        }
        super.moveTab(fromIndex, toIndex);
    }

    /**
     * Generate new tab view model.
     * @param referenceTabIndex a reference tab index to be used for cloning a new tab view model.
     * @param name (optional) the name to be used for the tab view model.
     * @return new tab view model.
     */
    public createTabViewModel(referenceTabIndex: number, name?: string): ColumnTabViewModel {
        Diag.Debug.assert(referenceTabIndex >= 0 && referenceTabIndex < this.tabs().length);

        var baseTab = this.tabs()[referenceTabIndex];
        var stateMappings = this._getStateMappingsForAddedColumn(baseTab);
        var options: IColumnTabViewModelOptions = {
            id: null,
            name: AgileControlsResources.CustomizeColumnsInitialColumnName,
            columnType: Work_Contracts.BoardColumnType.InProgress,
            itemLimit: ColumnTabViewModel.BOARDCOLUMN_DEFAULT_MEMBER_LIMIT,
            isSplit: false,
            description: "",
            stateMappings: stateMappings,
            tabCollection: this
        };

        return new ColumnTabViewModel(options);
    }

    public getWorkItemTypeNames(): string[] {
        /// <summary>Helper method to retrieve the work item type names from the allowed mappings.</summary>
        /// <returns type="Array" elementType="string"/>
        var allAllowedMappings = ColumnTabCollectionViewModel.allowedMappings;
        var incomingMappings = allAllowedMappings[Object.keys(allAllowedMappings)[0]];
        var names: string[] = [];
        $.each(incomingMappings, (witName) => {
            names.push(witName);
        });
        return names;
    }

    private _getStateMappingsForAddedColumn(tabViewModel: ColumnTabViewModel): IDictionaryStringTo<string> {
        var stateMappingsForAddedColumn: IDictionaryStringTo<string> = {};
        var stateMappings = tabViewModel.getStateMappings();

        $.each(this.getWorkItemTypeNames(), (index, wit) => {
            stateMappingsForAddedColumn[wit] = stateMappings[wit];
        });
        return stateMappingsForAddedColumn;
    }
}

export interface IFieldTabViewModelOptions extends TFS_TabStrip_ViewModels.ITabViewModelOptions {
    fieldSettings: Cards.ICardFieldSetting[];
    fieldDefinitions: IDictionaryStringTo<WITOM.FieldDefinition>;
    additionalCoreFields: string[];
    boardType: string;
    canEdit: boolean;
}

export class AdditionalFieldComboViewModel {
    public fieldIdentifier: string;
    public displayName: KnockoutObservable<string> = ko.observable("");
    public showError: KnockoutObservable<boolean> = ko.observable(false);
    public errorMessage: KnockoutObservable<string> = ko.observable("");
    // hasError will be calculated based on the existence of an  error message  
    public hasError: KnockoutComputed<boolean> = ko.computed(() => {
        return Boolean(this.errorMessage());
    }, this);
}

/**
 * View model for Card Field Settings tab.
 */
export class FieldTabViewModel extends TFS_TabStrip_ViewModels.TabViewModel {
    public static MAX_ADDITIONAL_FIELD_COUNT = 10;

    public tabName: string;
    public projectName: string;
    public workItemTypeName: string;
    public showID: KnockoutObservable<boolean> = ko.observable(false);
    public showAssignedTo: KnockoutObservable<boolean> = ko.observable(false);
    public showTags: KnockoutObservable<boolean> = ko.observable(false);
    public showEffort: KnockoutObservable<boolean> = ko.observable(false);
    public assignedToSelectedFormat: KnockoutObservable<Cards.CardFieldDisplayFormats.AssignedToFieldFormats> = ko.observable(assignedToFormats.AvatarAndFullName);
    public isDirty: KnockoutObservable<boolean> = ko.observable(false);
    public additionalFields: KnockoutObservableArray<AdditionalFieldComboViewModel> = ko.observableArray<AdditionalFieldComboViewModel>([]);
    public fieldAdditionEnabled: KnockoutObservable<boolean> = ko.observable(false);
    public showEmptyFields: KnockoutObservable<boolean> = ko.observable(false);
    public focusOnAddField: KnockoutObservable<boolean> = ko.observable(false);
    public additionalFieldComboOptions: any;
    public assignedToComboOptions: any;
    public comboContainerSelector: string = ".comboarea";
    public hasEffortField; boolean;
    public canEdit: boolean;
    // Label and help text strings for core field options
    public idLabelText: string;
    public assignedToLabelText: string;
    public effortLabelText: string;
    public tagsLabelText: string;
    public showEmptyFieldsLabelText: string;

    private _availableAdditionalFieldNames: string[] = [];
    private _fieldTabOptions: IFieldTabViewModelOptions;
    private _originalSettings: Cards.ICardFieldSetting[];
    private _additionalCoreField: string;
    private _coreFields: string[] = [];
    private _displayNameToFieldDefinitionsMap: IDictionaryStringTo<WITOM.FieldDefinition> = {};

    constructor(fieldTabOptions: IFieldTabViewModelOptions) {
        super(fieldTabOptions);
        this._fieldTabOptions = fieldTabOptions;
        this.tabName = fieldTabOptions.name;
        this.canEdit = fieldTabOptions.canEdit;
        $.each(fieldTabOptions.fieldDefinitions, (index, value: WITOM.FieldDefinition) => {
            this._displayNameToFieldDefinitionsMap[value.name] = value;
        });

        this._additionalCoreField = this._getAdditionalCoreField();
        this._coreFields = Util_Cards.getCoreFieldNames(this._additionalCoreField);

        this._initializeAvailableAdditionalFields();

        this.workItemTypeName = fieldTabOptions.name;

        // For taskboard, we need to show empty fields by default.
        if (fieldTabOptions.boardType === "TASKBOARD") {
            this.showEmptyFields(true);
        }

        this._populateViewModelSettings(fieldTabOptions.fieldSettings);

        this._originalSettings = this.getCardSettings();

        this._populateLabelAndDescritionStrings();

        this.projectName = TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;

        this.additionalFieldComboOptions = {
            mode: "drop",
            source: this._availableAdditionalFieldNames,
            change: delegate(this, this._additionalFieldComboChange),
            enabled: this.canEdit,
            focus: (additionalFieldVM: AdditionalFieldComboViewModel) => {
                additionalFieldVM.showError(false);
            },
            blur: (additionalFieldVM: AdditionalFieldComboViewModel) => {
                if (additionalFieldVM.hasError()) {
                    additionalFieldVM.showError(true);
                }
            },
            dropOptions: {
                preventMouseDown: true
            },
            label: AgileControlsResources.CardFields_Settings_AdditionalFields_Label
        };

        var assignedToSubscription = ko.computed(() => {
            this.assignedToComboOptions = {
                mode: "drop",
                value: this._getAssignedToComboCurrentDisplayValue(),
                change: delegate(this, this._assignedToComboChange),
                allowEdit: false,
                source: [AgileControlsResources.CardOptionsShowAvatarAndFullName, AgileControlsResources.CardOptionsShowAvatarOnly, AgileControlsResources.CardOptionsShowFullName],
                enabled: this.canEdit,
                label: this.assignedToLabelText
            };
        });
        this._disposables.push(assignedToSubscription);

        this.hasEffortField = Boolean(this._additionalCoreField);

        var settingsChangedSubscription = ko.computed(() => {
            // Computed isDirty flag.
            var isDirty = false;
            var currentSettings = this.getCardSettings();
            if (this._areSettingsDifferent(this._originalSettings, currentSettings)) {
                var isDirty = true;
            }

            this.isDirty(isDirty);
            this._setValidState();
        });
        this._disposables.push(settingsChangedSubscription);

        var fieldAdditionEnabledSubscription = ko.computed(() => {
            this.fieldAdditionEnabled((this.additionalFields().length < FieldTabViewModel.MAX_ADDITIONAL_FIELD_COUNT) && this.canEdit);
        });
        this._disposables.push(fieldAdditionEnabledSubscription);
    }

    private _getAdditionalCoreField(): string {
        var additionalCoreField: string = null;
        if (this._fieldTabOptions.additionalCoreFields && this._fieldTabOptions.additionalCoreFields.length > 0 && this._fieldTabOptions.additionalCoreFields[0]) {
            additionalCoreField = this._fieldTabOptions.additionalCoreFields[0];

            // if the field does not belong to the wit, clear it
            if (!this._fieldTabOptions.fieldDefinitions[additionalCoreField.toUpperCase()]) {
                additionalCoreField = null;
            }
        }
        return additionalCoreField;
    }

    public addAdditionalField(): void {
        if (this.fieldAdditionEnabled()) {
            this._createAdditionalFieldViewModel();
        }
    }

    public removeAdditionalField = (additionalFieldVM: AdditionalFieldComboViewModel) => {
        var currentDisplayName: string = additionalFieldVM.displayName();
        this.additionalFields.remove(additionalFieldVM);
        if (!additionalFieldVM.hasError()) {
            this._correctDuplicateErrorMessage(currentDisplayName);
        }
        this.focusOnAddField(true);
    };

    private _correctDuplicateErrorMessage(currentDisplayName: string) {
        // remove the error on first duplicte additional field matching the field which we are removing or changing
        $.each(this.additionalFields(), (index: number, value: AdditionalFieldComboViewModel) => {
            if (Utils_String.equals(value.displayName(), currentDisplayName, true)) {
                value.errorMessage("");
                return false;
            }
        });
    }

    private _additionalFieldComboChange(currentComboValue: string, additionalFieldVM: AdditionalFieldComboViewModel) {
        var oldDisplayValue = additionalFieldVM.displayName();
        // update the view model on input change
        additionalFieldVM.displayName(currentComboValue);
        this._correctDuplicateErrorMessage(oldDisplayValue);
    }

    private _assignedToComboChange(currentComboValue: string) {
        // update the view model on input change
        switch (currentComboValue) {
            case AgileControlsResources.CardOptionsShowAvatarAndFullName:
                this.assignedToSelectedFormat(assignedToFormats.AvatarAndFullName);
                break;
            case AgileControlsResources.CardOptionsShowAvatarOnly:
                this.assignedToSelectedFormat(assignedToFormats.AvatarOnly);
                break;
            case AgileControlsResources.CardOptionsShowFullName:
                this.assignedToSelectedFormat(assignedToFormats.FullName);
                break;
        }
    }

    private _getAssignedToComboCurrentDisplayValue(): string {

        switch (this.assignedToSelectedFormat()) {
            case assignedToFormats.AvatarAndFullName:
                return AgileControlsResources.CardOptionsShowAvatarAndFullName;
            case assignedToFormats.AvatarOnly:
                return AgileControlsResources.CardOptionsShowAvatarOnly;
            case assignedToFormats.FullName:
                return AgileControlsResources.CardOptionsShowFullName;
        }
    }

    private _setValidState(): void {
        var isValid = true;
        $.each(this.additionalFields(), (index: number, value: AdditionalFieldComboViewModel) => {
            if (value.hasError() && value.showError()) {
                isValid = false;
                return false;
            }
        });

        this.isValid(isValid);
    }

    private _createAdditionalFieldViewModel(displayName?: string, fieldIdentifier?: string) {
        var newAdditionalFieldVM = new AdditionalFieldComboViewModel();
        if (displayName) {
            newAdditionalFieldVM.displayName(displayName);
        }
        if (fieldIdentifier) {
            newAdditionalFieldVM.fieldIdentifier = fieldIdentifier;
        }

        var displayNameChangedSubscription = newAdditionalFieldVM.displayName.subscribe((newDisplayValue) => {
            var newDisplayValue = newAdditionalFieldVM.displayName();
            var errorMessage: string = "";
            var fieldDefinition = this._displayNameToFieldDefinitionsMap[newDisplayValue];
            if (fieldDefinition && this._isFieldAllowedInAdditionalFields(fieldDefinition)) {
                newAdditionalFieldVM.fieldIdentifier = fieldDefinition.referenceName;
                errorMessage = this._isAdditionalFieldDuplicate(newAdditionalFieldVM) ? AgileControlsResources.CardOptions_DuplicateFieldError : "";
            }
            else {
                errorMessage = AgileControlsResources.CardFieldOptions_InvalidFieldError;
            }

            newAdditionalFieldVM.errorMessage(errorMessage);
            this.isDirty(true);

        });
        this._disposables.push(displayNameChangedSubscription);

        this.additionalFields().push(newAdditionalFieldVM);
        this.additionalFields.valueHasMutated();

        return newAdditionalFieldVM;
    }

    private _isFieldAllowedInAdditionalFields(fieldDefinition: WITOM.FieldDefinition) {
        var fieldReferenceName = fieldDefinition.referenceName;
        switch (fieldReferenceName.toUpperCase()) {
            case DatabaseCoreFieldRefName.Title.toUpperCase():
            case DatabaseCoreFieldRefName.Id.toUpperCase():
            case DatabaseCoreFieldRefName.Tags.toUpperCase():
                return false;
            default:
                return this._isFieldTypeAllowed(fieldDefinition.type);
        }
    }

    private _isAdditionalFieldDuplicate(additionalFieldVM: AdditionalFieldComboViewModel): boolean {
        var currentItemIndex = this.additionalFields.indexOf(additionalFieldVM);
        var isDuplicate = false;
        $.each(this.additionalFields.peek(), (index, value) => {
            if (Utils_String.equals(additionalFieldVM.displayName.peek(), value.displayName.peek(), true) && (currentItemIndex !== index)) {
                isDuplicate = true;
                return false;
            }
        });
        return isDuplicate;
    }

    /**
     * _populateViewModelSettings: Populaltes this view model's members based on the given field settings. 
     * @param fieldSettings . 
     */
    private _populateViewModelSettings(fieldSettings: Cards.ICardFieldSetting[]) {
        var fieldIdentifier = Cards.CardSettings.FIELD_IDENTIFIER,
            displayFormat = Cards.CardSettings.DISPLAY_FORMAT;

        $.each(fieldSettings, (index: number, value: Cards.ICardFieldSetting) => {
            var fieldIdentifierValue: string = value[fieldIdentifier];
            var coreFields = Util_Cards.getCoreFieldNames(this._additionalCoreField);
            if (Utils_String.equals(fieldIdentifierValue, DatabaseCoreFieldRefName.Id, true) && Util_Cards.shouldRenderAsCoreField(value, coreFields)) {
                this.showID(true);
            }
            else if (Utils_String.equals(fieldIdentifierValue, DatabaseCoreFieldRefName.AssignedTo, true) && Util_Cards.shouldRenderAsCoreField(value, coreFields)) {
                this.showAssignedTo(true);
                // Use display format from the given settings only if it is a valid format,
                // Otherwise we will fallback to default value (Show Full Name and Avatar), which has already been set
                var assignedToFormat = assignedToFormats[value[displayFormat]];
                if (assignedToFormat !== null && assignedToFormat !== undefined) {
                    this.assignedToSelectedFormat(assignedToFormat);
                }
            }
            else if (Utils_String.equals(fieldIdentifierValue, DatabaseCoreFieldRefName.Tags, true)) {
                this.showTags(true);
            }
            else if (this._additionalCoreField &&
                Utils_String.equals(value[fieldIdentifier], this._additionalCoreField, true) &&
                Util_Cards.shouldRenderAsCoreField(value, coreFields)) {
                this.showEffort(true);
            }
            else if (Utils_String.equals(fieldIdentifierValue, DatabaseCoreFieldRefName.Title, true)) {
                //do nothing
            }
            else if (!fieldIdentifierValue) {
                var showEmptyFields = Util_Cards.getBoolShowEmptyFieldsFromString(value[Cards.CardSettings.SHOW_EMPTY_FIELDS], this.showEmptyFields());
                this.showEmptyFields(showEmptyFields);
            }

            if (Util_Cards.shouldRenderAsAdditionalField(value, coreFields)) {
                var field = this._fieldTabOptions.fieldDefinitions[fieldIdentifierValue.toUpperCase()];
                if (field) {
                    this._createAdditionalFieldViewModel(field.name, value["fieldIdentifier"]);
                }
            }
        });
    }

    private _populateLabelAndDescritionStrings() {
        // ID
        this.idLabelText = this._getFieldLabel(DatabaseCoreFieldRefName.Id);

        // AssignedTo
        this.assignedToLabelText = this._getFieldLabel(DatabaseCoreFieldRefName.AssignedTo);

        // Effort
        this.effortLabelText = this._getFieldLabel(this._getEffortFieldRefName());

        // Tags
        this.tagsLabelText = this._getFieldLabel(DatabaseCoreFieldRefName.Tags);

        this.showEmptyFieldsLabelText = this._getFieldLabel();
    }

    private _getFieldLabel(fieldRefName?: string): string {
        var labelText = fieldDisplayName,
            fieldDisplayName = this._getFieldDisplayNameFromRefName(fieldRefName),
            effortRefName = this._getEffortFieldRefName();

        if (Utils_String.ignoreCaseComparer(fieldRefName, DatabaseCoreFieldRefName.AssignedTo) === 0) {
            labelText = Utils_String.format(AgileControlsResources.CardOptions_ShowAssignedToFieldAs, fieldDisplayName);
        }
        else if (Utils_String.ignoreCaseComparer(fieldRefName, DatabaseCoreFieldRefName.Id) === 0) {
            labelText = Utils_String.format(AgileControlsResources.CardOptions_ShowWorkItemId, fieldDisplayName);
        }
        else if (Utils_String.ignoreCaseComparer(fieldRefName, DatabaseCoreFieldRefName.Tags) === 0) {
            labelText = Utils_String.format(AgileControlsResources.CardOptions_ShowTags, fieldDisplayName);
        }
        else if (effortRefName && Utils_String.ignoreCaseComparer(fieldRefName, effortRefName) === 0) {
            labelText = Utils_String.format(AgileControlsResources.CardOptions_ShowEffort, fieldDisplayName);
        }
        else if (!fieldRefName) {
            labelText = AgileControlsResources.CardFieldOptions_ShowEmptyFieldsLabel;
        }

        return labelText;
    }

    private _getFieldDisplayNameFromRefName(refname: string): string {
        var displayName = "",
            upperCaseRefName = "";
        if (refname) {
            upperCaseRefName = refname.toUpperCase();
        }
        if (upperCaseRefName && this._fieldTabOptions.fieldDefinitions[upperCaseRefName]) {
            displayName = this._fieldTabOptions.fieldDefinitions[upperCaseRefName].name;
        }
        return displayName;
    }

    private _getEffortFieldRefName(): string {
        var effortRefName = "";
        if (this._fieldTabOptions && this._fieldTabOptions.additionalCoreFields) {
            effortRefName = this._fieldTabOptions.additionalCoreFields[0];
        }
        return effortRefName;
    }

    private _areSettingsDifferent(original: Cards.ICardFieldSetting[], current: Cards.ICardFieldSetting[]): boolean {
        var isDifferent = false,
            originalCoreFields: IDictionaryStringTo<Cards.ICardFieldSetting> = {},
            currentCoreFields: IDictionaryStringTo<Cards.ICardFieldSetting> = {},
            originalAdditionalFields: Cards.ICardFieldSetting[] = [],
            currentAdditionalFields: Cards.ICardFieldSetting[] = [],
            originalShowEmptyFields = true,
            currentShowEmptyFields = true;

        if (original && current) {
            if (original.length !== current.length) {
                isDifferent = true;
            }
            else {
                // Break into additional and core fields
                var length = original.length;
                var fieldIdentifier: string;

                originalShowEmptyFields = this._splitSettingsIntoCoreAndAdditionalFields(original, originalCoreFields, originalAdditionalFields);
                currentShowEmptyFields = this._splitSettingsIntoCoreAndAdditionalFields(current, currentCoreFields, currentAdditionalFields);

                // Compare core fields
                isDifferent = this._areCoreFieldSettingsDifferent(originalCoreFields, currentCoreFields);

                if (!isDifferent) {
                    // compare "hide empty fields" setting
                    if (currentShowEmptyFields !== originalShowEmptyFields) {
                        isDifferent = true;
                    }

                    if (!isDifferent) {
                        // compare additional fields
                        var fieldIdentifier = Cards.CardSettings.FIELD_IDENTIFIER;

                        if (originalAdditionalFields.length !== currentAdditionalFields.length) {
                            isDifferent = true;
                        }
                        else {
                            length = originalAdditionalFields.length;
                            for (var i = 0; i < length; i++) {
                                if (!(Utils_String.equals(originalAdditionalFields[i][fieldIdentifier], currentAdditionalFields[i][fieldIdentifier]))) {
                                    isDifferent = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        else if (!(!original && !current)) {
            isDifferent = true;
        }

        return isDifferent;
    }

    private _splitSettingsIntoCoreAndAdditionalFields(cardSettings: Cards.ICardFieldSetting[],
        coreFields: IDictionaryStringTo<Cards.ICardFieldSetting>,
        additionalFields: Cards.ICardFieldSetting[]): boolean {
        var showEmptyFields = this._fieldTabOptions.boardType === "KANABAN" ? false : true;
        for (var i = 0; i < cardSettings.length; i++) {
            var fieldIdentifier = cardSettings[i][Cards.CardSettings.FIELD_IDENTIFIER];
            if (this._isCoreField(fieldIdentifier)) {
                if (!Utils_String.equals(cardSettings[i][Cards.CardSettings.FIELD_DISPLAY_TYPE], Cards.CardFieldDisplayType[Cards.CardFieldDisplayType.ADDITIONAL], true)) {
                    // Convert to uppercase because the comparison is case-insensitive
                    coreFields[fieldIdentifier.toUpperCase()] = cardSettings[i];
                }
                if (Utils_String.equals(cardSettings[i][Cards.CardSettings.FIELD_DISPLAY_TYPE], Cards.CardFieldDisplayType[Cards.CardFieldDisplayType.COREANDADDITIONAL], true)
                    || Utils_String.equals(cardSettings[i][Cards.CardSettings.FIELD_DISPLAY_TYPE], Cards.CardFieldDisplayType[Cards.CardFieldDisplayType.ADDITIONAL], true)) {
                    additionalFields.push(cardSettings[i]);
                }
            }
            else if (!fieldIdentifier) {
                showEmptyFields = Util_Cards.getBoolShowEmptyFieldsFromString(cardSettings[i][Cards.CardSettings.SHOW_EMPTY_FIELDS], this.showEmptyFields());
            }
            else {
                additionalFields.push(cardSettings[i]);
            }
        }
        return showEmptyFields;
    }

    private _isCoreField(fieldIdentifier: string): boolean {
        var length = this._coreFields.length,
            isCoreField = false;
        for (var i = 0; i < length; i++) {
            // Do a case insensitive comparison
            if (Utils_String.equals(this._coreFields[i], fieldIdentifier, true)) {
                isCoreField = true;
                break;
            }
        }

        return isCoreField;
    }

    private _areCoreFieldSettingsDifferent(original: IDictionaryStringTo<Cards.ICardFieldSetting>, current: IDictionaryStringTo<Cards.ICardFieldSetting>) {
        // For core fields the order in which they appear in the settings does not matter, since we always show them in a fixed order

        var originalLength = 0,
            currentLength = 0,
            isDifferent = false;

        for (var field in original) {
            if (original.hasOwnProperty(field)) {
                originalLength++;
            }
        }

        for (var field in current) {
            if (current.hasOwnProperty(field)) {
                currentLength++;
            }
        }

        // Compare the lengths first
        if (originalLength !== currentLength) {
            isDifferent = true;
        }

        if (!isDifferent) {
            var displayFormat = Cards.CardSettings.DISPLAY_FORMAT;
            var displayType = Cards.CardSettings.FIELD_DISPLAY_TYPE;
            // Compare individual fields
            for (var field in original) {
                if (original.hasOwnProperty(field)) {
                    if (current.hasOwnProperty(field)) {
                        // Check if display format is same or not
                        if (!(Utils_String.equals(original[field][displayFormat], current[field][displayFormat], true))) {
                            isDifferent = true;
                            break;
                        }
                        // Check if display type is same or not
                        else if (!(Utils_String.equals(original[field][displayType], current[field][displayType], true))) {
                            isDifferent = true;
                            break;
                        }
                    }
                    else {
                        isDifferent = true;
                        break;
                    }
                }
            }
        }


        return isDifferent;
    }


    /**
  * Returns the currently configured settings
  */
    public getCardSettings(): Cards.ICardFieldSetting[] {
        var cardField: Cards.ICardFieldSetting;
        var cardFieldSettings: Cards.ICardFieldSetting[] = [];
        var showEmptyFields: string;

        cardField = { fieldIdentifier: DatabaseCoreFieldRefName.Title };
        cardFieldSettings.push(cardField);

        $.each(this.additionalFields(), (index: number, value: AdditionalFieldComboViewModel) => {
            if (!value.hasError() && (value.displayName() !== "")) {
                cardField = {
                    fieldIdentifier: value.fieldIdentifier
                };
                if (this._isCoreField(value.fieldIdentifier)) {
                    cardField[FIELD_DISPLAY_TYPE] = Cards.CardFieldDisplayType[Cards.CardFieldDisplayType.ADDITIONAL];
                }
                cardFieldSettings.push(cardField);
            }
        });

        var setCoreFieldSetting = (coreFieldRefName: string, displayFormat?: string) => {
            // if the core field has already been added as an additional field, mark it as COREANDADDITIONAL, else only as CORE
            var index = Utils_Array.findIndex(cardFieldSettings, field => (Utils_String.equals(field[FIELD_IDENTIFIER], coreFieldRefName, true)));
            if (index > 0) {
                cardField = cardFieldSettings[index];
                cardField[FIELD_DISPLAY_TYPE] = Cards.CardFieldDisplayType[Cards.CardFieldDisplayType.COREANDADDITIONAL];

            } else {
                cardField = { fieldIdentifier: coreFieldRefName, displayType: Cards.CardFieldDisplayType[Cards.CardFieldDisplayType.CORE] };
                cardFieldSettings.push(cardField);
            }
            if (displayFormat) {
                cardField[DISPLAY_FORMAT] = displayFormat;
            }
        };

        if (this.showID()) {
            setCoreFieldSetting(DatabaseCoreFieldRefName.Id);
        }
        if (this.showAssignedTo()) {
            setCoreFieldSetting(DatabaseCoreFieldRefName.AssignedTo, assignedToFormats[this.assignedToSelectedFormat()]);
        }
        if (this.showEffort()) {
            setCoreFieldSetting(this._fieldTabOptions.additionalCoreFields[0]);
        }
        if (this.showTags()) {
            setCoreFieldSetting(DatabaseCoreFieldRefName.Tags);
        }

        showEmptyFields = this.showEmptyFields().toString();
        cardField = {
            showEmptyFields: showEmptyFields
        };
        cardFieldSettings.push(cardField);

        return cardFieldSettings;
    }


    private _isFieldTypeAllowed(type: WITConstants.FieldType): boolean {
        switch (type) {
            case WITConstants.FieldType.String:
            case WITConstants.FieldType.PlainText:
            case WITConstants.FieldType.Integer:
            case WITConstants.FieldType.DateTime:
            case WITConstants.FieldType.TreePath:
            case WITConstants.FieldType.Boolean:
            case WITConstants.FieldType.Double:
                return true;
            default:
                return false;
        }
    }


    private _initializeAvailableAdditionalFields() {
        var coreFieldsDisallowedAsAdditional: string[] = [DatabaseCoreFieldRefName.Id, DatabaseCoreFieldRefName.Title, DatabaseCoreFieldRefName.Tags];

        $.map(this._fieldTabOptions.fieldDefinitions, (fieldDef: WITOM.FieldDefinition, fieldName: string) => {
            if (!Utils_Array.contains(this._availableAdditionalFieldNames, fieldDef.name, Utils_String.ignoreCaseComparer) &&
                !Utils_Array.contains(coreFieldsDisallowedAsAdditional, fieldDef.referenceName, Utils_String.ignoreCaseComparer) &&
                this._isFieldTypeAllowed(fieldDef.type) &&
                fieldDef.isQueryable() &&
                !fieldDef.isIgnored() &&
                !Util_Cards.isFieldBlackListed(fieldDef.referenceName)) {
                this._availableAdditionalFieldNames.push(fieldDef.name);
            }
        });

        Utils_Array.uniqueSort<string>(this._availableAdditionalFieldNames, (a: string, b: string) => {
            return Utils_String.localeIgnoreCaseComparer(a, b);
        });
    }

    /**
     * @return false as none of the tabs should be 'delete-able'.
     */
    public canDelete(): boolean {
        return false;
    }

    /**
     * @return True if the tab can be sortable.
     */
    public isSortable(): boolean {
        return false;
    }

    /** Reset the view model.
     * @param options - data used to reset the view model.
     */
    public reset(options: IFieldTabViewModelOptions) {
        //this method is called when the settings are saved (not closed) on the CSC dialog
        // reset the original settings and remove any empty additional fields
        super.reset(options);
        this._originalSettings = options.fieldSettings;
        var emptyAdditionalFields: AdditionalFieldComboViewModel[] = [];
        $.each(this.additionalFields(), (index: number, additionalFieldVM: AdditionalFieldComboViewModel) => {
            if ((additionalFieldVM.displayName() === "") && !additionalFieldVM.hasError()) {
                emptyAdditionalFields.push(additionalFieldVM);
            }
        });

        this.additionalFields.removeAll(emptyAdditionalFields);
    }

}

/**
 * View model for fields tab collection.
 */
export class FieldTabCollectionViewModel extends TFS_TabStrip_ViewModels.TabCollectionViewModel<FieldTabViewModel> {
    constructor(fieldTabCollectionOptions: IFieldTabViewModelOptions[]) {
        super(FieldTabViewModel, fieldTabCollectionOptions);
    }


    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be moved before.
    */
    public canMoveBefore(tabIndex: number): boolean {
        return false;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be moved after.
    */
    public canMoveAfter(tabIndex: number): boolean {
        return false;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be insert before.
    */
    public canInsertBefore(tabIndex: number): boolean {
        return false;
    }

    /**
     * @params tabIndex - the current tabIndex
     * @return True if the tab is allowed to be insert after.
    */
    public canInsertAfter(tabIndex: number): boolean {
        return false;
    }

}
