import * as Controls from "VSS/Controls";
import * as VSSShim from "VSS/SDK/Shim";

import { PullRequestCreateView } from "VersionControl/Scenarios/PullRequestCreate/View";
import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";

import "VSS/LoaderPlugins/Css!VersionControl";

export class PullRequestCreateHub extends HubBase {

    public initialize() {
        super.initialize();

        if (!this.validateRepository()) {
            return;
        }

        const hubView = `<div class="versioncontrol-pullrequest-create-view"></div>`;
        this._element.append($(hubView));

        this.enhanceView();
    }

    protected enhanceView() {
        Controls.Enhancement.enhance(PullRequestCreateView, this._element);
    }

    protected validateRepository() {
        return ValidateRepository.repositoryForPageExists(this._element);
    }
}

VSSShim.VSS.register("versionControl.pullRequestCreateNewHub", (context) => {
    return Controls.create(PullRequestCreateHub, context.$container, context.options);
});