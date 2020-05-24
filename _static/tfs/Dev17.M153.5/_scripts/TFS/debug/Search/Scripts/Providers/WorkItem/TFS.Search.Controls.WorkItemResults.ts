// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Notifications = require("VSS/Controls/Notifications");
import Performance = require("Search/Scripts/Common/TFS.Search.Performance");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import WorkItemContracts = require("Search/Scripts/Contracts/TFS.Search.WorkItem.Contracts");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");
import ViewBuilder = require("Search/Scripts/Common/TFS.Search.ViewBuilder");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Search_Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import VSS = require("VSS/VSS");
import { WorkItemCommon } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Common";
import WorkItemBanner_NO_REQUIRE = require("Search/Scripts/Common/TFS.Search.MessageBanner");

import domElem = Utils_UI.domElem;

export class WorkItemResults extends Controls.BaseControl {
    private static RESULTS_PANE_CSS_SELECTOR: string = ".search-view-results-pane";
    private static ACCOUNT_NOT_INDEXED_MESSAGE_CSS_CLASS: string = "message";
    private static WORKITEM_ACCOUNT_NOT_INDEXED_CSS_CLASS: string = "work-item-account-not-indexed";
    private static NO_RESULTS_CSS_CLASS: string = "no-results";
    private static WILDCARD_NOT_SUPPORTED_MESSAGE_CSS_CLASS: string = "wildcard-not-support-message";
    private static WILDCARD_NOT_SUPPORTED_CSS_CLASS: string = "wildcard-not-support";

    // Information elements
    private _$noResultsMessage: JQuery;
    private _$accountNotIndexedMessage: JQuery;
    private _$prefixWildcardQueryNotSupportedMessage: JQuery;
    private _resultSelectionChangedHandler: any;
    private _previousWorkItemId: number;
    private messageBanner: WorkItemBanner_NO_REQUIRE.WorkItemSearchBannerMessage;

    constructor(options?) {
        super(options);
        if (this._options && this._options.resultSelectionChangedHandler) {
            this._resultSelectionChangedHandler = this._options.resultSelectionChangedHandler;
        }
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
    }

    /**
     * Draw preFix Wild Query Not supported Message.
     */
    public showPrefixWildcardQueryNotSupportedMessage(searchText: string): string {
        ViewBuilder.SearchViewBuilder.setViewMode();

        var messageText: string = Search_Helpers.Utils.replaceUsingSplitAndJoin(Search_Resources.PrefixWildcardQueryNotSupportedMessage, '{0}', searchText),
            prefixWildcardQueryNotSupportedMessage = "<p>" + messageText + "</p>",
            prefixWildcardQueryNotSupportedMessageElement: JQuery = $(domElem("div")).addClass(WorkItemResults.WILDCARD_NOT_SUPPORTED_MESSAGE_CSS_CLASS).append($(prefixWildcardQueryNotSupportedMessage)),
            _$container = $(Search_Constants.SearchConstants.SearchViewInformationAreaCssSelector);

        this._$prefixWildcardQueryNotSupportedMessage = $(domElem("div")).addClass(WorkItemResults.WILDCARD_NOT_SUPPORTED_CSS_CLASS).append(prefixWildcardQueryNotSupportedMessageElement);
        this._$prefixWildcardQueryNotSupportedMessage.appendTo(_$container);

        _$container.removeClass("collapsed");

        TelemetryHelper.TelemetryHelper.traceLog({ "PrefixWildcardQuery": true });

        return messageText;
    }

    /**
    * Hides the splitter and shows a message indicating the data in not indexed yet.
    */
    public showAccountNotIndexedMessage(activityId: string, entityTypeName: string): string {        
        ViewBuilder.SearchViewBuilder.setViewMode();
        return (Search_Resources.ShowWorkItemNotIndexedMessage + Context.SearchContext.isHosted()
            ? Search_Resources.ShowAccountNotIndexedFeedbackMessageForHosted.replace('{0}', Search_Resources.ContactUsText)
            : Search_Resources.ShowAccountNotIndexedFeedbackMessageForOnPrem);
    }

    /**
    * Hides the splitter and shows a message indicating no results were found.
    */
    public showNoResultsMessage(searchText: string, entityTypeName: string, activityId: string): string {
        var feedbackLink = Search_Resources.WorkItemSearchFeedbackMail.replace('{0}', entityTypeName).replace('{1}', activityId),
            noResultsSupportMessage = Search_Resources.WorkItemSearchNoResultsSupportMessage.replace('{0}', feedbackLink),
            noResultsMessage = Search_Helpers.Utils.replaceUsingSplitAndJoin(Search_Resources.WorkItemSearchNoResultsFoundMessage, '{0}', searchText) + noResultsSupportMessage,
            _$container = $(Search_Constants.SearchConstants.SearchViewInformationAreaCssSelector);

        this._$noResultsMessage = $(domElem("div")).append(noResultsMessage)
            .addClass(WorkItemResults.NO_RESULTS_CSS_CLASS)
            .appendTo(_$container);

        _$container.removeClass("collapsed");

        return Search_Helpers.Utils.replaceUsingSplitAndJoin(Search_Resources.NoResultsFoundMessage, '{0}', searchText) +
            (Context.SearchContext.isHosted()
                ? Search_Resources.NoResultsSupportMessageForHosted.replace('{0}', Search_Resources.GoHereLabel.toLocaleLowerCase()).replace('{1}', Search_Resources.LetUsKnowLabel)
            : Search_Resources.NoResultsSupportMessageForOnPremise.replace('{0}', Search_Resources.GoHereLabel.toLocaleLowerCase()));
    }

    public showNewWorkItemMessageBanner(messageContent: any, type: Notifications.MessageAreaType, showIcon: boolean, onClose?: Function): void {
        VSS.using(["Search/Scripts/Common/TFS.Search.MessageBanner"],
            (WorkItemBanner: typeof WorkItemBanner_NO_REQUIRE) => {
                if (!this.messageBanner) {
                    this.messageBanner = new WorkItemBanner.WorkItemSearchBannerMessage($("#welcome-banner"));
                }

                if (!this.messageBanner.isVisible()) {
                    this.messageBanner.showBanner(messageContent, type, showIcon, onClose);

                    TelemetryHelper.TelemetryHelper.traceLog({ "WorkItemSearchWelcomeBannerShown": true});
                }
            });
    }

    /**
    * Sets the results handler callback
    * @param resultsHandler The results handler
    */
    public setResultHandler(resultsHandler: any): void {
    }
}