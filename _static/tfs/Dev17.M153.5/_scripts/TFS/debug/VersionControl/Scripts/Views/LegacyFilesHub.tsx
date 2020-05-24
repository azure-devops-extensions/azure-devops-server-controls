
// VSS
import Controls = require("VSS/Controls");
import SDK_Shim = require("VSS/SDK/Shim");
import Navigation = require("VSS/Controls/Navigation");
import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import {createLocalStorageHubSplitter} from "VersionControl/Scenarios/Shared/HubSplitter";
import {ValidateRepository} from "VersionControl/Scenarios/Shared/ValidateRepository";
import * as Explorer from "VersionControl/Scripts/Views/ExplorerView";

///////////////////////////////////////////////////////////////////////////////
// LegacyFilesHub
///////////////////////////////////////////////////////////////////////////////

export class LegacyFilesHub extends Controls.Control<any> {

    public initialize() {

        super.initialize();

        //Determine if we hit the page as tfvc
        let tfvcPage = false;
        if (Utils_String.caseInsensitiveContains(window.location.pathname, '/_versionControl')) {
            tfvcPage = true;
        }

        if (!ValidateRepository.repositoryForPageExists(this._element, tfvcPage)) {
            return;
        }

        const leftPane = `\
		<div class="leftPane hotkey-section hotkey-section-0" role="navigation" style="width: 250px;">\
		    <div class="left-hub-content">\
                <div class="version-control-item-left-pane">\
                    <div class="source-node-container">\
                        <div class="source-explorer-tree"></div>\
                    </div>\
                </div>\
		    </div>\
		</div>`;

        const hubPivots = `\
            <div class="hub-pivot">\
                <div class="views">\
                    ${this._getPivotViewHtml()}
                </div>\
                <div class="filters"></div>\
            </div>\
            <div class="hub-pivot-content">\
                <div class="version-control-item-right-pane">\
                </div>\
            </div>`;

        const rightPane = `\
		<div class="rightPane hotkey-section hotkey-section-1" role="main" style="left: 250px;">\
		    <div class="hub-title">\
		        <div class="vc-page-title-area">\
		            <div class="vc-branches-container"></div>\
		            <div class="vc-path-explorer-container"></div>\
		            <div class="vc-status-container"></div>\
		        </div>\
		    </div>\
            <div class="hub-progress pageProgressIndicator" style="visibility: hidden;"></div>\
		    <div class="right-hub-content">\
                ${hubPivots}\
            </div >\
		</div>`;

        const hubSkeleton = `\
            <div class="hub-view explorer versioncontrol-explorer-view">\
	            <div class="hub-content">\
		            <div class="splitter hub-splitter toggle-button-enabled toggle-button-hotkey-enabled">\
                        ${leftPane} \
			            <div class="handleBar"></div>\
                        ${rightPane} \
			        </div>\
		        </div>\
            </div>`;
        this._element.append($(hubSkeleton));

        createLocalStorageHubSplitter(this._element.find(".splitter"), "Git.Explorer.LeftHubSplitter", VCResources.SourceExplorerText);

        //Render View
        Controls.Enhancement.enhance(Explorer.ExplorerView, this._element);
    }

    private _getPivotViewHtml(): string {
        const pivotView = Controls.BaseControl.createIn(Navigation.PivotView, null, {
            items: [
                {
                    text: VCResources.Contents,
                    id: "contents",
                    link: "#_a=contents",
                    selected: true
                },
                {
                    text: VCResources.History,
                    id: "history",
                    link: "#_a=history"
                },
                {
                    text: VCResources.Compare,
                    id: "compare",
                    link: "#_a=compare",
                    disabled: "true"
                },
                {
                    text: VCResources.Annotate,
                    id: "annotate",
                    link: "#_a=annotate",
                    disabled: "true"
                }
            ] as Navigation.IPivotViewItem[],
        }) as Navigation.PivotView;

        return pivotView.getElement().addClass("vc-explorer-tabs enhance")[0].outerHTML;
    }
}

SDK_Shim.VSS.register("versionControl.legacyFilesHub", (context) => {
    return Controls.create(LegacyFilesHub, context.$container, context.options);
});
