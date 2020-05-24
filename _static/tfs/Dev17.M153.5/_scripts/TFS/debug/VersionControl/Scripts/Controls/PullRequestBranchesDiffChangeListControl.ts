import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCPullRequestUrl = require("VersionControl/Scripts/PullRequestUrl");
import VCBranchesDiffChangeListControl = require("VersionControl/Scripts/Controls/BranchesDiffChangeListControl");

export class BranchesDiffChangeListControl extends VCBranchesDiffChangeListControl.DiffChangeListControl {
    constructor(options?) {
        super($.extend({}, options));
    }

    public _createFileLink($container: JQuery, changeEntry: VCLegacyContracts.Change, linkText: string, initialState: any) {
        VCPullRequestUrl.Url.createPullRequestFileLink(changeEntry, linkText, initialState).appendTo($container);
    }
}
