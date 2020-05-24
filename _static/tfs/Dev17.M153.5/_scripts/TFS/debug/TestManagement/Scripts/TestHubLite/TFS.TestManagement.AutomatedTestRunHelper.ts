import { ITestPointModel } from "TestManagement/Scripts/TFS.TestManagement";
import { AutomatedTestRunActionsHub, IAutomatedTestRunOptions } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Actions/AutomatedTestRunActionsHub";
import { AutomatedTestsValidationStore } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Stores/AutomatedTestsValidationStore";
import { AutomatedTestRunActionsCreator } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Actions/AutomatedTestRunActionsCreator";
import * as AutomatedTestsValidationDialog from "TestManagement/Scripts/Scenarios/OnDemandTestRun/ControllerViews/AutomatedTestsValidationDialog";
import { AutomatedTestsValidationSource } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Sources/AutomatedTestsValidationSource";

import { ReleaseDefinition } from "ReleaseManagement/Core/Contracts";
import { Build } from "TFS/Build/Contracts";
import * as Utils_String from "VSS/Utils/String";

export class AutomatedTestRunHelper {

    constructor() {
        const actionsHub = new AutomatedTestRunActionsHub();
        const automatedTestsValidationSource = new AutomatedTestsValidationSource();
        this._automatedTestsValidationStore = new AutomatedTestsValidationStore(actionsHub);
        this._automatedTestRunActionsCreator = new AutomatedTestRunActionsCreator(actionsHub, automatedTestsValidationSource);
    }
    
    /**
     * Opens Validation Dialog to perform checks for running automated tests and trigger a release when all are satisfied
     * @param dialogViewModel
     * @param selectedPlan
     * @param parentElement
     */
    public openAutomatedTestRunDialog(selectedPoints: ITestPointModel[],
        selectedBuild: Build,
        selectedReleaseDefinition: ReleaseDefinition,
        selectedReleaseEnvironmentId: number,
        selectedPlan: any,
        onClose: () => void) {

        if (!selectedPlan) {
            return;
        }

        this._onCloseHandler = onClose;
        // Start Validation in background 
        let automatedPointIds: number[] = selectedPoints.filter((point: ITestPointModel) => {
            return point.automated;
        }).map((point) => {
            return point.testPointId;
            });

        let runOptions: IAutomatedTestRunOptions = {
            selectedPlan: selectedPlan,
            automatedTestPointIds: automatedPointIds,
            selectedBuild: selectedBuild,
            selectedReleaseDefinition: selectedReleaseDefinition,
            selectedReleaseEnvironmentId: selectedReleaseEnvironmentId
        };
        this._automatedTestRunActionsCreator.startOnDemandValidations(runOptions);

        // Render Dialog
        this._element = document.createElement("div");

        let props: AutomatedTestsValidationDialog.IAutomatedTestsValidationProps = {
            onCloseDialog: this._onCloseDialog,
            selectedPlanName: selectedPlan.name,
            actionsCreator: this._automatedTestRunActionsCreator,
            store: this._automatedTestsValidationStore
        };
        AutomatedTestsValidationDialog.renderDialog(this._element, props);
    }

    private _onCloseDialog = (): void => {
        AutomatedTestsValidationDialog.unmountDialog(this._element);
        if (this._onCloseHandler) {
            this._onCloseHandler();
        }
    }

    private _automatedTestRunActionsCreator: AutomatedTestRunActionsCreator;
    private _automatedTestsValidationStore: AutomatedTestsValidationStore;
    private _element: HTMLElement;
    private _onCloseHandler: () => void;
}