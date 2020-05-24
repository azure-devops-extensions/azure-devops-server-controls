import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Grid_Adapters = require("Presentation/Scripts/TFS/TFS.UI.Controls.Grid.DataAdapters");

export module StructureType {
    export var Iterations: string = "ProjectLifecycle";
    export var Areas: string = "ProjectModelHierarchy";
}

/**
 * The various types of ClassificationModes.
 */
export class ClassificationMode {
    /**
     * Iterations
     */
    public static MODE_ITERATIONS = 1;
    /**
     * Areas
     */
    public static MODE_AREAS = 2;
}

export class CssNode {

    public static CREATE_ACTION: string = "CreateClassificationNode";
    public static UPDATE_ACTION: string = "UpdateClassificationNode";
    public static NAME_DATA_INDEX: number = 0;
    public static START_DATE_DATA_INDEX: number = 1;
    public static END_DATE_DATA_INDEX: number = 2;
    public static EmptyGuidString: string = "00000000-0000-0000-0000-000000000000";

    public static create(node, fieldDataProvider) {
        /// <summary>Creates a new CSS node wrapper around the specified node.</summary>
        /// <param name="node">The node to wrap with extra CSS functionality.</param>
        /// <param name="fieldDataProvider">A field data provider used to manage indexes for quick lookup and retreival.</param>

        Diag.Debug.assertParamIsObject(node, "node");
        Diag.Debug.assertParamIsObject(fieldDataProvider, "fieldDataAdapter");

        var newNode = new CssNode(node, fieldDataProvider);

        return newNode;
    }

    public static compare(left: any, right: any) {
        /// <summary>Compares CSS nodes by start date (sorting nulls to the bottom), end date, name </summary>
        /// <param name="left" type="Object">The left node (see FieldDataProvider for node definition) in which to compare.</param>
        /// <param name="right" type="Object">The right node in which to compare.</param>
        /// <returns>Number n, where n<0 if left<right, n=0 if left==right, n>0 if left>right</returns>

        Diag.Debug.assertParamIsObject(left, "left");
        Diag.Debug.assertParamIsObject(right, "right");

        var result = 0;

        // test if we're dealing with iteration or area nodes
        if (left.values && left.values.length > 1) {

            // compare start dates
            result = (left.values[CssNode.START_DATE_DATA_INDEX] || Number.MAX_VALUE) - (right.values[CssNode.START_DATE_DATA_INDEX] || Number.MAX_VALUE);

            if (result === 0) {
                // compare finish dates
                result = (left.values[CssNode.END_DATE_DATA_INDEX] || Number.MAX_VALUE) - (right.values[CssNode.END_DATE_DATA_INDEX] || Number.MAX_VALUE);
            }
        }

        if (result === 0) {
            // compare node names
            result = Utils_String.localeIgnoreCaseComparer(left.text || "", right.text || "");
        }

        return result;
    }

    public node: any;
    public dataAdapter: any;

    constructor(node, fieldDataAdapter) {
        /// <summary>Creates a new CSS node wrapper around the specified node.</summary>
        /// <param name="node">The node to wrap with extra CSS functionality.</param>
        /// <param name="fieldDataAdapter">A field data provider used to manage indexes for quick lookup and retreival.</param>

        Diag.Debug.assertParamIsObject(node, "node");
        Diag.Debug.assertParamIsObject(fieldDataAdapter, "fieldDataAdapter");

        this.node = node;
        this.dataAdapter = fieldDataAdapter;
        
        if(node != null)
        {
            if (node.id === CssNode.EmptyGuidString) {
                node.id = null;
            }
            
            if (node.parentId === CssNode.EmptyGuidString) {
                node.parentId = null;
            }
        }
    }

    public getId() {
        /// <summary>Gets the ID of the node.</summary>
        return this.node.id || CssNode.EmptyGuidString;
    }

    public getParentId() {
        /// <summary>Gets the parent ID of the node.</summary>
        return this.node.parentId || CssNode.EmptyGuidString;
    }

    public getText() {
        /// <summary>Gets the text (or nodeName) of the node.</summary>
        return this.node.text;
    }

    public getStartDate() {
        /// <summary>Gets the start date for the iteration.</summary>
        return this.node.values[CssNode.START_DATE_DATA_INDEX] || null;
    }

    public getEndDate() {
        /// <summary>Gets the end date for the iteration.</summary>
        return this.node.values[CssNode.END_DATE_DATA_INDEX] || null;
    }

    public getStructureType() {
        return this.node.values.length > 1 ? StructureType.Iterations : StructureType.Areas;
    }

    public getParent() {
        /// <summary>Gets the parent of the node if one exists.</summary>
        var parentId = this.getParentId(),
            parent;

        if (parentId !== CssNode.EmptyGuidString) {
            parent = this.dataAdapter.getNodeFromId(parentId);
            return CssNode.create(parent, this.dataAdapter);
        }

        return undefined;
    }

    public getValues() {
        /// <summary>Gets the collection of values associated with the node.</summary>
        return this.node.values;
    }

    public getChildren() {
        /// <summary>Gets the children array of associated with the node.</summary>
        /// <returns>Returns a collection of CssNodes representing the children of the node.</returns>

        var children = [],
            that = this;

        $.each(this.node.children, function (index, value) {
            children.push(CssNode.create(value, that.dataAdapter));
        });

        return children;
    }

    public getPath() {
        /// <summary>Gets this path of the node.</summary>
        return this.node.path;
    }

    public createChild(text: string) {
        /// <summary>Create a child node of the current node. NOTE: this is not added into the parent's children yet.</summary>
        /// <param name="text" type="String">The name for the new node</param>

        Diag.Debug.assertParamIsStringNotEmpty(text, "text");

        var parentNode = this.node,
            node = {
                id: CssNode.EmptyGuidString,
                parentId: parentNode.id,
                text: text,
                values: new Array(parentNode.values.length),  // The length needs to match the parent since Iterations are Array[3] and Areas are Array[1]. This drives the getStructureType function.
                children: [],
                path: parentNode.path // TODO: This probably isn't needed now. Remove after RTM when then risk is lower.
            };

        node.values[0] = text;

        return new CssNode(node, this.dataAdapter);
    }

    public beginUpdate(successCallback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Send the node update to the server.</summary>
        /// <param name="successCallback" type="IResultCallback">Function to invoke on success.</param>
        /// <param name="errorCallback" type="IErrorCallback">Function to invoke on error.</param>

        Diag.Debug.assertParamIsFunction(successCallback, "successCallback");
        Diag.Debug.assertParamIsFunction(errorCallback, "errorCallback");

        var actionUrl = this._getUrl(CssNode.UPDATE_ACTION),
            operationData = this._getOperationData();

        // Post the request.
        Ajax.postMSJSON(
            actionUrl,
            {
                operationData: Utils_Core.stringifyMSJSON(operationData)
            },
            function (result) {
                // Invoke the appropriate callback based on the result.
                if (result.success) {
                    successCallback(result);
                }
                else {
                    errorCallback(result);
                }
            },
            function (error) {
                errorCallback(error);
            });
    }

    public clone() {
        /// <summary>Clones the CssNode including its children.</summary>

        return new CssNode(TFS_Grid_Adapters.HierarchicalGridDataAdapter.cloneNode(this.node), this.dataAdapter);
    }

    private _getUrl(actionName: string) {
        /// <summary>Generate the url for the provided action name on the Area Iterations controller</summary>
        /// <param name="actionName" type="String">Name of the action to invoke.</param>

        Diag.Debug.assertParamIsString(actionName, "actionName");
        return TFS_Host_TfsContext.TfsContext.getDefault().getActionUrl(
            actionName,
            "Areas",
            {
                area: "admin",
                team: "",
                includeVersion: true
            });
    }

    private _getOperationData() {
        /// <summary>Get the operation data from the node.</summary>

        return {
            NodeId: this.node.id,
            NodeName: this.node.values[CssNode.NAME_DATA_INDEX],
            ParentId: this.node.parent.id,
            IterationStartDate: this.node.values[CssNode.START_DATE_DATA_INDEX],
            IterationEndDate: this.node.values[CssNode.END_DATE_DATA_INDEX]
        };
    }
}

VSS.initClassPrototype(CssNode, {
    node: null,
    dataAdapter: null
});




/**
 * Classification tree node, contained in the IProjectWorkModel
 */
export interface IClassificationTreeNode {
    /**
     * Id of the node
     */
    id: string;
    /**
     * Id of the parent
     */
    parentId: string;
    /**
     * Parent node object
     */
    parent: IClassificationTreeNode;
    /**
     * List of descendents
     */
    children: IClassificationTreeNode[];
    /**
     * Text of the node
     */
    text: string;
    /**
     * Path from root node
     */
    path: string;
    /**
     * Size is 1 for area nodes and 3 for iteration nodes:
     * Area: [text]
     * Iteration: [text, startDate, endDate]
     */
    values: any[];
}

/**
 * Maps to the areas and iterations properties returned as part of the ProjectAdminWorkModel class from the server.
 */
export interface IClassificationNodes {
    /**
     * Mode (Iterations=1, Areas=2) of the nodes, specified by this object.
     */
    mode: number;
    /**
     * The CSS tree of the nodes of the specified type
     */
    treeValues: IClassificationTreeNode[];
}

/**
 * Maps to the ProjectAdminWorkModel class, used by the AdminWorkModel class, to return project nodes from the server.
 */
export interface IProjectWorkModel {
    /**
     * Area nodes for the project to which the team belongs
     */
    areas: IClassificationNodes;
    /**
     * Iteration nodes for the project to which the team belongs
     */
    iterations: IClassificationNodes;
}
