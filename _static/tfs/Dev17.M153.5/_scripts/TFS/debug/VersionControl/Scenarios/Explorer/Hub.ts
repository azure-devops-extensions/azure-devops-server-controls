import * as Controls from "VSS/Controls";
import * as VSSShim from "VSS/SDK/Shim";
import { caseInsensitiveContains } from "VSS/Utils/String";
import { domElem } from "VSS/Utils/UI";

import { ExplorerView } from "VersionControl/Scenarios/Explorer/ExplorerView";
import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";

import "VSS/LoaderPlugins/Css!BuildStyles";
import "VSS/LoaderPlugins/Css!DistributedTasksLibrary";
import "VSS/LoaderPlugins/Css!VersionControl";

export class FilesHub extends HubBase {
    public initialize() {
        super.initialize();

        const isTfvc = caseInsensitiveContains(window.location.pathname, "/_versionControl");
        if (!ValidateRepository.repositoryForPageExists(this._element, isTfvc)) {
            return;
        }

        const $pageRoot = $(domElem("div", "versioncontrol-explorer-view"));
        $pageRoot.append(domElem("div", "hub-content"));
        this._element.append($pageRoot);

        Controls.Enhancement.enhance(ExplorerView, this._element);
    }
}

VSSShim.VSS.register("versionControl.filesHub", (context) => {
    return Controls.create(FilesHub, context.$container, context.options);
});
