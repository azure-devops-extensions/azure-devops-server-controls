// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Context = require("Search/Scripts/Common/TFS.Search.Context");
import CodeUtils = require("Search/Scripts/Providers/Code/TFS.Search.CodeUtils");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Search_Navigation = require("Search/Scripts/Common/TFS.Search.NavigationExtensions");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");

import domElem = Utils_UI.domElem;

export class ProjectResultsView extends Controls.BaseControl {
    private static RESULTS_PANE_CSS_SELECTOR: string = ".search-view-results-pane";
    private static ACCOUNT_NOT_INDEXED_CSS_CLASS: string = "account-not-indexed";
    private static SEARCH_RESULTS_PANE_CONTENTS_CSS_CLASS: string = "search-results-contents";
    private static MOUSE_OVER_CSS_CLASS: string = "mouse-over";
    private static NO_RESULTS_CSS_CLASS: string = "no-results";
    private static SHOW_MORE_RESULTS_LINK_CSS_CLASS: string = "show-more-results";
    private static SHOW_MORE_RESULTS_CELL_BACKGROUND_CSS_CLASS: string = "show-more-results-cell-background";

    private static ACTION_DELAY_TIME_IN_MS: number = 300;
    private static DETECT_LAST_RESULT_CELL_DELAY_TIME_IN_MS: number = 0.2;

    // Information elements
    private _$noResultsMessage: JQuery;
    // private _$noPreviewMessage: JQuery; TODO shyvel
    private _$accountNotIndexedMessage: JQuery;

    // Results/left pane
    private _$resultsPane: JQuery;
    public _resultsGrid: Grids.Grid;

    private _selectedIndex: number;
    private _numberOfRowsDisplayed: number = 0;

    constructor(options?) {
        super(options);
        this._$resultsPane = $(ProjectResultsView.RESULTS_PANE_CSS_SELECTOR);
    }

    /**
    * Clears the results grid, the preview, and starts the loading animation.
    */
    public clear(onPreviewOrientationChange?: boolean): void {
        this.clearResults();

        if (this._$noResultsMessage) {
            this._$noResultsMessage.remove();
            this._$noResultsMessage = null;
        }

        if (this._$accountNotIndexedMessage) {
            this._$accountNotIndexedMessage.remove();
            this._$accountNotIndexedMessage = null;
        }
    }

    // Sets the selected result code grid row 
    public setSelectedRowIndex(row: number, isAutoNavigated?: boolean): void {        
        this._resultsGrid.setSelectedRowIndex(row);
    }

    /**
    * Gets the row into view provided the index of the row to be revealed
    * @param revealIndex Index of the result that should brought(shown) into the visible results area
    * @param force Forces the provided index row to be brought(shown) at top into the visible results area
    */
    public getRowIntoView(revealIndex: number, force?: boolean): void {
        force = (force === undefined) ? true : force;
        this._resultsGrid._getRowIntoView(revealIndex, force);
    }

    /**
    * Draw the results pane with a grid from grid options.
    * @param gridOptions The grid options to apply to the result pane.
    * @param showShowMoreLink Indicates whether "Show More" link be appended at the end of results
    * @param showMoreLinkResultIndex Has the index in the result list where show more link will be drawn
    * @param revealIndex Index of the result that should brought(shown) into the visible results area (ex. on Show more,
    *        first result of the next batch should be shown by default instead of the first result
    */
    public drawResultsGrid(gridOptions: Grids.IGridOptions, showShowMoreLink: boolean, showMoreLinkResultIndex: number, revealIndex?: number): void {
        var defaultOptions = {
            cssClass: ProjectResultsView.SEARCH_RESULTS_PANE_CONTENTS_CSS_CLASS,
            header: true,
            allowMultiSelect: false,
            allowTextSelection: true, // This option allows the text content of the grid cell to be selectable and copyable  
        }

        $.extend(defaultOptions, gridOptions);
        this._resultsGrid = <Grids.Grid>Controls.BaseControl.createIn(Grids.Grid,
            $(Search_Constants.SearchConstants.SearchResultsPaneContentsCssSelector), defaultOptions);
        this._resultsGrid._applyColumnSizing(0, -1, true); //Triggering the columnsresize event by passing default parameter to adjust scroll bar
        this._selectedIndex = 0;

        if (revealIndex) {
            this.getRowIntoView(revealIndex);
        }

        Utils_UI.detachResize(this._resultsGrid);
        
        // Compute number of rows shown to the user (can vary based on window size)
        var count: number = 0;
        for (var row in this._resultsGrid._rows) {
                count++;
        }

        this._numberOfRowsDisplayed = count;
    }
    
    /**
    * Hides the splitter and shows a message indicating the data in not indexed yet.
    */
    public showAccountNotIndexedMessage(activityId: string, entityTypeName: string): string {
        var mailLink = "mailto:vstssearch@microsoft.com?Subject=Feedback on Azure DevOps Services " + entityTypeName + " Search [Reference ID: " + activityId + "]";
        var feedbackLink = "<a href='" + mailLink + "' id='account-not-indexed-feedbacklink' target='_top' style='text-decoration: underline'>" + Search_Resources.ContactUsText + "</a>";
        var frown = "<P>:(</p>";
        var accountNotIndexedMessage = "<p>" + Search_Resources.ShowProjectNotIndexedMessage.replace('{0}', feedbackLink) + "</p>";

        var accountNotIndexedFeedbackMessage = Context.SearchContext.isHosted()
            ? "<p>" + Search_Resources.ShowAccountNotIndexedFeedbackMessageForHosted.replace('{0}', feedbackLink) + "</p>"
            : "<p>" + Search_Resources.ShowAccountNotIndexedFeedbackMessageForOnPrem + "</p>";

        this._$accountNotIndexedMessage = $(domElem("div")).addClass(ProjectResultsView.ACCOUNT_NOT_INDEXED_CSS_CLASS).append($(frown).css({ "font-size": "36px", "margin-bottom": "20px" }));
        this._$accountNotIndexedMessage.append($(accountNotIndexedMessage).css({ "font-size": "12px", "text-align": "justify" }));
        this._$accountNotIndexedMessage.append($(accountNotIndexedFeedbackMessage).css({ "font-size": "12px", "text-align": "justify" }));
        this._$accountNotIndexedMessage.appendTo($(Search_Constants.SearchConstants.SearchResultsPaneContentsCssSelector));

        $("#account-not-indexed-feedbacklink").click((e) => {
            TelemetryHelper.TelemetryHelper.traceLog({ "AccountNotIndexedContactUsAction": true });
        });

        return Search_Resources.ShowProjectNotIndexedMessage +
            Context.SearchContext.isHosted()
            ? Search_Resources.ShowAccountNotIndexedFeedbackMessageForHosted.replace('{0}', "contact us")
            : Search_Resources.ShowAccountNotIndexedFeedbackMessageForOnPrem;
    }

    /**
    * Hides the splitter and shows a message indicating no results were found.
    */
    public showNoResultsMessage(): string {
        this._$noResultsMessage = $(domElem("div")).text(Search_Resources.ProjectSearchNoResultsFoundMessage)
            .addClass(ProjectResultsView.NO_RESULTS_CSS_CLASS)
            .appendTo($(Search_Constants.SearchConstants.SearchResultsPaneContentsCssSelector));

        return Search_Resources.ProjectSearchNoResultsFoundMessage;
    }

    /**
     * Returns number of results shown in results view (depends on the screen height/view port height)
     */
    public numberOfResultsDisplayed(): number {
        return this._numberOfRowsDisplayed;
    }

    private clearResults(): void {
        if (this._resultsGrid) {
            this._resultsGrid.dispose();
            this._resultsGrid = null;
        }
    }

    /*
    * This is a do nothing function.
    */
    public selectResultAndPreview(index: number, preview: Controls.BaseControl): void {
        // no-op
    }

    /*
    * This is a do nothing function.
    */
    public setFocusOnResultsGrid(): void {
        //no-op
    }

}
