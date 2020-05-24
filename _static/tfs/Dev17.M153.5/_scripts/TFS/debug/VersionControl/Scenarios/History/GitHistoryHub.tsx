
import * as Controls from "VSS/Controls";
import * as  SDK_Shim from "VSS/SDK/Shim";

import { GitHistoryView } from "VersionControl/Scenarios/History/GitHistoryView";
import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!VersionControl";

/**
 * Contributed Git History Hub.
 */
export class GitHistoryHub extends HubBase {

    public initialize(): void {

        super.initialize();

        if (!ValidateRepository.repositoryForPageExists(this._element)) {
            return;
        }

        const hubContent = ` \
            <div class="hub-content explorer versioncontrol-git-history-view git-repositories-view"> \
            </div> `;

        this._element.append($(hubContent));

        Controls.Enhancement.enhance(GitHistoryView, this._element, {});
    }
}

SDK_Shim.VSS.register("versionControl.gitHistoryHub", (context) => {
    return Controls.create(GitHistoryHub, context.$container, context.options);
});
