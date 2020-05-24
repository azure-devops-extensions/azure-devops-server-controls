import { FilterEditorControl, FilterViewModel } from "Build/Scripts/FilterViewModel";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import VCContracts = require("TFS/VersionControl/Contracts");

import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import VCClient = require("VersionControl/Scripts/TFS.VersionControl.ClientServices");
import VCGitVersionSelectorMenu = require("VersionControl/Scripts/Controls/GitVersionSelectorMenu");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");

import Controls = require("VSS/Controls");
import Service = require("VSS/Service");

export class TfGitBranchFilterEditorControl extends FilterEditorControl {
    constructor(viewModel: FilterViewModel, options?: any) {
        super(viewModel, options);
    }

    initialize(): void {
        super.initialize();
        var elem = this.getElement().parent();
        var viewModel = this.getViewModel();
        var repo = viewModel.repository;

        // bind branch-picker control to html
        var gitVersionMenu = <VCGitVersionSelectorMenu.GitVersionSelectorMenu>Controls.BaseControl.createIn(VCGitVersionSelectorMenu.GitVersionSelectorMenu, elem, {
            popupOptions: {
                elementAlign: "left-top",
                baseAlign: "left-bottom",
                allowUnmatchedSelection: true
            },
            disableTags: true,
            initialSelectedItem: new VCSpecs.GitBranchVersionSpec(viewModel.pattern()),
            onItemChanged: function (selectedItem: VCSpecs.GitBranchVersionSpec) {
                if (selectedItem) {
                    var branch = selectedItem.branchName || "";
                    if (branch.indexOf("refs/") == 0) {
                        // allow to let user save something like "refs/pull/*"
                        viewModel.pattern(branch);
                    }
                    else {
                        viewModel.pattern(GitRefUtility.getFullRefNameFromBranch(branch));
                    }
                }
            }
        });
        
        // get repository context so the correct branches get displayed in the control
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var tfsConnection: Service.VssConnection = new Service.VssConnection(tfsContext.contextData);
        var gitHttpClient = tfsConnection.getHttpClient<VCWebApi.GitHttpClient>(VCWebApi.GitHttpClient);
        var repoContext;
        gitHttpClient.beginGetRepository(tfsContext.navigation.project, repo().id).then(
            (repository: VCContracts.GitRepository) => {
                repoContext = VCClient.getContext(tfsContext, repository);
                gitVersionMenu.setRepository(repoContext);
            });
    }
}
