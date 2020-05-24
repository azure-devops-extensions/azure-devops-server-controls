import * as Controls from "VSS/Controls";
import * as SDK_Shim from "VSS/SDK/Shim";
import { domElem } from "VSS/Utils/UI";

import { SearchView } from "Search/Scenarios/Hub/SearchView";

export class SearchHub extends Controls.Control<{}> {
    public initialize() {
        super.initialize();

        const $pageRoot = $(domElem("div", "search-hub absolute-full"));
        $pageRoot.append(domElem("div", "search-view"));
        this._element.append($pageRoot);

        Controls.Enhancement.enhance(SearchView, this._element, this._options);
    }
}

SDK_Shim.registerContent("search.mainHub", (contextData: SDK_Shim.InternalContentContextData) => {
    return Controls.create(SearchHub, contextData.$container, contextData.options);
});
