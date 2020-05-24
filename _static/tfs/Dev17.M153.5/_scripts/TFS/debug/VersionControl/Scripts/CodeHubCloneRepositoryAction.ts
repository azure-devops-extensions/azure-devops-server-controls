import Controls = require("VSS/Controls");
import Contribution_Services = require("VSS/Contributions/Services");
import GitRepositoryContext = require("VersionControl/Scripts/GitRepositoryContext");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Service = require("VSS/Service");
import Serialization = require("VSS/Serialization");
import Utils_UI = require("VSS/Utils/UI");
import { ClonePopup } from "VersionControl/Scripts/Controls/ClonePopup";
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import * as Constants from "VersionControl/Scenarios/Shared/Constants";

export function createCloneRepositoryPopup($selector: JQuery, options?: any, onEscape?: () => void, extendDefaultOptions?: boolean): ClonePopup {
    //if options are not provided construct them from vc viewmodel data provider
    if (!options || extendDefaultOptions) {
        options = options || {};
        const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
        let versionControlViewModel = webPageDataSvc.getPageData<any>(Constants.versionControlDataProviderId);
        versionControlViewModel = Serialization.ContractSerializer.deserialize(versionControlViewModel, VCWebAccessContracts.TypeInfo.VersionControlViewModel, false);
        options = $.extend({
            repositoryContext: GitRepositoryContext.GitRepositoryContext.create(versionControlViewModel.gitRepository, versionControlViewModel.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault()),
            openInVsLink: versionControlViewModel.openInVsLink,
            sshEnabled: versionControlViewModel.sshEnabled,
            sshUrl: versionControlViewModel.sshUrl,
            cloneUrl: versionControlViewModel.cloneUrl,
            branchName: versionControlViewModel.defaultGitBranchName,
            openedFromL2Header: true
        }, options);
    }

    options.onEscape = onEscape;

    const clonePopup = Controls.Enhancement.enhance(ClonePopup, $selector, options) as ClonePopup;
    // show the clone popup after the first time it is created
    clonePopup.show();

    // Make this element focusable to listen for keyboard events  
    $selector.bind("keydown", (e) => {
        switch (e.keyCode) {
            case Utils_UI.KeyCode.DOWN:
            case Utils_UI.KeyCode.ENTER:
            case Utils_UI.KeyCode.SPACE:
                clonePopup.show();
                return false;
            case Utils_UI.KeyCode.UP:
            case Utils_UI.KeyCode.ESCAPE:
                clonePopup.hide();
                return false;
        }
    });

    return clonePopup;
}