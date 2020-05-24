import * as Controls from "VSS/Controls";
import * as  SDK_Shim from "VSS/SDK/Shim";

import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";
import { GitTagsView } from "VersionControl/Scenarios/Tags/TagsPage/GitTagsView";

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!VersionControl";

/**
 * Contributed Tags Hub.
 */
export class GitTagsHub extends HubBase {

    public initialize(): void {
        super.initialize();

        if (!ValidateRepository.repositoryForPageExists(this._element)) {
            return;
        }
        const hubContent = ` \
        <div class="hub-view git-tags-page"> \
            <div class="hub-content"> \
                <div class="version-control-item-right-pane tags-page-container"></div> \
                <div class="version-control-item-right-list-pane"></div> \
            </div>
        </div> `;

        this._element.append($(hubContent));

        Controls.Enhancement.enhance(GitTagsView, this._element);
    }
}

SDK_Shim.VSS.register("versionControl.gitTagsHub", (context) => {
    return Controls.create(GitTagsHub, context.$container, context.options);
});