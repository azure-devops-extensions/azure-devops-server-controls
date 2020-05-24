import Contribution_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Navigation = require("VSS/Controls/Navigation");
import * as Service from "VSS/Service";
import * as SDK_Shim  from "VSS/SDK/Shim";

import { createLocalStorageHubSplitter } from "VersionControl/Scenarios/Shared/HubSplitter";
import { PushView } from "VersionControl/Scripts/Views/PushView";
import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import { ValidateRepository } from "VersionControl/Scenarios/Shared/ValidateRepository";
import { VersionControlActionIds } from "VersionControl/Scripts/Controls/ControlsCommon";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!VersionControl";

/**
 * Contributed Git Push View.
 */
export class GitPushHub extends HubBase {
    public initialize(): void {

        super.initialize();

        if (!ValidateRepository.repositoryForPageExists(this._element)) {
            return;
        }

        const data = Service.getService(Contribution_Services.WebPageDataService)
            .getPageData<any>("ms.vss-code-web.git-legacy-push-view-data-provider");
        const options = { pushId: data["PushId"] };

        const hubTitle = `\
        <div class="hub-title"> \
            <div class="vc-page-title-area"> \
                <div class="vc-page-title-container"> \
                    <div class="vc-page-title"></div> \
                </div> \
                <div class="vc-push-toolbar-container"></div> \
            </div> \
        </div> `;

        const leftPane = ' \
        <div class="leftPane hotkey-section hotkey-section-0" role="navigation"> \
            <div class="left-hub-content"> \
                <div class="version-control-item-left-pane"> \
                    <div class="vc-push-items-container"></div> \
                </div> \
            </div > \
        </div> ';

        const hubPivots = `\
        <div class="hub-pivot"> \
            <div class="views"> \
                ${this._getPivotViewHtml() } \
            </div> \
        </div> \
        <div class="hub-pivot-content"> \
            <div class="version-control-item-right-pane"></div> \
        </div> `;

        const rightPane = ` \
        <div class="rightPane hotkey-section hotkey-section-1" role="main"> \
            ${hubTitle} \
            <div class="hub-progress pageProgressIndicator" style="visibility: hidden;"></div> \
            <div class="right-hub-content"> \
                ${hubPivots} \
            </div> \
        </div> `;

        const hubContent = ` \
        <div class="hub-view explorer versioncontrol-push-view"> \
            <div class="hub-content"> \
                <div class="splitter horizontal hub-splitter stateful toggle-button-enabled toggle-button-hotkey-enabled">\
                    ${leftPane} \
                    <div class="handleBar"></div> \
                    ${rightPane} \
                </div> \
            </div>
        </div> `;

        this._element.append($(hubContent));

        // build the splitter
        createLocalStorageHubSplitter(this._element.find(".hub-content > .splitter"), "Git.GitPush.LeftHubSplitter", VCResources.SourceExplorerText);

        // Enhance this with the original PushesView view
        Controls.Enhancement.enhance(PushView, this._element, options);
    }

    private _getPivotViewHtml(): string {
        const pivotView = Controls.BaseControl.createIn(Navigation.PivotView, null, {
            items: [
                {
                    text: VCResources.Summary,
                    id: VersionControlActionIds.Summary,
                    link: "#_a=summary",
                    disabled: true,
                },
                {
                    text: VCResources.Commits,
                    id: VersionControlActionIds.Commits,
                    link: "#_a=commits",
                    disabled: true,
                },
                {
                    text: VCResources.CommitsRemovedTabName,
                    id: VersionControlActionIds.CommitsRemoved,
                    link: "#_a=commitsremoved",
                    disabled: true,
                },
                {
                    text: VCResources.Contents,
                    id: VersionControlActionIds.Contents,
                    link: "#_a=contents",
                    disabled: true,
                },
                {
                    text: VCResources.Compare,
                    id: VersionControlActionIds.Compare,
                    link: "#_a=compare",
                    disabled: true,
                },
            ] as Navigation.IPivotViewItem[],
        }) as Navigation.PivotView;

        return pivotView.getElement().addClass("vc-explorer-tabs enhance")[0].outerHTML;
    }
}

SDK_Shim.VSS.register("versionControl.gitPushHub", (context) => {
    return Controls.create(GitPushHub, context.$container, context.options);
});