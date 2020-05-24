/// <reference types="jquery" />

import Navigation = require("VSS/Controls/Navigation");
import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import VCPushSummaryControl = require("VersionControl/Scripts/Controls/PushSummaryControl");
import {CustomerIntelligenceData} from "VersionControl/Scripts/CustomerIntelligenceData";

export class PushSummaryTab extends Navigation.NavigationViewTab {

    private static readonly CHANGE_LIST_CHANGES_FETCHED_EVENT = "change-list-changes-fetched";
    private _summaryControl: VCPushSummaryControl.PushSummaryControl;

    public initialize() {
        super.initialize();

        let customerIntelligenceData: CustomerIntelligenceData = new CustomerIntelligenceData();
        customerIntelligenceData.setTab("PushSummaryTab");

        this._summaryControl = <VCPushSummaryControl.PushSummaryControl>Controls.BaseControl.createIn(VCPushSummaryControl.PushSummaryControl, this._element, {
            customerIntelligenceData: customerIntelligenceData,
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault()
        });

        $(window).bind(PushSummaryTab.CHANGE_LIST_CHANGES_FETCHED_EVENT, this._onChangeListChangesFetched);
    }

    public onNavigate(rawState: any, parsedState: any) {
        CustomerIntelligenceData.publishFirstTabView("PushSummaryTab", parsedState, this._options);
        this._summaryControl.setModel(parsedState.repositoryContext, parsedState.push, parsedState.refUpdate, parsedState.changeList, parsedState.summaryFilter);
    }

    protected _dispose(): void {
        $(window).off(PushSummaryTab.CHANGE_LIST_CHANGES_FETCHED_EVENT, this._onChangeListChangesFetched);

        if (this._summaryControl) {
            this._summaryControl.dispose();
            this._summaryControl = null;
        }

        super._dispose();
    }

    private _onChangeListChangesFetched = (changeList: JQueryEventObject): void => {
        this._summaryControl.refreshChangedFiles();
    }
}
