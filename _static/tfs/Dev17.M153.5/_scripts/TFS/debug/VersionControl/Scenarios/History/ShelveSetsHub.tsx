import * as Controls from "VSS/Controls";
import { VSS } from "VSS/SDK/Shim";
import { domElem } from "VSS/Utils/UI";

import { ShelveSetsView } from "VersionControl/Scenarios/History/ShelveSetsView";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";
import * as ShelvesetSearch from "VersionControl/Scripts/Controls/ShelvesetSearchAdapter";

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!VersionControl";

export class ShelveSetsHub extends Controls.Control<{}> {
    public initialize(): void {
        super.initialize();

        if (!ValidateRepository.repositoryForPageExists(this._element)) {
            return;
        }

        const $pageRoot = $(domElem("div", "tfvc-shelvesets-page-view"));
        $pageRoot.append(domElem("div", "hub-content"));
        this._element.append($pageRoot);

        Controls.Enhancement.enhance(ShelveSetsView, this._element);

        Controls.Enhancement.enhance(ShelvesetSearch.ShelvesetSearchAdapter, this._element.find(".vc-search-adapter-shelvesets"));
    }
}

VSS.register("versionControl.tfvcShelveSetsHub", (context) => {
    return Controls.create(ShelveSetsHub, context.$container, context.options);
});