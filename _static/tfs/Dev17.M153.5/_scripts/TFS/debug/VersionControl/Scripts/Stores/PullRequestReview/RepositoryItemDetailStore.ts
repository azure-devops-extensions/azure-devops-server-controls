import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import Performance = require("VSS/Performance");
import * as Actions from "VersionControl/Scripts/Actions/PullRequestReview/ActionsHub";
import { RemoteStore } from "VSS/Flux/Store";
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

/**
 * Details about the currently selected item in the change explorer (specifically Git item detail)
 */
export class RepositoryItemDetailStore extends RemoteStore {
    private _itemDetail: VCLegacyContracts.ItemModel;
    private _selectedPath: string; // track the selected path, so we know if responses are out of order
    private _scenario: Performance.IScenarioDescriptor; // time how long it takes to load a file

    constructor() {
        super();
        this._scenario = null;
        this._selectedPath = null;
        this._itemDetail = null;
    }

    /**
     * Reset item detail on a new explorer selection
     */
    public onResetItemDetail = (payload: Actions.IChangeExplorerSelectPayload): void => {
        if (this._selectedPath == payload.path) {
            return;
        }

        this._loading = true;
        this._selectedPath = payload.path;
        this._itemDetail = null;

        if (!this._scenario) {
            this._scenario = Performance.getScenarioManager().startScenario(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.PULL_REQUEST_VIEW_LOAD_FILE_FEATURE);
        }

        this.emitChanged();
    }

    /**
     * Update item detail when it is loaded.
     */
    public onItemDetailLoaded = (payload: Actions.IChangeItemDetailLoadedPayload): void => {
        if (this._selectedPath != payload.id) {
            return; // do not change, since this does not match our expectation
        }

        if (this._scenario) {
            this._scenario.end();
            this._scenario = null;
        }

        this._itemDetail = payload.item;
        this.emitChanged();
    }
   
    public getItemDetail(): VCLegacyContracts.ItemModel {
        return this._itemDetail;
    }
}