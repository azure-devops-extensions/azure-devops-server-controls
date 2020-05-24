import * as Controls from "VSS/Controls";
import * as VSSShim from "VSS/SDK/Shim";
import { domElem } from "VSS/Utils/UI";

import { WikiSearchView } from "Search/Scenarios/Wiki/WikiSearchView";
import "VSS/LoaderPlugins/Css!Search/Scripts/Hub";

export class WikiSearchHub extends Controls.Control<{}> {
    public initialize() {
        super.initialize();

        const $pageRoot = $(domElem("div", "search-hub absolute-full"));
        $pageRoot.append(domElem("div", "search-view"));
        this._element.append($pageRoot);

        Controls.Enhancement.enhance(WikiSearchView, this._element);
    }
}

VSSShim.VSS.register("search.wikiHub", (context) => {
    return Controls.create(WikiSearchHub, context.$container, context.options);
});
