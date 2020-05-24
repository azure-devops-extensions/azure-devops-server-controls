import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");

import TFS_Admin_Security_NO_REQUIRE = require("Admin/Scripts/TFS.Admin.Security");

import { ClassificationMode, CssNode, StructureType, IClassificationTreeNode } from "Agile/Scripts/Admin/AreaIterations.DataModels";
import { Debug } from "VSS/Diag";
import { FieldDataProvider } from "Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters";
import { ProjectProcessConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { ClassificationDialogs } from "Agile/Scripts/Admin/ManageClassificationDialogs";
import { LinkingUtilities } from "VSS/Artifacts/Services";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

var tfsContext = TfsContext.getDefault();

/**
 * Get the process configutation using the ProjectProcessConfigurationService
 */
function getProcessConfigurationService() {
    return ProjectCollection.getConnection(tfsContext).getService<ProjectProcessConfigurationService>(ProjectProcessConfigurationService);
}

/**
 * Manages the add/edit/delete as well as security of the nodes. Used by the work hub with project or as team context
 */
export class CSSNodeManager {

    public static ITERATION_SECURITY_SET = "BF7BFA03-B2B7-47db-8113-FA2E002CC5B1";
    public static AREA_SECURITY_SET = "83E28AD4-2D72-4ceb-97B0-C7726D5502C3";

    private _permissionSet: string;
    private _mode: number;
    private _dataProvider: FieldDataProvider;

    constructor(mode: number, dataProvider: FieldDataProvider) {
        this._mode = mode;
        this._dataProvider = dataProvider;
        this._permissionSet = (this._mode === ClassificationMode.MODE_ITERATIONS) ? CSSNodeManager.ITERATION_SECURITY_SET : CSSNodeManager.AREA_SECURITY_SET;
    }

    /**
     * Launches a dialog to add a node either as a sibling or as a child
     * 
     * @param {IClassificationTreeNode} node The node to be added
     * @param {(node: CssNode) => void} onSaved callback
     * @param {(node: CssNode) => void} Optional onClosed callback
     */
    public addNode(node: IClassificationTreeNode, addAsChild: boolean, onSaved: (node: CssNode) => void, onClosed?: (node: CssNode) => void): void {
        Debug.assertParamIsObject(node, "node");
        Debug.assertParamIsBool(addAsChild, "addAsChild");

        var parent = CssNode.create(addAsChild ? node : node.parent, this._dataProvider),
            text = (this._mode === ClassificationMode.MODE_ITERATIONS ? AgileResources.EditIterationDefaultName : AgileResources.EditAreaDefaultName),
            cssNode = parent.createChild(text),
            isIteration = cssNode.getStructureType() === StructureType.Iterations,
            previousIteration,
            options;

        var showDialog = () => {
            ClassificationDialogs.showEditClassificationDialog(cssNode, onSaved, options);
        };

        options = {
            close: onClosed,
            createNode: true,
            bowtieVersion: 2
        };

        if (isIteration) {
            getProcessConfigurationService().beginGetProcessSettings((processSettings) => {
                previousIteration = this._findLastIterationWithDates(parent.getChildren());
                if (previousIteration) {
                    options.previousIteration = CssNode.create(previousIteration, this._dataProvider);
                    options.weekends = processSettings.weekends;
                }

                showDialog();
            }, showDialog); // If there is an error getting the process settings (E.g. project has been upgraded but features haven't been enabled) then don't default dates.
        }
        else {
            showDialog();
        }
    }

    /**
     * Launches a dialog to edit the specified node
     * 
     * @param {IClassificationTreeNode} node The node to be edited
     * @param {(node: CssNode) => void} onSaved callback
     * @param {(node: CssNode) => void} Optional onClosed callback
     */
    public editNode(node: IClassificationTreeNode, onSaved: (node: CssNode) => void, onClosed?: (node: CssNode) => void): void {
        /// <summary>Displays the dialog to edit a node</summary>
        /// <param name="node" type="object">The node from the grid adapter which will be edited</param>
        Debug.assertParamIsObject(node, "node");

        var dataProvider = this._dataProvider,
            cssNode = CssNode.create(node, dataProvider),
            isIteration = cssNode.getStructureType() === StructureType.Iterations,
            options;

        var showDialog = () => {
            ClassificationDialogs.showEditClassificationDialog(cssNode, onSaved, options);
        };

        options = {
            close: onClosed,
            bowtieVersion: 2
        };

        if (isIteration) {
            getProcessConfigurationService().beginGetProcessSettings((processSettings) => {
                var previousIteration = dataProvider.getPreviousSiblingNode(cssNode.getId());
                if (previousIteration) {
                    options.previousIteration = CssNode.create(previousIteration, this._dataProvider);
                    options.weekends = processSettings.weekends;
                }

                showDialog();
            }, showDialog); // If there is an error getting the process settings (E.g. project has been upgraded but features haven't been enabled) then don't default dates.
        }
        else {
            showDialog();
        }
    }

    /**
     * Launches a dialog to delete the specified node
     * 
     * @param {IClassificationTreeNode} node The node to be edited
     * @param {() => void} onSaved callback
     * @param {() => void} Optional onClosed callback
     */
    public deleteNode(node: IClassificationTreeNode, onSaved: () => void, onClosed?: () => void): void {
        /// <summary>Handle the request to remove the selected area/iteration.</summary>
        /// <param name="node">The node in which to remove.</param>
        Debug.assertParamIsObject(node, "node");

        // We need to clone the node and the payload here only because the delete dialog modifies
        // both and we want those modifications to be transient.
        var cssNode = CssNode.create(node, this._dataProvider);
        var options = {
            cssClass: "delete-iteration-host",
            mode: this._mode,
            payload: this._dataProvider.cloneSource(),
            cssNode: cssNode.clone(),
            bowtieVersion: 2,
            operationCompleteCallback: onSaved,
            close: onClosed
        };

        ClassificationDialogs.showDeleteClassificationDialog(options);
    }

    /**
     * Launches a dialog to manage the security of the specified node
     * 
     * @param {IClassificationTreeNode} node The node to be edited
     */
    public editNodeSecurity(node: IClassificationTreeNode): void {
        /// <summary>Show Security Dialog to manage node security</summary>
        /// <param name="node" type="object">node to manage security for</param>

        var options: TFS_Admin_Security_NO_REQUIRE.SecurityDialogOptions = {
            permissionSet: this._permissionSet,
            token: LinkingUtilities.encodeUri({
                tool: "Classification",
                type: "Node",
                id: node.id
            }),
            tokenDisplayVal: node.text
        };

        ClassificationDialogs.showSecureClassificationDialog(options);
    }

    private _findLastIterationWithDates(cssNodes?: CssNode[]): any {
        /// <summary>Find the latest iteration node in the list of CssNodes which has dates specified</summary>
        /// <param name="cssNodes" type="DataModels.CssNode[]" optional="true">The array of CssNode objects to search through</param>
        /// <returns type="Object">The node data for the located node, or null if none of the nodes have dates</returns>
        Debug.assertParamIsObject(cssNodes, "cssNodes", true);

        var previousCssNode: CssNode,
            index: number;

        if (cssNodes && cssNodes.length > 0) {
            index = cssNodes.length - 1;
            previousCssNode = cssNodes[index];
        }

        while (previousCssNode && !previousCssNode.getStartDate()) {
            index -= 1;
            previousCssNode = index >= 0 ? cssNodes[index] : null;
        }

        return previousCssNode ? previousCssNode.node : null;
    }
}
