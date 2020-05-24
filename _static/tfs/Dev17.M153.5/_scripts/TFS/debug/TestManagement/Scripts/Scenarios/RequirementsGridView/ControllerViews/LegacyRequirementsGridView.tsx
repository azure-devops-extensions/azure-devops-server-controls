/// <reference types="react" />
import * as React from "react";
import { RequirementsGridViewActionsCreator } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Actions/RequirementsGridViewActionsCreator";
import { RequirementsGridViewActionsHub } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Actions/RequirementsGridViewActionsHub";
import { RequirementsGridView } from "TestManagement/Scripts/Scenarios/RequirementsGridView/ControllerViews/RequirementsGridView";
import { RequirementsGridViewSource } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Sources/RequirementsGridViewSource";
import { RequirementsGridViewStore } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Stores/RequirementsGridViewStore";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as ComponentBase from "VSS/Flux/Component";
import { registerLWPComponent } from "VSS/LWP";

export interface ILegacyRequirementsGridViewProps extends ComponentBase.Props {
    testCaseResult: TCMContracts.TestCaseResult;
}

export class LegacyRequirementsGridView extends ComponentBase.Component<ILegacyRequirementsGridViewProps, {}> {
    constructor(props) {
        super(props);
        const requirementsGridViewActionsHub = new RequirementsGridViewActionsHub();
        const requirementsGridViewSource = new RequirementsGridViewSource();
        this._store = new RequirementsGridViewStore(requirementsGridViewActionsHub);
        this._actionCreator = new RequirementsGridViewActionsCreator(requirementsGridViewActionsHub, requirementsGridViewSource);
    }

    render() {
        return (
            <RequirementsGridView
                actionsCreator={this._actionCreator}
                store={this._store}
                {... this.props}
            />);
    }

    private _actionCreator: RequirementsGridViewActionsCreator;
    private _store: RequirementsGridViewStore;
}


registerLWPComponent("legacyRequirementsGridView", LegacyRequirementsGridView);