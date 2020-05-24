import { ServiceManager as TMServiceManager } from "TestManagement/Scripts/TFS.TestManagement.Service";
import Resources = require("TestManagement/Scripts/Resources/Tfs.Resources.TestManagement");

import { TestSuite } from "TFS/TestManagement/Contracts";

import Controls = require("VSS/Controls");
import Combos = require("VSS/Controls/Combos");
import TreeView = require("VSS/Controls/TreeView");
import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

/**
 * Options for the TestSuite Picker.
 */
export interface ITestSuitePickerOptions {
    onSelectionChanged: (selectedSuiteId: number, selectedSuiteName: string, selectedSuitePath: string) => void;
    initialTestPlanId: number;
    initialTestSuiteId: number;
}

export class TestSuitePicker extends Controls.Control<ITestSuitePickerOptions> {

    public dispose() {
        if (this._testSuitePickerCombo) {
            this._testSuitePickerCombo.dispose();
        }
        super.dispose();
    }

    constructor(options: ITestSuitePickerOptions) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this._load();
    }

    private _load(): void {

        // create the combo control. This doesnt have the definition data populated yet.
        this._testSuitePickerCombo = this._createTestSuiteSelector();

        this.getElement().append(this._testSuitePickerCombo.getElement());
        if (this._options.initialTestPlanId) {
            this.fetchAndShowTestSuites(this._options.initialTestPlanId, this._options.initialTestSuiteId);
        }
    }

    public fetchAndShowTestSuites(planId: number, initialTestSuiteId?: number): void {

        this._testSuitePickerCombo.setEnabled(false);
        // show placeholder loading text till data is available for the release dropdown.
        this._testSuitePickerCombo.setText(Utils_String.empty);
        Utils_UI.Watermark(this._testSuitePickerCombo.getInput(), { watermarkText: Resources.LoadingMessage });

        const testMangementService = TMServiceManager.instance().testPlanningService();
        testMangementService.getTestSuitesForPlan(planId, true).then((testSuites: TestSuite[]) => {
            // set these placeholders into the combo.
            let treeNodes: TreeView.TreeNode[] = testSuites.map((testSuite) => {
                return this.populateUINodes(testSuite);
            });
            this._testSuitePickerCombo.setSource(treeNodes);

            const initialText: string = this._getCurrentSuitePath(initialTestSuiteId);
            this._showDefaultText(initialText);
            this._testSuitePickerCombo.setEnabled(true);

            Diag.logTracePoint("TestSuiteSelector.Loading.Complete");
        }, (error) => {
            Diag.logError("Unable to fetch Test Suites");
        });
    }

    /**
     * Converts Test suite nodes to TreeNodes
     * @param node
     * @param uiNode
     * @param level
     */
    public populateUINodes(node: TestSuite, uiNode?: TreeView.TreeNode, level?: number): TreeView.TreeNode {
        let childNodes: TestSuite[] = node.children, newUINode: TreeView.TreeNode;

        level = level || 1;
        let nodeName: string = node.name ? node.name : node.text;

        if (uiNode) {
            if (node.id) {
                newUINode = new TreeView.TreeNode(nodeName, null, null, node.id.toString());
            } else {
                newUINode = new TreeView.TreeNode(nodeName);
            }
            uiNode.add(newUINode);
            uiNode = newUINode;
        }
        else {
            if (node.id) {
                uiNode = new TreeView.TreeNode(nodeName, null, null, node.id.toString());
            } else {
                uiNode = new TreeView.TreeNode(nodeName);
            }
        }

        // set expanded state for the suite nodes based on their levels
        uiNode.expanded = level < TestSuitePicker._suiteExpansionLevel;

        if (childNodes) {
            childNodes.forEach((child: TestSuite) => {
                this.populateUINodes(child, uiNode, level + 1);
            });
        }

        return uiNode;
    }

    private _createTestSuiteSelector(): Combos.ComboO<Combos.IComboOptions> {

        const comboOptions: Combos.IComboOptions = {

            type: "tree",
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
     * get suite path from the suite id
     *
     * @param initialSuiteId
     */
    private _getCurrentSuitePath(initialSuiteId: number): string {
        if (initialSuiteId) {
            const dataSource = this._testSuitePickerCombo.getBehavior().getDataSource();
            const allSuites: any[] = dataSource.getItems(true);
            let initialItemIndex = -1;

            // Find out the index of the selected suite in the source
            allSuites.forEach((suiteNode, index) => {
                if (suiteNode.id === initialSuiteId.toString()) {
                    initialItemIndex = index;
                }
            });
            if (initialItemIndex !== -1) {
                return dataSource.getItemText(initialItemIndex, true);
            }
        }

        return Utils_String.empty;
    }

    /**
     * * shows default text on experience load (either watermark or current definition name)
     */
    private _showDefaultText(initialSuiteText: string): void {
        if (initialSuiteText) {
            this._testSuitePickerCombo.setText(initialSuiteText, true);
        } else {
            Utils_UI.Watermark(this._testSuitePickerCombo.getInput(), { watermarkText: Resources.SelectTestSuite });
        }
    }

    private _indexChangedCallback(selectedSuiteIndex: number) {
        const dataSource = this._testSuitePickerCombo.getBehavior().getDataSource();
        const selectedSuite = dataSource.getItem(selectedSuiteIndex, true);
        if (selectedSuite) {
            this._options.onSelectionChanged(parseInt(selectedSuite.id), selectedSuite.text, this._testSuitePickerCombo.getInputText());
        }
    }

    private static _suiteExpansionLevel = 2;
    private _testSuitePickerCombo: Combos.ComboO<Combos.IComboOptions> = null;
}
