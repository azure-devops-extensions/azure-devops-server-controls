import * as Controls from "VSS/Controls";
import * as SDK_Shim from "VSS/SDK/Shim";

import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!VersionControl";

/**
 * Contributed Tags Hub.
 */
export class GitTagsHub extends HubBase {

    public initialize(): void {

        super.initialize();

        const hubContent = ` \
        <div> \
        </div> `;

        this._element.append($(hubContent));

    }
}

SDK_Shim.VSS.register("versionControl.gitTagsHub", (context) => {
    return Controls.create(GitTagsHub, context.$container, context.options);
});
