import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";

import "VSS/LoaderPlugins/Css!VersionControl";

/** This Hub is an entry point of PullRequestList rendering. It gets PageData and instatiates PullRequestListView */
export abstract class PullRequestListHubBase extends HubBase {

    public initialize() {
        super.initialize();

        if (!this.validateRepository()) {
            return;
        }

        const hubView = `<div class="versioncontrol-pullrequest-list-view"></div>`;
        this._element.append($(hubView));

        this.enhanceView();
    }

    protected abstract enhanceView();

    protected validateRepository() {
        return ValidateRepository.repositoryForPageExists(this._element);
    }
}
