// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Notifications = require("VSS/Controls/Notifications");
import EntityTypePicker = require("Search/Scripts/Controls/TFS.Search.Controls.EntityTypePicker");
import Filters = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.FilterArea");
import Grids = require("VSS/Controls/Grids");
import InformationArea = require("Search/Scripts/Controls/TFS.Search.Controls.InformationArea");
import MessageBanner = require("Search/Scripts/Common/TFS.Search.MessageBanner");
import SearchBoxHelper = require("Search/Scripts/Common/TFS.Search.SearchBoxHelper");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");

import domElem = Utils_UI.domElem;

var g_entityTypePickerPane: EntityTypePicker.EntityTypePicker,
    g_filtersPane: Filters.FilterArea,
    g_resultsPane: any,
    g_informationArea: InformationArea.InformationArea,
    g_searchView: any;

/**
* Defines methods to render search portal page controls such as entities,
* filters, resulsts pane or landing page etc
*/
export class SearchViewBuilder {

    private static SEARCH_FILTERS_AREA_CSS_SELECTOR: string = ".search-view-filters-area";
    private static ENTITY_TYPE_PICKER_CSS_CLASS: string = "search-entity-picker";

    /**
    * Initalizes the common elements - these are the minumum controls needed
    * for showing search landing page
    */
    public static initialize(searchView: any) {
        g_searchView = searchView;

        SearchBoxHelper.SearchBoxHelper.customizeSearchBox();

        g_entityTypePickerPane = <EntityTypePicker.EntityTypePicker>Controls.BaseControl.createIn(
            EntityTypePicker.EntityTypePicker,
            g_searchView._element.find(SearchViewBuilder.SEARCH_FILTERS_AREA_CSS_SELECTOR),
            {
                cssClass: SearchViewBuilder.ENTITY_TYPE_PICKER_CSS_CLASS,
                entityTypeNavigationHandler: g_searchView
            });

        g_filtersPane = <Filters.FilterArea>Controls.BaseControl.createIn(
            Filters.FilterArea,
            g_searchView._element.find(SearchViewBuilder.SEARCH_FILTERS_AREA_CSS_SELECTOR));

        // Set the handlers to have callbacks to the appropriate handlers.
        g_filtersPane.setNavigationHandler(g_searchView);

        g_informationArea = <InformationArea.InformationArea>Controls.BaseControl.createIn(
            InformationArea.InformationArea,
            g_searchView._element.find(Constants.SearchConstants.SearchViewInformationAreaContainerCssSelector));
    }

    /* Clear elements */
    public static clearAll(): void {
        SearchViewBuilder.clearFiltersPane();
        SearchViewBuilder.clearResultsView();
        SearchViewBuilder.setViewMode();
    }

    public static clearEntityTypePickerPane(): void {
        g_entityTypePickerPane.clear();
    }

    public static clearFiltersPane(): void {
        g_filtersPane.clear();
    }

    public static clearResultsView(): void {
        MessageBanner.SearchMessageBanner.clear();
        this.clearResultsGrid();
        g_informationArea.clear();
    }

    public static clearResultsGrid(onPreviewOrientationChange?: boolean): void {
        if (g_resultsPane) {
            g_resultsPane.clear(onPreviewOrientationChange);
        }
    }

    /* Message banner operation */
    public static showMessageBanner(message: string, messageType: Notifications.MessageAreaType): void {
        MessageBanner.SearchMessageBanner.drawMessageBanner(message, messageType);
    }

    public static clearMessageBanner(): void {
        MessageBanner.SearchMessageBanner.clear();
    }

    public static isMessageBannerShown(): boolean {
        return MessageBanner.SearchMessageBanner.isMessageBannerShown();
    }

    public static showNewWorkItemMessageBanner(messageContent: any, type: Notifications.MessageAreaType, showIcon: boolean, clickCallBack?: Function): void {
        g_resultsPane.showNewWorkItemMessageBanner(messageContent, type, showIcon, clickCallBack);
    }

    /* Filter pane operations */

    public static setEntityTypes(currentEntityTypeId: string): void {
        g_entityTypePickerPane.setEntityTypes(State.SearchViewState.registeredProviderIds, currentEntityTypeId);
    }

    public static setEntityTypeHitCount(entityTypeId: string, hitCount: number): void {
        g_entityTypePickerPane.setEntityTypeHitCount(entityTypeId, hitCount);
    }

    public static setEntityTypeSpinnerRolling(entityTypeId: string): void {
        g_entityTypePickerPane.setEntityTypeSpinnerRolling(entityTypeId);
    }

    public static updateCurrentEntityType(entityTypeId: string, isSelected: boolean): void {
        g_entityTypePickerPane.updateCurrentEntityType(entityTypeId, isSelected);
    }

    public static drawFilters(filterCategories: Core_Contracts.IFilterCategoryName[], scopeFiltersActionDelay?: number, entityName?: string): void {
        if (filterCategories.length <= 0) {
            g_filtersPane.clear();
        }
        else {
            g_filtersPane.drawFilterControl(filterCategories, scopeFiltersActionDelay, entityName);
        }
    }

    public static appendFilters(filterCategories: Core_Contracts.IFilterCategoryName[]): void {
        if (filterCategories.length > 0) {
            g_filtersPane.appendOtherSourcesFilters(filterCategories);
        }
    }

    /* Results & preview pane operations */
    public static initializeResultsPane(resultsPaneObject: any): void {
        if (!g_resultsPane || resultsPaneObject._typeName !== g_resultsPane._typeName) {
            this.clearResultsView();
            this.setViewMode();
            g_resultsPane = resultsPaneObject;
        }
    }

    public static showPrefixWildcardQueryNotSupportedMessage(searchText: string): string {
        return g_resultsPane.showPrefixWildcardQueryNotSupportedMessage(this.sanitizedHtml(searchText));
    }

    public static showAccountNotIndexedMessage(activityId: string, entityTypeName: string): string {
        return g_resultsPane.showAccountNotIndexedMessage(activityId, entityTypeName);
    }

    public static showNoResultsMessage(searchText: string, entityTypeName: string, activityId: string): string {
        return g_resultsPane.showNoResultsMessage(this.sanitizedHtml(searchText), entityTypeName, activityId);
    }

    public static showNoResultsMessageWithShowMoreLink(searchText: string): string {
        return g_resultsPane.showNoResultsMessageWithShowMoreLink(this.sanitizedHtml(searchText));
    }

    public static showNoResultsMessageAfterClickingShowMoreLink(searchText: string): string {
        return g_resultsPane.showNoResultsMessageAfterClickingShowMoreLink(this.sanitizedHtml(searchText));
    }

    public static drawResultsGrid(gridOptions: Grids.IGridOptions, showShowMoreLink: boolean, noOfResultsToDraw: number, revealIndex?: number): void {
        g_resultsPane.drawResultsGrid(gridOptions, showShowMoreLink, noOfResultsToDraw, revealIndex);
    }

    public static setSelectedRowIndex(selectedIndex: number, isAutoNavigated?: boolean): void {
        g_resultsPane.setSelectedRowIndex(selectedIndex, isAutoNavigated);
    }

    public static clearPreviewPane(): void {
        g_resultsPane.clearPreviewPane();
    }

    public static getRowIntoView(revealIndex: number, force?: boolean): void {
        g_resultsPane.getRowIntoView(revealIndex, force);
    }

    public static selectResultAndPreview(index: number, preview: Controls.BaseControl): void {
        g_resultsPane.selectResultAndPreview(index, preview);
    }
    
    public static showNoPreviewMessage(error: any): void {
        g_resultsPane.showNoPreviewMessage(error.message || error);
    }

    public static numberOfResultsDisplayed(): number {
        return g_resultsPane.numberOfResultsDisplayed();
    }

    /* Information area/landing page operations */

    public static drawSearchTips(title: string, tipsSummary: JQuery, feebackLinkPresent?: boolean, helpLinkPresent?: boolean): void {
        g_informationArea.drawSearchTips(title, tipsSummary, feebackLinkPresent, helpLinkPresent);
    }

    public static drawErrorMessage(errorTitle: string, errorText: string): void {
        g_informationArea.drawErrorMessage(errorTitle, errorText);
    }

    public static drawAccountFaultInErrorMessage(errorText: string): void {
        g_informationArea.drawAccountFaultInErrorMessage(errorText);
    }

    public static setFeedbackLink(activityId: string, entityTypeName: string): void {
        if (Context.SearchContext.isHosted()) {
            g_informationArea.setFeedbackLink(activityId, entityTypeName);
        }
    }

    public static drawGenericErrorMessage(errorText: string): void {
        g_informationArea.drawGenericErrorMessage(errorText);
    }

    public static setResultCountMessage(displayedResultsCount: number, totalResultsCount: number): void {
        g_informationArea.setResultCountMessage(displayedResultsCount, totalResultsCount);
    }

    public static setPreviewContentLoadingTile(): void {
        g_resultsPane.setPreviewContentLoadingTile();
    }

    /**
    * Sets the view to desired mode (landing page, results (3 pane vs 2 pane etc)
    */
    public static setViewMode(viewMode: Constants.ViewMode = Constants.ViewMode.LandingPage): void {
        var landingPageView: boolean = viewMode === Constants.ViewMode.LandingPage,
            resultsGridView: boolean = viewMode === Constants.ViewMode.ResultsGrid,
            resultsGridWithPreviewView: boolean = viewMode === Constants.ViewMode.ResultsGridWithPreview,
            intermediatePagePreview: boolean = viewMode === Constants.ViewMode.IntermediateViewMode;

        $(Constants.SearchConstants.SearchViewAreaCssSelector).toggleClass(Constants.SearchConstants.LandingPageViewModeCssClass, landingPageView);
        $(Constants.SearchConstants.SearchViewAreaCssSelector).toggleClass(Constants.SearchConstants.ResultsGridViewModeCssClass, resultsGridView);
        $(Constants.SearchConstants.SearchViewAreaCssSelector).toggleClass(Constants.SearchConstants.ResultsGridWithPreviewViewModeCssClass, resultsGridWithPreviewView);
        $(Constants.SearchConstants.SearchViewAreaCssSelector).toggleClass(Constants.SearchConstants.IntermediatePageViewModeCssClass, intermediatePagePreview);

        // For accessibility purposes in case of no results scenarios remove the handle bar from default tab order.
        // In all other scenarios include it in the tab order (restoring the default behavior).
        let $splitterHandleBar = $(".search-view-content-handle-bar");
        if (landingPageView || intermediatePagePreview) {
            $splitterHandleBar.attr("tabindex", "-1");
        }
        else {
            $splitterHandleBar.attr("tabindex", "0");
        }
    }

    public static hidePivotFilters(): void {
        $(Constants.SearchConstants.HubPivotFiltersSelector).hide()
    }

    public static showPivotFilters(): void {
        $(Constants.SearchConstants.HubPivotFiltersSelector).show()
    }

    private static sanitizedHtml(input: string): string {
        return Utils_String.htmlEncode(input);
    }
}