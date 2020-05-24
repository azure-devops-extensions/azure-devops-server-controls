import * as ReactDOM from "react-dom";
import * as Controls from "VSS/Controls";
import * as SDK_Shim from "VSS/SDK/Shim";

import { CommitDetailsView } from "VersionControl/Scenarios/ChangeDetails/CommitDetailsView";
import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";

import "VSS/LoaderPlugins/Css!VersionControl";
import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!VersionControl/CommitHub";


/**
 * Contributed Git Commit Hub.
 */
export class CommitHub extends HubBase {
    private readonly changeDetailsBodyCssClass = "vc-changedetails-view";
    private _pageData: any;

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

        Controls.Enhancement.enhance(CommitDetailsView, this._element);
    }

    protected _dispose(): void {
        super._dispose();

        // to unmount error message component
        if (!this._pageData || !this._pageData.commitDetails) {
            ReactDOM.unmountComponentAtNode(this._element[0]);
        }

        // remove page specific selector when we navigate to another page (because of the SPA navigation)
        $("body").removeClass(this.changeDetailsBodyCssClass);
    }
}

SDK_Shim.VSS.register("versionControl.gitCommitHub", (context) => {
    return Controls.create(CommitHub, context.$container, context.options);
});
