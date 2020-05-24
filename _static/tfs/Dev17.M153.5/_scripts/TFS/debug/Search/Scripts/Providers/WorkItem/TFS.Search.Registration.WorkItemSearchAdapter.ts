// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";


/// <reference types="jquery" />

import Controls = require("VSS/Controls");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Q = require("q");
import Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import { Entity } from "Presentation/Scripts/TFS/TFS.Host.MultiEntitySearch";
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import VSS = require("VSS/VSS");
import WorkItemAdapter = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Global.Registration");
import Work_Item_Controls = require("Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.SearchBoxDropdown");

import { delegate } from "VSS/Utils/Core";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getApplicationService } from "VSS/Service";
import { ISearchBoxDropdownOptions } from "Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.Contracts";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";

import Helpers_NO_REQUIRE = require("Search/Scripts/Common/TFS.Search.Helpers");
import TFS_OM_Common_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITOM_NO_REQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WORKITEMMANGER_NO_REQUIRE = require("WorkItemTracking/Scripts/OM/WorkItemManager");

import WorkItemEventHandlers_NO_REQUIRE = require("Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.EventHandlers");
import Contributions_Services_NO_REQUIRE = require("VSS/Contributions/Services");
import Service_NO_REQUIRE = require("VSS/Service");
import * as FeatureManagement_RestClient_NO_REQUIRE from "VSS/FeatureManagement/RestClient";
import * as FeatureManagement_Contracts_NO_REQUIRE from "VSS/FeatureManagement/Contracts";

/**
 * Returns true or false if Feature Flag is enabled
 * @param feature
 */
function isFeatureFlagEnabled(feature: string): boolean {
    var featureAvailabilityService = getApplicationService(FeatureAvailabilityService);

    return (featureAvailabilityService && featureAvailabilityService.isFeatureEnabledLocal(feature));
}

const WORK_ITEM_SEARCH_FEATURE_ID = "ms.vss-workitem-search.enable-workitem-search";
const WORK_ITEM_SEARCH_ONPREM_FEATURE_ID = "ms.vss-workitem-searchonprem.enable-workitem-search";

export class MultiEntityWorkItemSearchAdapter extends WorkItemAdapter.GlobalWorkItemsSearchAdapter {
    public static VALID_WORKITEM_REGEX: RegExp = /^\s*#?(\d{1,9})\s*$/;
    private _workItemSearchBoxDropdownControl: Work_Item_Controls.SearchBoxDropdown;

    public getWatermarkText(isContextualNavigationEnabled: boolean, isCollectionContext: boolean): string {
        let placeholderFormat = isCollectionContext ? Resources.SearchThisCollectionWaterMark : Resources.SearchThisProjectWaterMark;
        placeholderFormat = placeholderFormat.replace("{0}", Resources.WorkItemEntityNameV2.toLowerCase());
        return isContextualNavigationEnabled
            ? placeholderFormat
            : super.getWatermarkText(isContextualNavigationEnabled, isCollectionContext);
    }

    public performSearch(searchText: string, openInNewTab?: boolean): void {
        var workerDelegate = (Helpers_Module: typeof Helpers_NO_REQUIRE) => {
            var matchInteger = searchText.match(MultiEntityWorkItemSearchAdapter.VALID_WORKITEM_REGEX),
                workItemId = matchInteger ? parseInt(matchInteger[1], 10) : 0;
            // see if the number format is as expected. In case the entered value is a number open up the work item dialog.
            if (workItemId > 0) {
                VSS.using([
                    "Presentation/Scripts/TFS/TFS.OM.Common",
                    "WorkItemTracking/Scripts/TFS.WorkItemTracking",
                    "Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.EventHandlers",
                    "WorkItemTracking/Scripts/OM/WorkItemManager"
                ], (
                    TFS_OM_Common: typeof TFS_OM_Common_NO_REQUIRE,
                    WITOM: typeof WITOM_NO_REQUIRE,
                    WorkItemEventHandlers: typeof WorkItemEventHandlers_NO_REQUIRE,
                    WorkItemManager: typeof WORKITEMMANGER_NO_REQUIRE
                ) => {
                        WorkItemManager.WorkItemManager.get(
                            TFS_OM_Common.ProjectCollection
                                .getConnection(Context.SearchContext.getTfsContext())
                                .getService<WITOM_NO_REQUIRE.WorkItemStore>(WITOM.WorkItemStore))
                            .beginGetWorkItem(
                            workItemId,
                            (workItem: WITOM_NO_REQUIRE.WorkItem) => {
                                WorkItemEventHandlers.WorkItemEventHandlers.openModalDialogForWorkItem(workItemId);
                                TelemetryHelper.TelemetryHelper.traceLog({
                                    "WorkItemSearchQuickNavigation": workItemId
                                });
                            }, () => {
                                // in case of error redirect search to work item search page.
                                Helpers_Module.Utils.createNewSearchRequestState(
                                    searchText,
                                    SearchConstants.WorkItemEntityTypeId,
                                    openInNewTab);
                            });
                    });
            }
            else {
                Helpers_Module.Utils.createNewSearchRequestState(
                    searchText,
                    SearchConstants.WorkItemEntityTypeId,
                    openInNewTab);
            }
        };

        VSS.using(["Search/Scripts/Common/TFS.Search.Helpers"], delegate(this, (Helpers: typeof Helpers_NO_REQUIRE) => {
            if (Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItem)) {
                workerDelegate.call(this, Helpers);
            }
            else {
                const entitySearchAvail = this._options.entitySearchAvail;
                if (entitySearchAvail[Entity.WorkItem]) {
                    workerDelegate.call(this, Helpers);
                }
                else {
                    // Delegate to legacy work item search
                    super.performSearch(searchText, openInNewTab);
                }
            }
        }));
    }

    public getHelpDropdownMenu(inputControl: JQuery, parent: JQuery, triggerSearchContext: any, successCallback: any) {
        var workerDelegate = () => {
            if (!this._workItemSearchBoxDropdownControl) {
                var options = <ISearchBoxDropdownOptions>{
                    searchTextBoxCssSelector: ".multi-entity-search-box .search-text",
                    documentClickNamespace: "multiEntitySearchBoxDropdown",
                    isIdentityPickerEnabled: true,
                    dropdownId: "multi-entity-workitem-dropdown"
                };

                this._workItemSearchBoxDropdownControl = new Work_Item_Controls.SearchBoxDropdown(options);
                this._workItemSearchBoxDropdownControl.bind(inputControl, false);
            }

            parent.append(this._workItemSearchBoxDropdownControl.getPopup());
            successCallback(this._workItemSearchBoxDropdownControl);
        };

        if (isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchWorkItem)) {
            workerDelegate.call(this);
        }
        else {
            const entitySearchAvail = this._options.entitySearchAvail;
            if (entitySearchAvail[Entity.WorkItem]) {
                workerDelegate.call(this);
            }
            else {
                // Delegate to legacy work item search dropdown
                super.getHelpDropdownMenu(inputControl, parent, triggerSearchContext, successCallback);
            }
        }
    }

    protected _getEntitySelectorDropdownItems(contextInfo, callback, errorCallback): void {
        const entitySearchAvail = this._options.entitySearchAvail;

        VSS.using(["Search/Scripts/Providers/Code/TFS.Search.Registration.SearchAdapters",
            "Search/Scripts/Providers/Wiki/TFS.Search.Registration.WikiSearchAdapter"],
            (_SearchAdapters: any, _WikiSearchAdapter: any) => {
                const menuItems = [];

                if (entitySearchAvail[Entity.Code]) {
                    menuItems.push({
                        id: "global-search-adapter", text: Resources.CodeSearchWatermark,
                        "arguments": { adapter: _SearchAdapters.GlobalCodeSearchAdapter },
                        noIcon: true
                    });
                }
                if (entitySearchAvail[Entity.Wiki]) {
                    menuItems.push({
                        id: "wiki-search-adapter", text: Resources.WikiSearchWatermark,
                        "arguments": { adapter: _WikiSearchAdapter.MultiEntityWikiSearchAdapter },
                        noIcon: true
                    });
                }

                callback(menuItems);
            });
    }
}

export class SearchWorkItemSearchAdapter extends WorkItemAdapter.WorkItemsSearchAdapter {
    private _workItemSearchBoxDropdownControl: Work_Item_Controls.SearchBoxDropdown;
    public hasDropdown(): boolean {
        return false;
    }

    public performSearch(searchText: string, openInNewTab?: boolean): void {
        VSS.using(["Search/Scripts/Common/TFS.Search.Helpers"], (Helpers: typeof Helpers_NO_REQUIRE) => {
            Helpers.Utils.createNewSearchRequestState(searchText, SearchConstants.WorkItemEntityTypeId, openInNewTab);
        });
    }

    public getHelpDropdown(callback: any): void {
        if ($.isFunction(callback)) {
            if (!this._workItemSearchBoxDropdownControl) {
                var options = <ISearchBoxDropdownOptions>{
                    searchTextBoxCssSelector: ".main-search-box .search-text",
                    documentClickNamespace: "mainSearchBoxDropdown",
                    isIdentityPickerEnabled: true,
                    dropdownId: "workitem-dropdown"
                };

                this._workItemSearchBoxDropdownControl = new Work_Item_Controls.SearchBoxDropdown(options);
            }

            callback(this._workItemSearchBoxDropdownControl);
        }
    }
}

function getWorkItemSearchExtensionInstallationStatus() {
    var deferred = Q.defer();
    VSS.using(["VSS/Contributions/Services", "VSS/Service"], (
        Contribution_Services: typeof Contributions_Services_NO_REQUIRE,
        Service: typeof Service_NO_REQUIRE) => {
        Service.getService(Contribution_Services.ExtensionService)
            .getContributions(["ms.vss-search-platform.entity-type-collection"], false, true)
            .then((contributions: IExtensionContribution[]) => {
                var isWorkItemSearchContributionAvailable = contributions
                    .map((contribution, index) => {
                        return contribution.id.toLowerCase();
                    }).indexOf("ms.vss-workitem-search.workitem-entity-type") !== -1;

                var isWorkItemSearchOnPremContributionAvailable = contributions
                    .map((contribution, index) => {
                        return contribution.id.toLowerCase();
                    }).indexOf("ms.vss-workitem-searchonprem.workitem-entity-type") !== -1;

                deferred.resolve(isWorkItemSearchContributionAvailable || isWorkItemSearchOnPremContributionAvailable);
            }, () => {
                deferred.resolve(false);
            });
    });

    return deferred.promise;
}

function getWorkItemSearchToggleStatus() {
    var deferred = Q.defer();
    VSS.using(["VSS/FeatureManagement/RestClient", "VSS/FeatureManagement/Contracts", "VSS/Service"], (
        FeatureManagement_RestClient: typeof FeatureManagement_RestClient_NO_REQUIRE,
        FeatureManagement_Contracts: typeof FeatureManagement_Contracts_NO_REQUIRE,
        Service: typeof Service_NO_REQUIRE) => {
        var featureManagementClient = Service.getClient(FeatureManagement_RestClient.FeatureManagementHttpClient);
        featureManagementClient
            .queryFeatureStates({
                featureIds: [WORK_ITEM_SEARCH_FEATURE_ID, WORK_ITEM_SEARCH_ONPREM_FEATURE_ID]
            } as any)
            .then((query: FeatureManagement_Contracts_NO_REQUIRE.ContributedFeatureStateQuery) => {
                let workItemSearchFeatureState = query.featureStates[WORK_ITEM_SEARCH_FEATURE_ID],
                    workItemSearchOnPremFeatureState = query.featureStates[WORK_ITEM_SEARCH_ONPREM_FEATURE_ID];
                // Check whether workItemSearchFeatureState is null or not as in onPrem, this will be undefined
                if ((workItemSearchFeatureState &&
                    (workItemSearchFeatureState.state === FeatureManagement_Contracts.ContributedFeatureEnabledValue.Enabled)) ||
                    (workItemSearchOnPremFeatureState &&
                        (workItemSearchOnPremFeatureState.state === FeatureManagement_Contracts_NO_REQUIRE.ContributedFeatureEnabledValue.Enabled))) {
                    deferred.resolve(true);
                }
                else {
                    deferred.resolve(false);
                }
            }, () => {
                deferred.resolve(false);
            });
    });

    return deferred.promise;
}