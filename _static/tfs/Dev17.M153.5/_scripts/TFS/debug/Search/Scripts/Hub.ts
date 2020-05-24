import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as SearchPage from "Search/Scripts/React/Components/Page";
import * as Models from "Search/Scripts/React/Models";
import * as Context from "VSS/Context";
import * as Controls from "VSS/Controls";
import { domElem } from "VSS/Utils/UI";
import * as VSS from "VSS/VSS";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { Utils } from "Search/Scripts/Common/TFS.Search.Helpers";
import { ActionCreator } from "Search/Scripts/React/ActionCreator";
import { ActionsHub } from "Search/Scripts/React/ActionsHub";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import * as SearchView_NO_REQUIRE from "Search/Scripts/TFS.Search";
import "VSS/LoaderPlugins/Css!Search/Scripts/Hub";

export class SearchHub extends Controls.BaseControl {
    public initialize() {
        super.initialize();

        const $pageRoot = $(domElem("div", "search-view"));
        this._element.append($pageRoot);

        // Render search page layout before Initializing the search view. Since, there are DOM level dependencies in  Search view. 
        // In other words there are certain components which are intialized on intializing SearchView which require certain DOM elements
        // to be present before hand in the div. This dependency is because we are supporting both legacy and new layouts, which will go
        // away once the old code is deprecated
        const crossAccountEnabled: boolean = Utils.isFeatureFlagEnabled(
            ServerConstants
                .FeatureAvailabilityFlags
                .WebAccessSearchMultiAccount);

        const currentPageContext = TfsContext.getDefault().navigation.topMostLevel;

        SearchPage.renderInto(
            $(".search-view")[0],
            {
                storesHub: StoresHub.getInstance(),
                actionCreator: ActionCreator.getInstance(),
                featureAvailabilityStates: {
                    crossAccountEnabled: crossAccountEnabled,
                    contextualNavigationEnabled: true,
                    newCodeElementFilterEnabled: true
                },
                currentPageContext: currentPageContext,
                isOldLayout: false
            });

        // ToDo: piyusing, this call should go away once we completed move from old layout.
        VSS.using(["Search/Scripts/TFS.Search"], (view: typeof SearchView_NO_REQUIRE) => {
            const searchView: SearchView_NO_REQUIRE.SearchView = <SearchView_NO_REQUIRE.SearchView>
                Controls.Enhancement.ensureEnhancement(view.SearchView);

            if (!searchView) {
                throw Error("Search view not initialized");
            }
        });
    }
}
Controls.Enhancement.registerEnhancement(SearchHub, ".search-hub");