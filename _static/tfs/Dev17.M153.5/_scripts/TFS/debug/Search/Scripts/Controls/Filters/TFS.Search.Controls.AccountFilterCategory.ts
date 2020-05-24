// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";
import Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Performance = require("Search/Scripts/Common/TFS.Search.Performance");
import Providers = require("Search/Scripts/Providers/TFS.Search.Providers");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Link_Filter_Category = require("Search/Scripts/Controls/Filters/TFS.Search.Controls.LinkFilterCategory");
import Utils_UI = require("VSS/Utils/UI");

var domElem = Utils_UI.domElem;

export class AccountFilterCategory extends Link_Filter_Category.LinkFilterCategory {

    private areFiltersInitialized: boolean;

    constructor(options?) {
        super(options);
        this.areFiltersInitialized = false;
    }

    public initialize(): void {
        super.initialize();
    }

    protected expandedChanged(expand: boolean): void {
        var provider: Providers.ISearchProvider = State.SearchViewState.currentProvider;

        if (expand && !this.areFiltersInitialized && !this.getIsLoading() &&
            provider.getId() === Constants.SearchConstants.CodeEntityTypeId) {
            
            // if this is the first time expansion has happened, we intend to get the account level filters.
            // getTenantResultAsync() routine fetches the search hits present in other accounts tied along the
            // current account in search
            var tenantRequestStartTime: any = Performance.getTimestamp();
            var accountFiltersScenario: Performance.PerfScenario = Performance.startGetAccountFiltersForCodeScenario();
            accountFiltersScenario.split(Performance.PerfConstants.TenantSearchQueryStart);
            provider.getTenantResultsAsync(State.SearchViewState.currentActivityId, State.SearchViewState.currentQueryString,
                Context.SearchContext.getDefaultContext().navigation.applicationServiceHost.name,
                State.SearchViewState.currentFiltersDecoded, false).then((tenantResponse) => {
                    var isStaleTenantQueryResponse: boolean = State.SearchViewState.currentActivityId !== tenantResponse.activityId;
                    var tenantRequestResponseTime: any = Performance.getTimestamp();
                    this.setIsLoading(true);
                    TelemetryHelper.TelemetryHelper.traceLog({
                        "TenantE2eQueryTime": tenantRequestResponseTime - tenantRequestStartTime,
                        "StaleTenantActivityId": isStaleTenantQueryResponse
                    }, isStaleTenantQueryResponse ? tenantResponse.activityId : State.SearchViewState.currentActivityId);

                    if (isStaleTenantQueryResponse) {
                        this.setIsLoading(false);
                        Performance.abortGetAccountFiltersForCodeScenario();
                        return;
                    }
                    accountFiltersScenario.split(Performance.PerfConstants.TenantSearchQueryEnd);
                    provider.getFiltersFromResponse(tenantResponse).then((tenantFilters) => {
                        this.setIsLoading(false);                
                        for (var i in tenantFilters) {
                            var category = tenantFilters[i];

                            if ((category.name === Constants.SearchConstants.AccountFilters)) {
                                this.appendFilters(<Core_Contracts.IDefaultFilterCategory>category);
                                this.areFiltersInitialized = true;
                                break;
                            }
                        }
                        Performance.endGetAccountFiltersForCodeScenario();
                        TelemetryHelper.TelemetryHelper.traceLog({ "TenantFiltersRenderingTime": Performance.getTimestamp() - tenantRequestResponseTime });
                    });

                }), (error: any) => {
                    this.setIsLoading(false);
                    Performance.abortGetAccountFiltersForCodeScenario();
                    TelemetryHelper.TelemetryHelper.traceLog({
                        "TenantCodeQueryFailedForActivityId": State.SearchViewState.currentActivityId,
                        "TenantCodeQueryFailedWithMessage": error.message
                    });
                    return;
                };
        }
    }

    public drawCategory(filterCategory: Core_Contracts.IDefaultFilterCategory): void {
        super.drawCategory(filterCategory);
        this.setExpanded(false);
    }
}