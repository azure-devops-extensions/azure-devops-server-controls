import q = require("q");
import ko = require("knockout");
import KoTree = require("DistributedTasksCommon/TFS.Knockout.Tree");
import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");
import Contracts = require("TFS/TestManagement/Contracts");
import Navigation_Services = require("VSS/Navigation/Services");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import Utils_String = require("VSS/Utils/String");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
let delegate = Utils_Core.delegate;

/// <summary>
/// Enum for definitions
/// </summary>
export enum DefinitionsType {
    configDefinition = 0,
    variableDefinition
}

/// <summary>
/// Stores the latest selected node always also update the navigation url accordingly
/// </summary>
export class DefinitionContext {
    /**
     * The currently selected definition
     */
    public selectedDefinition: KnockoutObservable<ConfigurationDefinitionModel> = ko.observable(null);

    constructor() {
        this.selectedDefinition(null);
        this.selectedDefinition.subscribe((newValue: ConfigurationDefinitionModel) => {
            let data = null;
            if (newValue === undefined || newValue === null) {
                data = {
                    configurationId: null,
                    variableId: null
                };
                Navigation_Services.getHistoryService().replaceHistoryPoint(null, data);
                return;
            }
            if (newValue.id() === 0 || newValue.id() < -1) {
                data = {
                    configurationId: null,
                    variableId: null
                };
                Navigation_Services.getHistoryService().replaceHistoryPoint(null, data);
                return;
            }
           
            if (newValue.definitionType === DefinitionsType.configDefinition) {
                data = {
                    configurationId: newValue.id(),
                    variableId : null
                };
            }
            else {
                data = {
                    variableId: newValue.id(),
                    configurationId: null
                };
            }
            // Add history point 
            if (data !== null) {
                Navigation_Services.getHistoryService().addHistoryPoint(null, data);
            }
        });
    }
}

export let definitionContext: DefinitionContext = new DefinitionContext();

/**
 * Base class for configuration definition view models
 */
export class ConfigurationDefinitionModel {
    /**
    * The definitionType
    */
    public definitionType: DefinitionsType;
    /**
     * The name
     */
    public name: KnockoutObservable<string> = ko.observable("");
    /**
   * The id
   */
    public id: KnockoutObservable<number> = ko.observable<number>();
    
    /**
     * Creates a new model from a data contract
     * @param value The data contract
     */
    constructor(id: number, name: string, definitionType: DefinitionsType) {
        if (id > 0 || id === -1) {
            this.id(id);
        }
        if (name) {
            name = name.trim();
        }
        this.name(name);
        this.definitionType = definitionType;
    }
}

/**
 * A basic node in the definition tree
 */
export class DefinitionExplorerTreeNode extends KoTree.BaseTreeNode implements KoTree.ITreeNode, TaskModels.IDirty {
    /**
     * The definition represented by this node
     */
    public value: KnockoutObservable<ConfigurationDefinitionModel> = ko.observable(null);

    /**
    * Determines css for the node
     */
    public nodeContentCssClass: KnockoutObservable<string> = ko.observable("");

    /**
     * The text to display
     * see KoTree.ITreeNode
     */
    public text: KnockoutComputed<string>; 

    /**
     * Indicates whether the model is dirty
     * see KoTree.ITreeNode
     */
    public dirty: KnockoutComputed<boolean>;

    /**
   * Whether to show an icon for the node
   * see KoTree.ITreeNode
   */
    public showIcon: KnockoutObservable<boolean> = ko.observable(false);

    /**
   * The CSS class for the icon
   * see KoTree.ITreeNode
   */
    public nodeIconCssClass: KnockoutObservable<string> = ko.observable("");

    /**
     * The CSS class for the node
    * see KoTree.ITreeNode
     */
    public cssClass: KnockoutObservable<string> = ko.observable("");

    private _options: any;

    constructor(options: any, nodes?: any) {
        super(nodes);
        this._options = options || {};
        this._options.definitionSelectedAction = this._options.definitionSelectedAction || (() => { return false; });
        this._options.definitionDeleteAction = this._options.definitionDeleteAction || (() => { return false; });
        this.cssClass("node-link");
        this.dirty = ko.computed({
            read: () => {
                return false;
            }
        });
    }

    /**
    * Called when the node is clicked
    * @param target The node
    * @param args Event args
    */
    public _onClick(target: DefinitionExplorerTreeNode, args: JQueryEventObject) {
        this.root()._onClick(target, args, this);

        if (args.target.className === ("node-remove")){
            if ($.isFunction(this._options.definitionDeleteAction)) {
                this._options.definitionDeleteAction(target, args);
            }
        }

        else if ($.isFunction(this._options.definitionSelectedAction)) {
            this._options.definitionSelectedAction(target);
        }
    }

}

/**
 * A tree node that represents a configuration definition
 */
export class DefinitionExplorerDefinitionTreeNode extends DefinitionExplorerTreeNode {

    constructor(definition: ConfigurationDefinitionModel,
        options?: any,
        nodes?: any) {
        super(options, nodes);
        this.value(definition);
        this.nodeIconCssClass("configuration-definition-node");

        this.text = ko.computed({
            read: () => {
                if (!!this.value()) {
                    return this.value().name();
                }
                else {
                    return "";
                }
            }
        });
    }
}

/**
 * A tree node that represents "new definition node"
 */
export class DefinitionExplorerNewDefinitionNode extends DefinitionExplorerTreeNode {
    constructor(text: string, options?: any) {
        //no actions on the new node
        super(options, null);
        this.text = ko.computed({
            read: () => {
                return text;
            }
        });

        this.showIcon = ko.observable(false);
    }
}

/**
 * A tree section node that represents a group of definitions
 */
export class DefinitionExplorerTreeSection extends KoTree.BaseTreeSection<DefinitionExplorerTreeNode> {
    constructor(text: string, css: string = "node-section") {
        super(text, css);
    }
}

/**
 * Left hub of configuration tab
 */
export class ConfigurationDefinitionExplorerTab extends KnockoutPivot.BasicPivotTab {

    /**
    * The definition tree
    */
    public definitionTree: KoTree.TreeViewModel = new KoTree.TreeViewModel();
    private _definitionSections: { sectionName: string; sectionNode: DefinitionExplorerTreeSection } = <any>{};
    private _initPromise: IPromise<any>;
    private _options: any;
    private _definitionSelectionActionDelegate: any;
    private _definitionDeleteActionDelegate: any;
    private _currentDefinitionNode: DefinitionExplorerTreeNode;
    private _configDefinitonId_treeNodeMap: { [id: number]: DefinitionExplorerTreeNode } = {};
    private _variableDefinitonId_treeNodeMap: { [id: number]: DefinitionExplorerTreeNode } = {};

    constructor(options?: any) {
        super("definitions", "Definitions", "configurations_list_explorer_tree");
        this._definitionSelectionActionDelegate = delegate(this, this._definitionSelectionAction);
        this._definitionDeleteActionDelegate = delegate(this, this._definitionDeleteAction);
        this._options = options || {};
        this._options.definitionSelectedAction = this._options.definitionSelectedAction || (() => { return false; });
        this._options.definitionContexMenuAction = this._options.definitionDeleteAction || (() => { return false; });
        
        // init sections
        let testConfigurationsSection = new DefinitionExplorerTreeSection(Resources.AllTestConfigurations);
        let testVariableSection = new DefinitionExplorerTreeSection(Resources.AllTestVariables);

        this._definitionSections[Resources.AllTestConfigurations] = testConfigurationsSection;
        this._definitionSections[Resources.AllTestVariables] = testVariableSection;
        
        // definition explorer tree
        this.definitionTree.nodes.push(testConfigurationsSection.root);
        this.definitionTree.nodes.push(testVariableSection.root);
        this.definitionTree.onKeyDown.subscribe(delegate(this, this._onDefinitionNodeKeyDown));

        // set default expanded states
        testConfigurationsSection.setExpanded(true);
        testVariableSection.setExpanded(true);
    }

    /**
   * refresh all definition trees 
   */
    public refresh(allConfigurations: Contracts.TestConfiguration[], allVariables: Contracts.TestVariable[], configuarationId: number = -1,
        variableId: number = -1): void {
        configuarationId = (isNaN(configuarationId) || configuarationId < 1) ? -1 : configuarationId;
        variableId = (isNaN(variableId) || variableId < 1) ? -1 : variableId;
        this._currentDefinitionNode = null;
        //refresh config and variables
        this.refreshConfigurationDefinitions(allConfigurations, configuarationId);
        this.refreshVariableDefinitions(allVariables, variableId);

        let definitionNodes = null;
        if (this._currentDefinitionNode === null) {
            //if configurations are not null select the first config
            if (allConfigurations !== undefined && allConfigurations.length > 0) {
                definitionNodes = this._getDefintionNodes(Resources.AllTestConfigurations);
            }
            else if (allVariables !== undefined && allVariables.length > 0) {
                definitionNodes = this._getDefintionNodes(Resources.AllTestVariables);
            }
        }
        if (definitionNodes !== null && definitionNodes !== undefined) {
            let firstNode = (definitionNodes !== undefined) ? definitionNodes()[0] : null;
            if (firstNode !== null && firstNode !== undefined) {
                this._setNode(firstNode);
            }
        }
        if (this._currentDefinitionNode === null) {
            definitionContext.selectedDefinition(null);
        }
    }

    //it wont validate anything .. just set the values
    private _setNode(node: DefinitionExplorerTreeNode): void {
        if (node !== null && node !== undefined) {
            this._currentDefinitionNode = node;
            this.definitionTree.selectedNode(node);
            definitionContext.selectedDefinition(node.value());
        }
    }

    /**
    * refresh the config definition tree only
    */
    public refreshConfigurationDefinitions(allConfigurations: Contracts.TestConfiguration[], configuarationId: number): void {

        if (allConfigurations === undefined || allConfigurations.length === 0) {
            this.clearConfigs(DefinitionsType.configDefinition);
            this._configDefinitonId_treeNodeMap = {};
            return;
        }
        //already configurations were in sorted order 

        let testConfigurations: DefinitionExplorerTreeNode[] = [];
        let selectedConfiguration: DefinitionExplorerDefinitionTreeNode;

        $.each(allConfigurations, (index: number, testConfiguration: Contracts.TestConfiguration) => {
            let definitionNode: DefinitionExplorerTreeNode;
            definitionNode = new DefinitionExplorerDefinitionTreeNode(
                new ConfigurationDefinitionModel(testConfiguration.id, testConfiguration.name, DefinitionsType.configDefinition),
                {
                    definitionSelectedAction: this._definitionSelectionActionDelegate,
                    definitionDeleteAction: this._definitionDeleteActionDelegate
                }, null);

            //store the node that needs to be selected
            if (configuarationId === testConfiguration.id) {
                selectedConfiguration = definitionNode;
            }

            //store a map of id to node
            this._configDefinitonId_treeNodeMap[testConfiguration.id] = definitionNode;
            testConfigurations.push(definitionNode);
        });

        this._definitionSections[Resources.AllTestConfigurations].setNodes(testConfigurations);

        //set the context with selected node
        if (configuarationId > 0 && !isNaN(configuarationId) && selectedConfiguration !== null && selectedConfiguration !== undefined) {
            this._setNode(selectedConfiguration);
        }
    }

    /**
    * refresh the variable definition tree only
    */
    public refreshVariableDefinitions(allVariables: Contracts.TestVariable[], variableId: number = -1): void {
        if (allVariables === undefined || allVariables.length === 0) {
            this.clearConfigs(DefinitionsType.variableDefinition);
            this._variableDefinitonId_treeNodeMap = {};
            return;
        }

        //already configurations were in sorted order 
        let testVariables: DefinitionExplorerTreeNode[] = [];
        let selectedVariable: DefinitionExplorerDefinitionTreeNode;

        $.each(allVariables, (index: number, testVariable: Contracts.TestConfiguration) => {
            let definitionNode: DefinitionExplorerTreeNode;
            definitionNode = new DefinitionExplorerDefinitionTreeNode(
                new ConfigurationDefinitionModel(testVariable.id, testVariable.name, DefinitionsType.variableDefinition),
                {
                    definitionSelectedAction: this._definitionSelectionActionDelegate,
                    definitionDeleteAction: this._definitionDeleteActionDelegate
                }, null);

            //store the node that needs to be selected
            if (variableId === testVariable.id) {
                selectedVariable = definitionNode;
            }
            //store a map of id to node
            this._variableDefinitonId_treeNodeMap[testVariable.id] = definitionNode;
            testVariables.push(definitionNode);
        });

        this._definitionSections[Resources.AllTestVariables].setNodes(testVariables);

        //set the context with selected node
        if (variableId > 0 && !isNaN(variableId) && selectedVariable !== null && selectedVariable !== undefined) {
            this._setNode(selectedVariable);
        }

    }

    public clearConfigs(definitionType: DefinitionsType) {
        let testConfigurations: DefinitionExplorerTreeNode[] = [];
        if (definitionType === DefinitionsType.configDefinition) {
            this._definitionSections[Resources.AllTestConfigurations].setNodes(testConfigurations);
        }
        else if (definitionType === DefinitionsType.variableDefinition) {
            this._definitionSections[Resources.AllTestVariables].setNodes(testConfigurations);
        }
    }

    /**
    * update selected node with this value
    */
    public updateSelectedNode(name: string, id: number = 0) {
        let definitionNode: DefinitionExplorerTreeNode;
        if (this.definitionTree.selectedNode() instanceof DefinitionExplorerNewDefinitionNode) {

            this.removeNewDefinitionNode(true);

            if (this._currentDefinitionNode.value().definitionType === DefinitionsType.configDefinition) {
                this._updateNewDefinitionNode(name, id, DefinitionsType.configDefinition, Resources.AllTestConfigurations);
            }
            else if (this._currentDefinitionNode.value().definitionType === DefinitionsType.variableDefinition) {
                this._updateNewDefinitionNode(name, id, DefinitionsType.variableDefinition, Resources.AllTestVariables);
            }
        }
        else {
            if (definitionContext.selectedDefinition()) {
                definitionContext.selectedDefinition().name(name);
            }
        }
        (definitionContext.selectedDefinition().definitionType === DefinitionsType.configDefinition)
            ? this._sortNodesOfConfigTree() : this._sortNodesOfVariableTree();
    }

    private _updateNewDefinitionNode(name: string, id: number, definitionType: DefinitionsType, definitionSection : string) {
        let definitionNode: DefinitionExplorerTreeNode;
        definitionNode = new DefinitionExplorerDefinitionTreeNode(new ConfigurationDefinitionModel(id, name, definitionType),
            {
                definitionSelectedAction: this._definitionSelectionActionDelegate,
                definitionDeleteAction: this._definitionDeleteActionDelegate
            }, null);
        if (DefinitionsType.configDefinition === definitionType) {
            this._configDefinitonId_treeNodeMap[id] = definitionNode;
        }
        else if (DefinitionsType.variableDefinition === definitionType) {
            this._variableDefinitonId_treeNodeMap[id] = definitionNode;
        }

        this._definitionSections[definitionSection].add(definitionNode, true);
        this._setNode(definitionNode);
        this._sortNodesOfVariableTree();

    }

    private _sortNodesOfVariableTree() {
        let definitionNodes = this._definitionSections[Resources.AllTestVariables].root.nodes;
        definitionNodes.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.text(), b.text()));
    }

    private _sortNodesOfConfigTree() {
        let definitionNodes = this._definitionSections[Resources.AllTestConfigurations].root.nodes;
        definitionNodes.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.text(), b.text()));
    }

    private _definitionSelectionAction(definition: DefinitionExplorerDefinitionTreeNode) {
        if ($.isFunction(this._options.definitionSelectedAction)) {
            this._options.definitionSelectedAction(definition);
        }
    }

    private _definitionDeleteAction(definition: DefinitionExplorerDefinitionTreeNode, args: JQueryEventObject) {
        if ($.isFunction(this._options.definitionDeleteAction)) {
            this._options.definitionDeleteAction(definition);
        }
    }

    private _onDefinitionNodeKeyDown(args: KoTree.TreeNodeEventArgs) {
        const NODE_VISIBLE_AND_FOCUSABLE_SELECTOR = "li.node:visible:not(.nofocus)";
        const NODE_CONTENT_SELECTOR = "div.node-content";
        const TREE_ICON_SELECTOR = "div.tree-icon";
        const TREE_CHILDREN_SELECTOR = "ul.tree-children";

        let event = args.eventObject, target = args.node;
        let $currentElement: JQuery = $(args.eventObject.target);
        let $closestNode = $currentElement.closest(NODE_VISIBLE_AND_FOCUSABLE_SELECTOR);

        switch (event.keyCode) {
            case Utils_UI.KeyCode.RIGHT:
                event.preventDefault();
                if (target && !target.expanded()) {
                    $currentElement.children(TREE_ICON_SELECTOR).first().click();
                }
                break;

            case Utils_UI.KeyCode.LEFT:
                event.preventDefault();
                if (target && target.expanded()) {
                    $currentElement.children(TREE_ICON_SELECTOR).first().click();
                }
                break;

            case Utils_UI.KeyCode.DOWN:
                event.preventDefault();
                if (target && target.expanded()) {
                    let firstChild = $closestNode.children(TREE_CHILDREN_SELECTOR).find(NODE_VISIBLE_AND_FOCUSABLE_SELECTOR).first();
                    if (firstChild.length === 1) {
                        firstChild.children(NODE_CONTENT_SELECTOR).first().focus(); // If node is expanded and has focusable children, move onto first child. 
                        break;
                    }
                }

                let nextSibling = $closestNode.nextAll(NODE_VISIBLE_AND_FOCUSABLE_SELECTOR).first();
                if (nextSibling.length === 1) {
                    nextSibling.children(NODE_CONTENT_SELECTOR).first().focus(); // If node has next sibling, move onto next sibling 
                    break;
                }

                let $parent = $closestNode.parent(TREE_CHILDREN_SELECTOR).parent(NODE_VISIBLE_AND_FOCUSABLE_SELECTOR).first();
                while ($parent.length === 1) { // Traverse the parents till you find a successor
                    let nextParentSibling = $parent.nextAll(NODE_VISIBLE_AND_FOCUSABLE_SELECTOR).first();
                    if (nextParentSibling.length === 1) {
                        nextParentSibling.children(NODE_CONTENT_SELECTOR).first().focus(); // If parent have next sibling, move onto parent's next sibling
                        break;
                    }
                    $parent = $parent.parent(TREE_CHILDREN_SELECTOR).parent(NODE_VISIBLE_AND_FOCUSABLE_SELECTOR).first();
                }
                break; // This is end of the tree - do nothing 

            case Utils_UI.KeyCode.UP:
                event.preventDefault();
                let prevSibling = $closestNode.prevAll(NODE_VISIBLE_AND_FOCUSABLE_SELECTOR).first();
                if (prevSibling.length === 1) {
                    let lastChild = prevSibling.children(TREE_CHILDREN_SELECTOR).find(NODE_VISIBLE_AND_FOCUSABLE_SELECTOR).last();
                    if (lastChild.length === 1) {
                        lastChild.children(NODE_CONTENT_SELECTOR).first().focus(); // if prev sibling is expanded and have focusable children, move onto last child of that 
                        break;
                    }
                    prevSibling.children(NODE_CONTENT_SELECTOR).first().focus(); // else move onto prev sibling
                    break;
                }

                let parent = $closestNode.parent(TREE_CHILDREN_SELECTOR).parent(NODE_VISIBLE_AND_FOCUSABLE_SELECTOR).first();
                if (parent.length === 1) {
                    parent.children(NODE_CONTENT_SELECTOR).first().focus(); // If no sibling but has parent , move onto parent
                }
                break;  // This is beginning of the tree - do nothing 
        }
    }

    private _getDefintionNodes(definitionTypeString: string) {
        let definitionNodes = null;

        definitionNodes = (this._definitionSections[definitionTypeString] !== undefined
            && this._definitionSections[definitionTypeString].root !== undefined) ?
            this._definitionSections[definitionTypeString].root.nodes : null;

        return definitionNodes;
    }

    public removeNewDefinitionNode(isAllNew: boolean = false): void {
        if (definitionContext.selectedDefinition() !== null) {
            let definitionNodes = null;
            if ((definitionContext.selectedDefinition().definitionType === DefinitionsType.configDefinition) || isAllNew) {
                definitionNodes = this._getDefintionNodes(Resources.AllTestConfigurations);

                let firstNode = (definitionNodes !== undefined && definitionNodes !== null) ? definitionNodes()[0] : null;
                if (firstNode !== null && firstNode !== undefined && firstNode instanceof DefinitionExplorerNewDefinitionNode) {
                    // If already exists, remove it
                    definitionNodes.splice(0, 1);
                }
            }

            if ((definitionContext.selectedDefinition().definitionType === DefinitionsType.variableDefinition) || isAllNew) {
                definitionNodes = this._getDefintionNodes(Resources.AllTestVariables);

                let firstNode = (definitionNodes !== undefined && definitionNodes !== null) ? definitionNodes()[0] : null;
                if (firstNode !== null && firstNode !== undefined && firstNode instanceof DefinitionExplorerNewDefinitionNode) {
                    // If already exists, remove it
                    definitionNodes.splice(0, 1);
                }
            }
        }
    }

    public addNewDefinitionNode(model: ConfigurationDefinitionModel): void {
        // Remove new definition node if exists
        this.removeNewDefinitionNode(true);
        // Add new one
        let name = model.name();
        let newDefinitionNode = new DefinitionExplorerNewDefinitionNode("* " + name,
            {
                definitionSelectedAction: this._definitionSelectionActionDelegate,
                definitionDeleteAction: this._definitionDeleteActionDelegate
            });

        //Where to add
        newDefinitionNode.value(model);
        (model.definitionType === DefinitionsType.configDefinition) ? this._definitionSections[Resources.AllTestConfigurations].add(newDefinitionNode, true) :
            this._definitionSections[Resources.AllTestVariables].add(newDefinitionNode, true);
        this._setNode(newDefinitionNode);
    }

    public selectNodeById(configurationId: number, variableId: number) {
        let definition: DefinitionExplorerTreeNode = null;
        if (configurationId > 0) {
            definition = this._configDefinitonId_treeNodeMap[configurationId];
        }
        else if (variableId > 0) {
            definition = this._variableDefinitonId_treeNodeMap[variableId];
        }

        if (definition !== null && definition !== undefined) {
            this._setNode(definition);
        }
        else if (configurationId === 0 && variableId === 0) {
            this._currentDefinitionNode = null;
            definitionContext.selectedDefinition(null);
        }

    }

    public selectNode(definition: DefinitionExplorerDefinitionTreeNode, selectLastConfig: boolean = false): void {
        if (selectLastConfig) {
            this.definitionTree.selectedNode(this._currentDefinitionNode);
            return;
        }
        //remove if any new config created
        this.removeNewDefinitionNode(true);
        this._setNode(definition);
    }

    public UpdateNavigation() {
        if (this._currentDefinitionNode !== null || this._currentDefinitionNode !== undefined) {
            let data = null;
            if (this._currentDefinitionNode.value().definitionType === DefinitionsType.configDefinition) {
                data = {
                    configurationId: this._currentDefinitionNode.value().id(),
                    variableId: null
                };
            }
            else {
                data = {
                    variableId: this._currentDefinitionNode.value().id(),
                    configurationId: null
                };
            }
            // Add history point 
            if (data !== null) {
                Navigation_Services.getHistoryService().addHistoryPoint(null, data, null, true);
            }
        }
    }

    public filterSections(searchText: string, definitionType: DefinitionsType = DefinitionsType.configDefinition) {
        // Expand all sections by default
        $.each(this._definitionSections, (sectionName: string, sectionNode: DefinitionExplorerTreeSection) => {
            sectionNode.filterNodes(searchText);
        });
    }

    public resetFilteredSections() {
        $.each(this._definitionSections, (sectionName: string, sectionNode: DefinitionExplorerTreeSection) => {
            sectionNode.resetNodes();
        });
    }

}

// TFS plugin model requires this call for each tfs module. 
VSS.tfsModuleLoaded("TFS.TestManagement.Configurations.DefinitionTree", exports);
