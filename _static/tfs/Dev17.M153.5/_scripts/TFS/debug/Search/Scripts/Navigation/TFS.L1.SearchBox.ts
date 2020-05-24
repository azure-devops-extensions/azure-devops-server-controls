
import "VSS/LoaderPlugins/Css!Search/Navigation/TFS.L1.SearchBox";

import MultiEntitySearch = require("Presentation/Scripts/TFS/TFS.Host.MultiEntitySearch");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Search_WebApi_Types_NO_REQUIRE = require("Search/Scripts/WebApi/TFS.Search.WebApi.Types");
import TelemetryHelper_NO_REQUIRE = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Navigation_Common = require("TfsCommon/Scripts/Navigation/Common");
import Controls = require("VSS/Controls");
import EventServices = require("VSS/Events/Services");
import SDK_Shim = require("VSS/SDK/Shim");
import VSS = require("VSS/VSS");

import { HeaderItemContext, getRightMenuItem } from "TfsCommon/Scripts/Navigation/Common";
import { HubsService } from "VSS/Navigation/HubsService";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { InfoCodes, WikiSearchResponse, WikiSearchRequest } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { getClient as getV2Client } from "Search/Scripts/Generated/Client/RestClient";
import { getClient } from "Search/Scripts/Generated/RestClient";
import { RefitEventName as L1HubsRefitEventName } from "TfsCommon/Scripts/Navigation/L1.HubSelector";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { NavigationContextLevels } from "VSS/Common/Contracts/Platform";
import * as VSSService from "VSS/Service";
import { SettingsHttpClient } from "VSS/Settings/RestClient";
import { getQueryParameters } from "VSS/Utils/Url";

SDK_Shim.registerContent("navbar.level1.search", (context) => {
    let searchSettings = <HeaderItemContext>getRightMenuItem(context.options.headerContext, "search");
    if (searchSettings && searchSettings.available) {

        // This gets MultiEntitySearchBox styles working but the ideal solution is to get MultiEntitySearchBox control load its styles on demand
        context.$container.addClass("header-post11");

        const hubsService = <HubsService>VSSService.getLocalService(HubsService);
        const selectedHubGroupId: string = hubsService.getSelectedHubGroupId();
        const entitySearchAvail: IDictionaryStringTo<boolean> = {};
        entitySearchAvail[MultiEntitySearch.Entity.Code]
            = searchSettings.properties && searchSettings.properties.codeSearchAvailable;
        entitySearchAvail[MultiEntitySearch.Entity.WorkItem]
            = (searchSettings.properties && searchSettings.properties.workItemSearchAvailable);
        entitySearchAvail[MultiEntitySearch.Entity.Wiki]
            = searchSettings.properties && searchSettings.properties.wikiSearchAvailable;

        // Add MultiEntitySearchBox control to the header
        const searchBox = Controls.BaseControl.createIn(MultiEntitySearch.MultiEntitySearchBox, context.$container, {
            cssClass: "search-menu-bar title-bar-header-search header-item multi-entity-search-box global-search-adapter",
            entitySearchAvail: entitySearchAvail,
            contextualNavigationEnabled: true,
            defaultEntity: getSearchEntity(selectedHubGroupId, entitySearchAvail),
            getSearchEntity: getSearchEntity
        });

        // Fire event to get L1.Hubs refit
        EventServices.getService().fire(L1HubsRefitEventName);

        // Fire a faultin request if the workitemsearch is a builtin extension and the account needs a conditional faultin when the user visits the workitem hub.
        if (searchSettings.properties && searchSettings.properties.shouldInvokeConditionalFaultInForWIS) {
            VSS.using([
                "Search/Scripts/WebApi/TFS.Search.WebApi.Types",
                "Search/Scripts/Common/TFS.Search.TelemetryHelper"
            ], (
                Search_WebApi_Types: typeof Search_WebApi_Types_NO_REQUIRE,
                TelemetryHelper: typeof TelemetryHelper_NO_REQUIRE
            ) => {
                    var tfsContext: TfsContext = TfsContext.getDefault();
                    var actionUrl: string = tfsContext.getActionUrl(
                        Search_WebApi_Types.WebApiConstants.ConditionalWorkitemSearchFaultIn,
                        "search",
                        { area: "api" });
                    var ajaxOptions: JQueryAjaxSettings = {};
                    ajaxOptions.headers = {
                        "X-TFS-Session": tfsContext.activityId
                    };
                    Ajax.postMSJSON(
                        actionUrl,
                        { Trigger: "WorkItemHubVisited" },
                        (response) => {
                            TelemetryHelper.TelemetryHelper.traceLog({ "ConditionalAccountFaultIn-Response": response.Message });
                        },
                        (error) => {
                            TelemetryHelper.TelemetryHelper.traceLog({ "ConditionalAccountFaultIn-Error": error.Message });
                        },
                        ajaxOptions);
                });
        }

        if (searchSettings.properties && searchSettings.properties.shouldInvokeConditionalFaultInForWikiSearch) {
            VSS.using([
                "Search/Scripts/WebApi/TFS.Search.WebApi.Types",
                "Search/Scripts/Common/TFS.Search.TelemetryHelper"
            ], (
                Search_WebApi_Types: typeof Search_WebApi_Types_NO_REQUIRE,
                TelemetryHelper: typeof TelemetryHelper_NO_REQUIRE
            ) => {
                    const httpClient = getV2Client();
                    const currentPageContext = TfsContext.getDefault();
                    httpClient.fetchWikiSearchResults(
                        {   $orderBy: null,
                            searchText: "id=0", 
                            $skip: 0, 
                            $top: 1
                        } as WikiSearchRequest, currentPageContext.navigation.projectId).then(
                        (response: WikiSearchResponse) => {
                            if (response.infoCode === 0 ||
                                (response.infoCode) === InfoCodes.AccountIsBeingOnboarded) {

                                TelemetryHelper.TelemetryHelper.traceLog({ "ConditionalWikiAccountFaultIn-Success": "Success" });
                            }
                            else {
                                TelemetryHelper.TelemetryHelper.traceLog({ "ConditionalWikiAccountFaultIn-Error": InfoCodes[response.infoCode].toString() });
                            }
                        },
                        (error) => {
                            TelemetryHelper.TelemetryHelper.traceLog({ "ConditionalWikiAccountFaultIn-Error": error.Message });
                        });
                });
        }
    }
});

function getSearchEntity(currentSelectedHubGroupId: string, entityAvail: IDictionaryStringTo<boolean>): MultiEntitySearch.Entity {
    const currentController = TfsContext.getDefault().navigation.currentController.toLowerCase();
    const isSearchPage: boolean = ignoreCaseComparer(currentController, "search") === 0;
    const isWikiSearchPage: boolean = ignoreCaseComparer(currentSelectedHubGroupId, "ms.vss-search-platform.wikisearch-collection-hub-group") === 0
        || ignoreCaseComparer(currentSelectedHubGroupId, "ms.vss-search-platform.wikisearch-project-hub-group") === 0;

    return isSearchPage || isWikiSearchPage ?
        getEntityOnSearchPage(window.location.href, entityAvail) :
        getDefaultEntity(currentSelectedHubGroupId, entityAvail);
}

function getDefaultEntity(selectedHubGroupId: string, entityAvail: IDictionaryStringTo<boolean>): MultiEntitySearch.Entity {
    let defaultEntities: IDictionaryStringTo<MultiEntitySearch.Entity> = {
        "ms.vss-tfs-web.project-team-hidden-hub-group": MultiEntitySearch.Entity.WorkItem,
        "ms.vss-web.home-hub-group": MultiEntitySearch.Entity.WorkItem,
        "ms.vss-code-web.code-hub-group": MultiEntitySearch.Entity.Code,
        "ms.vss-work-web.work-hub-group": MultiEntitySearch.Entity.WorkItem,
        "ms.vss-build-web.build-release-hub-group": MultiEntitySearch.Entity.Code,
        "ms.vss-test-web.test-hub-group": MultiEntitySearch.Entity.WorkItem,
        "ms.vss-web.project-admin-hub-group": MultiEntitySearch.Entity.Code,
        "ms.vss-tfs-web.collection-project-hub-group": MultiEntitySearch.Entity.Code,
        "ms.vss-tfs-web.collection-favorites-hub-group": MultiEntitySearch.Entity.Code,
        "ms.vss-tfs-web.collection-work-hub-group": MultiEntitySearch.Entity.WorkItem,
        "ms.vss-tfs-web.collection-pullrequests-hub-group": MultiEntitySearch.Entity.Code,
        "ms.vss-web.collection-admin-hub-group": MultiEntitySearch.Entity.Code,
        "ms.vss-wiki-web.wiki-hub-group": MultiEntitySearch.Entity.Wiki
    };

    const defaultEntity: MultiEntitySearch.Entity = defaultEntities[selectedHubGroupId];

    return isEntityAvailable(defaultEntity, entityAvail)
        ? defaultEntity
        : handleSpecialCases(entityAvail);
}

function getEntityOnSearchPage(currentUrl: string, entityAvail: IDictionaryStringTo<boolean>): MultiEntitySearch.Entity {
    const urlParams = getQueryParameters(currentUrl);
    let defaultEntity: MultiEntitySearch.Entity;

    if (ignoreCaseComparer(urlParams["type"], "code") === 0) {
        defaultEntity = MultiEntitySearch.Entity.Code;
    }
    else if (ignoreCaseComparer(urlParams["type"], "work item") === 0) {
        defaultEntity = MultiEntitySearch.Entity.WorkItem;
    }
    else if (ignoreCaseComparer(urlParams["type"], "wiki") === 0) {
        defaultEntity = MultiEntitySearch.Entity.Wiki;
    }

    return isEntityAvailable(defaultEntity, entityAvail)
        ? defaultEntity
        : handleSpecialCases(entityAvail);
}

function handleSpecialCases(entityAvail: IDictionaryStringTo<boolean>): MultiEntitySearch.Entity {
    // If there is no default entity fall back to code search and workitem search 
    // if code search is not available and wiki search if work item search is not available.
    const defaultEntity = isEntityAvailable(MultiEntitySearch.Entity.Code, entityAvail)
        ? MultiEntitySearch.Entity.Code
        : (isEntityAvailable(MultiEntitySearch.Entity.WorkItem, entityAvail)
            ? MultiEntitySearch.Entity.WorkItem
            : (isEntityAvailable(MultiEntitySearch.Entity.Wiki, entityAvail)
                ? MultiEntitySearch.Entity.Wiki
                : undefined));

    return defaultEntity;
}

function isEntityAvailable(entity: MultiEntitySearch.Entity, entityAvail: IDictionaryStringTo<boolean>): boolean {
    if (entity === MultiEntitySearch.Entity.WorkItem) {
        return entityAvail[entity] || TfsContext.getDefault().navigation.topMostLevel >= NavigationContextLevels.Project;
    }
    return entityAvail[entity];
}