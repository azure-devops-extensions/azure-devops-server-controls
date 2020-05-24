// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Notifications = require("VSS/Controls/Notifications");
import Providers = require("Search/Scripts/Providers/TFS.Search.Providers");
import Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Service_NO_REQUIRE = require("VSS/Service");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Settings_RestClient_NO_REQUIRE = require("VSS/Settings/RestClient");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import ViewBuilder = require("Search/Scripts/Common/TFS.Search.ViewBuilder");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

/**
* Helper class to handle error messages received from search service
*/
export class ResponseMessage {

    private static m_isIndexingErrorLogged: boolean = false;

    /**
    * Handles no matches or special messages received from search service
    */
    public static handleResponseMessages(
        response: Providers.IResponseWithActivityId,
        entityTypeName: string,
        showMoreResults: boolean,
        v2Layout: boolean): string {
        var results: any = response.searchResults,
            message: string = "";

        // If response has error codes then below is the priority order in which we show messages in the results pane.
        // 1. Show account not indexed message if IndexingNotStartedErrorCode is present
        // 2. Show PrefixWildcardQueryNotSupported message if PrefixWildcardQueryNotSupported is present 
        //    and IndexingNotStartedErrorCode is not present
        // 3. If none of the above is there and there are 0 results then show no results found message.        
        if (response.searchResults.errors && response.searchResults.errors.length > 0) {
            if (ResponseMessage.errorCodeExists(response.searchResults.errors, Constants.SearchConstants.IndexingNotStartedErrorCode)
                || (ResponseMessage.errorCodeExists(response.searchResults.errors, Constants.SearchConstants.AccountIsBeingOnboarded)
                    && response.searchResults.results.values.length <= 0)) {
                message = ViewBuilder.SearchViewBuilder.showAccountNotIndexedMessage(State.SearchViewState.currentActivityId, entityTypeName);
            }
            else if (ResponseMessage.errorCodeExists(response.searchResults.errors, Constants.SearchConstants.PrefixWildcardQueryNotSupported)) {
                message = ViewBuilder.SearchViewBuilder.showPrefixWildcardQueryNotSupportedMessage(results.query.searchText);
            }
            else if (response.searchResults.results.values.length <= 0) {
                message = this.showNoResultsMessage(response, entityTypeName, showMoreResults, v2Layout);
            }

            // TODO Add this tracing in new layout of no results page when this file is being removed.
            // Trace indexing status per session, if bulk indexing or project rename happened
            if (!ResponseMessage.m_isIndexingErrorLogged) {
                var serializedErrorCodes: string = ResponseMessage.serializeErrorCodes(response.searchResults.errors);
                TelemetryHelper.TelemetryHelper.traceLog({ "IndexingErrorCodes": serializedErrorCodes });
                ResponseMessage.m_isIndexingErrorLogged = true;
            }
        }
        else if (response.searchResults.results.values.length <= 0) {
            message = this.showNoResultsMessage(response, entityTypeName, showMoreResults, v2Layout);
        }

        if (Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItemWelcomeBanner)) {
            if (entityTypeName === Resources.WorkItemEntityName &&
                !(ResponseMessage.errorCodeExists(response.searchResults.errors, Constants.SearchConstants.IndexingNotStartedErrorCode) ||
                    ResponseMessage.errorCodeExists(response.searchResults.errors, Constants.SearchConstants.AccountIsBeingOnboarded))) {

                VSS.using(["VSS/Service", "VSS/Settings/RestClient"],
                    (Service: typeof Service_NO_REQUIRE, Settings_RestClient: typeof Settings_RestClient_NO_REQUIRE) => {
                        Service.getClient(Settings_RestClient.SettingsHttpClient).getEntries("me", "WorkItemSearch").then(
                            (showBanner: any) => {
                                if (!showBanner.value["IsWelcomeBannerClosedByUser"]) {
                                    let $helpPageLink = $(domElem("a", "help-link"))
                                        .text(Resources.LearnMoreText + ".")
                                        .attr("href", "https://go.microsoft.com/fwlink/?linkid=845419")
                                        .css("text-decoration", "none")
                                        .attr("target", "_blank")
                                        .unbind("click")
                                        .bind("click", () => {
                                            TelemetryHelper.TelemetryHelper.traceLog({ "WelcomeBannerHelpLinkClick": true });
                                        }),
                                        $welcomeMessageSpan: JQuery = $(domElem("span", "welcome-message")).text(Resources.WorkItemWelcomebannerMessage),
                                        $turnOffMessageSpan: JQuery = $(domElem("span", "turn-off-message")).text(Resources.WorkItemSearchTurnoffMessage),
                                        welcomeBannerMessage: JQuery = $(domElem("span", "workitem-search-welcome-banner"))
                                            .append($welcomeMessageSpan)
                                            .append($helpPageLink);

                                    let isOptoutFeatureEnabled = Helpers.Utils.isFeatureFlagEnabled(
                                        ServerConstants
                                            .FeatureAvailabilityFlags
                                            .WebAccessSearchWorkItemFeatureToggle);

                                    // Append "Not ready yet" message only iff the Opt-out experience is enabled.
                                    if (isOptoutFeatureEnabled) {
                                        welcomeBannerMessage.append($turnOffMessageSpan);
                                    }

                                    ViewBuilder.SearchViewBuilder.showNewWorkItemMessageBanner(
                                        welcomeBannerMessage,
                                        Notifications.MessageAreaType.Info,
                                        false,
                                        () => {
                                            let settingsToUpdate: IDictionaryStringTo<boolean> = {};
                                            settingsToUpdate["WorkItemSearch/IsWelcomeBannerClosedByUser"] = true;
                                            Service.getClient(Settings_RestClient.SettingsHttpClient).setEntries(settingsToUpdate, "me");
                                        });
                                }

                            });
                    });
            }
        }

        return message;
    }

    /**
    * Handles no matches or special messages received from search service
    */
    public static handleBannerErrorCodes(response: Providers.IResponseWithActivityId): void {
        var errors: Core_Contracts.IErrorData[] = response.searchResults.errors,
            resultsCount = response.searchResults.results.values.length;
        if (errors && errors.length > 0) {
            // TODO: [bsarkar] Have different banner messages for different error codes in S113
            if (ResponseMessage.errorCodeExists(errors, Constants.SearchConstants.AccountIsBeingIndexed)
                || ResponseMessage.errorCodeExists(errors, Constants.SearchConstants.AccountIsBeingReindexed)
                || (ResponseMessage.errorCodeExists(errors, Constants.SearchConstants.AccountIsBeingOnboarded) && resultsCount > 0)) {
                if (!ViewBuilder.SearchViewBuilder.isMessageBannerShown()) {
                    ViewBuilder.SearchViewBuilder.showMessageBanner(
                        Resources.AccountIsGettingIndexedBannerMessage,
                        Notifications.MessageAreaType.Info);
                }
            }
            else if (ResponseMessage.errorCodeExists(errors, Constants.SearchConstants.BranchesAreBeingIndexed)) {
                if (!ViewBuilder.SearchViewBuilder.isMessageBannerShown()) {
                    ViewBuilder.SearchViewBuilder.showMessageBanner(
                        Resources.BranchesAreBeingIndexed,
                        Notifications.MessageAreaType.Info);
                }
            }
        }
    }

    /**
    * Draws no Results Message
    */
    private static showNoResultsMessage(
        response: Providers.IResponseWithActivityId,
        entityTypeName: string,
        showMoreResults: boolean,
        v2Layout: boolean): string {
        // Show feedback link in old layout
        !v2Layout && ViewBuilder.SearchViewBuilder.setFeedbackLink(State.SearchViewState.currentActivityId, entityTypeName);
        var results: any = response.searchResults,
            message: string = "";

        // Displaying no results message even if the total number of results are less than or equal to 50 and all of them are trimmed out
        if (response.searchResults.results.count <= Constants.SearchConstants.DefaultTakeResults) {
            // Show no results message as there are no hits
            message = ViewBuilder.SearchViewBuilder.showNoResultsMessage(results.query.searchText, entityTypeName, State.SearchViewState.currentActivityId);
            ViewBuilder.SearchViewBuilder.setViewMode(Constants.ViewMode.LandingPage);
            TelemetryHelper.TelemetryHelper.traceLog({ "ShowNoSearchResultsMessage": {} });
        }
        else if (showMoreResults === undefined) {
            // Show no results message with show more link as there might be more results            
            message = ViewBuilder.SearchViewBuilder.showNoResultsMessageWithShowMoreLink(results.query.searchText);
            TelemetryHelper.TelemetryHelper.traceLog({ "showNoResultsMessageWithShowMoreLink": {} });
        }
        else if (showMoreResults === true) {
            // Show no results message as the top 1000 results are not accessible to the user
            message = ViewBuilder.SearchViewBuilder.showNoResultsMessageAfterClickingShowMoreLink(results.query.searchText);
            TelemetryHelper.TelemetryHelper.traceLog({ "showNoResultsMessageAfterClickingShowMoreLink": {} });
        }

        return message;
    }

    /**
    * Serialize errors
    */
    private static serializeErrorCodes(errorData: Core_Contracts.IErrorData[]): string {
        var errorCodeList: Array<string> = new Array<string>();

        for (var i = 0; i < errorData.length; i++) {
            errorCodeList.push(errorData[i].errorCode);
        }

        return errorCodeList.join();
    }

    /**
    * Tests whether given error code exists in errors
    */
    public static errorCodeExists(errorData: Core_Contracts.IErrorData[], errorCode: string): boolean {
        var exists: boolean = false;

        var length: number = errorData.length;
        for (var index = 0; index < length; index++) {
            if (errorData[index].errorCode === errorCode) {
                exists = true;
                break;
            }
        }

        return exists;
    }
}
