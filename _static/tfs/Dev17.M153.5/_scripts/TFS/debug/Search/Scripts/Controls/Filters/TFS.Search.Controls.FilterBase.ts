// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Controls = require("VSS/Controls");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");

export class FilterBase extends Controls.BaseControl
{
    private _filterSelectionChangedHandler: FilterItemClickHandler;
    private _identifier: string;
    private _name: string;
    private _isSelected: boolean;
    private _resultCount: number;
    private _category: string;

    constructor(options?) {
        super(options);
        this._category = options.category;
        this._name = options.name;
        this._identifier = options.id;
        this._isSelected = options.isSelected;
        this._resultCount = options.resultCount;
    }

    public initialize(): void {
        super.initialize();
    }
    
    public getId(): string {
        return this._identifier;
    }

    public getIsSelected(): boolean {
        return this._isSelected;
    }

    public getName(): string {
        return this._name;
    }

    public getResultCount(): number {
        return this._resultCount;
    }

    public setFilterSelectionChangedHandler(clickHandler: FilterItemClickHandler) {
        this._filterSelectionChangedHandler = clickHandler;
    }

    public selectedChanged(isSelected: boolean) {
        this._isSelected = isSelected;

        var isLandingPage: boolean = Helpers.Utils.isLandingPage();

        if (this._isSelected) {
            TelemetryHelper.TelemetryHelper.traceLog({ "FilterAction": "Added", "IsLandingPage": isLandingPage, "Category": this._category });
        }
        else {
            TelemetryHelper.TelemetryHelper.traceLog({ "FilterAction": "Removed", "IsLandingPage": isLandingPage, "Category": this._category });
        }

        if (this._filterSelectionChangedHandler) {
            this._filterSelectionChangedHandler();
        }
    }

    /**
     * override in child classes
     */
    public drawItem(filter: Core_Contracts.IFilter): void {
    }
}

/**
* An interface for use with the filters's click handler
*/
export interface FilterItemClickHandler
{
    (options?: any): void;
}

export interface ToggleShowMoreLinkStateClickHandler {
    (filterCategoryName: string, showAllFilters: boolean): void;
}

