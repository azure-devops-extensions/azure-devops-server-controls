import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import { TestPlanSettingsActionsHub } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Actions/TestPlanSettingsActionsHub";
import { TestPlanSettingsActionsCreator } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Actions/TestPlanSettingsActionsCreator";
import * as TestPlanSettingsDialog from "TestManagement/Scripts/Scenarios/OnDemandTestRun/ControllerViews/TestPlanSettingsDialog";
import { TestPlanSettingsSource } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Sources/TestPlanSettingsSource";
import { TestPlanSettingsStore } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Stores/TestPlanSettingsStore";

import TCMContracts = require("TFS/TestManagement/Contracts");
import VSS_Artifacts_Services = require("VSS/Artifacts/Services");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let LinkingUtilities = VSS_Artifacts_Services.LinkingUtilities;

export class TestPlanSettingsHelper {

    constructor() {
        const actionsHub = new TestPlanSettingsActionsHub();
        const source = new TestPlanSettingsSource();
        this._testPlanSettingsStore = new TestPlanSettingsStore(actionsHub);
        this._testPlanSettingsActionsCreator = new TestPlanSettingsActionsCreator(actionsHub, source);
    }

    public openTestPlanSettingsDialog(testPlan: any, parentElement: JQuery, onSaveCallback: (testPlan: TCMContracts.TestPlan) => void) {
        
        let selectedPlan: TCMContracts.TestPlan = this._convertObjectToTestPlanModel(testPlan);
        // Render Dialog
        if (!this._element) {
            this._element = $("<div class='test-plan-settings'/>");
            parentElement.append(this._element[0]);
        }
        
        let props: TestPlanSettingsDialog.ITestPlanSettingsProps = {
            selectedPlan: selectedPlan,
            actionsCreator: this._testPlanSettingsActionsCreator,
            store: this._testPlanSettingsStore,
            onCloseDialog: this._onCloseDialog,
            onSaveCallback: onSaveCallback
        };
        TestPlanSettingsDialog.renderDialog(this._element[0], props);

        //Fetching build definitions
        this._testPlanSettingsActionsCreator.populateTestPlanSettingsOptions(selectedPlan);
    }

    //TODO: Proper TestPlan MVC data model to TestPlan Contract
    private _convertObjectToTestPlanModel(testPlan: any): TCMContracts.TestPlan {
        let testPlanModel: TCMContracts.TestPlan = testPlan as TCMContracts.TestPlan;
        if (testPlan && testPlan.buildUri) {
            let buildArtifact: VSS_Artifacts_Services.IArtifactData = LinkingUtilities.decodeUri(testPlan.buildUri);
            testPlanModel.build = { id: buildArtifact.id } as TCMContracts.ShallowReference;
        } else {
            testPlanModel.build = { id: "0" } as TCMContracts.ShallowReference;
        }
        if (testPlan && testPlan.buildDefinitionId) {
            testPlanModel.buildDefinition = { id: testPlan.buildDefinitionId } as TCMContracts.ShallowReference;
        }
        return testPlanModel;
    }

    private _onCloseDialog = (): void => {
        TestPlanSettingsDialog.unmountDialog(this._element[0]);
    }

    private _testPlanSettingsActionsCreator: TestPlanSettingsActionsCreator;
    private _testPlanSettingsStore: TestPlanSettingsStore;
    private _element: JQuery;
}
