import * as Controls from "VSS/Controls";
import * as VSSShim from "VSS/SDK/Shim";

import { PushesView } from "VersionControl/Scenarios/Pushes/PushesView";
import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";

import "VSS/LoaderPlugins/Css!VersionControl";

export class PushesHub extends HubBase {
    public initialize(): void {
        super.initialize();

        if (!ValidateRepository.repositoryForPageExists(this._element, false)) {
            return;
        }

        const hubContent = ` \
        <div class="hub-view versioncontrol-pushes-view"> \
            <div class="hub-content"> \
                <div class="version-control-item-right-pane pushes-page-container"></div> \
                <div class="version-control-item-right-list-pane"></div> \
            </div>
        </div> `;

        this._element.append($(hubContent));

        Controls.Enhancement.enhance(PushesView, this._element);
    }
}

VSSShim.VSS.register("versionControl.pushesHub", (context) => {
    return Controls.create(PushesHub, context.$container, context.options);
});
