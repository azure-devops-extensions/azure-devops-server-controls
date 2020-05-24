// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";
import { SearchViewState } from "Search/Scripts/Common/TFS.Search.ViewState";
import Providers = require("Search/Scripts/Providers/TFS.Search.Providers");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Performance = require("Search/Scripts/Common/TFS.Search.Performance");
import { TelemetryHelper } from "Search/Scripts/Common/TFS.Search.TelemetryHelper";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";

export class AccountSource {

    /**
     * Fetches the list of accounts eligible for cross account search  and calls the callback using hte list.
     * @param successDelegate
     */
    public getAccounts(successDelegate: Function): void {
        var provider: Providers.ISearchProvider = SearchViewState.currentProvider;
        var tenantRequestStartTime: any = Performance.getTimestamp();
        var filterList: any[] = [];
        provider.getTenantResultsAsync(
            SearchViewState.currentActivityId,
            SearchViewState.currentQueryString,
            Context.SearchContext.getDefaultContext().navigation.applicationServiceHost.name,
            SearchViewState.currentFiltersDecoded,
            false).then((tenantResponse) => {
                var isStaleTenantQueryResponse: boolean = SearchViewState.currentActivityId !== tenantResponse.activityId;
                var tenantRequestResponseTime: any = Performance.getTimestamp();
                TelemetryHelper.traceLog({
                    "TenantE2eQueryTime": tenantRequestResponseTime - tenantRequestStartTime,
                    "StaleTenantActivityId": isStaleTenantQueryResponse
                }, isStaleTenantQueryResponse ? tenantResponse.activityId : SearchViewState.currentActivityId);

                if (isStaleTenantQueryResponse) {
                    Performance.abortGetAccountFiltersForCodeScenario();
                    return;
                }
                provider.getFiltersFromResponse(tenantResponse).then((tenantFilters) => {
                    for (var i in tenantFilters) {
                        var category = tenantFilters[i];

                        if ((category.name === SearchConstants.AccountFilters)) {
                            filterList.push(tenantFilters[i]);
                        }
                    }

                    // Call the success delegate once the results are fetched.
                    let accounts = filterList[0] && filterList[0].filters;

                    successDelegate(accounts || []);
                    Performance.endGetAccountFiltersForCodeScenario();
                    TelemetryHelper.traceLog({ "TenantFiltersRenderingTime": Performance.getTimestamp() - tenantRequestResponseTime });
                });

            }, (error: any) => {
                successDelegate([]);
                Performance.abortGetAccountFiltersForCodeScenario();
                TelemetryHelper.traceLog({
                    "TenantCodeQueryFailedForActivityId": SearchViewState.currentActivityId
                })
            });
    }
}