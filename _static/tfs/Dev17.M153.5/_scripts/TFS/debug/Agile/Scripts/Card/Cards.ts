/// <reference types="jquery" />

import "VSS/LoaderPlugins/Css!Cards";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Diag = require("VSS/Diag");

import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");

import WIT = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import Work_Contracts = require("TFS/Work/Contracts");


export module Notifications {
    export var CardWorkItemListBeginEdit = "VSS.Agile.Boards.CardWorkItemListBeginEdit";
    export var CardWorkItemListEndEdit = "VSS.Agile.Boards.CardWorkItemListEndEdit";
    export var CardWorkItemListAddChild = "VSS.Agile.Boards.CardWorkItemListAddChild";
}


//in sync with WIT FieldType
export enum CardFieldType {
    String = 1,
    Integer = 2,
    DateTime = 3,
    PlainText = 5,
    Html = 7,
    TreePath = 8,
    Double = 10,
    Guid = 11,
    Boolean = 12,
    Identity    //This is a type not part of WIT
}

export interface IFieldDefinition {
    ReferenceName: string;
    Name: string;
    Type: CardFieldType;
    IsEditable: boolean;
    IsIdentity: boolean;
}

/*An field on a board item.*/
export class CardFieldDefinition {

    protected _refName: string;
    protected _displayName: string;
    protected _type: CardFieldType;
    protected _isEditable: boolean;

    constructor(referenceName: string, displayName?: string, fieldType?: CardFieldType, isEditable?: boolean) {

        this._refName = referenceName;
        this._displayName = displayName;
        this._type = fieldType;
        this._isEditable = isEditable;

    }

    /*
     * Returns name for the field
     * @return string The display name
     */
    public displayName(): string {

        return this._displayName;
    }

    /*
     * Returns reference name for the field
     * @return string The reference name
     */
    public referenceName(): string {

        return this._refName;
    }

    /**
    * Returns type of the field
    * @return CardFieldType The field type
    */
    public type(): CardFieldType {

        return this._type;
    }

    /**
     * Returns if the field is a user field
     * @return boolean
     */
    public isIdentity(): boolean {

        return this._type === CardFieldType.Identity;
    }

    /**
     * Returns if the field is editable
     * @return boolean true if editable, false otherwise
     */
    public isEditable(): boolean {

        return this._isEditable;
    }

    /**
     * checks if the value is valid for the field type
     * @param any the  field value 
     * @returns boolean if the field value is valid for the specified type
     */
    public isValid(fieldValue: any): boolean {
        Diag.Debug.fail("isValid: IsAbstract");
        return false;
    }


    /**
     * normalize the field value for displaying to the user
     * @param string the original field value 
     * @returns string the transformed value as to be displayed
     */
    public convertToExternal(fieldValue: any): string {
        Diag.Debug.fail("convertToExternal: IsAbstract");
        return null;
    }

    /**
     * normalize the field value from the user displayed format to internal format
     * @param string the value as displayed to the user
     * @returns string the field value to be saved internally
     */
    public convertToInternal(fieldValue: string): string {
        Diag.Debug.fail("convertToInternal: IsAbstract");
        return null;
    }

}

export class FieldSetting implements Work_Contracts.FieldSetting {
}

export class BoardCardSettings implements Work_Contracts.BoardCardSettings {
    cards: {
        [key: string]: FieldSetting[];
    };
    constructor() {
        this.cards = {};
    }
    public addVal(key: string, val: FieldSetting[]) {
        this.cards[key] = val;
    }
}

/**A field on a board item. */
export class CardField {
    constructor() {

    }

    /**
     * Returns the reference name for the field
     * @return string reference name
     */
    public referenceName(): string {
        Diag.Debug.fail("referenceName: IsAbstract");
        return null;
    }

    /**
     * Returns the id of the parent item
     * @return number item id
     */
    public itemId(): number {
        Diag.Debug.fail("itemId: IsAbstract");
        return null;
    }

    /**
     * Returns the definition for the field
     * @return CardFieldDefinition
     */
    public definition(): CardFieldDefinition {

        Diag.Debug.fail("definition: IsAbstract");
        return null;
    }

    /**
     * Returns the settings for the field
     * @return ICardFieldSetting
     */
    public fieldSetting(): ICardFieldSetting {

        Diag.Debug.fail("fieldSetting: IsAbstract");
        return null;
    }

    /**
     * Returns the allowed values for the field
     * @return string[]
     */
    public getAllowedValues(currentValue: string): string[] {

        Diag.Debug.fail("getAllowedValues: IsAbstract");
        return null;
    }

    /**
     * Sets additional values for this card field
     */
    public setAdditionalValues(values: string[]): void {

        Diag.Debug.fail("setAdditionalValues: IsAbstract");
        return null;
    }

    /**
    * Returns additional values for the field
    * @return string[]
    */
    public getAdditionalValues(): string[] {

        Diag.Debug.fail("getAdditionalValues: IsAbstract");
        return null;
    }

    /**
     * Returns if the field has allowed values
     * @return boolean
     */
    public hasAllowedValues(): boolean {

        Diag.Debug.fail("hasAllowedValues: IsAbstract");
        return false;
    }

    /**
     * Returns if the field is editable
     * @return boolean
     */
    public isEditable(): boolean {

        Diag.Debug.fail("isEditable: IsAbstract");
        return false;
    }

    /**
     * Returns if the field must have a value
     * @return boolean
     */
    public isRequired(): boolean {

        Diag.Debug.fail("isRequired: IsAbstract");
        return false;
    }


    /**
     * Returns if field values are limited to those allowed
     * @return boolean
     */
    public isLimitedToAllowedValues(): boolean {

        Diag.Debug.fail("isLimitedToAllowedValues: IsAbstract");
        return false;
    }

    /**
     * Return the scope to identity controls
     */
    public getFilterByScope(): any | null {
        Diag.Debug.fail("getFilterByScope: IsAbstract");
        return null;
    }

    /**
     * gets/sets the field value 
     * @param fieldValue the value to be set. If undefined, value() is treated as get
     * @return the field value
     */
    public value(fieldValue?: any): any {
        Diag.Debug.fail("value: IsAbstract");
        return null;
    }
}

export interface ICardFieldSetting extends IDictionaryStringTo<string> {
}

export class CardSettings {
    public static FIELD_IDENTIFIER = "fieldIdentifier";
    public static DISPLAY_FORMAT = "displayFormat";
    public static SHOW_EMPTY_FIELDS = "showEmptyFields";
    public static FIELD_DISPLAY_TYPE = "displayType";

    public fields: ICardFieldSetting[];
    public workItemType: string;

    constructor(fieldSettings: ICardFieldSetting[]) {
        Diag.Debug.assertParamIsArray(fieldSettings, "fieldSettings", true);
        this.fields = fieldSettings;
    }

    public containsField(fieldIdentifier): boolean {
        return this.getField(fieldIdentifier) !== null;
    }

    public getField(fieldIdentifier): ICardFieldSetting {
        var filteredItems = this.fields.filter((value: ICardFieldSetting) => (Utils_String.ignoreCaseComparer(value["fieldIdentifier"], fieldIdentifier) === 0));
        Diag.Debug.assert(filteredItems.length <= 1, "The card settings can have atmost one entry for a field");
        if (filteredItems.length > 0) {
            return filteredItems[0];
        }
        return null;
    }

    public isShowEmptyFieldsEnabled(): boolean {
        // Walking backwards here because the record we are interested in is currently always at the end
        for (var i = this.fields.length - 1; i >= 0; i--) {
            if (this.fields[i].hasOwnProperty(CardSettings.SHOW_EMPTY_FIELDS)) {
                return TFS_Core_Utils.BoolUtils.parse(this.fields[i][CardSettings.SHOW_EMPTY_FIELDS]);
            }
        }

        return false;
    }
}

export interface IStyleRule {
    name: string;
    type: string;
    isEnabled: boolean;
    styles?: ICardRuleAttribute;
    criteria?: IItemQuery;
}

export interface ICardRuleAttribute extends IDictionaryStringTo<string> {
}

export interface IItemQuery {
    clauses: IQueryClause[];
    groups: IQueryGroup[];
    maxGroupLevel: number;
}

export interface IQueryGroup {
    end: number;
    start: number;
    level: number;
}

export interface IQueryClause {
    fieldName: string;
    index: number;
    logicalOperator: string;
    operator: string;
    value: any;
}

export interface IBoardCardSettings {
    scope: string;
    scopeId: string;
    cards: IDictionaryStringTo<ICardFieldSetting[]>;
    styles: IStyleRule[];
}

export class CardSettingsProvider {

    private _boardCardSettings: IBoardCardSettings;
    private _originalCardSettings: IBoardCardSettings;
    private _itemTypeToCardSettingsMap: IDictionaryStringTo<CardSettings>;

    constructor(boardCardSettings: IBoardCardSettings) {
        Diag.Debug.assertIsNotNull(boardCardSettings, "boardCardSettings");
        this._originalCardSettings = JSON.parse(JSON.stringify(boardCardSettings));
        this._boardCardSettings = boardCardSettings;
        this._itemTypeToCardSettingsMap = {};
    }

    public getCardSettingsForItemType(itemType: string): CardSettings {
        if (!this._itemTypeToCardSettingsMap[itemType]) {
            var cardFieldSettings = this._boardCardSettings.cards[itemType];

            if (!cardFieldSettings || cardFieldSettings.length < 1) {
                // default field settings
                cardFieldSettings = [{ "fieldIdentifier": WITConstants.CoreFieldRefNames.Title }, { "fieldIdentifier": WITConstants.CoreFieldRefNames.AssignedTo }];
            }
            this._itemTypeToCardSettingsMap[itemType] = new CardSettings(cardFieldSettings);
        }
        return this._itemTypeToCardSettingsMap[itemType];
    }

    public getCardSettings(): IBoardCardSettings {
        return this._boardCardSettings;
    }

    public setCardSettings(boardCardSettings: IBoardCardSettings) {
        this._originalCardSettings = JSON.parse(JSON.stringify(boardCardSettings));
        this._boardCardSettings = boardCardSettings;
    }

    public areCardSettingsEqual(newBoardCardSettings: IBoardCardSettings) {
        return Utils_Core.equals(this._originalCardSettings, newBoardCardSettings);
    }

    public dispose() {
        this._itemTypeToCardSettingsMap = null;
        this._boardCardSettings = null;
        this._originalCardSettings = null;
    }
}

export module CardFieldDisplayFormats {
    export enum AssignedToFieldFormats {
        AvatarOnly = 0,
        FullName = 1,
        AvatarAndFullName = 2
    }
}

export enum CardFieldDisplayType {
    CORE = 0,
    ADDITIONAL = 1,
    COREANDADDITIONAL = 2
}

/**A field definition for on a wit item field.*/
export class WitCardFieldDefinition extends CardFieldDefinition {
    private _witStore: WIT.WorkItemStore;
    private _witFieldDef: WIT.FieldDefinition;

    constructor(referenceName: string, displayName?: string, fieldType?: CardFieldType, isEditable?: boolean, isIdentity?: boolean) {

        super(referenceName, displayName, isIdentity ? CardFieldType.Identity : fieldType, isEditable);

        if (isEditable === undefined || fieldType === undefined || displayName === undefined) {
            this._initialize();
        }
    }

    private _initialize() {
        this._witStore = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService(WIT.WorkItemStore);
        if (this._witStore) {
            this._witStore.beginGetFields(() => {
                this._witFieldDef = this._witStore.getFieldDefinition(this._refName);

                if (!this._displayName && this._witFieldDef) {
                    this._displayName = this._witFieldDef.name;
                }
                if (!this._type && this._witFieldDef) {
                    this._type = <any>this._witFieldDef.type;
                }
            });
        }
    }

    /*
     * Returns name for the field
     * @return string The display name
     */
    public displayName(): string {

        return this._displayName;
    }

    /*
     * Returns reference name for the field
     * @return string The reference name
     */
    public referenceName(): string {

        return this._refName;
    }

    /**
    * Returns type of the field
    * @return CardFieldType The field type
    */
    public type(): CardFieldType {

        return this._type;
    }

    /**
     * Returns if the field is editable
     * @return boolean true if editable, false otherwise
     */
    public isEditable(): boolean {

        if (this._witFieldDef) {
            this._isEditable = this._witFieldDef.isEditable();
        }
        return this._isEditable;
    }

    /**
     * checks if the value is valid for the field type
     * @param any the  field value 
     * @returns boolean if the field value is valid for the specified type
     */
    public isValid(fieldValue: any): boolean {
        var type = (this.type() === CardFieldType.Identity) ? CardFieldType.String : this.type();
        return !WIT.Field.convertValueToInternal(this._witStore, fieldValue, <any>type).status;
    }

    /**
    * normalize the field value for displaying to the user
    * @param string the original field value 
    * @returns string the transformed value as to be displayed
    */
    public convertToExternal(fieldValue: any): string {
        var displayValue = "";

        switch (this.type()) {
            case CardFieldType.Identity: {
                fieldValue = fieldValue ? fieldValue : WITResources.AssignedToEmptyText;
                displayValue = Utils_Core.convertValueToDisplayString(fieldValue);
                break;
            }
            case CardFieldType.DateTime: {
                var date = null;
                if (fieldValue instanceof Date) {
                    date = fieldValue;
                } else if (typeof fieldValue === "number" || typeof fieldValue === "string") {
                    date = new Date(<number>fieldValue);
                }

                if (date != null) {
                    displayValue = Utils_Date.localeFormat(date, "d");
                }
                break;
            }
            default: {
                displayValue = Utils_Core.convertValueToDisplayString(fieldValue);
                break;
            }
        }
        return displayValue;
    }


    /**
     * normalize the field value from the user displayed format to internal format
     * @param string the value as displayed to the user
     * @returns string the field value to be saved internally
     */
    public convertToInternal(fieldValue: string): string {
        switch (this.type()) {

            case CardFieldType.Identity:
                if (!Utils_String.localeIgnoreCaseComparer(fieldValue, WITResources.AssignedToEmptyText)) {
                    fieldValue = "";
                }
                break;
            default:
                break;
        }
        return fieldValue;
    }

}

export class WitCardField extends CardField {

    private _witField: WIT.Field;
    private _id: number;
    private _cardFieldDef: WitCardFieldDefinition;
    private _cardFieldSetting: ICardFieldSetting;
    private _additionalFieldValues: string[];

    constructor(id: number, cardFieldDefinition: WitCardFieldDefinition, cardFieldSetting: ICardFieldSetting) {
        Diag.Debug.assertParamIsNotNull(cardFieldDefinition, "cardFieldDefinition");
        Diag.Debug.assertParamIsNotNull(cardFieldSetting, "cardFieldSetting");

        super();
        this._id = id;
        this._cardFieldDef = cardFieldDefinition;
        this._cardFieldSetting = cardFieldSetting;
    }

    /**
     * Returns the reference name for the field
     * @return string
     */
    public referenceName(): string {
        return this._cardFieldDef.referenceName();
    }

    /**
     * Returns the id of the parent item
     * @return number item id
     */
    public itemId(): number {
        return this._id;
    }

    /**
     * Returns the definition for the field
     * @return CardFieldDefinition
     */
    public definition(): CardFieldDefinition {
        return this._cardFieldDef;
    }

    /**
     * Returns the settings for the field
     * @return ICardFieldSetting
     */
    public fieldSetting(): ICardFieldSetting {
        return this._cardFieldSetting;
    }

    /**
     * Returns if the field is editable
     * @return boolean
     */
    public isEditable(): boolean {
        var isEditable = false;

        var witField: WIT.Field = this._getWitField();
        if (witField) {
            isEditable = witField.isEditable();
        } else {
            isEditable = this._cardFieldDef.isEditable();
        }
        return isEditable;
    }

    /**
     * Returns if the field must have a value
     * @return boolean
     */
    public isRequired(): boolean {

        var isRequired = true;

        var witField: WIT.Field = this._getWitField();
        if (witField) {
            isRequired = witField.isRequired();
        } else {
            switch (this.referenceName()) {
                case WITConstants.CoreFieldRefNames.Title:
                case WITConstants.CoreFieldRefNames.AssignedTo:
                case WITConstants.CoreFieldRefNames.State:
                case WITConstants.CoreFieldRefNames.AreaPath:
                case WITConstants.CoreFieldRefNames.IterationPath:
                    {
                        isRequired = true;
                        break;
                    }
            }
        }
        return isRequired;
    }

    /**
     * Returns the allowed   for the field
     * @return string[]
     */
    public getAllowedValues(currentValue: string): string[] {
        var witField: WIT.Field = this._getWitField();
        if (witField) {
            return witField.getAllowedValues();
        }
        return [];
    }

    /**
     * Returns if the field has allowed values
     * @return boolean
     */
    public hasAllowedValues(): boolean {
        var hasAllowedValues = false;

        var witField: WIT.Field = this._getWitField();
        if (witField) {
            hasAllowedValues = witField.hasList();
        } else {
            switch (this.referenceName()) {
                case WITConstants.CoreFieldRefNames.AssignedTo:
                case WITConstants.CoreFieldRefNames.State:
                case WITConstants.CoreFieldRefNames.AreaPath:
                case WITConstants.CoreFieldRefNames.IterationPath:
                    {
                        hasAllowedValues = true;
                        break;
                    }
            }
        }
        return hasAllowedValues;
    }

    /**
     * Returns if field values are limited to those allowed
     * @return boolean
     */
    public isLimitedToAllowedValues(): boolean {
        var witField: WIT.Field = this._getWitField();
        if (witField) {
            return witField.isLimitedToAllowedValues();
        }
        return false;
    }

    /**
     * gets/sets the field value
     * @param the field value to be set
     * @return any
     */
    public value(fieldValue?: any): any {
        var witField: WIT.Field = this._getWitField();
        if (witField) {
            if (fieldValue === undefined) {
                fieldValue = witField.getValue();
            } else {
                witField.setValue(fieldValue);
            }
        }
        return fieldValue;
    }

    /**
     * Sets additional values for this field
     */
    public setAdditionalValues(values: string[]): void {
        this._additionalFieldValues = values;
    }

    /**
     * Gets additional values for this field
     * @return string[]
     */
    public getAdditionalValues(): string[] {
        return this._additionalFieldValues;
    }

    public getFilterByScope(): any | null {
        const field = this._getWitField();
        return field && field.filterByScope;
    }

    private _getWitField(): WIT.Field {
        if (!this._witField) {
            var witManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService(WIT.WorkItemStore));
            var item: WIT.WorkItem = witManager.getWorkItem(this._id);
            if (item) {
                this._witField = item.getField(this._cardFieldDef.referenceName());
            }
        }
        return this._witField;
    }
}

