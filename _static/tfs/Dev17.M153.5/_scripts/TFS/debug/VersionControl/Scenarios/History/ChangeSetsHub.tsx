import * as Controls from "VSS/Controls";
import { VSS } from "VSS/SDK/Shim";
import { domElem } from "VSS/Utils/UI";

import { ChangeSetsView } from "VersionControl/Scenarios/History/ChangeSetsView";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";
import * as ChangesetSearch from "VersionControl/Scripts/Controls/ChangesetSearchAdapter";

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!VersionControl";

export class ChangeSetsHub extends Controls.Control<{}> {
    public initialize(): void {
        super.initialize();

        if (!ValidateRepository.repositoryForPageExists(this._element)) {
            return;
        }

        const searchAdapterClass = ChangesetSearch.ChangesetSearchAdapter;

        const $pageRoot = $(domElem("div", "tfvc-changesets-page-view"));
        $pageRoot.append(domElem("div", "hub-content"));
        this._element.append($pageRoot);

        Controls.Enhancement.enhance(ChangeSetsView, this._element);

        // Draw the search box
        Controls.Enhancement.enhance(searchAdapterClass, this._element.find(".search-box"));
    }
}

VSS.register("versionControl.tfvcChangeSetsHub", (context) => {
    return Controls.create(ChangeSetsHub, context.$container, context.options);
});