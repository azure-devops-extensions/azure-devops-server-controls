import * as VSSStore from "VSS/Flux/Store";
import * as _WITContracts from "TFS/WorkItemTracking/Contracts";
import * as _SearchHelp from "Search/Scenarios/Shared/Components/SearchHelp/SearchHelp.Props";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import * as VSS from "VSS/VSS";
import { IWITFieldWrapper } from "Search/Scenarios/WorkItem/Flux/ActionsHub"
import { WorkItemFieldsRetrievedPayload, WorkItemFieldsRetrievalFailedPayload } from "Search/Scenarios/WorkItem/Flux/ActionsHub";

export enum DropdownType {
    None,
    Identity,
    Fields,
    Operators,
    Values,
    Static
}

export interface HelpStoreState {
    fields: IWITFieldWrapper[];

    dropdownType: DropdownType;

    filterGroups: _SearchHelp.ISearchFilterGroup[];

    filterText: string;

    isDropdownActive: boolean;
}

interface IToken {
    content: string;

    startIndex: number;

    endIndex: number;
}

/*
* Creating a copy of E:\VSO\bin\Debug.AnyCPU\Tfs.WebPlatform\Client\ref\TFS\WorkItemTracking\Contracts.d.ts
* So as to avoid bring WIT related scripts in work item search view bundle.
**/
export enum WITFieldsTypes {
    /**
     * String field type.
     */
    String = 0,
    /**
     * Integer field type.
     */
    Integer = 1,
    /**
     * Datetime field type.
     */
    DateTime = 2,
    /**
     * Plain text field type.
     */
    PlainText = 3,
    /**
     * HTML (Multiline) field type.
     */
    Html = 4,
    /**
     * Treepath field type.
     */
    TreePath = 5,
    /**
     * History field type.
     */
    History = 6,
    /**
     * Double field type.
     */
    Double = 7,
    /**
     * Guid field type.
     */
    Guid = 8,
    /**
     * Boolean field type.
     */
    Boolean = 9,
    /**
     * Identity field type.
     */
    Identity = 10,
    /**
     * String picklist field type.
     */
    PicklistString = 11,
    /**
     * Integer picklist field type.
     */
    PicklistInteger = 12,
    /**
     * Double picklist field type.
     */
    PicklistDouble = 13,
}

export class HelpStore extends VSSStore.Store {
    private _state: HelpStoreState = {
        fields: [],
        dropdownType: DropdownType.Static,
        filterGroups: [defaultFieldsFilterGroup, defaultOperatorsFilterGroup],
        filterText: "",
        isDropdownActive: false
    }

    public get state(): HelpStoreState {
        return this._state;
    }

    public onWorkItemFieldsRetrieved = (payload: WorkItemFieldsRetrievedPayload): void => {
        const { fields, text } = payload;
        this._state.fields = fields;

        const filterText = this.getText(text);
        this._state.filterText = filterText;
        this._state.filterGroups = this.getFilterGroups(filterText);
        this._state.isDropdownActive = true;
        this.emitChanged();
    }

    public onWorkItemFieldsRetrievalFailed = (payload: WorkItemFieldsRetrievalFailedPayload): void => {
        this._state.fields = [];
        this._state.dropdownType = DropdownType.Static;
        this._state.filterGroups = [defaultFieldsFilterGroup, defaultOperatorsFilterGroup];
        this._state.filterText = "";
        this._state.isDropdownActive = true;
        this.emitChanged();
    }

    public onWorkItemSearchTextChanged = (text: string): void => {
        const filterText = this.getText(text);
        this._state.filterText = filterText
        this._state.filterGroups = this.getFilterGroups(filterText);
        this._state.isDropdownActive = true;
        this.emitChanged();
    }

    public updateHelpDropdownVisibility = (isVisible: boolean): void => {
        this._state.isDropdownActive = isVisible;
        this.emitChanged();
    }
    
    private getText = (text: string): string => {
        // To show the initial drop down when there is no text in search box or only a single quote
        if (!text || text === "" || (text.length <= 1 && isQuoteUnpaired(text))) {
            this._state.dropdownType = DropdownType.Static;
            return "";
        }

        if (isQuoteUnpaired(text)) {
            return this.handleForUnPairedQuote(text);
        }
        else {
            return this.handleForPairedQuote(text);
        }
    }

    private handleForPairedQuote = (text: string): string => {
        const lastIndexOfQuote = text.lastIndexOf("\""),
            fullFormRegexDelegate = (regexMatch: RegExpMatchArray) => {
                const probableFieldName = regexMatch[1], value = regexMatch[3];
                return this.setSuggestionModeForOperators(probableFieldName, value);
            },
            fieldNameRegexDelegate = (regexMatch: RegExpMatchArray) => {
                // Checking if more than one space is given or not
                const hasSpace = regexMatch[2] && regexMatch[2].replace(/\s+/, " ") === " ",
                    fieldName = regexMatch[1];
                if (hasSpace) {
                    return this.setSuggestionModeForFieldName(fieldName);
                }
                else {
                    this._state.dropdownType = DropdownType.Fields;
                    return fieldName;
                }
            }

        // If there are no Quotes in the text then we need to take care of that particular cases
        if (lastIndexOfQuote < 0) {
            const fullFormRegExMatch = text.match(FULLFORMED_REGEX);
            if (fullFormRegExMatch) {
                return fullFormRegexDelegate(fullFormRegExMatch);
            }

            const fieldNameMatch = text.match(ONLYFIELDNAME_REGEX);
            if (fieldNameMatch) {
                return fieldNameRegexDelegate(fieldNameMatch);
            }

            this._state.dropdownType = DropdownType.Fields;
            return text;
        }
        else {
            // Getting text after Quote
            const textAfterQuote = text.substr(lastIndexOfQuote + 1),
                fullFormRegExMatch = textAfterQuote.match(FULLFORMED_REGEX);
            // e.g   "Accepted" DueDate : 
            if (fullFormRegExMatch) {
                return fullFormRegexDelegate(fullFormRegExMatch);
            }

            const fullFormedRegexWithQuotesMatch = text.match(FULL_FORMED_REGEX_WITH_QUOTES);
            //e.g. "ChangedDate" : 2012-12-09 or "AssignedTo": etc.
            if (fullFormedRegexWithQuotesMatch) {
                // To give suggestions for values if field in quotes is date time
                const probableFieldName = fullFormedRegexWithQuotesMatch[1],
                    value = fullFormedRegexWithQuotesMatch[3];
                return this.setSuggestionModeForOperators(probableFieldName, value);
            }

            // To give suggestions to normal fields after quotes e.g "assigned to" priority
            const fieldNameMatch = textAfterQuote.match(ONLYFIELDNAME_REGEX);
            if (fieldNameMatch) {
                return fieldNameRegexDelegate(fieldNameMatch);
            }

            // Operator suggestions for field names in quotes e.g "Priority" 
            const fieldNameWithinQuotesMatch = text.match(FIELD_WITHIN_QUOTES_REGEX);
            if (fieldNameWithinQuotesMatch) {
                const probableFieldName = fieldNameWithinQuotesMatch[1].replace(/\s+/g, "");
                return this.setSuggestionModeForFieldName(probableFieldName);
            }

            this._state.dropdownType = DropdownType.Static;

            return "";
        }
    }

    private setSuggestionModeForOperators = (probableFieldName: string, fieldValue: string): string => {
        const fieldType = getFieldType(this._state.fields, probableFieldName);
        if (typeof fieldType === "undefined") {
            this._state.dropdownType = DropdownType.None;
            return "";
        }
        else if (fieldType === WITFieldsTypes.DateTime as number) {
            // Corresponds to fieldType.DateTime - Not downloading contracts as it bloats up our bundle size.
            this._state.dropdownType = DropdownType.Values;
        }
        else if (fieldType === WITFieldsTypes.Identity as number ||
            isIdentityField(this._state.fields, probableFieldName)) {
            // Corresponds to fieldType.Identity - Not downloading contracts as it bloats up our bundle size.
            this._state.dropdownType = DropdownType.Identity;
        }
        else {
            this._state.dropdownType = DropdownType.None;
        }

        return fieldValue;
    }

    private setSuggestionModeForFieldName = (fieldName: string): string => {
        // If field Type is numeric or date time then mode is operatorSuggesion else mode is none
        const fieldType = getFieldType(this._state.fields, fieldName);
        if (!fieldType) {
            this._state.dropdownType = DropdownType.Static;
        }
        else if (fieldType === WITFieldsTypes.DateTime as number || fieldType === WITFieldsTypes.Double as number || fieldType === WITFieldsTypes.Integer as number) {
            // Corresponds to fieldType.Integer, Double and DateTime - Not downloading contracts as it bloats up our bundle size.
            this._state.dropdownType = DropdownType.Operators;
        }

        return "";
    }

    private handleForUnPairedQuote = (text: string): string => {
        const fullFormRegExMatch = text.match(FULL_FORMED_REGEX_FOR_UNPAIRED_QUOTE),
            fieldnameRegexMatch = text.match(FIELD_NAME_REGEX_FOR_UNPAIRED_QUOTE);

        // If Quotes are preceded by an operator then no suggestions need to be given except if the field value is identity picker before Operator
        if (fullFormRegExMatch) {
            //Checking if Operator is Colon or not as Identity Picker Field Value is followed by colon only
            if (fullFormRegExMatch[2] === ":") {  //e.g : "Assigned to" : "Alias" , "Due Date" : 20-10-2016 etc.
                //this to to trim spaces in the match there are cases where spaces are not getting selected seperately
                let fieldValueBeforeColon = fullFormRegExMatch[1].trim(), probableFieldName, currentPosition: number;
                const stringLength: number = fieldValueBeforeColon.length;
                //Checking if the field value is given in quotes or not
                if (fieldValueBeforeColon[stringLength - 1] === "\"") {
                    currentPosition = stringLength - 2;
                    //Getting the position of the other Quote that is at the beginning of the field value
                    while (fieldValueBeforeColon.charAt(currentPosition) !== "\"" && currentPosition > 0) {
                        currentPosition--;
                    }

                    //Getting field value before colon to check if it is a identity picker
                    probableFieldName = fieldValueBeforeColon.substring(currentPosition + 1, stringLength - 1);
                }
                else {
                    // Checking if field value is given in a normal way
                    currentPosition = stringLength - 1;
                    //Getting the position of the beginning of the field value
                    //e.g "assignedto":"User, assignedto : "user , "Sometext"Assignedto : "user, some text Assignedto:"User
                    while (fieldValueBeforeColon.charAt(currentPosition) !== " " && currentPosition > 0) {
                        currentPosition--;
                    }

                    //Condition if the value is given at beginning with out space
                    if (fieldValueBeforeColon.charAt(currentPosition) === " ") {
                        currentPosition++;
                    }

                    probableFieldName = fieldValueBeforeColon.substr(currentPosition);
                }

                return this.setSuggestionModeForOperators(probableFieldName, fullFormRegExMatch[3]);
            }
            else {
                this._state.dropdownType = DropdownType.None;

                return "";
            }
        }

        // If a valid fieldName is preceded by a single quote then we need to remove spaces in filedName and send to filter for suggestions
        if (fieldnameRegexMatch) {
            const lastIndexOfQuote = text.lastIndexOf("\""),
                textAfterQuote = text.substr(lastIndexOfQuote + 1);
            // e.g "Assigned to : , "Tags = , ": etc.
            if (!textAfterQuote) {
                this._state.dropdownType = DropdownType.Static;
            }
            else if (textAfterQuote.match(OPERATORS_REGEX)) {
                this._state.dropdownType = DropdownType.None;
            }
            else {
                this._state.dropdownType = DropdownType.Fields;
            }

            return textAfterQuote;
        }

        this._state.dropdownType = DropdownType.None;

        return "";
    }

    private getFilterGroups = (text: string): _SearchHelp.ISearchFilterGroup[] => {
        let filterGroups: _SearchHelp.ISearchFilterGroup[] = [];

        if (this._state.dropdownType === DropdownType.Static) {
            filterGroups = [defaultFieldsFilterGroup, defaultOperatorsFilterGroup];
        }
        else if (this._state.dropdownType === DropdownType.Fields) {
            filterGroups = [{
                caption: Resources.FilterByField,
                example: Resources.FilterByFieldExample,
                filters: this._state
                    .fields
                    .filter(f => normalize(f.field.name).indexOf(normalize(text)) === 0)
                    .map<_SearchHelp.ISearchFilter>(f => {
                        return {
                            text: f.field.name,
                            getSuggestedText: (currentString, filterText) =>
                                getSuggestedText(currentString, filterText, isFieldStringType(f.field.type)),
                            shortcutText: f.shortcut,
                            replaceText: true
                        };
                    })
            }, defaultOperatorsFilterGroup];
        }
        else if (this._state.dropdownType === DropdownType.Operators) {
            filterGroups = [numericOperatorsFilterGroup]
        }
        else if (this._state.dropdownType === DropdownType.Values) {
            filterGroups = [{
                caption: undefined,
                filters: [
                    {
                        text: "@Today",
                        getSuggestedText: (currentString, filterText) => getSuggestedText(currentString, filterText, false),
                        replaceText: true
                    },
                    {
                        text: "@Today-1",
                        getSuggestedText: (currentString, filterText) => getSuggestedText(currentString, filterText, false),
                        replaceText: true
                    },
                    {
                        text: "@Today-7",
                        getSuggestedText: (currentString, filterText) => getSuggestedText(currentString, filterText, false),
                        replaceText: true
                    },
                    {
                        text: "@Today-30",
                        getSuggestedText: (currentString, filterText) => getSuggestedText(currentString, filterText, false),
                        replaceText: true
                    }
                ].filter(f => normalize(f.text).indexOf(normalize(text)) === 0)
            }]
        }

        return filterGroups;
    }
}

function normalize(text: string): string {
    return text && text.replace(/\s+/g, "").toLowerCase();
}

function getFieldType(fields: IWITFieldWrapper[], fieldName: string): _WITContracts.FieldType {
    const filteredFields = fields.filter(f => normalize(f.field.name) === normalize(fieldName) || normalize(f.shortcut) === normalize(fieldName));
    return filteredFields[0] && filteredFields[0].field && filteredFields[0].field.type;
}

function isIdentityField(fields: IWITFieldWrapper[], fieldName: string): boolean {
    const filteredFields = fields.filter(f => normalize(f.field.name) === normalize(fieldName) || normalize(f.shortcut) === normalize(fieldName));
    return filteredFields[0].field && filteredFields[0].field.isIdentity;
}

function getToken(str: string, delimiters: Array<string>): IToken {
    let tokenStart = str.length - 1, tokenEnd = str.length - 1;
    // get the start Index
    while (tokenStart > 0 && delimiters.indexOf(str.charAt(tokenStart)) < 0) {
        tokenStart--;
    }

    // get the end Index
    while (tokenEnd < str.length - 1 && delimiters.indexOf(str.charAt(tokenEnd)) === -1) {
        tokenEnd++;
    }

    const startIndex = tokenStart > 0 ? tokenStart + 1 : 0,
        endIndex = tokenEnd < str.length - 1 ? tokenEnd - 1 : tokenEnd;

    return {
        startIndex: startIndex,
        endIndex: endIndex,
        content: str.substr(startIndex, endIndex - startIndex + 1)
    };
}

function isQuoteUnpaired(text: string): boolean {
    const quotesMatch = text.match(/\"/g),
        isQuoteUnpaired = !!((quotesMatch ? quotesMatch.length : 0) % 2);

    return isQuoteUnpaired;
}

export function isFieldStringType(fieldType: _WITContracts.FieldType): boolean {
    return fieldType as number === WITFieldsTypes.Guid ||
        fieldType as number === WITFieldsTypes.History ||
        fieldType as number === WITFieldsTypes.Html ||
        fieldType as number === WITFieldsTypes.PlainText ||
        fieldType as number === WITFieldsTypes.String ||
        fieldType as number === WITFieldsTypes.TreePath ||
        fieldType as number === WITFieldsTypes.Identity ||
        fieldType as number === WITFieldsTypes.PicklistString;
}

export function getSuggestedText(currentString: string, filterText: string, appendColon: boolean, removeWhiteSpaces: boolean = true): string {
    // remove all white spaces.
    filterText = removeWhiteSpaces ? filterText.replace(/[\s]+/g, "") : filterText;
    // If there is an unpaired quote in the string. Use " as the delimiter.
    const delimiters = isQuoteUnpaired(currentString) ? ['"'] : DELIMITER_CHARACTERS;

    let { endIndex, startIndex, content } = getToken(currentString, delimiters);
    //Removing Single Quote from the string if it contains odd number of quotes
    //As suggested text contains quotes surrounded which will give extra quote in resulted string
    if (startIndex > 0 &&
        currentString.charAt(startIndex - 1) === "\"" &&
        isQuoteUnpaired(currentString)) {
        currentString = currentString.slice(0, startIndex - 1) + currentString.slice(startIndex);
        startIndex--;
        endIndex--;
    }

    if (appendColon) {
        filterText += ": ";
    }

    const prevSubString = currentString.substr(0, startIndex).trim(),
        nextSubString = currentString.substr(endIndex + 1).trim(),
        stringUptoSuggestion = `${prevSubString}${prevSubString !== "" ? " " : ""}${filterText}`,
        stringWithSuggestion = `${stringUptoSuggestion}${nextSubString}`;

    return stringWithSuggestion;
}

export const defaultFieldsFilterGroup: _SearchHelp.ISearchFilterGroup = {
    caption: Resources.FilterByField,
    example: Resources.FilterByFieldExample,
    footer: Resources.FilterByFieldFooter,
    filters: [
        {
            text: "a:",
            hint: Resources.AssignedToHint
        },
        {
            text: "c:",
            hint: Resources.CreatedByHint
        },
        {
            text: "s:",
            hint: Resources.StateHint
        },
        {
            text: "t:",
            hint: Resources.WITHint
        }
    ]
}

export const defaultOperatorsFilterGroup: _SearchHelp.ISearchFilterGroup = {
    caption: Resources.Operators,
    example: Resources.WorkItemSearchOperatorsExample,
    singleLine: true,
    filters: [
        {
            text: "AND"
        },
        {
            text: "NOT"
        },
        {
            text: "OR"
        }
    ]
}

const numericOperatorsFilterGroup: _SearchHelp.ISearchFilterGroup = {
    caption: undefined,
    filters: [
        {
            text: "="
        },
        {
            text: "!="
        },
        {
            text: ">"
        },
        {
            text: "<"
        },
        {
            text: ">="
        },
        {
            text: "<="
        }
    ]
}

// For Onprem we need to support all language alphabetic characters. In Java Script there is no such expression at that time, so we went with a logic
// to match all characters which are not supported by WIT form. Below are the characters which are not supported in hosted. Need to work with WITteam for 
// OnPrem non supported characters
const WIT_RESTRICTED_CHARACTERS = "\\.,;'`:~\\\\\/\\*\\|\\?\"&%$!\\+=\\(\\)\\[\\]{}<>-";
const VALUE_RESTRICTED_CHARACTERS = ":|<|>|<=|>=|!=";
// If you are using new RegExp() method to create a regular expression we need to use double back slash instead of one which you need to do in normal way
const FULL_FORMED_REGEX_FOR_UNPAIRED_QUOTE: RegExp = /(.*)\s*(:|<=|>=|<|>|=|!=)\s*\"([^\"]*)$/; //e.g  AssignedTo:" , :" , >", ::" etc.
const FIELD_NAME_REGEX_FOR_UNPAIRED_QUOTE: RegExp = new RegExp("\"[^{0}]*$".replace("{0}", WIT_RESTRICTED_CHARACTERS)); //e.g "Assigned etc.;
const OPERATORS_REGEX: RegExp = /(:|<=|>=|<|>|=|!=)/;
const FULLFORMED_REGEX: RegExp = new RegExp("([^{0}\\s]+)\\s*(:|<=|>=|<|>|=|!=)\\s*([^{1}\\s]*)$"
    .replace("{0}", WIT_RESTRICTED_CHARACTERS)
    .replace("{1}", VALUE_RESTRICTED_CHARACTERS)); // e.g. ChangedDate: 2012-12-09  or AssignedTo: etc.
const ONLYFIELDNAME_REGEX: RegExp = new RegExp("([^{0}\\s]+)(\\s*)$".replace("{0}", WIT_RESTRICTED_CHARACTERS)); // e.g. AssignedTo etc.
const FULL_FORMED_REGEX_WITH_QUOTES: RegExp = new RegExp("\"([^{0}]+)\"\\s*(:|<=|>=|<|>|=|!=)\\s*([^{1}\"]*)$"
    .replace("{0}", WIT_RESTRICTED_CHARACTERS)
    .replace("{1}", VALUE_RESTRICTED_CHARACTERS)); //e.g. "ChangedDate" : 2012-12-09 or "AssignedTo": etc.
const FIELD_WITHIN_QUOTES_REGEX: RegExp = new RegExp("\"([^{0}]+)\"\\s*$".replace("{0}", WIT_RESTRICTED_CHARACTERS)); // e.g "Assigned To"
const DELIMITER_CHARACTERS: string[] = [' ', '<', '>', ':', '=', '"', "!"];