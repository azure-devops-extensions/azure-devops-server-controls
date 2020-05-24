// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Contributions_Services = require("VSS/Contributions/Services");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Providers = require("Search/Scripts/Providers/TFS.Search.Providers");
import Q = require("q");
import Search_Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Service = require("VSS/Service");
import State = require("Search/Scripts/Common/TFS.Search.ViewState");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import VSS = require("VSS/VSS");

import Providers_Code_NO_REQUIRE = require("Search/Scripts/Providers/Code/TFS.Search.Providers.Code");
import Providers_WorkItem_NO_REQUIRE = require("Search/Scripts/Providers/WorkItem/TFS.Search.Providers.WorkItem");

import FeatureManagement_RestClient_NO_REQUIRE = require("VSS/FeatureManagement/RestClient");
import FeatureManagement_Contracts_NO_REQUIRE = require("VSS/FeatureManagement/Contracts");

import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { ActionsHub } from "Search/Scripts/React/ActionsHub";
import { StoresHub } from "Search/Scripts/React/StoresHub";

const WORK_ITEM_SEARCH_FEATURE_ID = "ms.vss-workitem-search.enable-workitem-search";
const WORK_ITEM_SEARCH_ONPREM_FEATURE_ID = "ms.vss-workitem-searchonprem.enable-workitem-search";

/*
* Defines methods to work with entity providers
*/
export class ProvidersHelper {

    /**
    * Initalizes registered providers with search view
    */
    public static initializeProviders(
        providers: Providers.ISearchProvider[],
        searchV2Layout: boolean,
        actionsCreator: ActionCreator,
        actionsHub: ActionsHub,
        storesHub: StoresHub): void {
        for (var i in providers) {
            providers[i].initalizeProvider(actionsCreator, actionsHub, storesHub, searchV2Layout);

            // Update provide Id to localized name mappings for available providers
            State.SearchViewState.entityTypeIdToLocalizedNameMap[providers[i].getId()] = providers[i].getDisplayName();
        }
    }

    public static attachProvidersToNavigationEvents(searchView: any, providers: Providers.ISearchProvider[]): void {
        for (var i in providers) {
            providers[i].attachToNavigationEvents(searchView);
        }
    }

    /**
    * Finds and returns a provider by id, if none found, default provier is returned
    */
    public static getProviderById(providers: Providers.ISearchProvider[], providerId?: string): Providers.ISearchProvider {
        var provider: Providers.ISearchProvider;
        if (providers && providers.length > 0) {
            // default provider is the first provider
            provider = providers[0];
            if (providerId) {
                for (var i in providers) {
                    if (Helpers.Utils.compareStrings(providers[i].getId(), providerId)) {
                        provider = providers[i];
                        break;
                    }
                }
            }
        }

        return provider;
    }

    /**
    * Used to detect all the registered providers and get the provider implemantation for the requested provider.
    */
    public static getInstalledSearchExtensionProvidersPromise(isUserStakeHolder: boolean, currentProviderId: string, v2Layout: boolean): Q.Promise<Providers.ProvidersInfo> {
        var deferred: Q.Deferred<Providers.ProvidersInfo> = Q.defer<Providers.ProvidersInfo>();
        Service
            .getService(Contributions_Services.ExtensionService)
            // get list of all installed extensions
            .getContributions(["ms.vss-search-platform.entity-type-collection"], false, true)
            .then((contributions: IExtensionContribution[]) => {
                this.getAvailableSearchEntities(contributions, isUserStakeHolder, v2Layout).then((registeredProviderIds: Array<string>) => {
                    // if currentProvider is undefined which means user directly lands on search page, 
                    // we should use the first registered provider as default
                    if (!currentProviderId && registeredProviderIds.length > 0) {
                        currentProviderId = registeredProviderIds[0];
                    }

                    // We have registered provider list. Now return the actual requested provider.
                    if (Helpers.Utils.compareStrings(currentProviderId, Search_Constants.SearchConstants.WorkItemEntityTypeId) &&
                        registeredProviderIds.indexOf(Search_Constants.SearchConstants.WorkItemEntityTypeId) >= 0) {
                        VSS.using(["Search/Scripts/Providers/WorkItem/TFS.Search.Providers.WorkItem"], (Providers_WorkItem: typeof Providers_WorkItem_NO_REQUIRE) => {
                            var providers: Providers.ISearchProvider[] = [new Providers_WorkItem.WorkItemSearchProvider()];
                            deferred.resolve(new Providers.ProvidersInfo(registeredProviderIds, this.getAvailableProviders(providers)));
                        });
                    }
                    else if (Helpers.Utils.compareStrings(currentProviderId, Search_Constants.SearchConstants.CodeEntityTypeId) &&
                        registeredProviderIds.indexOf(Search_Constants.SearchConstants.CodeEntityTypeId) >= 0) {
                        // If both the feature flags are ON we take searchshell route by honoring searchshell feature flag. This is
                        // to ensure that existing accounts will have seamless search experience when extension feature flag is on
                        // and extension is not installed.
                        // Note: Entities are drawn in the order of initialization
                        VSS.using(["Search/Scripts/Providers/Code/TFS.Search.Providers.Code"], (Providers_Code: typeof Providers_Code_NO_REQUIRE) => {
                            var providers: Providers.ISearchProvider[] = [new Providers_Code.CodeSearchProvider()];
                            deferred.resolve(new Providers.ProvidersInfo(registeredProviderIds, this.getAvailableProviders(providers)));
                        });
                    }
                    else if (Helpers.Utils.compareStrings(currentProviderId, Search_Constants.SearchConstants.WikiEntityTypeId) &&
                        registeredProviderIds.indexOf(Search_Constants.SearchConstants.WikiEntityTypeId) >= 0) {
                        var providers: Providers.ISearchProvider[] = [];
                        deferred.resolve(new Providers.ProvidersInfo(registeredProviderIds, providers));
                    }
                });
            }, () => {
                TelemetryHelper.TelemetryHelper.traceLog({
                    "GetContributionsServiceCall": "GetContributions service call failed"
                });

                deferred.resolve(new Providers.ProvidersInfo([], []));
            });

        return deferred.promise;
    }

    private static getAvailableSearchEntities(contributions: IExtensionContribution[], isUserStakeHolder: boolean, v2Layout: boolean): Q.Promise<Array<string>> {
        let deferred = Q.defer<Array<string>>(),
            registeredProviderIds = [];
        if (contributions.length > 0) {
            // Sorting contributions based on order property as the entities are rendered in the same order of the providers list.
            contributions.sort(function sortingBasedOnOrderValue(a, b) {
                return b.properties.order < a.properties.order ? 1 // if b should come earlier in the entity pane, push a to end.
                    : b.properties.order > a.properties.order ? -1 // if b should come later, push a to begin.
                        : 0; // if a,b order is same do nothing.
            });

            registeredProviderIds = contributions
                .map((contribution, index) => {
                    // add code search provider only for non-stake holder users.
                    if (Helpers.Utils.compareStrings(contribution.id, "ms.vss-code-search.code-entity-type") && !isUserStakeHolder) {
                        return Search_Constants.SearchConstants.CodeEntityTypeId
                    }
                    else if (Helpers.Utils.compareStrings(contribution.id, "ms.vss-workitem-search.workitem-entity-type") ||
                        Helpers.Utils.compareStrings(contribution.id, "ms.vss-workitem-searchonprem.workitem-entity-type")) {
                        return Search_Constants.SearchConstants.WorkItemEntityTypeId;
                    }
                    else if (v2Layout &&
                        (Helpers.Utils.compareStrings(contribution.id, "ms.vss-wiki-search.wiki-entity-type") ||
                        Helpers.Utils.compareStrings(contribution.id, "ms.vss-wiki-searchonprem.wiki-entity-type"))) {
                        return Search_Constants.SearchConstants.WikiEntityTypeId;
                    }
                })
                .filter((p, i) => {
                    return !!p;
                }) || [];

            // if work item search extension is installed, and toggle feature FF is enabled.
            // remove work item search provider if the toggle is off.
            if (registeredProviderIds.indexOf(Search_Constants.SearchConstants.WorkItemEntityTypeId) > 0 &&
                Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItemFeatureToggle)) {

                VSS.using([
                    "VSS/FeatureManagement/RestClient",
                    "VSS/FeatureManagement/Contracts"
                ], (FeatureManagement_RestClient: typeof FeatureManagement_RestClient_NO_REQUIRE,
                    FeatureManagement_Contracts: typeof FeatureManagement_Contracts_NO_REQUIRE) => {
                        Service
                            .getClient(FeatureManagement_RestClient.FeatureManagementHttpClient)
                            .queryFeatureStates({
                                featureIds: [WORK_ITEM_SEARCH_FEATURE_ID, WORK_ITEM_SEARCH_ONPREM_FEATURE_ID]
                            } as any)
                            .then((query: FeatureManagement_Contracts_NO_REQUIRE.ContributedFeatureStateQuery) => {
                                // if toggle is disable remove WIS provider from the list of providers.
                                let workItemSearchFeatureState = query.featureStates[WORK_ITEM_SEARCH_FEATURE_ID],
                                    workItemSearchOnPremFeatureState = query.featureStates[WORK_ITEM_SEARCH_ONPREM_FEATURE_ID];
                                let isWorkItemSearchEnabled = workItemSearchFeatureState &&
                                    (workItemSearchFeatureState.state === FeatureManagement_Contracts_NO_REQUIRE.ContributedFeatureEnabledValue.Enabled),
                                    isWorkItemSearchOnPremEnabled = workItemSearchOnPremFeatureState &&
                                        (workItemSearchOnPremFeatureState.state === FeatureManagement_Contracts_NO_REQUIRE.ContributedFeatureEnabledValue.Enabled);
                                registeredProviderIds = (isWorkItemSearchEnabled || isWorkItemSearchOnPremEnabled)
                                    ? registeredProviderIds
                                    : registeredProviderIds.filter((id) => {
                                        return !Helpers.Utils.compareStrings(id, Search_Constants.SearchConstants.WorkItemEntityTypeId);
                                    });

                                deferred.resolve(registeredProviderIds);
                            }, (error) => {
                                deferred.resolve(registeredProviderIds);
                            });
                    });
            }
            else {
                deferred.resolve(registeredProviderIds);
            }
        }
        else {
            TelemetryHelper.TelemetryHelper.traceLog({
                "NoEntityRegistered": "No contibutions were registered for entity-type-collection"
            });

            if (Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchShell) &&
                registeredProviderIds.indexOf(Search_Constants.SearchConstants.CodeEntityTypeId) < 0) {
                registeredProviderIds.push(Search_Constants.SearchConstants.CodeEntityTypeId);
            }

            if (Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItem) &&
                registeredProviderIds.indexOf(Search_Constants.SearchConstants.WorkItemEntityTypeId) < 0) {
                registeredProviderIds.push(Search_Constants.SearchConstants.WorkItemEntityTypeId);
            }

            deferred.resolve(registeredProviderIds);
        }

        return deferred.promise;
    }

    /**
    * Registers available providers.
    * A provider may not be avialable due to various reasons (ex. under a feature flag/ extension of that provider might not be installed)
    */
    private static getAvailableProviders(providers): Providers.ISearchProvider[] {
        var availableProviders: Providers.ISearchProvider[] = new Array<Providers.ISearchProvider>();
        for (var i in providers) {
            if (providers[i].isAvailable()) {
                availableProviders.push(providers[i]);
            }
        }

        return availableProviders;
    }
}