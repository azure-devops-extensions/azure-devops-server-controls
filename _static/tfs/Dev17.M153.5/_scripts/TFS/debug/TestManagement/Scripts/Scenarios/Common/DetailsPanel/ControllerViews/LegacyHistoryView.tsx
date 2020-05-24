/// <reference types="react" />
import * as React from "react";
import { HistoryViewActionsCreator } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/HistoryViewActionsCreator";
import { HistoryViewActionsHub } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/HistoryViewActionsHub";
import { HistoryView } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/ControllerViews/HistoryView";
import { HistoryViewSource } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/HistoryViewSource";
import { HistoryViewStore } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Stores/HistoryViewStore";
import { IViewContextData } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as ComponentBase from "VSS/Flux/Component";
import { registerLWPComponent } from "VSS/LWP";


export interface ILegacyHistoryViewProps extends ComponentBase.Props {
    testCaseResult: TCMContracts.TestCaseResult;
    subResultId: number;
    viewContext: IViewContextData;
    isFullScreen: boolean;
}

export class LegacyHistoryView extends ComponentBase.Component<ILegacyHistoryViewProps, {}> {
    constructor(props) {
        super(props);
        const historyViewActionsHub = new HistoryViewActionsHub();
        const historyViewSource = new HistoryViewSource();
        this._store = new HistoryViewStore(historyViewActionsHub),
            this._actionCreator = new HistoryViewActionsCreator(historyViewActionsHub, historyViewSource)
    }

    render() {
        return (
            <HistoryView
                actionsCreator={this._actionCreator}
                store={this._store}
                {... this.props}
            />);
    }

    private _actionCreator: HistoryViewActionsCreator;
    private _store: HistoryViewStore;
}


registerLWPComponent("legacyHistoryView", LegacyHistoryView);