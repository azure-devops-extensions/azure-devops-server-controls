/// <amd-dependency path='VSS/LoaderPlugins/Css!VersionControlControls' />

import * as VSS from "VSS/VSS";
import Notifications = require("VSS/Controls/Notifications");
import Navigation = require("VSS/Controls/Navigation");
import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import {CustomerIntelligenceData} from "VersionControl/Scripts/CustomerIntelligenceData";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import Q = require("q");

import * as VCBranchesDiffChangeListControl_NO_REQUIRE from "VersionControl/Scripts/Controls/BranchesDiffChangeListControl";

import TfsContext = TFS_Host_TfsContext.TfsContext;

export class BranchFileDiffTab extends Navigation.NavigationViewTab {

    private _summaryControl: Q.Promise<VCBranchesDiffChangeListControl_NO_REQUIRE.DiffChangeListControl>;

    constructor(options?) {
        super($.extend({
        }, options));
    }

    public initialize() {
        /// <summary>Initialize the control</summary>
        super.initialize();

        //Async load summary control for performance reasons
        this._summaryControl = Q.Promise<VCBranchesDiffChangeListControl_NO_REQUIRE.DiffChangeListControl>((resolve, reject) => {
            VSS.using(["VersionControl/Scripts/Controls/BranchesDiffChangeListControl"], (
                VCBranchesDiffChangeListControl: typeof VCBranchesDiffChangeListControl_NO_REQUIRE) => {
                let summaryControl = <VCBranchesDiffChangeListControl_NO_REQUIRE.DiffChangeListControl> Controls.BaseControl.createIn(VCBranchesDiffChangeListControl.DiffChangeListControl, this._element, {
                    tfsContext: TfsContext.getDefault(),
                    coreCssClass: "vc-change-summary"
                });
                resolve(summaryControl);
            });
        });
    }

    public onNavigate(rawState: any, parsedState: any) {
        /// <summary>
        /// Called whenever navigation occurs with this tab as the selected tab
        /// </summary>
        /// <param name="rawState" type="Object">The raw/unprocessed hash/url state parameters (string key/value pairs)</param>
        /// <param name="parsedState" type="Object">Resolved state objects parsed by the view</param>

        CustomerIntelligenceData.publishFirstTabView("BranchFileDiffTab", parsedState, this._options);

        this._summaryControl.then(summaryControl => {
            summaryControl.setActiveState(true, true);
            summaryControl.setModel(parsedState.repositoryContext, null);
            summaryControl.setDiscussionManager(parsedState.discussionManager);

            (<GitRepositoryContext>parsedState.repositoryContext).getGitClient().beginGetCommitFileDiff(
                parsedState.repositoryContext,
                parsedState.baseVersion.toVersionString(),
                parsedState.targetVersion.toVersionString(),
                1000,
                0,
                (changeList) => {
                if (changeList.changes && changeList.changes.length > 0) {
                    changeList.version = parsedState.targetVersion.toVersionString();
                    summaryControl.setModel(parsedState.repositoryContext, changeList,
                    (changeList.commitId) ? new VCSpecs.GitCommitVersionSpec(changeList.commitId.full).toVersionString() : null, parsedState.targetVersion.toVersionString());
                }
                else {
                    this._options.navigationView.showErrorContent(VCResources.BranchesPageEmptyMessage, null, Notifications.MessageAreaType.Info);
                }
            },
            (error) => {
                this._options.navigationView.showErrorContent(error.message, null, Notifications.MessageAreaType.Warning);
            });
        });
    }

    public onNavigateAway() {
        this._summaryControl.then(summaryControl => {
            summaryControl.setActiveState(false)
        });
    }
}