// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Controls = require("VSS/Controls");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;

export class InformationArea extends Controls.BaseControl {
    private static INFO_AREA_CSS_CLASS: string = "search-view-information-area";
    private static RESULTS_COUNT_MESSAGE_CSS_CLASS: string = "results-count-message";
    private static SUMMARY_CSS_CLASS: string = "search-view-information-summary";
    private static TITLE_CSS_CLASS: string = "search-view-information-title";
    private static FEEDBACK_LINK_CSS_CLASS: string = "feedback-link"

    private static RESULTS_HEADER_CSS_SELECTOR: string = ".search-results-pane-header";

    private _$title: JQuery;
    private _$summary: JQuery;
    private _$resultCountMessage: JQuery;
    private _$feedbackLink: JQuery;

    constructor(options?) {
        super(options);
        this.setEnhancementOptions({
            cssClass: InformationArea.INFO_AREA_CSS_CLASS + " " + "collapsed"
        });
    }

    /**
    * Clears the information area.
    */
    public clear(): void {
        this._element.empty();
        this._element.addClass("collapsed");

        if (this._$title) {
            this._$title.remove();
            this._$title = null;
        }

        if (this._$summary) {
            this._$summary.remove();
            this._$summary = null;
        }

        this.clearResultCountMessage();
        this.clearFeedbackLink();
    }

    public clearResultCountMessage(): void {
        if (this._$resultCountMessage) {
            this._$resultCountMessage.remove();
            this._$resultCountMessage = null;
        }
    }

    public clearFeedbackLink(): void {
        if (this._$feedbackLink) {
            this._$feedbackLink.remove();
            this._$feedbackLink = null;
        }
    }

    /**
    * Draws the text area specifying the guidance about how to search.
    */
    public drawSearchTips(title: string, tipsSummary: JQuery, feebackLinkPresent?: boolean, helpLinkPresent?: boolean): void {
        // Clear existing content if any
        this.clear();

        this._$title = $(domElem("div", InformationArea.TITLE_CSS_CLASS)).appendTo(this._element).text(title);
        this._$summary = tipsSummary.addClass(InformationArea.SUMMARY_CSS_CLASS).appendTo(this._element);

        if (feebackLinkPresent) {
            $("#search-hub-feedbacklink").bind('click', (e) => {
                // Trace - click on feedback email alias on search landing page
                TelemetryHelper.TelemetryHelper.traceLog({ "ProvideFeedBackActionOnSearchHub": true });
            });
        }

        if (helpLinkPresent) {
            $("#search-hub-helplink").bind('click', (e) => {
                // Trace - click on help link on search landing page
                TelemetryHelper.TelemetryHelper.traceLog({ "HelpLinkActionOnSearchHub": true });
            });
        }

        // Set the div visible.
        this._element.removeClass("collapsed");
    }

    /**
    * Draws an error message based on the title and error text passed in.
    * @param errorTitle The error title.
    * @param errorText The error message.
    */
    public drawErrorMessage(errorTitle: string, errorText?: string): void {
        // Hide the div
        this._element.addClass("collapsed");
        var finalErrorMessage: string = errorTitle;
        this._$title = $(domElem("div", InformationArea.TITLE_CSS_CLASS)).text(errorTitle || "");
        if (errorText) {
            this._$summary = $(domElem("div", InformationArea.SUMMARY_CSS_CLASS)).append(errorText || "");
            finalErrorMessage = finalErrorMessage + " " + errorText;
        }

        var errorMessage: JQuery = $(domElem("div")).append(this._$title).append(this._$summary);
        this._element.append(errorMessage);

        // set the div visible
        this._element.removeClass("collapsed");
        TelemetryHelper.TelemetryHelper.traceLog({ "Error": finalErrorMessage });
    }

    /**
    * Draws an error message when the region is not supported by search.
    * @param errorText The error message.
    */
    public drawAccountFaultInErrorMessage(errorText: string): void {
        // Hide the element first
        this._element.addClass("collapsed");
        this._$summary = $(domElem("div", InformationArea.SUMMARY_CSS_CLASS)).appendTo(this._element).text(errorText || "");

        // Make the div visible
        this._element.removeClass("collapsed");
        TelemetryHelper.TelemetryHelper.traceLog({ "AccountFaultInError": errorText });
    }

    /**
    * Draws an error message based on the title and error text passed in.
    * @param errorText The error message.
    */
    public drawGenericErrorMessage(errorText: string): void {
        this.drawErrorMessage(Search_Resources.GenericErrorTitleMessage, errorText);
    }

    /**
    * Returns a value indicating whether content is being displayed or not.
    */
    public hasContent(): boolean {
        if (this._$title || this._$summary) {
            return true;
        }

        return false;
    }

    public setResultCountMessage(displayedResultsCount: number, totalResultsCount: number): void {
        var resultsTitle: string;

        if (displayedResultsCount === 1) {
            resultsTitle = Search_Resources.ShowingSingleResultTitle;
        }
        else if (displayedResultsCount === totalResultsCount) {
            resultsTitle = Search_Resources.ShowingXResultsTitle.replace('{0}', String(displayedResultsCount));
        }
        else {
            resultsTitle = Search_Resources.ShowingXofYResultsTitle.replace('{0}', String(displayedResultsCount)).replace('{1}', String(totalResultsCount))
        }

        this._$resultCountMessage = $(domElem("div", InformationArea.RESULTS_COUNT_MESSAGE_CSS_CLASS)).text(resultsTitle);

        // Attach "results count" message to the results pane header
        $(InformationArea.RESULTS_HEADER_CSS_SELECTOR).append(this._$resultCountMessage);
    }

    // Sets the provide feedback link
    public setFeedbackLink(activityId: string, entityTypeName: string): void {
        var mailLink = "mailto:vstssearch@microsoft.com?Subject=Feedback on Azure DevOps Services " + entityTypeName + " Search [Reference ID: " + activityId + "]";

        this._$feedbackLink = $(domElem("div", InformationArea.FEEDBACK_LINK_CSS_CLASS));
        $(domElem('a')).appendTo(this._$feedbackLink)
            .text(Search_Resources.ProvideFeedbackLink)
            .attr('target', '_top')
            .attr('href', mailLink)
            .attr('alt', Search_Resources.FeedbackMessageText)
            .css('text-decoration', 'underline')
            .trigger('click');

        $(InformationArea.RESULTS_HEADER_CSS_SELECTOR).append(this._$feedbackLink);

        this._$feedbackLink.click(() => {
            // Trace - click on feedback link on search results page
            TelemetryHelper.TelemetryHelper.traceLog({ "ProvideFeedBackActionOnResultsPane": true });
        });
    }
}
