// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Providers = require("Search/Scripts/Providers/TFS.Search.Providers");
import WebApi = require("Search/Scripts/WebApi/TFS.Search.WebApi");

/**
* Static state that each file can have access to
* Note: This is not same as the URL state that we get due to navigation
*/
export class SearchViewState {

    public static currentAction: string;

    public static currentQueryString: string;

    public static currentActivityId: string;

    public static currentSessionId: string;

    public static searchLaunchPoint: string;

    public static currentSelectedResultUniqueId: string;

    public static currentSelectedResultIndex: number;

    public static currentFiltersEncoded: string;

    public static currentFiltersDecoded: Core_Contracts.IFilterCategory[];

    public static urlContainsQuery: boolean;

    public static currentProvider: Providers.ISearchProvider;

    public static searchHttpClient: WebApi.SearchHttpClient;

    public static previewState: string;

    public static registeredProviderIds: string[];

    public static entityTypeIdToLocalizedNameMap = {};

    public static sortOptions: string;
}
