import "VSS/LoaderPlugins/Css!SharedSCripts/QueryCombo";
import Combos = require("VSS/Controls/Combos");
import Controls = require("VSS/Controls");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Diag = require("VSS/Diag");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TreeView = require("VSS/Controls/TreeView");
import Validation = require("VSS/Controls/Validation");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import QueryFolderTree = require("WorkItemTracking/SharedScripts/QueryFolderTree");
import { QueryHierarchy, QueryItem, QueryFolder, QueryDefinition, IQueryFavoritesData } from "WorkItemTracking/SharedScripts/QueryHierarchy";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { QueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import * as Q from "q";
import { QueriesConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

const tfsContext = TfsContext.getDefault();

export class QueryComboTreeBehavior extends TreeView.ComboTreeBehavior {
    public static TYPE = "queryTree";

    private _querydata: QueryHierarchy | QueryItem[];

    constructor(combo, options?) {
        super(combo, $.extend({
            dropControlType: QueryComboTreeDropPopup,
            sepChar: QueryItem.DEFAULT_PATH_SEPARATOR,
            treeLevel: 0,
            autoComplete: false
        }, options));
    }

    public getCombo(): QueryCombo {
        return <QueryCombo>this.combo;
    }

    public getDropOptions(): any {
        /// <returns type="object" />

        return $.extend({
            queryHierarchy: this._querydata,
            selectionMode: this._options.selectionMode
        }, super.getDropOptions());
    }

    public setSource(source: QueryTreeDataSource) {
        super.setSource(source);

        this._dataSource.ensureItems();
    }

    public showDropPopup(): boolean {
        this.getCombo().ensureValidInput(() => {
            super.showDropPopup();
        }, () => {
            // Input could not be validated, show the popup anyway to allow the user an easier correction of the invalid input
            super.showDropPopup();
        });

        return true;
    }

    public _createDataSource(): Controls.BaseDataSource {
        return new QueryTreeDataSource(this._options);
    }

    public setQueryData(queryData: QueryHierarchy | QueryItem[]) {
        this._querydata = queryData;
    }

    public setText(value: string, fireEvent?: boolean) {
        /// <param name="value" type="string" />
        /// <param name="fireEvent" type="boolean" optional="true" />

        super.setText(value, fireEvent);

        this.getCombo().validateInput();
    }

    public upKey(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" optional="true"/>
        /// <returns type="any" />

        if (!this.isDropVisible()) {
            // Show popup only, if it's not open
            this.showDropPopup();

            return false;
        }

        return super.upKey(e);
    }

    public downKey(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" optional="true"/>
        /// <returns type="any" />

        if (!this.isDropVisible()) {
            // Show popup only, if it's not open
            this.showDropPopup();

            return false;
        }

        return super.downKey(e);
    }

    public keyUp(e?: JQueryEventObject): any {
        /// <param name="e" type="JQueryEvent" optional="true"/>
        /// <returns type="any" />

        if (this.isDropVisible()) {
            return false;
        } else {
            return super.keyUp(e);
        }
    }

    public getSelectedItem(): QueryComboTreeNode {
        /// <summary>Gets the currently selected item or null if nothing is selected.</summary>
        /// <returns type="QueryComboTreeNode">Selected QueryComboTreeNode or null</returns>

        const selectedIndex = this.getSelectedIndex();
        let selectedItem;

        if (selectedIndex >= 0) {
            selectedItem = this._dataSource.getItem(selectedIndex);
        }

        return (selectedItem) || null;
    }

    public updateTree() {
        /// <summary>Rebuild the tree from the query hierarchy and ensure all internal data structures are synchronized to that state.</summary>

        // Update the datasource's tree because it might have changed
        const dataSource = <QueryTreeDataSource>this._dataSource;
        dataSource.root.populate(this._querydata, this._options.selectionMode);

        // Map the updated tree to the list data structures
        dataSource.updateItemsFromSource();
    }

    public _dropSelectionChanged(selectedIndex: number, accept) {
        const dropPopup = this.getDropPopup<TreeView.ComboTreeDropPopup>();
        const selectedNode: QueryComboTreeNode = dropPopup.getDataSource().getItem(selectedIndex);

        if (selectedNode
            && selectedNode.queryItem
            && selectedNode.isValidSelection(this._options.selectionMode)) {
            super._dropSelectionChanged(selectedIndex, accept);
        }
    }
}

// Register this behavior with the combobox
Combos.Combo.registerBehavior(QueryComboTreeBehavior.TYPE, QueryComboTreeBehavior);

VSS.initClassPrototype(QueryComboTreeBehavior, {
    "_queryHierarchy": null,
});

interface NonSelfReferentialValidatorOptions extends Validation.BaseValidatorOptions {
    existingPath?: string;
}

class NonSelfReferentialValidator extends Validation.BaseValidator<NonSelfReferentialValidatorOptions> {

    constructor(options?: NonSelfReferentialValidatorOptions) {

        super(options);
    }

    public initializeOptions(options?: NonSelfReferentialValidatorOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions(<NonSelfReferentialValidatorOptions>$.extend({
            message: Resources.QueryManageDialog_Validator_FolderSelfReferential
        }, options));
    }

    public isValid(): boolean {
        /// <summary>Called to verify the proposed query item parent folder is not self referential.</summary>
        /// <returns type="Boolean" />

        const proposedParentPath = $.trim(this.getValue());

        // Reject text which starts with the existing path as being self-referential.
        return (!proposedParentPath || !Utils_String.startsWith(proposedParentPath, this._options.existingPath));
    }
}

export class QueryComboTreeNode extends QueryFolderTree.QueryTreeNode {
    private _isErrorMessage: boolean = false;
    public children: QueryComboTreeNode[];

    constructor(text: string) {
        super(text);

        this.emptyFolderNodeText = VSS_Resources_Platform.NoItemsInThisFolder;
    }

    public hasChildren(): boolean {
        /// <summary>Returns true if this node has children</summary>

        return this.queryItem && this.queryItem instanceof QueryFolder;
    }

    public addLoadingNode() {
        /// <summary>Add dummy node indicating that children are being loaded.</summary>

        this._addEmptyNode(Resources.QueryTree_Loading);
    }

    public addEmptyNode(text: string) {
        /// <summary>Add dummy node indicating that there are no children to select.</summary>
        /// <param name="text">Name of the dummy node.</param>

        this._addEmptyNode(text);
    }

    public removeEmptyChildNodes() {
        if (this.children) {
            const nodesToRemove: QueryComboTreeNode[] = [];

            // Mark nodes for deletion
            for (let i = 0, l = this.children.length; i < l; ++i) {
                const child = this.children[i];
                if (child.isEmptyFolderChildNode) {
                    nodesToRemove.push(child);
                } else {
                    child.removeEmptyChildNodes();
                }
            }

            // Delete marked nodes
            for (let i = 0, l = nodesToRemove.length; i < l; ++i) {
                nodesToRemove[i].remove();
            }
        }
    }

    public populate(queryItem: QueryItem | QueryItem[], selectionMode: QuerySelectionMode) {
        if (queryItem instanceof QueryFolder && selectionMode !== QuerySelectionMode.Favorites) {
            const queryFolder: QueryFolder = queryItem;

            this.folder = true;

            // Remove pseudo-nodes
            this.removeEmptyChildNodes();

            if (queryFolder.hasChildren && !queryFolder.childrenLoaded()) {
                // Folder has children but they have not been loaded yet. We do not know yet
                // whether there are only folders or query definitions etc. so display loading
                // indicator
                this.addLoadingNode();

                return;
            }

            if (!queryFolder.hasChildren
                || queryFolder.children.length === 0
                || (selectionMode === QuerySelectionMode.Folders
                    && queryFolder.children.every((child: QueryItem): boolean => !(child instanceof QueryFolder)))) {
                // Folder doesn't have children at all, or no children are visible in the current selection mode, display empty
                // folder node indicator
                let emptyNodeText = VSS_Resources_Platform.NoItemsInThisFolder;
                if (selectionMode === QuerySelectionMode.Folders) {
                    emptyNodeText = Resources.NoQueryFolderChildren;
                }

                this.addEmptyNode(emptyNodeText);
            } else {
                const sortedChildren: QueryItem[] = QueryFolderTree.QueryUtils.sortChildren(queryFolder, queryFolder.children);

                for (const child of sortedChildren) {
                    if (selectionMode === QuerySelectionMode.Folders
                        && !(child instanceof QueryFolder)) {
                        // Skip query definitions in this mode
                        continue;
                    }

                    if (QueryDefinition.isRecycleBinQuery(child)) {
                        continue; // Skip adding recycle bin query
                    }

                    let childNode: QueryComboTreeNode;

                    const existingChildNodeIdx = Utils_Array.findIndex(this.children, (a: QueryComboTreeNode) => a.queryId === child.id);
                    if (existingChildNodeIdx !== -1) {
                        // Update existing child
                        childNode = <QueryComboTreeNode>this.children[existingChildNodeIdx];
                    } else {
                        // Add new child to parent
                        childNode = new QueryComboTreeNode(child.name);
                        childNode.queryItem = child;
                        childNode.queryId = child.id;
                        this.add(childNode);
                    }

                    childNode.populate(child, selectionMode);
                }
            }
        } else if (selectionMode === QuerySelectionMode.Favorites && queryItem && queryItem instanceof Array) {
            const favorites: QueryItem[] = queryItem;
            if (favorites.length > 0) {
                for (const favorite of favorites) {
                    const child = new QueryComboTreeNode(favorite.name);
                    child.queryItem = favorite;
                    child.queryId = favorite.id;
                    this.add(child);
                }
            } else {
                const child = new QueryComboTreeNode(Resources.LinkWorkItemsNoFavorites);
                child._isErrorMessage = true;
                this.add(child);
            }
        }
    }

    public isValidSelection(selectionMode: QuerySelectionMode): boolean {
        return !this.isEmptyFolderChildNode && !this._isErrorMessage
            && (selectionMode === QuerySelectionMode.Folders && this.folder)
            || (selectionMode === QuerySelectionMode.QueryDefinitions && !this.folder)
            || (selectionMode === QuerySelectionMode.Favorites && !this.folder);
    }

    private _addEmptyNode(text: string) {
        const emptyNode = new QueryComboTreeNode(text);
        emptyNode.folder = false;
        emptyNode.isEmptyFolderChildNode = true;
        this.add(emptyNode);
    }
}

export class QueryTreeDataSource extends TreeView.TreeDataSource {
    // Use strongly typed root node
    public root: QueryComboTreeNode;

    constructor(options?) {
        super(options);
    }

    public _initRoot() {
        if (!this.root) {
            this.root = new QueryComboTreeNode("");
            this.root.expanded = true;
            this.root.root = true;
        }
    }
}

export class QueryComboTreeDropPopup extends TreeView.ComboTreeDropPopup {
    private static CLASS_EMPTY = "empty";
    private static CLASS_FOLDER = "folder";

    private _queryHierarchy: QueryHierarchy;

    constructor(options?: any) {
        super(options);

        this._queryHierarchy = this._options.queryHierarchy;
    }

    public expandNode() {
        const node = this._getSelectedNode();

        this._expandNode(node);

        return false;
    }

    public _onItemClick(e?, itemIndex?, $target?, $li?): boolean {

        const node = <QueryComboTreeNode>this.getDataSource().getItem(itemIndex);
        if (node.isEmptyFolderChildNode) {
            // Ignore clicks on empty folder nodes
            return false;
        }

        if ($target.hasClass("node-img")) {
            // User clicked on expand/collapse arrow
            if (node.hasChildren()) {
                if (node.expanded) {
                    // Collapse node
                    this.getDataSource<TreeView.TreeDataSource>().collapseNode(node);
                    this.virtualizingListView.update();
                } else {
                    this._expandNode(node);
                }

                return false;
            }
        }

        return node.isValidSelection(this._options.selectionMode);
    }

    public _createItem(index) {
        const node: QueryComboTreeNode = this.getDataSource().getItem(index),
            $li = super._createItem(index);

        if (node.isEmptyFolderChildNode) {
            $li.addClass(QueryComboTreeDropPopup.CLASS_EMPTY);
        }

        if (node.folder) {
            $li.addClass(QueryComboTreeDropPopup.CLASS_FOLDER);
        }

        return $li;
    }

    private _updateNode(queryItem: QueryItem, treeNode: QueryComboTreeNode) {
        treeNode.populate(queryItem, this._options.selectionMode);
    }

    private _expandNode(node: QueryComboTreeNode) {
        if (node.queryItem && node.queryItem instanceof QueryFolder) {
            const queryFolder = <QueryFolder>node.queryItem;
            const dataSource = this.getDataSource<TreeView.TreeDataSource>();
            if (queryFolder.hasChildren) {
                // Prefetch new data
                queryFolder.beginLoadChildren().then(
                    (updatedFolder) => {
                        // Update tree representation
                        this._updateNode(queryFolder, node);

                        // Refresh display, collapse and expand to trigger generation of children
                        dataSource.updateItemsFromSource();
                        dataSource.collapseNode(node);
                        dataSource.expandNode(node);
                        this.virtualizingListView.update();
                    });
            }

            // Expand now to display any temporary children
            dataSource.expandNode(node);
            this.virtualizingListView.update();
        }
    }
}

export interface IQueryComboOptions {
    initialPath?: string; // Initial path for folder selection
    queryPath?: string; // Original query path (e.g., in case of rename)
    allowSelfReferentialSelection?: boolean; // Default is false, only used if initialPath is set
    selectionMode: QuerySelectionMode;
    project?: WITOM.Project;
    watermark?: string; // Optional: watermark to display if there is no value selected
}

export enum QuerySelectionMode {
    Folders,
    QueryDefinitions,
    Favorites,
}

export class QueryComboValidator extends Validation.BaseValidator<Validation.BaseValidatorOptions> {

    constructor(options?: Validation.BaseValidatorOptions) {

        super(options);
    }

    public initializeOptions(options?: Validation.BaseValidatorOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions(<Validation.BaseValidatorOptions>$.extend({
            message: "Input value is not allowed!"
        }, options));
    }

    public initialize() {
        // Do not call super here, we want to avoid the common event registrations explicitly
    }

    public isValid(): boolean {
        /// <returns type="boolean" />
        const text = $.trim(this.getValue());

        if (text) {
            const combo = <QueryCombo>Controls.Enhancement.getInstance(QueryCombo, this.getElement());
            if (combo) {
                return combo.getSelectedIndex() >= 0;
            }
        }

        // Empty input is not a valid state here
        return false;
    }
}

export class QueryCombo extends Combos.Combo {
    private _project: WITOM.Project;
    private _queryHierarchy: QueryHierarchy;
    private _queryOptions: IQueryComboOptions;
    private _validator: QueryComboValidator;

    public initializeOptions(options?: any) {
        /// <summary>Initialize the options for the combobox.</summary>
        /// <param name="options" type="any" optional="true">Options to set.</param>

        super.initializeOptions($.extend({},
            <IQueryComboOptions>{
                type: QueryComboTreeBehavior.TYPE,
                selectionMode: QuerySelectionMode.QueryDefinitions
            }, options));

        // Provide typed access to options for internal usage
        this._queryOptions = <IQueryComboOptions>this._options;
    }

    public beginInitialize(callback: Function, errorCallback?: IErrorCallback) {
        /// <summary>Initialize the combobox.</summary>
        /// <param name="callback" type="Function">Callback to be called after the control has been initialized.</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback in case an error occurs</param>

        if (this._queryOptions.allowSelfReferentialSelection && this._queryOptions.queryPath) {
            // Use the complete query path here
            Controls.Enhancement.enhance(
                NonSelfReferentialValidator, this, { existingPath: this._queryOptions.queryPath });
        }

        this._setWatermark();

        this._validator = <QueryComboValidator>Controls.Enhancement.enhance(
            QueryComboValidator, this, { message: Resources.QueryManageDialog_Validator_FolderInvalid });

        if (this._queryOptions.project) {
            this.beginSetProject(this._queryOptions.project, () => {
                const pathToSelect = this._queryOptions.initialPath || this._queryHierarchy.myQueries.path();

                this.beginSetSelectedPath(pathToSelect, callback, errorCallback);
            }, errorCallback);
        } else {
            callback();
        }
    }

    private _beginGetFavorites(project: WITOM.Project): Q.IPromise<QueryDefinition[]> {
        const {
            queryFavoriteGroupStore,
            queryHierarchyItemStore,
        } = QueriesHubContext.getInstance().stores;
        // NQE stores ready?
        if (queryFavoriteGroupStore.isLoaded() && queryHierarchyItemStore.isLoaded()) {
            const favorites = queryFavoriteGroupStore.get(QueriesConstants.MyFavoritesGroupKey).favorites.map(
                ({artifactId}) => new QueryDefinition(
                    project,
                    queryHierarchyItemStore.getItem(artifactId),
                ),
            );
            return Q(favorites);
        }
        // fallback to OQE
        return QueryHierarchy.beginGetQueryFavorites(project).then((favorites) =>
            favorites.myFavorites.map((f) => new QueryDefinition(project, f.queryItem)),
        );

    }

    /** Set the project for which the query hierarchy should be shown */
    public beginSetProject(project: WITOM.Project, callback: Function, errorCallback?: IErrorCallback) {
        Diag.Debug.assertIsNotNull(project, "Project is required");

        if (this._project !== project) {
            this._project = project;
            if (this._queryOptions.selectionMode === QuerySelectionMode.Favorites) {

                this._beginGetFavorites(project).then((queryItems) => {
                    const queryRootNode = new QueryComboTreeNode("");
                    queryRootNode.populate(queryItems, this._queryOptions.selectionMode);

                    this.setSource(queryRootNode.children);
                    (<QueryComboTreeBehavior>this.getBehavior()).setQueryData(queryItems);

                    callback();
                }, errorCallback);
            } else {
                QueryHierarchy.beginGetQueryHierarchy(project).then((queryHierarchy: QueryHierarchy) => {
                    this._queryHierarchy = queryHierarchy;

                    const queryRootNode = new QueryComboTreeNode("");
                    queryRootNode.populate(queryHierarchy, this._queryOptions.selectionMode);

                    this.setSource(queryRootNode.children);
                    (<QueryComboTreeBehavior>this.getBehavior()).setQueryData(queryHierarchy);

                    callback();
                }, errorCallback);
            }
        } else {
            callback();
        }
    }

    public beginSetSelectedItem(queryItem: QueryItem, callback: Function, errorCallback?: IErrorCallback) {
        /// <summary>Updates the currently selected item and updates the hierarchy to display it.</summary>
        /// <param name="callback" type="Function">Callback to be called after the item has been set.</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback in case an error occurs</param>

        QueryHierarchy.beginGetQueryHierarchy(this._project).then(
            (queryHierarchy: QueryHierarchy) => {
                queryHierarchy._ensureItemInTree(queryItem.storedPath, queryItem).then(
                    (attachedQueryItem: QueryItem) => {
                        const behavior = this.getBehavior<QueryComboTreeBehavior>();
                        behavior.updateTree();
                        behavior.setText(queryItem.path());

                        callback();
                    },
                    errorCallback);
            },
            errorCallback);
    }

    public beginSetSelectedPath(path: string, callback: Function, errorCallback?: IErrorCallback) {
        /// <summary>Updates the currently selected item and updates the hierarchy to display it.</summary>
        /// <param name="callback" type="Function">Callback to be called after the item identified by the path has been set.</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback in case an error occurs</param>

        Diag.Debug.assertIsNotNull(this._project, "Project is not set");

        QueryHierarchy.beginGetQueryHierarchy(this._project).then(
            (queryHierarchy: QueryHierarchy) => {
                queryHierarchy.beginFindByPath(path).then(
                    (queryItem: QueryItem) => {
                        this.beginSetSelectedItem(queryItem, callback, errorCallback);
                    },
                    errorCallback);
            },
            errorCallback);
    }

    public getSelectedItem(): QueryItem {
        /// <summary>Gets the currently selected item.</summary>
        /// <returns>Returns the currently selected item or null if no selection.</returns>

        const selectedNode = this.getBehavior<QueryComboTreeBehavior>().getSelectedItem();

        return (selectedNode && selectedNode.queryItem) || null;
    }

    public setText(text: string, fireEvent?: boolean) {
        /// OVERRIDE

        if (text.trim() === "") {
            // Ensure watermark is shown again
            this._setWatermark();
        }

        return super.setText(text, fireEvent);
    }

    public ensureValidInput(callback: Function, errorCallback?: IErrorCallback) {
        /// <summary>Ensure that current input into the combobox (e.g., a manual path) is valid and
        /// corresponds to valid query item</summary>
        /// <param name="callback" type="Function">Callback to be called after the input is validated.</param>
        /// <param name="errorCallback" type="IErrorCallback">Callback in case an error occurs.</param>

        const wrappedCallback = () => {
            this._validator.validate();

            callback();
        };

        const pathToSelect = this.getText();
        if (this.getSelectedIndex() !== -1 || pathToSelect.trim() === "") {
            // Current input already resolves to a valid node in tree, or cannot be resolved using the API
            wrappedCallback();
        } else {
            this.beginSetSelectedPath(pathToSelect, wrappedCallback, (error: any) => {
                this._validator.validate();

                if (errorCallback) {
                    errorCallback(error);
                }
            });
        }
    }

    public validateInput() {
        /// <summary>Manually validate that the current text corresponds to an item in the tree.</summary>
        /// <remarks>Usually this is called automatically</remarks>

        this._validator.validate();
    }

    public setEnabled(value: boolean) {
        /// <summary>In addition to enabling/disabling the combo, ensure the invalidCss style is applied correctly.</summary>

        super.setEnabled(value);

        if (value) {
            this.validateInput();
        } else {
            this.setInvalid(value);
        }
    }

    private _setWatermark() {
        if (this._queryOptions.watermark) {

            Utils_UI.Watermark(this._input, { watermarkText: this._queryOptions.watermark });
            Utils_UI.Watermark(this._input, "reset");
        }
    }
}
