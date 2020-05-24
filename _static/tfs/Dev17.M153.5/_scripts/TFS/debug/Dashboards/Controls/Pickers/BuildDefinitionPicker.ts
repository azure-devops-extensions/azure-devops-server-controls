import Q = require("q");
import Combos = require("VSS/Controls/Combos");
import Diag = require("VSS/Diag");
import TreeView = require("VSS/Controls/TreeView");
import Utils_UI = require("VSS/Utils/UI");
import Build_Contracts = require("TFS/Build/Contracts");
import TFS_Resources_Presentation = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Build_RestClient = require("TFS/Build/RestClient");
import Artifacts_Services = require("VSS/Artifacts/Services");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Controls = require("VSS/Controls");
import Resources_Dashboards = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import VSS = require("VSS/VSS");
import VSS_Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import * as Favorites_RestClient from "Favorites/RestClient";
import { Favorite } from "Favorites/Contracts";
import { FavoriteStorageScopes, OwnerScopeTypes } from "Favorites/Constants";
import { FavoriteTypes, FavoriteScopes } from "TfsCommon/Scripts/Favorites/Constants";
import { getDashboardTeamContext } from "Dashboards/Scripts/Common";
import { getDefaultWebContext } from "VSS/Context";

var domElem = Utils_UI.domElem;

/*****************Contracts *****************************/

/**
* Options for the build picker. 
*/
export interface BuildDefinitionPickerOptions {
    /**
     * callback for when a selection change is made on the picker. Returns the reference to the definition that is now the current selection.
     * @param newValue is the reference to the definition.
     */
    onIndexChanged: (newValue: Build_Contracts.DefinitionReference) => void;

    /**
    * preset definition for the picker to display as an existing selection. If none is provided, a watermark is shown.
    * Note: Initial value allows for a single control flow design which is simpler. An alternative is the paint-load pattern where the data is loaded
    * via expressive caller behaviour. 
    */
    initialValue?: Build_Contracts.DefinitionReference;
}

/**
* Interface mapping to the definition picker control. This is the container for public contract actions/methods that the caller can initiate on the 
* picker. 
*/
export interface IBuildDefinitionPicker {
}

/**
 * Create the picker within the given container. 
 * @param container is the JQuery element holding the picker. 
 * @param options options to the provide to the picker. 
 */
export function create(container: JQuery, options: BuildDefinitionPickerOptions): IBuildDefinitionPicker {
    return Controls.create(BuildDefinitionPicker, container, options);
}


/*****************Implementation *****************************

Callers of the picker need no understanding of its inner working.
The contracts provide the public surface that will be supported. 
This is here for reference for more curious folks. 

***************************************************************/
/**
* A tree node representing a build definition
*/
class BuildDefinitionNode extends TreeView.TreeNode {

    /**
     * allows for tree node setup. Child classes override this as needed. 
     */
    protected setupTreeNodeProperties(): void {
    }

    /**
    * verifies if a node selected if valid for the popup
    * @returns true for data nodes and false for provider root nodes.
    */
    public isValidSelection(): boolean {
        return !this.folder;
    }

    constructor(text: string, config?: any) {
        super(text, config, null);
        this.setupTreeNodeProperties();
    }
}

/**
* A node on the definition popup that presents a root folder.
*/
class BuildDefinitionProviderRootNode extends BuildDefinitionNode {

    protected setupTreeNodeProperties(): void {
        this.folder = true;
        super.setupTreeNodeProperties();
    }

    constructor(text: string) {
        super(text);
    }
}

/**
* A node on the definition popup that presents a actual definitions data.
*/
class BuildDefinitionDataNode extends BuildDefinitionNode {

    private definitionReference: Build_Contracts.DefinitionReference;

    /**
    * provide a reference to the definition.
    */
    public getDefinition(): Build_Contracts.DefinitionReference {
        return this.definitionReference;
    }

    private setIconClass(): void {
        if (this.definitionReference.type === Build_Contracts.DefinitionType.Build) {
            this.icon = "buildvnext-definition-node icon";
        }
        else {
            this.icon = "xaml-node  icon";
        }
    }

    protected setupTreeNodeProperties(): void {
        this.noTreeIcon = true;
        super.setupTreeNodeProperties();
    }

    constructor(definitionReference: Build_Contracts.DefinitionReference, text: string, providerNode: BuildDefinitionProviderRootNode) {
        super(definitionReference.name);
        this.definitionReference = definitionReference;
        this.parent = providerNode;
        this.setIconClass();
    }
}

/**
* An extension of the combo tree popup control with concerns limited to using with build definitions. 
*/
class BuildDefinitionTreeDropPopup extends TreeView.ComboTreeDropPopup {
    constructor(options?: any) {
        super($.extend({
            showIcons: true
        }, options));
    }

    public initialize(): void {
        super.initialize();
        // all for the popup to be auto ordered on tab order. 
        this.getElement().attr("tabindex", 0);
    }

    /**
    * creates an node item in the tree and returns the corresponding JQuery object. 
    * @param {number} index presenting the location within the tree when in a flattened state. 
    * @returns a jquery object for the item. 
    * @override
    */
    public _createItem(index: number): JQuery {
        // we assert the override as we do not have type safety through an interface on the base class. 
        Diag.Debug.assertIsFunction(super._createItem, "_createItem public method has been removed in TreeView.ComboTreeDropPopup");

        var node: TreeView.TreeNode = this.getDataSource().getItem(index);

        // setup list item corresponding to the folder/definition node. 
        let $li = super._createItem(index);

        // get the underlying content
        let $div = $li.find(".node-content");

        // identify if the node is a folder
        if (node.folder) {
            // this applies the bolding style for all the top level folders. 
            $div.addClass("folder");

            // apply an aria label for the folder.
            $li.attr("aria-label", node.text);
        }

        $li.attr("aria-level", node.level(true));

        return $li;
    }

    /**
  * click handler for when a tree node is clicked on within the popup.
  * @param {any} event object for the click 
  * @param {number} index presenting the location within the tree when in a flattened state. 
  * @param {JQuery} target object
  * @param {JQuery} list item associated with the target object. 
  * @returns a boolean whether the click behaviour should be propogated. 
  * @override
  */
    public _onItemClick(e?: any, itemIndex?: number, $target?: JQuery, $li?: JQuery): boolean {
        // we assert the override as we do not have type safety through an interface on the base class. 
        Diag.Debug.assertIsFunction(super._onItemClick, "_onItemClick public method has been removed in TreeView.ComboTreeDropPopup");
        var node: BuildDefinitionNode = <BuildDefinitionNode>this.getDataSource().getItem(itemIndex);
        if (node.folder) {
            var dataSource: TreeView.TreeDataSource = this.getDataSource<TreeView.TreeDataSource>();
            if (node.expanded) {
                this.collapseNode();
            } else {
                this.expandNode();
            }
            return false;
        }
        return node.isValidSelection();
    }
}

/**
* Extension on default combo tree behaviour to handle custom behaviours for the configuration. 
* We manage our own rendering of the popup where the root folders are no selectable, there is more custom organization
* of the node UI experience,  we want to display the actual selection vs its path in the combo
* Some of capabilities are missing the platform control and hopefully can be coalesced in the future.
*/
class BuildDefinitionComboTreeBehavior extends TreeView.ComboTreeBehavior {
    /**
    * name to be used when refering to the behaviour on a combo tree popup control type. 
    */
    public static Type = "buildDefinitionTree";

    /**
    * Seperator for the underlying node representation. 
    */
    public static Seperator = "\\";

    /**
    * Action to perform when the drop popup is visible. 
    */
    private dropShowAction: () => string;

    constructor(combo, options?) {
        options.dropShow = (popUp: BuildDefinitionTreeDropPopup) => {
            if (this.dropShowAction) {
                this.setSelectedValue(this.dropShowAction());
            }
        };
        super(combo, $.extend({
            dropControlType: BuildDefinitionTreeDropPopup,
            sepChar: BuildDefinitionComboTreeBehavior.Seperator,
            treeLevel: 0,
            autoComplete: false
        }, options));
    }

    /**
    * when selection is changed this is called. 
    * @param {number} index that has been selected. 
    * @param {boolean} treat selection change as acceptance of close  
    * @override
    */
    public _dropSelectionChanged(selectedIndex: number, accept: boolean): void {
        // we assert the override as we do not have type safety through an interface on the base class. 
        Diag.Debug.assertIsFunction(super._dropSelectionChanged, "_dropSelectionChanged public method has been removed in TreeView.ComboTreeBehavior");

        // we short circuit the selection change when not an acceptance of close to avoid rapid changes from up/down keys.
        if (accept)
        {
            var selectedValue = this.getDropPopup().getSelectedValue();
            this.setText(this.getDisplayText(selectedValue), true);
            this.hideDropPopup();
        }
    }

    /**
    * this is called when setting text on the combo. 
    * @param {string} value to set. 
    * @param {boolean} decide if the fire event needs to be set.  
    * @override
    */
    public setText(value: string, fireEvent: boolean): void {
        // we assert the override as we do not have type safety through an interface on the base class. 
        Diag.Debug.assertIsFunction(super.setText, "setText public method has been removed in TreeView.ComboTreeBehavior");

        // only set text when not a folder. 
        if (!this.getSelectedItem() ||
            (this.getSelectedItem() && !this.getSelectedItem().folder) ||
            (!this.isDropVisible())) {

            super.setText.call(this, value, false);
            if (fireEvent) {
                // fire the index changed event on the combo popup. 
                if (this._options.indexChanged) {
                    this._options.indexChanged.call(this, this.getSelectedIndex(value));
                }
            }
        }
    }

    /**
    * this is called to get the current index for what is selected. 
    * @param {string} value to search for if selection is not known. 
    * @param {any} whether the search needs to be performed on all index in the flattened list for the tree. 
    * @override
    */
    public getSelectedIndex(value?: string, all?: any): number {
        // we assert the override as we do not have type safety through an interface on the base class. 
        Diag.Debug.assertIsFunction(super.getSelectedIndex, "getSelectedIndex public method has been removed in TreeView.ComboTreeBehavior");

        if (this.isDropVisible()) {
            return this._dataSource.getItemIndex(value || this.getDropPopup().getSelectedValue(), false, all);
        }
        else {
            return -1;
        }
    }

    /**
    * provides the currently selected item. 
    * @returns BuildDefinitionNode
    */
    public getSelectedItem(): BuildDefinitionNode {
        var selectedIndex = this.getSelectedIndex();
        var selectedItem;

        if (selectedIndex >= 0) {
            selectedItem = this._dataSource.getItem(selectedIndex);
        }

        return (selectedItem) || null;
    }

    /**
    * Action to perform when the popup is visible. 
    * @param{() => void} a function representing the action to be performed. 
    */
    public setDropShowAction(dropShowAction: () => string): void {
        this.dropShowAction = dropShowAction;
    }

    /**
    * Set a value as the current selection. 
    * @param {string} value to search for and select in the drop down.
    */
    public setSelectedValue(value: string): void {
        this.getDropPopup().setSelectedValue(value);
    }

    /**
    * action to perform on an up key event
    * @param {JQueryEventObject} event object
    * @override
    */
    public upKey(e?: JQueryEventObject): any {
        // trap moving selection when drop is not open and we havent pressed the alt key
        if (!this.isDropVisible() && !e.altKey) {
            return false;
        }

        return super.upKey(e);
    }

    /**
    * action to perform on an down key event
    * @param {JQueryEventObject} event object
    * @override
    */
    public downKey(e?: JQueryEventObject): any {
        // trap moving selection when drop is not open and we havent pressed the alt key
        if (!this.isDropVisible() && !e.altKey) {
            return false;
        }

        return super.downKey(e);
    }

    /**
       * action to perform on an key down event
       * @param {JQueryEventObject} event object
       * @override
       */
    public keyDown(e?: JQueryEventObject): any {
        let selectedItem: BuildDefinitionNode;

        var dataSource: TreeView.TreeDataSource = this.getDataSource<TreeView.TreeDataSource>();
        var dropPopup: BuildDefinitionTreeDropPopup = this.getDropPopup<BuildDefinitionTreeDropPopup>();

        if (dropPopup) {
            selectedItem = dropPopup._getSelectedNode();
        }

        switch (e.keyCode) {
            case Utils_UI.KeyCode.HOME:
                //Moves focus to the first node in the tree
                let firstItem: BuildDefinitionNode = dataSource.getItem(0);
                dropPopup.setSelectedValue(firstItem.path(false, BuildDefinitionComboTreeBehavior.Seperator));
                return false;
            case Utils_UI.KeyCode.END:
                //Moves focus to the last node in the tree
                let lastItem: BuildDefinitionNode = dataSource.getItem(this._dataSource.getCount() - 1);
                dropPopup.setSelectedValue(lastItem.path(false, BuildDefinitionComboTreeBehavior.Seperator));
                return false;
            case Utils_UI.KeyCode.ENTER:
                // For parent nodes, open or close the node
                if (selectedItem.folder) {
                    if (selectedItem.expanded) {
                        dropPopup.collapseNode();
                    } else {
                        dropPopup.expandNode();
                    }
                    return false;
                }
                // for leaf nodes, make selection.
                else {
                    this.setText(this.getDisplayText(dropPopup.getSelectedValue()), true);
                    return true;
                }
            case Utils_UI.KeyCode.TAB:
                // move focus out of the combo. 
                this.hideDropPopup();
                this.combo.focus();
                return true;
            case Utils_UI.KeyCode.LEFT:
                //When focus is on an open node, closes the node
                if (selectedItem.folder && selectedItem.expanded) {
                    dropPopup.collapseNode();
                }
                //When focus is on a child node that is also either an end node or a closed node, moves focus to its parent node
                else if (!selectedItem.folder){
                    dropPopup.setSelectedValue(selectedItem.parent.path(false, BuildDefinitionComboTreeBehavior.Seperator));
                }
                return false;
            case Utils_UI.KeyCode.RIGHT:
                if (selectedItem.folder && selectedItem.hasChildren()) {
                    //When focus is on a open node, moves focus to the first child node
                    if (selectedItem.expanded) {
                        dropPopup.setSelectedValue(selectedItem.children[0].path(false, BuildDefinitionComboTreeBehavior.Seperator));
                    }
                    //When focus is on a closed node, opens the node; focus does not move
                    else {
                        dropPopup.expandNode();
                    }
                }
                return false;
            default:
                return super.keyDown(e);
        }
    }

    /**
    * parse the display text from a path resolved node name
    * @param {string} path resolved name
    * @returns actual name
    */
    private getDisplayText(path: string): string {
        var pathSegments: string[] = path.split(BuildDefinitionComboTreeBehavior.Seperator);
        if (pathSegments) {
            if (pathSegments.length === 1) {
                return pathSegments[0];
            }
            else {
                return pathSegments[pathSegments.length - 1];
            }
        }
        else {
            return "";
        }
    }

}

// register the behaviour with the combo registration. This allows for it to be used as a type when setting up a combo control. 
Combos.Combo.registerBehavior(BuildDefinitionComboTreeBehavior.Type, BuildDefinitionComboTreeBehavior);

/**
* constants representing the provider names
*/
class BuildDefinitionProviderNameConstants {
    public static vNext: string = Resources_Dashboards.BuildDefinitions;
    public static Xaml: string = Resources_Dashboards.XamlDefinitions;
    public static teamFav: string = TFS_Resources_Presentation.TeamFavoritesText;
    public static myFav: string = TFS_Resources_Presentation.MyFavoritesText;
}


/**
* Provider for build definitions data that will be used by the configuration to populate the popup experience
* Making this exportable to be usable by UTs.
*/
export interface IBuildDefinitionDataProvider {
    /**
    * A list of build definitions associated with the provider
    * @returns Build_Contracts.DefinitionReference[] wrapped in a promise.  
    */
    getData(): IPromise<Build_Contracts.DefinitionReference[]>;

    /**
    * Name associated with the provider
    * @returns string
    */
    getName(): string;
}


/**
* provider of vnext build definitions. 
*/
class VNextBuildDefinitionProvider implements IBuildDefinitionDataProvider {
    public getData(): IPromise<Build_Contracts.DefinitionReference[]> {
        return VSS_Service.
            getClient(Build_RestClient.BuildHttpClient2_3).
            getDefinitions(getDefaultWebContext().project.id, null, Build_Contracts.DefinitionType.Build).then((references: Build_Contracts.DefinitionReference[]) => {
                var nonDraftReferences: Build_Contracts.DefinitionReference[] =
                    references.filter((definition: Build_Contracts.DefinitionReference, index: number, references: Build_Contracts.DefinitionReference[]) => {

                        // v2_2 only supports the DefinitionReference interface, however the data being passed down the wire is the contract for version 3. We cannot use the 
                        // version 3 rest api as its in preview and doesnt support Xaml builds anymore, that we need to support. So we cast the data to the returned type 
                        // in case of vnext definitions to be able to infer relevant state of the definition for the picker. 
                        var definitionCast: Build_Contracts.BuildDefinitionReference = <Build_Contracts.BuildDefinitionReference>definition;

                        // check if its draft
                        var isDraft: boolean = Utils_String.ignoreCaseComparer(
                            Build_Contracts.DefinitionQuality[Build_Contracts.DefinitionQuality.Draft],
                            definitionCast.quality.toString()) === 0;

                        // return true only if its a non draft definition.
                        return !isDraft;
                    });

                Utils_Array.sortIfNotSorted(nonDraftReferences, (a: Build_Contracts.DefinitionReference, b: Build_Contracts.DefinitionReference) => {
                    return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
                });

                return Q.resolve(nonDraftReferences);
            });
    }

    public getName(): string {
        return BuildDefinitionProviderNameConstants.vNext;
    }
}

/**
* provider of xaml build definitions. 
*/
class XamlBuildDefinitionProvider implements IBuildDefinitionDataProvider {
    public getData(): IPromise<Build_Contracts.DefinitionReference[]> {
        return VSS_Service.
            getClient(Build_RestClient.BuildHttpClient2_3).
            getDefinitions(getDefaultWebContext().project.id, null, Build_Contracts.DefinitionType.Xaml).then(
            (references: Build_Contracts.DefinitionReference[]) => {
                Utils_Array.sortIfNotSorted(references, (a: Build_Contracts.DefinitionReference, b: Build_Contracts.DefinitionReference) => {
                    return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
                });

                return references;
            });
    }

    public getName(): string {
        return BuildDefinitionProviderNameConstants.Xaml;
    }
}

/**
* provider of favorites build definitions. 
*/
class FavoritesBuildDefinitionProvider implements IBuildDefinitionDataProvider {
    // owner type associated with the favorite
    private ownerScopeType: string;

    // name associated with the favorite to be displayed in the picker
    private providerName: string;

    constructor(ownerScopeType: string, providerName: string) {
        this.ownerScopeType = ownerScopeType;
        this.providerName = providerName;
    }

    public getData(): IPromise<Build_Contracts.DefinitionReference[]> {
        var context = getDefaultWebContext();
        var teamContext = getDashboardTeamContext();
        var definitions: Build_Contracts.DefinitionReference[] = [];

        // get favorites based on identity
        var favoritesPromise = this.ownerScopeType === OwnerScopeTypes.Team ?
            Favorites_RestClient.getClient().getFavoritesOfOwner(OwnerScopeTypes.Team, teamContext.id, FavoriteTypes.BUILD_DEFINITION, FavoriteStorageScopes.Project, context.project.id, false) :
            Favorites_RestClient.getClient().getFavorites(FavoriteTypes.BUILD_DEFINITION, FavoriteStorageScopes.Project, context.project.id, true);

        return favoritesPromise.then((favorites: Favorite[]) => {

            // create a list of definitions based on favorites data. 
            favorites.forEach((favorite: Favorite) => {
                // the only reason uri would not be present is when a draft definition is being favorited (this is no longer supported but appears to have been in earlier TFS versions)
                if (!!favorite.artifactId) {
                    var reference: Build_Contracts.DefinitionReference = <Build_Contracts.DefinitionReference>{};

                    // performing an explicit cast to number as definition ids are always integers, however they are being sent back as strings from the artifact parser. 
                    reference.id = +new Artifacts_Services.Artifact(Artifacts_Services.LinkingUtilities.decodeUri(favorite.artifactId)).getId();

                    reference.uri = favorite.artifactId;
                    reference.name = favorite.artifactName;

                    // at this point we are unaware of which type it is as favorites api doesnt differentiate types
                    reference.type = Build_Contracts.DefinitionType.Build;
                    reference.project = <TFS_Core_Contracts.TeamProjectReference>{
                        id: context.project.id
                    };

                    definitions.push(reference);
                }
            });

            // pull xaml list to match against charts that are of the older form. This is allows us to associate the right types
            // with the favorites. This is a slight perf hit on the configuration however it provides a cleaner visual experience.  
            if (definitions.length > 0) {
                return new XamlBuildDefinitionProvider().getData().then((xamlDefinitions: Build_Contracts.DefinitionReference[]) => {
                    $.each(definitions, (index: number, value: Build_Contracts.DefinitionReference) => {

                        var searchIfXaml: Build_Contracts.DefinitionReference[] =
                            xamlDefinitions.filter((xamlValue: Build_Contracts.DefinitionReference, index: number) => {
                                if (value.id === xamlValue.id) {
                                    return true;
                                }
                                else {
                                    return false;
                                }
                            });

                        if (searchIfXaml && searchIfXaml.length > 0) {
                            value.type = Build_Contracts.DefinitionType.Xaml;
                        }
                    });

                    Utils_Array.sortIfNotSorted(definitions, (a: Build_Contracts.DefinitionReference, b: Build_Contracts.DefinitionReference) => {
                        return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
                    });

                    return definitions;

                });
            }

            else {
                return definitions;
            }
        });
    }

    public getName(): string {
        return this.providerName;
    }
}


export interface BuildDefinitionPickerOptionsInternal extends BuildDefinitionPickerOptions{
    dataProviders: IBuildDefinitionDataProvider[];
}

export class BuildDefinitionPicker extends Controls.Control<BuildDefinitionPickerOptionsInternal> implements IBuildDefinitionPicker{

    private buildDefinitionCombo: Combos.ComboO<Combos.IComboOptions> = null;
    private providers: IBuildDefinitionDataProvider[] = [];
    private providerRootNodes: BuildDefinitionProviderRootNode[] = [];
    private currentDefinition: Build_Contracts.DefinitionReference = null;

    private defaultDataProviders: IBuildDefinitionDataProvider[] = [
        new FavoritesBuildDefinitionProvider(
            OwnerScopeTypes.Team,
            BuildDefinitionProviderNameConstants.teamFav), 
        new FavoritesBuildDefinitionProvider(
            OwnerScopeTypes.User,
            BuildDefinitionProviderNameConstants.myFav), 
        new VNextBuildDefinitionProvider(),
        new XamlBuildDefinitionProvider()
    ];

    constructor(options: BuildDefinitionPickerOptionsInternal) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this.currentDefinition = this._options.initialValue;
        this.providers = this._options.dataProviders || this.defaultDataProviders;

        this.load();
    }


    /**
    * load builds from providers and attach to the existing provider roots.
    * @returns a promise for when all the providers have been loaded. 
    */
    public fillTreeNodesFromProviders(): IPromise<void>[] {

        var providerPromises: IPromise<void>[] = [];

        $.each(this.providers, (index: number, provider: IBuildDefinitionDataProvider) => {
            var promise = provider.getData().then((definitions: Build_Contracts.DefinitionReference[]) => {

                // find top node
                var nodesFound: BuildDefinitionProviderRootNode[] = this.providerRootNodes.filter(
                    (rootNode: BuildDefinitionProviderRootNode,
                        index: number,
                        array: BuildDefinitionProviderRootNode[]) => {
                        if (rootNode.text === provider.getName()) {
                            return true;
                        }
                        else {
                            return false;
                        }
                    });

                if (nodesFound && nodesFound.length > 0) {
                    var topNode: BuildDefinitionProviderRootNode = nodesFound[0];

                    if (definitions.length > 0) {
                        // attach child nodes to it.
                        var children: BuildDefinitionDataNode[] = [];
                        $.each(definitions, (index: number, definition: Build_Contracts.DefinitionReference) => {

                            children.push(new BuildDefinitionDataNode(definition, null, topNode));
                        });
                        topNode.addRange(children);
                    }
                    else {
                        Utils_Array.remove(this.providerRootNodes, topNode);
                    }
                }      
            });

            providerPromises.push(promise);

        });

        return providerPromises;
    }

    /**
    * create placeholder top folders to hold the build definitions. 
    */
    public createProviderRootNodes(): void {
        $.each(this.providers, (index: number, provider: IBuildDefinitionDataProvider) => {
            var topNode = new BuildDefinitionProviderRootNode(provider.getName());
            this.providerRootNodes.push(topNode);
        });

        // set these placeholders into the combo. 
        this.buildDefinitionCombo.setSource(this.providerRootNodes);
    }

    /**
    * Selects the node corresponding to the active definition on the popup when its open. 
    */
    private autoSelectActiveNode(): string {
        // if new build widget added from catalog, it will have the provider name
        if (this.currentDefinition) {
            return this.searchForDefinition(this.currentDefinition.id);
        }

        return null;
    }

    /**
    * Look for the provider in the downloaded data from the providers.
    * @param {number} the id associated with the definition to be searched
    * @returns string representing the node in its path form i.e. provider name\definition name
    */
    private searchForDefinition(definitionId: number): string {
        var searchResult: string;
        this.providerRootNodes.forEach((node: BuildDefinitionProviderRootNode, index: number, array: BuildDefinitionProviderRootNode[]) => {
            node.children.forEach((definitionSearch: TreeView.TreeNode, index: number, array: TreeView.TreeNode[]) => {
                var definitionNode: BuildDefinitionDataNode = <BuildDefinitionDataNode>definitionSearch;
                if (definitionNode.getDefinition().id === definitionId && !searchResult) {
                    searchResult = node.text +
                        BuildDefinitionComboTreeBehavior.Seperator +
                        definitionNode.getDefinition().name;
                }
            });
        });

        return searchResult;
    }

    /**
    *  load the data from the providers and populate the popup control. Performs the heavy handling to manage the control and data interfaces
    * @returns promise that the load will be completed. 
    */
    public load(): IPromise<void> {

        // create the combo control. This doesnt have the definition data populated yet. 
        this.buildDefinitionCombo = this.createBuildDefinitionCombo();

        // show placeholder loading text till data is available for the build dropdown.
        Utils_UI.Watermark(this.buildDefinitionCombo.getInput(), { watermarkText: Resources_Dashboards.LoadingMessage });

        this.getElement().append(this.buildDefinitionCombo.getElement());

        // create placeholder top folders to hold the build definitions. 
        this.createProviderRootNodes();

        // load builds from providers and attach to the existing provider roots. 
        return Q.allSettled(this.fillTreeNodesFromProviders()).then(() => {

            this.buildDefinitionCombo.
                getBehavior<BuildDefinitionComboTreeBehavior>().
                setDropShowAction(() => { return this.autoSelectActiveNode(); });

            this.buildDefinitionCombo.setEnabled(true);
            this.showDefaultText();

            return Q.resolve<void>(null);
        });
    }

    public getCombo(): Combos.ComboO<Combos.IComboOptions> {
        return this.buildDefinitionCombo;
    }

    /**
    * shows default text on experience load (either watermark or current definition name)
    */
    private showDefaultText(): void {
        Utils_UI.Watermark(this.buildDefinitionCombo.getInput(), { watermarkText: Resources_Dashboards.BuildPicker_EmptyWatermark });

        if (this._options.initialValue) {
            this.buildDefinitionCombo.setText(this.currentDefinition.name, false);
            this.buildDefinitionCombo.getInput().removeAttr("placeholder");
        }

        Diag.logTracePoint("BuildDefinitionPicker.Loading.Complete");
    }

    /**
   * Creates a combo control for the build definition
   * @returns a combo.
   */
    private createBuildDefinitionCombo(): Combos.ComboO<Combos.IComboOptions> {
        var comboOptions: Combos.IComboOptions = {
            // popup control that we extend from basic popup
            type: BuildDefinitionComboTreeBehavior.Type, 

            // drop button visible.
            mode: "drop",

            enabled: false,
            dropWidth: "dynamic",

            // prevents editing insie the combo.
            allowEdit: false,
             
            // callback to handle a selection change.  
            indexChanged: (index: number) => this.indexChangedCallback()
        };

        return <Combos.ComboO<Combos.IComboOptions>>Controls.Control.createIn<Combos.IComboOptions>(
            Combos.Combo,
            null,
            comboOptions);
    }


    /**
    * Operations to perform on callback when the selection of definitions changes. 
    */
    private indexChangedCallback(): void {

        // get the selected item.
        var treeNode: BuildDefinitionDataNode =
            <BuildDefinitionDataNode>this.buildDefinitionCombo.
                getBehavior<BuildDefinitionComboTreeBehavior>().getSelectedItem();

        // update current configuration based on selected item.
        this.currentDefinition = treeNode.getDefinition();
        this._options.onIndexChanged(this.currentDefinition);
    }
}