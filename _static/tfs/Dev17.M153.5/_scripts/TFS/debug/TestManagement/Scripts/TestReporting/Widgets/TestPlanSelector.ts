import Resources = require("TestManagement/Scripts/Resources/Tfs.Resources.TestManagement");
import { ServiceManager as TMServiceManager } from "TestManagement/Scripts/TFS.TestManagement.Service";

import { TestPlan } from "TFS/TestManagement/Contracts";

import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Utils_UI = require("VSS/Utils/UI");

export interface ITestPlanSelectorOptions {
    initialTestPlanId?: number;
    onSelectionChanged: (selectedId: number) => void;
}

export class TestPlanSelector extends Controls.Control<ITestPlanSelectorOptions> {

    public dispose() {
        if (this._testPlanSelectorCombo) {
            this._testPlanSelectorCombo.dispose();
        }
        super.dispose();
    }

    public initialize() {
        super.initialize();
        this._initialTestPlanId = this._options.initialTestPlanId;
        this._load();
    }

    private _load(): void {

        // create the combo control. This doesnt have the definition data populated yet.
        this._testPlanSelectorCombo = this._createTestPlanSelector();

        // show placeholder loading text till data is available for the release dropdown.
        Utils_UI.Watermark(this._testPlanSelectorCombo.getInput(), { watermarkText: Resources.LoadingMessage });

        this.getElement().append(this._testPlanSelectorCombo.getElement());

        this._fetchAndShowTestPlans();

        this._testPlanSelectorCombo.setEnabled(true);
    }

    private _fetchAndShowTestPlans(): void {
        let testPlanNames: string[] = [];
        const testMangementService = TMServiceManager.instance().testPlanningService();
        testMangementService.getAllTestPlans().then((testPlans: TestPlan[]) => {
            let initialTestPlanName: string;
            this._availableTestPlans = testPlans;
            testPlanNames = testPlans.map((testPlan: TestPlan, index: number) => {
                if (this._initialTestPlanId && testPlan.id === this._initialTestPlanId) {
                    initialTestPlanName = testPlan.name;
                }
                return testPlan.name;
            });
            // set these placeholders into the combo.
            this._testPlanSelectorCombo.setSource(testPlanNames);
            this._showDefaultText(initialTestPlanName);

            Diag.logTracePoint("TestPlanSelector.Loading.Complete");
        }, (error) => {
            Diag.logError("Unable to fetch Test Plans");
        });
    }

    private _createTestPlanSelector(): Combos.ComboO<Combos.IComboOptions> {
        const comboOptions: Combos.IComboOptions = {

            type: "list",
            // drop button visible.
            mode: "drop",

            enabled: false,
            dropWidth: "dynamic",

            // prevents editing insie the combo.
            allowEdit: false,

            // callback to handle a selection change.
            indexChanged: (index: number) => this._indexChangedCallback(index)
        };

        return <Combos.ComboO<Combos.IComboOptions>>Controls.Control.createIn<Combos.IComboOptions>(
            Combos.Combo,
            null,
            comboOptions);
    }

    /**
     * shows default text on experience load (either watermark or current definition name)
     */
    private _showDefaultText(initialText: string): void {
        if (initialText) {
            this._testPlanSelectorCombo.setText(initialText, false);
        } else {
            Utils_UI.Watermark(this._testPlanSelectorCombo.getInput(), { watermarkText: Resources.SelectPlan });
        }
    }

    private _indexChangedCallback(selectedPlanIndex: number) {
        if (this._availableTestPlans && this._availableTestPlans.length && this._availableTestPlans[selectedPlanIndex]) {
            this._options.onSelectionChanged(this._availableTestPlans[selectedPlanIndex].id);
        }
    }

    private _testPlanSelectorCombo: Combos.ComboO<Combos.IComboOptions> = null;
    private _initialTestPlanId: number;
    private _availableTestPlans: TestPlan[];
}
