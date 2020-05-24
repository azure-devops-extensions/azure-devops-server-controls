import Utils_UI = require("VSS/Utils/UI");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCBranchesDiffChangeListControl = require("VersionControl/Scripts/Controls/BranchesDiffChangeListControl");
import domElem = Utils_UI.domElem;

interface ChangeListModelFetcher {
    beginRetrieveChangeList(callback: (changeList: VCLegacyContracts.ChangeList, oversion, mversion) => void): void;
}

export class DiffChangeListControlExt extends VCBranchesDiffChangeListControl.DiffChangeListControl {

    private _changeListModelFetcher: ChangeListModelFetcher;

    public initialize() {
        super.initialize();

        if (this._options.changeListModelFetcher) {
            this._changeListModelFetcher = this._options.changeListModelFetcher;
        }

        this.setModel(this._options.repositoryContext,
            <VCLegacyContracts.ChangeList> {
                allChangesIncluded: true,
                changeCounts: {},
                changes: [],
                comment: null,
                commentTruncated: false,
                creationDate: null,
                notes: [],
                owner: null,
                ownerDisplayName: null,
                ownerId: null,
                sortDate: null,
                url: null,
                version: null
            });
    }

    public getEmptyResultContainer(): JQuery {
        let $emptyResult = $(domElem("div", "no-changes-message")).append(
            $(domElem("div", "querying result-message")).text(VCResources.FilteredListQueryingMessage));

        return $emptyResult;
    }
}
