import * as Controls from "VSS/Controls";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_UI from "VSS/Utils/UI";

import { TfvcChangeDetailsView } from "VersionControl/Scenarios/ChangeDetails/TfvcChangeDetails/TfvcChangeDetailsView";
import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!VersionControl";

/**
 * Contributed Changeset, Shelveset details view.
 */
export class TfvcChangeDetailsHub extends HubBase {
    private readonly changeDetailsBodyCssClass = "vc-changedetails-view";

    public initialize(): void {

        super.initialize();

        if (!ValidateRepository.repositoryForPageExists(this._element)) {
            return;
        }

        // add hub specific selector to the page so top-level out-of-order DOM additions
        // (like office fabric dropdown container) can be specifically styled
        $("body").addClass(this.changeDetailsBodyCssClass);

        const hubContent = ` \
        <div class="hub-view explorer versioncontrol-change-list-view versioncontrol-new-change-list-view"> \
            <div class="hub-content" /> \
        </div> `;

        this._element.append($(hubContent));
        Controls.Enhancement.enhance(TfvcChangeDetailsView, this._element);
    }

    protected _dispose(): void {
        super._dispose();

        // remove page specific selector when we navigate to another page (because of the SPA navigation)
        $("body").removeClass(this.changeDetailsBodyCssClass);
    }
}

SDK_Shim.VSS.register("versionControl.tfvcChangeDetailsHub", (context) => {
    return Controls.create(TfvcChangeDetailsHub, context.$container, context.options);
});
