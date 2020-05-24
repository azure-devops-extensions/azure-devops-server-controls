/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import * as VSS_Context from "VSS/Context";
import * as VSS from "VSS/VSS";
import * as DirectoryView from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/DirectoryView";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { DirectoryPivotType, IDirectoryPivot, TestPlanRouteParameters } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Contracts";
import { NewTestPlanPageActionsCreator } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/NewTestPlanPageActionsCreator";
import { NewTestPlanPageActionsHub } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Actions/NewTestPlanPageActionsHub";
import { NewTestPlanPageSource } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Sources/NewTestPlanPageSource";
import { NewTestPlanPageStore } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Stores/NewTestPlanPageStore";
import { NewTestPlanView } from "TestManagement/Scripts/Scenarios/NewTestPlanHub/Components/NewTestPlanView";
import { TcmPerfScenarios } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";

export function registerContent(context: SDK_Shim.InternalContentContextData) {
    const name = VSS_Context.getPageContext().navigation.routeValues[TestPlanRouteParameters.Pivot].toLowerCase();

    if (Utils_String.equals(name, DirectoryPivotType.mine, true) ||
        Utils_String.equals(name, DirectoryPivotType.all, true)) {
        TestPlanHub.renderDirectoryView(context, name);
    } else if (Utils_String.equals(name, DirectoryPivotType.new, true)) {
        NewTestPlanPage.renderView(context);
    }

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
}

export class TestPlanHub {
    /**
     * Set up Directory view pivots and call Directory page render.
     * @param context - Content context used for rendering container
     * @param tab - Current selected tab
     */
    // Public for unit testing
    public static renderDirectoryView(context: SDK_Shim.InternalContentContextData, tab: string): void {
        const pivots: IDirectoryPivot[] = [
            {
                name: Resources.MineText,
                type: DirectoryPivotType.mine
            },
            {
                name: Resources.AllText,
                type: DirectoryPivotType.all
            }
        ];

        const selectedPivot: DirectoryPivotType = this.directoryPivotTypeFromString(tab);
        let scenarioName;
        let perfDescriptor;

        if (selectedPivot === DirectoryPivotType.all) {
            scenarioName = TcmPerfScenarios.LoadTestPlansAll;
        }
        else if (selectedPivot === DirectoryPivotType.mine) {
            scenarioName = TcmPerfScenarios.LoadTestPlansMine;
        }

        if (scenarioName) {
            perfDescriptor = PerformanceUtils.startScenario(TcmPerfScenarios.Area, scenarioName, true);
        }

        ReactDOM.render(
            <DirectoryView.DirectoryView
                selectedPivot={selectedPivot}
                pivots={pivots} />,
            context.container);
    }

    /**
     * Gets the DirectoryPivotType enum value for the pivot name provided.
     * @param pivotName The pivot name.
     * @param defaultValue Optional - DirectoryPivotType to return when pivot name does not match any of the known types.
     */
    public static directoryPivotTypeFromString(
        pivotName: string,
        defaultValue?: DirectoryPivotType): DirectoryPivotType {

        let result: DirectoryPivotType = defaultValue;

        if (Utils_String.equals(pivotName, DirectoryPivotType.all, /*ignorecase*/ true)) {
            result = DirectoryPivotType.all;
        }
        else if (Utils_String.equals(pivotName, DirectoryPivotType.mine, /*ignorecase*/ true)) {
            result = DirectoryPivotType.mine;
        }

        return result;
    }

}

export class NewTestPlanPage {

    public static renderView(context: SDK_Shim.InternalContentContextData) {

        const actionsCreator: NewTestPlanPageActionsCreator = new NewTestPlanPageActionsCreator(NewTestPlanPageActionsHub.getInstance(),
            NewTestPlanPageSource.getInstance());
        const store: NewTestPlanPageStore = new NewTestPlanPageStore(NewTestPlanPageActionsHub.getInstance());

        actionsCreator.initialize();

        ReactDOM.render(
            <NewTestPlanView
                actionsCreator={actionsCreator}
                store={store}
            />,
            context.container);
    }
}

SDK_Shim.registerContent("test.testplanhub", (context: SDK_Shim.InternalContentContextData) => {
    return registerContent(context);
});