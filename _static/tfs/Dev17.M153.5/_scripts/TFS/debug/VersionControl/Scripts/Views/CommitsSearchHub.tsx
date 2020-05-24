
import * as React from "react";

import * as Controls from "VSS/Controls";
import * as SDK_Shim from "VSS/SDK/Shim";

import { HubBase } from "VersionControl/Scenarios/Shared/HubBase";
import * as CommitsSearch from "VersionControl/Scripts/Views/CommitsSearchView";
import * as CommitSearch from "VersionControl/Scripts/Controls/CommitSearchAdapter";

import "VSS/LoaderPlugins/Css!VersionControl/CommitsSearchView";

export class CommitsSearchHub extends HubBase {

    public initialize() {

        super.initialize();

        const searchAdapterString = '<div class="vc-search-adapter-commits search-box bowtie"></div>';
        const searchAdapterClass = CommitSearch.CommitSearchAdapter;

        const searchBox = ` \
        <div class="versioncontrol-changes-search-box"> \
            ${searchAdapterString} \
        </div > `;

        const hubTitle = ` \
        <div class="hub-title"> \
            <div class="vc-page-title-area"> \
                <div class="vc-page-title-container"> \
                    <div class="vc-page-title"></div> \
                    ${searchBox} \
                </div > \
            </div> \
        </div> `;

        const contentPane = ` \
        <div class="rightPane hotkey-section hotkey-section-1" role= "main"> \
            ${hubTitle} \
            <div class="right-hub-content versioncontrol-commits-search-content"> \
            </div> \
        </div> `;

        const hubView = ` \
        <div class="hub-view explorer versioncontrol-commits-search-view"> \
            <div class="hub-content"> \
                 ${contentPane} \
            </div> \
        </div> `;

        this._element.append($(hubView));

        // Draw the search box
        Controls.Enhancement.enhance(searchAdapterClass, this._element.find(".search-box"));

        // Draw the view
        Controls.Enhancement.enhance(CommitsSearch.CommitsSearchView, this._element);
    }
}

SDK_Shim.VSS.register("versionControl.commitsSearchHub", (context) => {
    return Controls.create(CommitsSearchHub, context.$container, context.options);
});
