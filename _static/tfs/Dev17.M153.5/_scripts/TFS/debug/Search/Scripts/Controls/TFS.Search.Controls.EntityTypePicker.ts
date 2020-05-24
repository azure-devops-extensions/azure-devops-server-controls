// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Controls = require("VSS/Controls");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_LoadingTile = require("Search/Scripts/Controls/TFS.Search.Controls.LoadingTile");
import Search_Navigation = require("Search/Scripts/Common/TFS.Search.NavigationExtensions");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import {SearchViewState} from "Search/Scripts/Common/TFS.Search.ViewState";
import PopupContent = require("VSS/Controls/PopupContent");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");

/**
* A collection of LoadingTiles representing the different entity types which can be searched
* as well as their hit counts for the current search. Has awareness of the currently selected type
* and provides the glue which links the generic LoadingTile to our specific purpose.
*/
export class EntityTypePicker extends Controls.BaseControl {

    private static ENTITY_TYPE_PICKER_AREA_TITLE: string = "entity-area-title";

    private _entityTypeChoiceChangeHandler: Search_Navigation.IEntityTypeNavigationHandler;
    private _entityTypeChoices: Search_LoadingTile.LoadingTile[];
    private _selectedEntityTypeId: string;
    private _entityTypeTooltip;
    private _currentSelectedIndex: number;

    constructor(options?) {
        super(options);

        if (options) {
            this.setEntityTypeNavigationHandler(options.entityTypeNavigationHandler);
        }
    }

    public initialize() {
        super.initialize();
    }

    /**
    * Clears this pane on the entity choice controls.
    */
    public clear(): void {
        this.disposeChildren();
    }

    /** 
    * Disposes the child enitity choice controls and then this control.
    */
    public dispose(): void {
        this.disposeChildren();
        if (!this._entityTypeTooltip) {
            this._entityTypeTooltip.dispose();
            this._entityTypeTooltip = null;
        }
        super.dispose();
    }

    /** 
    * Sets the spinner loading for a particular entity type
    * @param entityTypeId Id for the entity to associate the spinner to (assumed to be unique)
    */
    public setEntityTypeSpinnerRolling(entityTypeId: string): void {
        // If choices are populated
        if (this._entityTypeChoices) {
            // Find the choice which matches the right entity type
            for (var entityTypeChoice in this._entityTypeChoices) {

                var entityTypeChoiceItem: Search_LoadingTile.LoadingTile = this._entityTypeChoices[entityTypeChoice];

                if (entityTypeChoiceItem.getId() === entityTypeId) {

                    entityTypeChoiceItem.removeContent();

                    // Assumed each name is unique, once found there should be no more matches
                    break;
                }
            }
        }
    }

    /** 
    * Sets the hit count for a particular entity type
    * @param entityTypeId Id for the entity to associate the hit count to (assumed to be unique)
    * @param hitCount Number of hits to display for that entity type
    */
    public setEntityTypeHitCount(entityTypeId: string, hitCount: number): void {
        // Checks whether hitCount is not equals to -1
        if (hitCount === Search_Constants.SearchConstants.HitCountNotAvailable) {
            hitCount = undefined;
        }

        // If choices are populated
        if (this._entityTypeChoices) {

            // Find the choice which matches the right entity type
            for (var entityTypeChoice in this._entityTypeChoices) {

                var entityTypeChoiceItem: Search_LoadingTile.LoadingTile = this._entityTypeChoices[entityTypeChoice];

                if (entityTypeChoiceItem.getId() === entityTypeId) {

                    // If a match is found, insert the hit count as content
                    var hitCountElement: JQuery = $("<div />").text(hitCount);
                    entityTypeChoiceItem.setContent(hitCountElement);

                    this._entityTypeTooltip = Controls.Enhancement.enhance(PopupContent.RichContentTooltip, hitCountElement.parent().parent(), {
                        cssClass: "search-richcontent-tooltip",
                        text: Search_Resources.EntityTypeTooltip.replace("{0}", String(hitCount)).replace("{1}", String(entityTypeId)),
                        openCloseOnHover: true,
                        openDelay: 800
                    });

                    // Assumed each name is unique, once found there should be no more matches
                    break;
                }
            }
        }
    }

    /** 
    * Sets the handler to be used in case the user tries to change their entity type choice
    */
    public setEntityTypeNavigationHandler(handler: Search_Navigation.IEntityTypeNavigationHandler): void {
        this._entityTypeChoiceChangeHandler = handler;
    }

    /** 
    * Sets the different entity types to display hit counts for, as well as the currently selected entity type
    * @param entityTypeIds An array of strings populated with the names of the entity types (assumed to be unique)
    * @param selectedTypeId The name of the currently selected entity type. If it doesn't match an entry in entityTypeIds, no item will be marked as selected
    */
    public setEntityTypes(entityTypeIds: string[], selectedTypeId: string): void {

        // clean out old content before loading in new
        this.disposeChildren();

        this._element.attr("aria-label", Search_Resources.EntityAreaAriaLabel).attr("role", "tree");

        // Set title for entity type picker area
        $("<div />").appendTo(this._element).addClass(EntityTypePicker.ENTITY_TYPE_PICKER_AREA_TITLE)
            .text(Search_Resources.SearchEntityLabel)
            .attr("role", "presentation")
            .attr("aria-label", Search_Resources.SearchEntityLabel);

        var entityChoiceContainer = $("<div />").appendTo(this._element).attr("tabindex", -1);

        // store new selected entity type id
        this._selectedEntityTypeId = selectedTypeId;
        this._entityTypeChoices = new Array<Search_LoadingTile.LoadingTile>();

        for (let index = 0; index < entityTypeIds.length; index++) {

            var thisEntityTypeId: string = entityTypeIds[index];

            // Determine if this is selected entity type for the current search
            var isSelected: boolean = thisEntityTypeId === selectedTypeId;
            if (!this._currentSelectedIndex && isSelected) {
                this._currentSelectedIndex = index;
            }

            // For each entityType given create a tile to display its summary information and allow for changing the search type
            var entityTypeChoiceControl = <Search_LoadingTile.LoadingTile>Controls.BaseControl.createIn(
                Search_LoadingTile.LoadingTile,
                entityChoiceContainer,
                {
                    cssClass: "search-entity-choice",
                    tabIndex: index === 0 ? 0: -1
                });

            entityTypeChoiceControl.setId(thisEntityTypeId);
            entityTypeChoiceControl.setLabelText(thisEntityTypeId);
            entityTypeChoiceControl.setSelected(isSelected);
            entityTypeChoiceControl.setClickHandler(
                (sender: Search_LoadingTile.LoadingTile) => {
                    this.handleEntityTypeChoiceClick(sender);
                }
            );
            entityTypeChoiceControl.setKeyHandler((sender: Search_LoadingTile.LoadingTile, e?) => {
                if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                    this.handleEntityTypeChoiceClick(sender);
                }
            });

            // After creation, store a reference so it can later be updated with its hit count or disposed, as needed
            this._entityTypeChoices[index] = entityTypeChoiceControl;
        }

        this._element.bind("keydown", Utils_Core.delegate(this, this._onKeyDown));
    }


    private _onKeyDown(e?): void {
        if (e.keyCode === Utils_UI.KeyCode.UP || e.keyCode === Utils_UI.KeyCode.DOWN) {
            let isUp = e.keyCode === Utils_UI.KeyCode.UP;

            // reset tabindex of the currently in focus element.
            typeof this._currentSelectedIndex !== "undefined" &&
                (this._currentSelectedIndex >= 0 &&
                    this._currentSelectedIndex < this._entityTypeChoices.length) &&
                this._entityTypeChoices[this._currentSelectedIndex].getElement().attr("tabindex", -1);

            this._currentSelectedIndex = !isUp ? (this._currentSelectedIndex + 1) : (this._currentSelectedIndex - 1);
            this._currentSelectedIndex = this._currentSelectedIndex % this._entityTypeChoices.length;

            if (this._entityTypeChoices[this._currentSelectedIndex]) {
                this._entityTypeChoices[this._currentSelectedIndex].getInFocus();
            }

            e && e.preventDefault();
        }
    }
    /** 
    * If entity types have been set, disposes of them individually and then cleans up references to them
    * as well as disposing of what remains of them in the DOM.
    */
    private disposeChildren(): void {

        if (this._entityTypeChoices) {

            for (var entityTypeChoice in this._entityTypeChoices) {
                this._entityTypeChoices[entityTypeChoice].dispose();
                this._entityTypeChoices[entityTypeChoice] = null;
            }

            this._entityTypeChoices = null;
            this._element.empty();
        }
    }

    public updateCurrentEntityType(entityTypeId: string, isSelected: boolean) {
        for (var index in this._entityTypeChoices) {
            if (this._entityTypeChoices[index].getId() === entityTypeId) {
                this._entityTypeChoices[index].setSelected(isSelected);
            }
            else {
                this._entityTypeChoices[index].setSelected(!isSelected);
            }
        }

        if (isSelected) {
            this._selectedEntityTypeId = entityTypeId;
        }
    }

    public getCurrentEntityTypeId(): string {
        return this._selectedEntityTypeId;
    }

    /** 
    * Method to use as click handler for the entityTypeChoices
    * @param sender A reference to the LoadingTile that was clicked
    */
    private handleEntityTypeChoiceClick(sender: Search_LoadingTile.LoadingTile): void {
        // If the click is on a choice which is not currently selected, let the controller know it needs to handle the request to change the selected entity type
        if (sender.getId() !== this._selectedEntityTypeId) {
            this._entityTypeChoiceChangeHandler.entityTypeChanged(sender.getId());
        }
    }
}
