// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import CodeUtils = require("Search/Scripts/Providers/Code/TFS.Search.CodeUtils");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import Utils_Clipboard = require("VSS/Utils/Clipboard");
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Code_Contracts = require("Search/Scripts/Contracts/TFS.Search.Code.Contracts");
import Search_Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Search_Navigation = require("Search/Scripts/Common/TFS.Search.NavigationExtensions");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Search_UserPreferences = require("Search/Scripts/UserPreferences/TFS.Search.UserPreferences");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import ViewBuilder = require("Search/Scripts/Common/TFS.Search.ViewBuilder");
import VSS = require("VSS/VSS");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import Events_Services_NO_REQUIRE = require("VSS/Events/Services");
import domElem = Utils_UI.domElem;

export class ResultsView extends Controls.BaseControl {
    private static PREVIEW_PANE_CONTENT_CSS_SELECTOR: string = ".search-preview-contents";
    private static PREVIEW_PANE_ERROR_MESSAGE_SUMMARY_SELECTOR: string = ".information-summary";
    private static PREVIEW_PANE_ERROR_MESSAGE_TITLE_SELECTOR: string = ".information-title";
    private static RESULTS_PANE_CSS_SELECTOR: string = ".search-view-results-pane";
    private static TABBED_VIEWER_CSS_SELECTOR: string = ".search-tabbed-viewer";
    private static PREVIEW_CONTENT_LOADING_CSS_SELECTOR: string = ".search-preview-contents-loading";

    private static ACCOUNT_NOT_INDEXED_CSS_CLASS: string = "code-account-not-indexed";
    private static ACCOUNT_NOT_INDEXED_MESSAGE_CSS_CLASS: string = "code-account-not-indexed-message";
    private static WILDCARD_NOT_SUPPORTED_MESSAGE_CSS_CLASS: string = "wildcard-not-support-message";
    private static WILDCARD_NOT_SUPPORTED_CSS_CLASS: string = "wildcard-not-support";
    private static ACCOUNT_NOT_INDEXED_SUPPORT_MESSAGE_CSS_CLASS: string = "code-account-not-indexed-support-message";
    private static MOUSE_OVER_CSS_CLASS: string = "mouse-over";
    private static NO_PREVIEW_MESSAGE_CSS_CLASS: string = "information-summary";
    private static NO_PREVIEW_TITLE_CSS_CLASS: string = "information-title";
    private static NO_RESULTS_CSS_CLASS: string = "no-results";
    private static SEARCH_RESULTS_PANE_CONTENTS_CSS_CLASS: string = "search-results-contents";
    private static SHOW_MORE_RESULTS_LINK_CSS_CLASS: string = "show-more-results";
    private static SHOW_MORE_RESULTS_CELL_BACKGROUND_CSS_CLASS: string = "show-more-results-cell-background";
    private static PREVIEW_CONTENT_LOADING: string = "search-preview-contents-loading";
    private static FILENAME_HEADER_CSS_CLASS: string = ".search-view-results-filename";
    private static FILENAME_HEADER_LINK_CSS_CLASS: string = ".search-view-results-filename-link";

    private static blogLink: string = "http://blogs.msdn.com/b/wlennon/archive/2015/09/21/what-are-my-version-control-permissions-on-visual-studio-online.aspx";

    private static ACTION_DELAY_TIME_IN_MS: number = 300;
    private static DETECT_LAST_RESULT_CELL_DELAY_TIME_IN_MS: number = 0.2;

    // Information elements
    private _$noResultsMessage: JQuery;
    private _$noPreviewMessage: JQuery;
    private _$accountNotIndexedMessage: JQuery;
    private _$prefixWildcardQueryNotSupportedMessage: JQuery;

    // Results/left pane
    private _$resultsPane: JQuery;
    
    // Preview/right pane
    private _$previewPane: JQuery;
    private _preview: Controls.BaseControl;
    
    private _selectedIndex: number;
    private _numberOfRowsDisplayed: number = 0;
    private _clearPreviewErrorMessage: boolean = false;

    constructor(options?) {
        super(options);
        
        this._$resultsPane = $(ResultsView.RESULTS_PANE_CSS_SELECTOR);
        this._$previewPane = $(ResultsView.PREVIEW_PANE_CONTENT_CSS_SELECTOR).attr("style", "height: 100%");
    }

    /**
    * Clears the results grid, the preview, and starts the loading animation.
    */
    public clear(onPreviewOrientationChange?: boolean): void {
        if (this._$noResultsMessage) {
            this._$noResultsMessage.remove();
            this._$noResultsMessage = null;
        }

        if (this._$accountNotIndexedMessage) {
            this._$accountNotIndexedMessage.remove();
            this._$accountNotIndexedMessage = null;
        }

        if (this._$prefixWildcardQueryNotSupportedMessage) {
            this._$prefixWildcardQueryNotSupportedMessage.remove();
            this._$prefixWildcardQueryNotSupportedMessage = null;
        }

        if (this._$noPreviewMessage) {
            this._$noPreviewMessage.remove();
            this._$noPreviewMessage = null;
        }

        if (this._preview && onPreviewOrientationChange != true) {
            this._preview.hideElement();
        }
    }

    /**
    * Clears preview pane error messages
    * @params newFlagValue it sets the flag value of _clearPreviewErrorMessage flag with the new value
    */
    private clearPreviewPaneErrorMessage(newFlagValue: boolean): void {
        if (this._clearPreviewErrorMessage) {
            this._$previewPane.find($(ResultsView.PREVIEW_PANE_ERROR_MESSAGE_TITLE_SELECTOR)).remove();
            this._$previewPane.find($(ResultsView.PREVIEW_PANE_ERROR_MESSAGE_SUMMARY_SELECTOR)).remove();
        }

        this._clearPreviewErrorMessage = newFlagValue;
    }

    /**
    * Selects a result from the result grid and displays a preview.
    * @param index The index in the result grid to select.
    * @param preview The preview Base Control to display in the right pane.
    */
    public selectResultAndPreview(index: number, preview: Controls.BaseControl): void {
        if (this._preview !== preview) {
            // clear preview pane header and preview content area
            this.clearPreviewPane();
            this._preview = preview;
            this._preview.createIn(this._$previewPane);
        }

        this.clearPreviewPaneErrorMessage(false);
    }

    public clearPreviewPane(): void {
        if (this._$previewPane) {
            this.removePreviewContentLoadingTile();
            this._$previewPane.empty();
        }
    }

    /**
    * Hides the splitter and shows a message indicating the preview could not be displayed along with a detailed reason.
    */
    public showNoPreviewMessage(error: string): void {
        this.clearPreview();
        this._$noPreviewMessage = $(domElem("div")).appendTo(this._$previewPane);
        $(domElem("div")).text(Search_Resources.PreviewLoadErrorMessage).addClass(ResultsView.NO_PREVIEW_TITLE_CSS_CLASS).appendTo(this._$noPreviewMessage);
        $(domElem("div")).text(error).addClass(ResultsView.NO_PREVIEW_MESSAGE_CSS_CLASS).appendTo(this._$noPreviewMessage);
    }

    /**
    * Hides the splitter and shows a message indicating the data in not indexed yet.
    */
    public showAccountNotIndexedMessage(activityId: string, entityTypeName: string): string {
        ViewBuilder.SearchViewBuilder.setViewMode();
        var mailLink = "mailto:vstssearch@microsoft.com?Subject=Feedback on Azure DevOps Services " + entityTypeName + " Search [Reference ID: " + activityId + "]",
            feedbackLink = "<a href='" + mailLink + "' id='account-not-indexed-feedbacklink' target='_top' style='text-decoration: underline'>" + Search_Resources.ContactUsText + "</a>",
            accountNotIndexedMessage = Context.SearchContext.isHosted()
                ? "<p>" + Search_Resources.ShowCodeNotIndexedMessageForHosted + "</p>"
                : "<p>" + Search_Resources.ShowCodeNotIndexedMessageForOnPremise + "</p>",

            accountNotIndexedFeedbackMessage = Context.SearchContext.isHosted()
                ? "<p>" + Search_Resources.ShowAccountNotIndexedFeedbackMessageForHosted.replace('{0}', feedbackLink) + "</p>"
                : "<p>" + Search_Resources.ShowAccountNotIndexedFeedbackMessageForOnPrem + "</p>",

            accountNotIndexedSupportMessageElement: JQuery = $(domElem("div")).addClass(ResultsView.ACCOUNT_NOT_INDEXED_SUPPORT_MESSAGE_CSS_CLASS).append($(accountNotIndexedFeedbackMessage)),
            accountNotIndexedMessageElement: JQuery = $(domElem("div")).addClass(ResultsView.ACCOUNT_NOT_INDEXED_MESSAGE_CSS_CLASS).append($(accountNotIndexedMessage)),
            _$container = $(Search_Constants.SearchConstants.SearchViewInformationAreaCssSelector);

        this._$accountNotIndexedMessage = $(domElem("div")).addClass(ResultsView.ACCOUNT_NOT_INDEXED_CSS_CLASS).append(accountNotIndexedMessageElement).append(accountNotIndexedSupportMessageElement);
        this._$accountNotIndexedMessage.appendTo(_$container);
        _$container.removeClass("collapsed");

        $("#account-not-indexed-feedbacklink").click((e) => {
            TelemetryHelper.TelemetryHelper.traceLog({ "AccountNotIndexedContactUsAction": true });
        });

        return (Context.SearchContext.isHosted()
            ? Search_Resources.ShowCodeNotIndexedMessageForHosted
            : Search_Resources.ShowCodeNotIndexedMessageForOnPremise) +
            (Context.SearchContext.isHosted()
                ? Search_Resources.ShowAccountNotIndexedFeedbackMessageForHosted.replace('{0}', Search_Resources.ContactUsText)
                : Search_Resources.ShowAccountNotIndexedFeedbackMessageForOnPrem);
    }

    /**
    * Draw preFix Wild Query Not supported Message.
    */
    public showPrefixWildcardQueryNotSupportedMessage(searchText: string): string {
        ViewBuilder.SearchViewBuilder.setViewMode();

        var messageText: string = Search_Helpers.Utils.replaceUsingSplitAndJoin(Search_Resources.PrefixWildcardQueryNotSupportedMessage, '{0}', searchText),
            prefixWildcardQueryNotSupportedMessage = "<p>" + messageText + "</p>",
            prefixWildcardQueryNotSupportedMessageElement: JQuery = $(domElem("div")).addClass(ResultsView.WILDCARD_NOT_SUPPORTED_MESSAGE_CSS_CLASS).append($(prefixWildcardQueryNotSupportedMessage)),
            _$container = $(Search_Constants.SearchConstants.SearchViewInformationAreaCssSelector);

        this._$prefixWildcardQueryNotSupportedMessage = $(domElem("div")).addClass(ResultsView.WILDCARD_NOT_SUPPORTED_CSS_CLASS).append(prefixWildcardQueryNotSupportedMessageElement);

        // Append to container and make it visible
        this._$prefixWildcardQueryNotSupportedMessage.appendTo(_$container);
        _$container.removeClass("collapsed");

        TelemetryHelper.TelemetryHelper.traceLog({ "PrefixWildcardQuery": true });

        return messageText;
    }

    /**
    * Hides the splitter and shows a message indicating no results were found.
    */
    public showNoResultsMessage(searchText: string, entityTypeName: string, activityId: string): string {
        var noResultsFoundMessageStr = Search_Helpers.Utils.replaceUsingSplitAndJoin(Search_Resources.NoResultsFoundMessage, '{0}', searchText),
            mailLink = "mailto:vstssearch@microsoft.com?Subject=Feedback on " + entityTypeName + " Search [Reference ID: " + activityId + "]",
            feedbackLink = "<a href='" + mailLink + "' id='no-results-found-feedbacklink' target='_top' style='text-decoration: underline'> "+ Search_Resources.LetUsKnowLabel+"</a>",
            wikiLink = "https://go.microsoft.com/fwlink/?LinkId=698587&clcid=0x409",
            supportLink = "<a href='" + wikiLink + "' target='_top' style='text-decoration: underline'> " + Search_Resources.GoHereLabel +"</a>",
            noResultsSupportMessage = Context.SearchContext.isHosted()
                ? "<p>" + Search_Resources.NoResultsSupportMessageForHosted.replace('{0}', supportLink).replace('{1}', feedbackLink) + "</p>"
                : "<p>" + Search_Resources.NoResultsSupportMessageForOnPremise.replace('{0}', supportLink) + "</p>",
            noResultsMessage = noResultsFoundMessageStr + noResultsSupportMessage,
            _$container = $(Search_Constants.SearchConstants.SearchViewInformationAreaCssSelector);

        this._$noResultsMessage = $(domElem("div")).append(noResultsMessage)
            .addClass(ResultsView.NO_RESULTS_CSS_CLASS)
            .appendTo(_$container);

        _$container.removeClass("collapsed");

        $("#no-results-found-feedbacklink").click((e) => {
            TelemetryHelper.TelemetryHelper.traceLog({ "NoResultsFoundContactAction": true });
        });

        return noResultsFoundMessageStr +
            (Context.SearchContext.isHosted()
                ? Search_Resources.NoResultsSupportMessageForHosted.replace('{0}', Search_Resources.GoHereLabel).replace('{1}', Search_Resources.LetUsKnowLabel)
            : Search_Resources.NoResultsSupportMessageForOnPremise.replace('{0}', Search_Resources.GoHereLabel));
    }

    /**
    * Hides the splitter and shows a message indicating to click on show more to get more results.
    */
    public showNoResultsMessageWithShowMoreLink(searchText: string): string {
        ViewBuilder.SearchViewBuilder.setViewMode();
        var showMoreResultsAfterSecTrimmingMessageStr = Search_Helpers.Utils.replaceUsingSplitAndJoin(Search_Resources.ShowMoreResultsAfterSecTrimmingMessage, '{0}', searchText),
            showMoreLink = "<span id='no-results-show-more-link' style='text-decoration: underline;display: inline-block;color: #077acc;cursor: pointer;'> " + Search_Resources.ShowMoreLowerCaseLabel +"</span>",
            link = "<a href='" + ResultsView.blogLink + "' id='version-control-presmissions-blog' target='_top' style='text-decoration: underline'> " + Search_Resources.CheckAccessPermissionLabel +"</a>",
            showMoreLinkWithNoResultsMessage = "<div style='display: inline-block'>" + showMoreResultsAfterSecTrimmingMessageStr.replace('{1}', link).replace('{2}', showMoreLink) + "</div>",
            _$container = $(Search_Constants.SearchConstants.SearchViewInformationAreaCssSelector);

        this._$noResultsMessage = $(domElem("div")).append(showMoreLinkWithNoResultsMessage)
            .addClass(ResultsView.NO_RESULTS_CSS_CLASS)
            .appendTo(_$container);

        _$container.removeClass("collapsed");
        $("#no-results-show-more-link").click((e) => {
            VSS.using(["VSS/Events/Services"],
                (Events_Services: typeof Events_Services_NO_REQUIRE) => {
                    Events_Services.getService().fire(Search_Constants.SearchConstants.ShowMoreResultsEvent);
                });
        });

        return showMoreResultsAfterSecTrimmingMessageStr
            .replace('{1}', Search_Resources.CheckAccessPermissionLabel)
            .replace('{2}', Search_Resources.ShowMoreLowerCaseLabel);
    }

    public showNoResultsMessageAfterClickingShowMoreLink(searchText: string): string {
        ViewBuilder.SearchViewBuilder.setViewMode();
        var noResultsMessageStr = Search_Helpers.Utils.replaceUsingSplitAndJoin(Search_Resources.NoResultsMessageAfterClickingShowMore, '{0}', searchText),
            link = "<a href='" + ResultsView.blogLink + "' id='version-control-presmissions-blog' target='_top' style='text-decoration: underline'> Check your access permissions</a>",
            showNoResultsMessageAfterClickingShowMoreLink = "<p style='display: inline-block'>" + noResultsMessageStr.replace('{1}', link) + "<p>",
            _$container = $(Search_Constants.SearchConstants.SearchViewInformationAreaCssSelector);

        this._$noResultsMessage = $(domElem("div")).append(showNoResultsMessageAfterClickingShowMoreLink)
            .addClass(ResultsView.NO_RESULTS_CSS_CLASS)
            .appendTo(_$container);

        _$container.removeClass("collapsed");

        return noResultsMessageStr.replace('{1}', "Check your access permissions");
    }
    
    private clearPreview(): void {
        this.clearPreviewPaneErrorMessage(true);
        this._$previewPane.find($(ResultsView.TABBED_VIEWER_CSS_SELECTOR)).hide();
        // remove loading tile
        this.removePreviewContentLoadingTile();
    }

    /**
    * Removes loading tile from preview pane.
    */
    private removePreviewContentLoadingTile() {
        $(ResultsView.PREVIEW_CONTENT_LOADING_CSS_SELECTOR).remove();
    }

    /**
    * Appends loading tile to preview area before preview pane is loaded
    */
    public setPreviewContentLoadingTile() {
        if ($(ResultsView.PREVIEW_CONTENT_LOADING_CSS_SELECTOR).length < 1) {
            $(domElem("div")).addClass(ResultsView.PREVIEW_CONTENT_LOADING).appendTo(this._$previewPane);
        }
    }
}
