/// <reference types="react" />
import * as React from "react";

import { BugsGridViewActionsCreator } from "TestManagement/Scripts/Scenarios/BugsGridView/Actions/BugsGridViewActionsCreator";
import { BugsGridViewActionsHub } from "TestManagement/Scripts/Scenarios/BugsGridView/Actions/BugsGridViewActionsHub";
import { BugsGridView } from "TestManagement/Scripts/Scenarios/BugsGridView/ControllerViews/BugsGridView";
import { BugsGridViewSource } from "TestManagement/Scripts/Scenarios/BugsGridView/Sources/BugsGridViewSource";
import { BugsGridViewStore } from "TestManagement/Scripts/Scenarios/BugsGridView/Stores/BugsGridViewStore";
import TCMContracts = require("TFS/TestManagement/Contracts");
import * as ComponentBase from "VSS/Flux/Component";
import { registerLWPComponent } from "VSS/LWP";


export interface ILegacyBugsGridViewProps extends ComponentBase.Props {
    testCaseResult: TCMContracts.TestCaseResult;
}

export class LegacyBugsGridView extends ComponentBase.Component<ILegacyBugsGridViewProps, {}> {

    constructor(props) {
        super(props);
        const bugsGridViewActionsHub = new BugsGridViewActionsHub();
        const bugsGridViewSource = new BugsGridViewSource();
        this._store = new BugsGridViewStore(bugsGridViewActionsHub);
        this._actionCreator = new BugsGridViewActionsCreator(bugsGridViewActionsHub, bugsGridViewSource);
    }

    render() {
        return (
            <BugsGridView
                actionsCreator={this._actionCreator}
                store={this._store}
                {... this.props}
            />);
    }

    private _actionCreator: BugsGridViewActionsCreator;
    private _store: BugsGridViewStore;
}

registerLWPComponent("legacyBugsGridView", LegacyBugsGridView);