import Controls = require("VSS/Controls");
import PRSearchAdapter = require("VersionControl/Scripts/Controls/PullRequestSearchAdapter");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCViewBase = require("VersionControl/Scripts/Views/BaseView");

export class PullRequestViewBase extends VCViewBase.ViewBase {
    public initialize(options?) {
        this._setPRSearchAdapter();
        super.initialize();
    }

    private _setPRSearchAdapter() {
        let $prAdapterElement: JQuery = $(".vc-search-adapter-pull-requests");
        let adapter : PRSearchAdapter.SearchAdapter;
        
        if ($prAdapterElement.length) {
            adapter = <PRSearchAdapter.SearchAdapter>Controls.Enhancement.ensureEnhancement(PRSearchAdapter.SearchAdapter, $prAdapterElement);
            adapter.setRepository(<GitRepositoryContext>this._repositoryContext);
        }
    }
}
