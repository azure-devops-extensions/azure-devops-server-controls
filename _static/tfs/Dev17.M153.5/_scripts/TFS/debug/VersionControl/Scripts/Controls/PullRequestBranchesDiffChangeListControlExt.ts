import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCPullRequestUrl = require("VersionControl/Scripts/PullRequestUrl");
import VCBranchesDiffChangeListControlExt = require("VersionControl/Scripts/Controls/BranchesDiffChangeListControlExt");

export class BranchesDiffChangeListControlExt extends VCBranchesDiffChangeListControlExt.DiffChangeListControlExt {
    constructor(options?) {
        super($.extend({}, options));
    }

    public _createFileLink($container: JQuery, changeEntry: VCLegacyContracts.Change, linkText: string, initialState: any) {
        VCPullRequestUrl.Url.createPullRequestFileLink(changeEntry, linkText, initialState).appendTo($container);
    }
}
