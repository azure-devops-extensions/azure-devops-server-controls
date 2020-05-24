// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

export enum MenuItemTypes {
    Numeric = 0,
    String = 1,
    DateTime = 2,
    Boolean = 3,
    Operator = 4,
    Value = 5,
    Identity = 6
}

export enum SuggestionDropdownMode {
    FieldSuggestion,
    OperatorSuggestion,
    ValueSuggestion,
    IdentitySuggestion,
    None,
    StaticDropDownSuggestion
}

export interface IMenuItem {
    displayName: string;
    type: MenuItemTypes;
    shortHand: string;
    helperText: string;
}

export interface ISuggestionProvider {
    getSuggestions(onSuccess: Function, searchText?: string): void;
    getSelectedSuggestionText(menuItem: IMenuItem): string;
    tryGetFieldType(name: string, callback: (fieldType: MenuItemTypes) => void): void;
    focus(): void;
    dispose(): void;
}

export interface ISearchBoxDropdownOptions {
    searchTextBoxCssSelector: string;
    documentClickNamespace: string;
    isIdentityPickerEnabled: boolean;
    dropdownId: string;
    setSearchBoxValue?: Function;
}

export interface IIdentityPickerOptions {
    container: JQuery;
    searchTextBoxCssSelector: string;
    setSearchBoxValue?: (searchText: string) => void;
}