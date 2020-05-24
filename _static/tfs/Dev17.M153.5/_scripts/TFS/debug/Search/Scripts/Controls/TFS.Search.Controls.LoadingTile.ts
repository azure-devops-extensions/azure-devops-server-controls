// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Controls = require("VSS/Controls");
import Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import {SearchConstants} from "Search/Scripts/Common/TFS.Search.Constants";
import {SearchViewState} from "Search/Scripts/Common/TFS.Search.ViewState";

/** 
* A tile with a text label and a JQuery content area with behavior to 
* display its loading/loaded state. If its desired to have the root element 
* have its own style, use the option cssClass when constructing.
*/
export class LoadingTile extends Controls.BaseControl {

    private static CONTENT_CSS_CLASS: string = "content";
    private static CONTENT_LOADED_CSS_CLASS: string = "loaded";
    private static CONTENT_LOADING_CSS_CLASS: string = "loading";
    private static LABEL_CSS_CLASS: string = "label";
    private static SELECTED_CSS_CLASS: string = "selected";

    private _clickHandler: LoadingTileClickHandler;
    private _keyHandler: LoadingTileKeyHandler;
    private _$content: JQuery;
    private _$label: JQuery;
    private id: string;

    constructor(options?) {
        super(options);
    }

    public initialize(): void {

        super.initialize();

        this._element.attr("role", "treeitem");
        this._element.attr("tabindex", this._options.tabIndex);

        // Create tile elements and apply default styles (tile will be in loading state until content is supplied)
        this._$label = $("<div />").appendTo(this._element).addClass(LoadingTile.LABEL_CSS_CLASS);
        this._$content = $("<div />").appendTo(this._element).addClass(LoadingTile.CONTENT_CSS_CLASS);

        // Set up click handler, ensure its not called if it hasn't been set
        this._element.click(() => {
            if (this._clickHandler) {
                this._clickHandler(this);
            }
        });

        this._element.keydown((e?) => {
            if (this._keyHandler) {
                this._keyHandler(this, e);
            }
        });
    }

    /**
    * Returns the current label text of the control
    */
    public getLabelText(): string {
        return this._$label.text();
    }

    /**
    * Returns the id associated with the control
    */
    public getId(): string {
        return this.id;
    }

    /**
    * Returns if the control is currently in the selected state
    */
    public getSelected(): boolean {
        return this._element.hasClass(LoadingTile.SELECTED_CSS_CLASS);
    }

    /**
    * Removes the tile content and returns to the content container to the loading state
    */
    public removeContent(): void {
        this._$content.empty();
        this._$content.addClass(LoadingTile.CONTENT_LOADING_CSS_CLASS);
    }

    /** 
    * Sets the click handler to use for this tile
    * @param clickHandler A LoadingTileClickHandler to call on click
    */
    public setClickHandler(clickHandler: LoadingTileClickHandler) {
        this._clickHandler = clickHandler;
    }

    /** 
    * Sets the click handler to use for this tile
    * @param clickHandler A LoadingTileClickHandler to call on click
    */
    public setKeyHandler(keyHandler: LoadingTileKeyHandler) {
        this._keyHandler = keyHandler;
    }

    /** 
    * Sets the tile content and removes the loading state, if needed
    * @param content A JQuery element to host as the content of the tile
    */
    public setContent(content: JQuery): void {
        this._$content.removeClass(LoadingTile.CONTENT_LOADING_CSS_CLASS).empty();
        content.addClass(LoadingTile.CONTENT_LOADED_CSS_CLASS).appendTo(this._$content);
    }

    public getInFocus(): void {
        if (this._element) {
            this._element.focus();
            this._element.attr("tabindex", 0);
        }
    }

    /** 
    * Sets the control's label text to a localized string identified by id
    * @param id current control identifier
    */
    public setLabelText(id: string): void {
        var localalizedString: string = SearchViewState.entityTypeIdToLocalizedNameMap[id];

        // Use fallback incase localized string is not populated
        if (!localalizedString) {
            localalizedString = this.getLocalizedEntityNameById(id);
        }

        let ariaLabelText: string = Resources.SearchEntityLabel + " " + localalizedString;
        this._$label.text(localalizedString);
        this._element.attr("aria-label", ariaLabelText);
    }

    /**
    * Assigns given id to the control
    */
    public setId(id: string): void {
        this.id = id;
    }

    /** 
    * Sets if the control is currently selected, applying style appropriately
    * @param isSelected Indicates if control is selected. If not included/null/undefined, defaults to false
    */
    public setSelected(isSelected?: boolean): void {
        if (isSelected) {
            this._element.addClass(LoadingTile.SELECTED_CSS_CLASS);
            this._$label.addClass(LoadingTile.SELECTED_CSS_CLASS);
            this._$content.addClass(LoadingTile.SELECTED_CSS_CLASS);
        }
        else {
            this._element.removeClass(LoadingTile.SELECTED_CSS_CLASS);
            this._$label.removeClass(LoadingTile.SELECTED_CSS_CLASS);
            this._$content.removeClass(LoadingTile.SELECTED_CSS_CLASS);
        }
    }

    /**
     * Returns hard coded localized entity name for the given entity id
     * @param id - entity id
     */
    private getLocalizedEntityNameById(id: string): string {
        switch (id) {
            case SearchConstants.CodeEntityTypeId: return Resources.CodeEntityName;
            case SearchConstants.WorkItemEntityTypeId: return Resources.WorkItemEntityName;
            case SearchConstants.ProjectEntityTypeId: return Resources.ProjectEntityName;
            default: return Resources.CodeEntityName;
        }
    }
}

/**
* An interface for use with the LoadingTile's click handler
*/
export interface LoadingTileClickHandler {
    (sender: LoadingTile): void;
}

/**
* An interface for use with the LoadingTile's key handler
*/
export interface LoadingTileKeyHandler {
    (sender: LoadingTile, e?: any): void;
}
