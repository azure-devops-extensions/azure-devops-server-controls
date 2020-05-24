// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");

export interface INavigationHandler extends IEntityTypeNavigationHandler, IFilterNavigationHandler, IQueryNavigationHandler {

}

export interface IEntityTypeNavigationHandler {
    entityTypeChanged(entityTypeId: string): void;
}

export interface IFilterNavigationHandler {
    filterSelectionChanged(selectedFilters: Core_Contracts.IFilterCategory[]): void;
}

export interface IQueryNavigationHandler {
    searchTextChanged(searchString: string): void;
}

