/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import BaseDefinitionModel = require("Build/Scripts/BaseDefinitionModel");
import BuildDefinitionModel = require("Build/Scripts/BuildDefinitionModel");
import BuildNavUtility = require("Build/Scripts/Utilities/NavigationUtility");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Context = require("Build/Scripts/Context");
import Favorites = require("Build/Scripts/Favorites");
import Telemetry = require("Build/Scripts/Telemetry");
import ViewsCommon = require("Build/Scripts/Views.Common");
import XamlDefinitionModel = require("Build/Scripts/XamlDefinitionModel");
import { CIOptinConstants } from "Build/Scripts/Constants";
import * as Utils from "Build/Scripts/Utilities/Utils";

import * as BuildCommonResources from "Build.Common/Scripts/Resources/TFS.Resources.Build.Common";
import { BuildCustomerIntelligenceInfo } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { BuildStatus } from "Build.Common/Scripts/BuildStatus";
import { GetBuildsResult, IBuildFilter } from "Build.Common/Scripts/ClientContracts";
import { BuildLinks, DesignerActions, ExplorerActions } from "Build.Common/Scripts/Linking";
import * as Histogram from "Build.Common/Scripts/Controls/Histogram";
import { getBuildDurationQueueText } from "Build.Common/Scripts/Duration";

import TFS_Dashboards_BuildArtifact = require("Dashboards/Scripts/Pinning.BuildArtifact");
import TFS_Dashboards_PushToDashboard = require("Dashboards/Scripts/Pinning.PushToDashboard");
import TFS_Dashboards_WidgetDataForPinning = require("Dashboards/Scripts/Pinning.WidgetDataForPinning");
import TFS_Dashboards_PushToDashboardInternal = require("Dashboards/Scripts/Pinning.PushToDashboardInternal");
import TFS_Dashboards_PushToDashboardConstants = require("Dashboards/Scripts/Pinning.PushToDashboardConstants");

import KoTree = require("DistributedTasksCommon/TFS.Knockout.Tree");
import { KnockoutTreeNode } from "DistributedTasksCommon/TFS.Knockout.Tree.TreeView";
import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Resources_Presentation = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import BuildContracts = require("TFS/Build/Contracts");

import Controls = require("VSS/Controls");
import Events = require("VSS/Events/Services");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import Menus = require("VSS/Controls/Menus");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

// needed for pinning to dashboards

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

/**
 * A basic node in the definition tree
 */
export class DefinitionExplorerTreeNode extends KoTree.BaseTreeNode implements KoTree.ITreeNode, TaskModels.IDirty {
    /**
     * The definition represented by this node
     */
    public value: KnockoutObservable<BaseDefinitionModel.BaseDefinitionModel> = ko.observable(null);

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
    public showIcon: KnockoutObservable<boolean> = ko.observable(true);

    /**
     * The CSS class for the node
    * see KoTree.ITreeNode
     */
    public cssClass: KnockoutObservable<string> = ko.observable("");

    /**
    * The CSS class for the icon
    * see KoTree.ITreeNode
    */
    public nodeIconCssClass: KnockoutObservable<string> = ko.observable("");

    /**
   * The template name for additional node rendering
   * see KoTree.ITreeNode
   */
    public templateName: KnockoutObservableBase<string> = ko.observable("");


    /**
     * The id of the node
     * see KoTree.ITreeNode
     */
    public id: KnockoutComputed<string>;

    constructor(nodes?: any, text?: string) {
        super(nodes);
        this.cssClass("node-link");
        this.nodeContentCssClass(""); // by default template already has "node-content"
        this.dirty = ko.computed({
            read: () => {
                return false;
            }
        });

        this.text = ko.computed({
            read: () => {
                return text;
            }
        });

        this.id = ko.computed({
            read: () => {
                let value = this.value();
                if (value) {
                    return "definition" + value.id();
                }

                return "";
            }
        });

        this.templateName("buildvnext_definition_tree_custom_node");
    }
    /**
     * Called when the context menu for the node is clicked
     * @param target The node
     * @param args Event args
     */
    public _onContextMenuClick(target: KoTree.ITreeNode, args: JQueryEventObject) {
        this.root()._onContextMenuClick(this, args, this.value());
    }

    /**
     * Called when the node is clicked
     * @param target The node
     * @param args Event args
     */
    public _onClick(target: KoTree.ITreeNode, args: JQueryEventObject) {
        this.root()._onClick(target, args, this);
    }

    /**
     * When using platform tree control, a tree node's getContributionContext would just return the "treeNode" it'self, so overriding
     * see KoTree.ITreeNode
     */
    public getContributionContext = (): BuildContracts.DefinitionReference => {
        let model = this.value();
        return model && model.value;
    }
}

/**
 * A tree node that represents favorite node
 */
export class DefinitionExplorerFavTreeNode extends DefinitionExplorerTreeNode {
    /**
    * Determines build status icon for the node
    */
    public buildStatusIconCssClass: KnockoutObservable<string> = ko.observable("");

    /**
    * Determines build status text for the node
    */
    public buildStatusText: KnockoutObservable<string> = ko.observable("");

    /**
    * Determines that this is a favorite node, this value would be used by the buildvnext_definition_tree_node template
    */
    public isFavNode: KnockoutObservable<boolean> = ko.observable(true);

    /**
    * Historgram view model to send to the enhancement
    */
    public histogram: Histogram.BuildHistogramViewModel = new Histogram.BuildHistogramViewModel(new Histogram.BuildsInfo([], 0), (build) => {
        Context.viewContext.viewBuild(build);
    });

    constructor(definition: BaseDefinitionModel.BaseDefinitionModel) {
        super();
        this.value(definition);
        this.cssClass("fav-node-link");
        this.nodeContentCssClass("fav-node-content");

        this.id = ko.computed({
            read: () => {
                let value = this.value();
                if (value) {
                    return "favdefinition" + value.id();
                }

                return "";
            }
        });
    }

    public setBuilds(builds: BuildContracts.Build[]) {
        this.histogram.buildsInfo(new Histogram.BuildsInfo(builds, 0));
    }
}

/**
 * A tree node that represents "all definitions"
 */
export class DefinitionExplorerAllNode extends DefinitionExplorerTreeNode {
    public type: KnockoutObservable<BuildContracts.DefinitionType> = ko.observable(null);

    constructor(text: string, type: BuildContracts.DefinitionType) {
        super();

        this.text = ko.computed({
            read: () => {
                return text;
            }
        });

        this.type(type);
    }
}

/**
 * A tree node that represents section nodes
 */
export class DefinitionExplorerSectionNode extends DefinitionExplorerTreeNode {

    constructor(text: string) {
        super();

        this.text = ko.computed({
            read: () => {
                return text;
            }
        });

        this.cssClass("section-node");
        this.templateName("");
    }
}

/**
 * A tree node that represents "new definition node"
 */
export class DefinitionExplorerNewDefinitionNode extends DefinitionExplorerTreeNode {
    constructor(text: string) {
        super();

        this.text = ko.computed({
            read: () => {
                return text;
            }
        });

        this.showIcon = ko.observable(false);
    }

    /**
     * Called when the context menu for the node is clicked
     * @param target The node
     * @param args Event args
     */
    public _onContextMenuClick(target: KoTree.ITreeNode, args: JQueryEventObject) {
        // No context menu should be shown
    }
}

/**
 * A tree node that represents a draft definition
 */
export class DefinitionExplorerDraftTreeNode extends DefinitionExplorerTreeNode {
    constructor(draft: BaseDefinitionModel.BaseDefinitionModel) {
        super();
        this.value(draft);
        this.nodeIconCssClass("buildvnext-draft-node");
        this.text = ko.computed({
            read: () => {
                var result: string = "";

                var viewModel: BaseDefinitionModel.BaseDefinitionModel = this.value();
                if (!!viewModel) {
                    result = viewModel.name();
                }

                return result;
            }
        });
    }
}

/**
 * A tree node that represents a build definition
 */
export class DefinitionExplorerDefinitionTreeNode extends DefinitionExplorerTreeNode {
    constructor(definition: BaseDefinitionModel.BaseDefinitionModel,
        drafts?: KnockoutObservableArray<DefinitionExplorerDraftTreeNode>) {
        super(drafts);
        this.value(definition);
        this.nodeIconCssClass("buildvnext-definition-node");

        this.text = ko.computed({
            read: () => {
                let value = this.value();
                if (!!value) {
                    let name = value.name();
                    let path = value.path;
                    if (path != "\\") {
                        if (path[0] === "\\") {
                            // strip of leading slash
                            path = path.slice(1, path.length);
                        }
                        name = path + "\\" + name;
                    }
                    return name;
                }
                else {
                    return "";
                }
            }
        });
    }
}

/**
 * A tree node that represents a XAML definition
 */
export class DefinitionExplorerXamlTreeNode extends DefinitionExplorerTreeNode {
    constructor(definition: XamlDefinitionModel.XamlDefinitionModel) {
        super();
        this.value(definition);
        this.nodeIconCssClass("xaml-node");

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
* A fav tree node that represents a build definition
 */
export class DefinitionExplorerDefinitionFavTreeNode extends DefinitionExplorerFavTreeNode {
    constructor(definition: BaseDefinitionModel.BaseDefinitionModel) {
        super(definition);
        this.nodeIconCssClass("buildvnext-definition-node");

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
 * A fav tree node that represents a XAML definition
 */
export class DefinitionExplorerXamlFavTreeNode extends DefinitionExplorerFavTreeNode {
    constructor(definition: XamlDefinitionModel.XamlDefinitionModel) {
        super(definition);
        this.nodeIconCssClass("xaml-node");

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

export interface ITreeViewModelOptions {
    filterAction: (skip?: boolean) => boolean;
    definitionAction: (actionId: string, definition: BaseDefinitionModel.BaseDefinitionModel) => void;
    getDashboardSubMenu: (definition: BaseDefinitionModel.BaseDefinitionModel) => Menus.IMenuItemSpec;
}

export class TreeViewModel extends KoTree.TreeViewModel {
    private _treeOptions: ITreeViewModelOptions;

    public myFavoritesStore: TFS_OM_Common.FavoriteStore;
    public teamFavoritesStore: TFS_OM_Common.FavoriteStore;

    constructor(options: ITreeViewModelOptions) {
        super();
        this._treeOptions = options;
    }

    public getMenuOptions = (node: KnockoutTreeNode): Menus.MenuOptions => {
        let data = node.tag as DefinitionExplorerTreeNode;
        let items: Menus.IMenuItemSpec[] = [];
        let definition = data.value.peek();
        if (definition) {
            items.push({
                id: "view-builds",
                text: BuildResources.ViewBuilds,
                title: BuildResources.ViewBuilds,
                showText: true,
                noIcon: false,
                action: () => {
                    if (!this._treeOptions.filterAction()) {
                        Navigation_Services.getHistoryService().addHistoryPoint(ExplorerActions.CompletedBuilds, $.extend(ViewsCommon.BuildActionIds.getDefaultState(), { definitionId: definition.id() }));
                    }
                },
                groupId: "build"
            });
            items.push({
                id: "queue-new-build",
                text: BuildResources.QueueBuildMenuItemText,
                title: BuildResources.QueueBuildMenuItemTooltip,
                noIcon: false,
                icon: "icon-queue-build",
                action: () => {
                    if (!this._treeOptions.filterAction()) {
                        var performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "QueueBuild");
                        Context.viewContext.queueBuild(definition, performance, Telemetry.Sources.Explorer).then(() => {
                            performance.end();
                        });
                    }
                },
                groupId: "build"
            });

            switch (definition.definitionType()) {
                case BuildContracts.DefinitionType.Build:
                    items.push({
                        id: "edit-selected-definition",
                        text: BuildResources.EditDefinitionMenuItemText,
                        title: BuildResources.EditDefinitionMenuItemText,
                        noIcon: false,
                        icon: "icon-edit",
                        showText: true,
                        action: () => {
                            const editDefinitionUrl = BuildLinks.getEditDefinitionUrl(definition.id());
                            if (editDefinitionUrl) {
                                Utils.openUrl(editDefinitionUrl);
                            }
                        },
                        groupId: "definition-update"
                    });
                    items.push({
                        id: "rename-selected-definition",
                        text: BuildResources.RenameDefinitionMenuItemText,
                        noIcon: false,
                        icon: "icon-rename",
                        showText: true,
                        action: () => {
                            if ($.isFunction(this._treeOptions.definitionAction)) {
                                this._treeOptions.definitionAction("rename-definition", definition);
                            }
                        },
                        groupId: "definition-update"
                    });
                    items.push({
                        id: "save-as-definition", // Clone a definition, disabled for a draft
                        text: BuildResources.CloneDefinitionMenuItemText,
                        noIcon: false,
                        icon: "icon-tfs-work-item-copy",
                        showText: true,
                        disabled: !(definition.getParentDefinitionId() < 1),
                        action: () => {
                            if (!this._treeOptions.filterAction()) {
                                BuildNavUtility.removeNavigationStateParameter(ViewsCommon.BuildNavigationStateProperties.favDefinitionId);
                                BuildNavUtility.removeNavigationStateParameter(ViewsCommon.BuildNavigationStateProperties.definitionId);
                                Navigation_Services.getHistoryService().addHistoryPoint(DesignerActions.SimpleProcess, $.extend(ViewsCommon.BuildActionIds.getDefaultState(), {
                                    cloneId: definition.id(), isNew: 1
                                }));
                            }
                        },
                        groupId: "definition-manage"
                    });
                    items.push({
                        id: "save-template-definition",
                        text: BuildResources.SaveTemplateDefinitionLabel,
                        noIcon: false,
                        icon: "icon-save",
                        showText: true,
                        action: () => {
                            if ($.isFunction(this._treeOptions.definitionAction)) {
                                this._treeOptions.definitionAction("save-template-definition", definition);
                            }
                        },
                        groupId: "definition-manage"
                    });
                    break;
                case BuildContracts.DefinitionType.Xaml:
                    // Currently some definitions manipulations are not possible for xaml
                    break;
            }
            items.push({
                id: "delete-definition",
                text: BuildResources.DeleteDefinitionMenuItemText,
                noIcon: false,
                icon: "icon-delete",
                showText: true,
                action: () => {
                    if ($.isFunction(this._treeOptions.definitionAction)) {
                        this._treeOptions.definitionAction("delete-definition", definition);
                    }
                },
                groupId: "definition-manage"
            });

            // Add favorites/ pin if this is not a draft
            if (definition.getParentDefinitionId() < 1) {
                if (this.myFavoritesStore && Favorites.getFavoriteItemFromStore(definition.uri(), this.myFavoritesStore)) {
                    items.push({
                        id: "remove-from-my-favorites",
                        text: TFS_Resources_Presentation.RemoveFromMyFavoritesTitle,
                        title: TFS_Resources_Presentation.RemoveFromMyFavoritesTooltipText,
                        noIcon: false,
                        icon: "icon-favorite-out",
                        showText: true,
                        action: () => {
                            if ($.isFunction(this._treeOptions.definitionAction)) {
                                this._treeOptions.definitionAction("remove-from-my-favorites", definition);
                            }
                        },
                        groupId: "definition-favorite"
                    });
                }
                else {
                    items.push({
                        id: "add-to-my-favorites",
                        text: TFS_Resources_Presentation.AddToMyFavoritesTitle,
                        title: TFS_Resources_Presentation.AddToMyFavoritesTooltipText,
                        noIcon: false,
                        icon: "icon-favorite-in",
                        showText: true,
                        action: () => {
                            if ($.isFunction(this._treeOptions.definitionAction)) {
                                this._treeOptions.definitionAction("add-to-my-favorites", definition);
                            }
                        },
                        groupId: "definition-favorite"
                    });
                }

                if (this.teamFavoritesStore && Favorites.getFavoriteItemFromStore(definition.uri(), this.teamFavoritesStore)) {
                    items.push({
                        id: "remove-from-team-favorites",
                        text: TFS_Resources_Presentation.RemoveFromTeamFavoritesTitle,
                        title: TFS_Resources_Presentation.RemoveFromTeamFavoritesTooltipText,
                        noIcon: false,
                        showText: true,
                        disabled: false,
                        icon: "icon-favorite-out",
                        action: () => {
                            if ($.isFunction(this._treeOptions.definitionAction)) {
                                this._treeOptions.definitionAction("remove-from-team-favorites", definition);
                            }
                        },
                        groupId: "definition-favorite"
                    });
                }
                else {
                    items.push({
                        id: "add-to-team-favorites",
                        text: TFS_Resources_Presentation.AddToTeamFavoritesTitle,
                        title: TFS_Resources_Presentation.AddToTeamFavoritesTooltipText,
                        noIcon: false,
                        icon: "icon-favorite-in",
                        disabled: false,
                        showText: true,
                        action: () => {
                            if ($.isFunction(this._treeOptions.definitionAction)) {
                                this._treeOptions.definitionAction("add-to-team-favorites", definition);
                            }
                        },
                        groupId: "definition-favorite"
                    });
                }


                // pinning for new dashboards view.
                items.push(this._treeOptions.getDashboardSubMenu(definition));
            }
        }

        items.push({
            id: "view-definition-security",
            text: TFS_Resources_Presentation.ItemSecurityTitle,
            title: TFS_Resources_Presentation.ItemSecurityTooltipText,
            noIcon: false,
            icon: "icon-admin",
            showText: true,
            action: () => {
                if ($.isFunction(this._treeOptions.definitionAction)) {
                    this._treeOptions.definitionAction("view-definition-security", definition);
                }
            },
            groupId: "definition-security"
        });

        // We are not sending any "contextInfo", since Platform's TreeView overrides it with "item" as TreeNode and also TreeNode implements "getContributionContext" which gets priority
        // hence we override getContributionContext to match our needs in DefinitionExplorerTreeNode
        return {
            items: items,
            contributionIds: ["ms.vss-build-web.build-definition-menu"]
        };
    }
}

export class DefinitionExplorerTab extends Context.DisposableTab {
    /**
     * The definition tree
     */
    public definitionTree: TreeViewModel;

    /**
     * The "all definitions" nodes
     */
    public allBuildDefinitionsNode: DefinitionExplorerAllNode = new DefinitionExplorerAllNode(BuildResources.AllBuildDefinitions, BuildContracts.DefinitionType.Build);
    public allXamlDefinitionsNode: DefinitionExplorerAllNode = new DefinitionExplorerAllNode(BuildResources.AllXamlDefinitions, BuildContracts.DefinitionType.Xaml);

    private _definitionSectionNodes: IDictionaryStringTo<DefinitionExplorerSectionNode> = {};

    private _myFavoritesStore: TFS_OM_Common.FavoriteStore;
    private _teamFavoritesStore: TFS_OM_Common.FavoriteStore;

    private _initPromise: IPromise<any>;
    private _options: any;
    private _definitonUri_treeNodeMap: { [uri: string]: DefinitionExplorerTreeNode } = {};
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    private _commandArgs: TFS_Dashboards_PushToDashboardInternal.commandArgsForPinning;

    private _originalNodes: IDictionaryStringTo<KoTree.ITreeNode[]> = {};

    constructor(options?: any) {
        super("definitions", "Definitions", "buildvnext_definition_explorer_tree");

        this._tfsContext = Context.viewContext.tfsContext;

        this._options = options || {};
        this._options.filterAction = this._options.filterAction || (() => { return false; });

        this.definitionTree = new TreeViewModel({
            filterAction: this._options.filterAction,
            definitionAction: this._options.definitionAction,
            getDashboardSubMenu: this._getDashboardSubMenu
        });

        // init sections
        let myFavSectionNode = new DefinitionExplorerSectionNode(TFS_Resources_Presentation.MyFavoritesText);
        let teamFavSectionNode = new DefinitionExplorerSectionNode(TFS_Resources_Presentation.TeamFavoritesText);
        let xamlBuildSectionNode = new DefinitionExplorerSectionNode(BuildResources.XamlDefinitions);

        this._definitionSectionNodes[TFS_Resources_Presentation.MyFavoritesText] = myFavSectionNode;
        this._definitionSectionNodes[TFS_Resources_Presentation.TeamFavoritesText] = teamFavSectionNode;
        this._definitionSectionNodes[BuildResources.XamlDefinitions] = xamlBuildSectionNode;

        // definition explorer tree
        this.definitionTree.nodes.push(myFavSectionNode);
        this.definitionTree.nodes.push(teamFavSectionNode);

        if (!this._options.xamlOnly) {
            let teamBuildSectionNode = new DefinitionExplorerSectionNode(BuildResources.BuildDefinitions);
            this._definitionSectionNodes[BuildResources.BuildDefinitions] = teamBuildSectionNode;
            this.definitionTree.nodes.push(teamBuildSectionNode);
            teamBuildSectionNode.expanded(true);
        }

        this.definitionTree.nodes.push(xamlBuildSectionNode);

        this.computed(() => {
            var definition: BaseDefinitionModel.BaseDefinitionModel = null;
            var node: DefinitionExplorerTreeNode = <DefinitionExplorerTreeNode>this.definitionTree.selectedNode();
            if (!!node) {
                definition = node.value();
            }

            if (!!definition) {
                Context.definitionContext.selectedDefinition(definition);
            }
            else {
                if (node instanceof DefinitionExplorerAllNode) {
                    Context.definitionContext.selectedDefinitionType((<DefinitionExplorerAllNode>node).type());
                }
                Context.definitionContext.selectedDefinition(null);
            }
        });

        this.computed(() => {
            // subcribe to changes where definition tree nodes have to be re-rendered
            Object.keys(this._definitionSectionNodes).forEach((sectionName) => {
                let sectionNode = this._definitionSectionNodes[sectionName];
                let nodes = sectionNode.nodes() || [];
                //nodes.forEach((node) => {
                //    node.nodes();
                //});
            });

            this.definitionTree.nodes.valueHasMutated();
        });

        // set default expanded states
        myFavSectionNode.expanded(true);
        teamFavSectionNode.expanded(true);
        xamlBuildSectionNode.expanded(true);

        this.definitionTree._onNodeSelecting = (target: KoTree.ITreeNode, isClick?: boolean) => {
            return this._options.filterAction(!isClick);
        }

        this.subscribe(Context.definitionContext.selectedDefinitionType, (newValue: BuildContracts.DefinitionType) => {
            if (newValue === BuildContracts.DefinitionType.Xaml) {
                xamlBuildSectionNode.expanded(true);
            }
        });

        this.refresh();
    }

    private _initializeMyFavorites(performance: Performance.IScenarioDescriptor): Q.IPromise<any> {
        var deferred = Q.defer();

        // Initialize my favorites store and fill favorites
        TFS_OM_Common.FavoriteStore.beginGetFavoriteStore(this._tfsContext, TFS_Host_TfsContext.NavigationContextLevels.Project, null, TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_BUILD_DEFINITIONS, "My Favorites", false,
            (favoriteStore: TFS_OM_Common.FavoriteStore) => {
                performance.addSplitTiming("retrieved my favorites");
                this._myFavoritesStore = favoriteStore;
                this.definitionTree.myFavoritesStore = favoriteStore;
                this._setFavoriteNodesFromStoreToSection(favoriteStore.children, this._definitionSectionNodes[TFS_Resources_Presentation.MyFavoritesText]).then(() => {
                    performance.addSplitTiming("created my favorites controls");
                    deferred.resolve(null);
                });
            });

        return deferred.promise;
    }

    private _initializeTeamFavorites(performance: Performance.IScenarioDescriptor): Q.IPromise<any> {
        var deferred = Q.defer();

        // initialize team favorites store and fill favorites
        TFS_OM_Common.FavoriteStore.beginGetFavoriteStore(this._tfsContext, TFS_Host_TfsContext.NavigationContextLevels.Team, this._tfsContext.currentTeam.identity.id, TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_BUILD_DEFINITIONS, "Team Favorites", false,
            (favoriteStore: TFS_OM_Common.FavoriteStore) => {
                performance.addSplitTiming("retrieved team favorites");
                this._teamFavoritesStore = favoriteStore;
                this.definitionTree.teamFavoritesStore = favoriteStore;
                this._setFavoriteNodesFromStoreToSection(favoriteStore.children, this._definitionSectionNodes[TFS_Resources_Presentation.TeamFavoritesText]).then(() => {
                    performance.addSplitTiming("created team favorites controls");
                    deferred.resolve(null);
                });
            });

        return deferred.promise;
    }

    private _setFavoriteNodesFromStoreToSection(items: TFS_OM_Common.FavoriteItem[], sectionNode: DefinitionExplorerSectionNode): Q.IPromise<any> {
        var definitionIds: number[] = [];
        var favNodes: DefinitionExplorerFavTreeNode[] = [];
        var favNodesByDefinitionId: IDictionaryNumberTo<DefinitionExplorerFavTreeNode> = [];

        if (!items) {
            return Q(null);
        }

        items.forEach((value: TFS_OM_Common.FavoriteItem) => {
            var definitionModel: BaseDefinitionModel.BaseDefinitionModel = $.map(this._definitonUri_treeNodeMap, (node: DefinitionExplorerTreeNode, uri: string) => {
                if (!node) {
                    return true;
                }

                var definition = node.value();
                // when we create favorite item, we send definition uri as data
                if (uri === value.data) {
                    return definition;
                }
                return null;
            })[0]; // get the first element

            if (definitionModel) {
                var definitionId = definitionModel.id.peek();
                definitionIds.push(definitionId);

                var favNode: DefinitionExplorerFavTreeNode = null;
                if (definitionModel.definitionType() === BuildContracts.DefinitionType.Xaml) {
                    favNode = new DefinitionExplorerXamlFavTreeNode(<XamlDefinitionModel.XamlDefinitionModel>definitionModel);
                }
                else {
                    // Note: drafts cannot be favorited so just create DefinitionExplorerDefinitionFavTreeNode
                    favNode = new DefinitionExplorerDefinitionFavTreeNode(definitionModel);
                }

                // fill in default values
                favNode.buildStatusIconCssClass("bowtie-icon bowtie-status-no");
                favNode.buildStatusText(BuildCommonResources.NoBuildExistsForDefinition);

                favNodes.push(favNode);
                favNodesByDefinitionId[definitionId] = favNode;
            }
        });

        if (definitionIds.length === 0) {
            sectionNode.nodes([]); // If none found, empty existing nodes if any
            return Q(null);
        }

        var buildFilter: IBuildFilter = {
            project: this._tfsContext.navigation.projectId,
            definitions: definitionIds.join(','),
            statusFilter: BuildContracts.BuildStatus.Completed | BuildContracts.BuildStatus.InProgress,
            maxBuildsPerDefinition: 10
        };

        // get all build histogram data in one request
        return Context.viewContext.buildClient.getBuilds(buildFilter).then((result: GetBuildsResult) => {
            // group the builds by definition id
            var buildsByDefinitionId: IDictionaryNumberTo<BuildContracts.Build[]> = {};
            result.builds.forEach((build: BuildContracts.Build) => {
                var definitionBuilds: BuildContracts.Build[] = buildsByDefinitionId[build.definition.id];
                if (!definitionBuilds) {
                    // most recent build for this definition
                    definitionBuilds = [];
                    buildsByDefinitionId[build.definition.id] = definitionBuilds;
                }

                definitionBuilds.push(build);
            });

            // set node status and builds
            for (var definitionId in buildsByDefinitionId) {
                var builds: BuildContracts.Build[] = buildsByDefinitionId[definitionId];
                var statusText: string = BuildCommonResources.NoBuildExistsForDefinition;
                var cssIconClass: string = "";

                if (builds) {
                    var mostRecentBuild = builds[0];
                    if (mostRecentBuild) {
                        var queueName: string = mostRecentBuild.queue ? mostRecentBuild.queue.name : BuildCommonResources.BuildDurationNoQueueName;
                        if (mostRecentBuild.definition.type === BuildContracts.DefinitionType.Xaml) {
                            if (mostRecentBuild.controller) {
                                queueName = mostRecentBuild.controller.name;
                            }
                        }

                        statusText = getBuildDurationQueueText(mostRecentBuild.status, mostRecentBuild.startTime, mostRecentBuild.finishTime, queueName);
                        cssIconClass = BuildStatus.getIconClassName(mostRecentBuild.status, mostRecentBuild.result);
                    }
                }

                var favNode = favNodesByDefinitionId[definitionId];
                if (favNode) {
                    favNode.buildStatusText(statusText);
                    favNode.buildStatusIconCssClass(cssIconClass);
                    favNode.setBuilds(builds || []);
                }
            }

            sectionNode.nodes(favNodes);
        }, (error) => {
            VSS.handleError(error);
        });
    }

    private _initializeDefinitions(reloadDefinitionCache: boolean, performance: Performance.IScenarioDescriptor): IPromise<any> {
        let promise: IPromise<BuildContracts.DefinitionReference[]> = null;
        if (this._options.xamlOnly) {
            promise = Context.viewContext.definitionCache.getXamlDefinitions(reloadDefinitionCache);
        }
        else {
            promise = Context.viewContext.definitionCache.getAllDefinitions(reloadDefinitionCache);
        }

        return promise
            .then((definitionReferences: BuildContracts.DefinitionReference[]) => {
                performance.addSplitTiming("retrieved definitions");

                var buildDrafts: DefinitionExplorerDraftTreeNode[] = [];
                var buildDefinitions: DefinitionExplorerTreeNode[] = [];
                var xamlDefinitions: DefinitionExplorerTreeNode[] = [];

                // Map to handle drafts
                var definitionMap: { [id: number]: DefinitionExplorerTreeNode } = {};

                // Reinit the map
                this._definitonUri_treeNodeMap = {};

                // xaml and non-draft definitions first
                $.each(definitionReferences, (index: number, definitionReference: BuildContracts.DefinitionReference) => {
                    var definitionNode: DefinitionExplorerTreeNode;
                    if (definitionReference.type === BuildContracts.DefinitionType.Xaml) {
                        definitionNode = new DefinitionExplorerXamlTreeNode(new XamlDefinitionModel.XamlDefinitionModel(<BuildContracts.XamlBuildDefinition>definitionReference))
                        xamlDefinitions.push(definitionNode);
                        this._definitonUri_treeNodeMap[definitionReference.uri] = definitionNode;
                    }
                    else {
                        var buildDefinition: BuildContracts.BuildDefinition = <BuildContracts.BuildDefinition>definitionReference;
                        var model: BuildDefinitionModel.BuildDefinitionModel = new BuildDefinitionModel.BuildDefinitionModel(buildDefinition);

                        if (buildDefinition.quality === BuildContracts.DefinitionQuality.Draft) {
                            buildDrafts.push(new DefinitionExplorerDraftTreeNode(model));
                        }
                        else {
                            definitionNode = new DefinitionExplorerDefinitionTreeNode(model, null);
                            buildDefinitions.push(definitionNode);
                            this._definitonUri_treeNodeMap[definitionReference.uri] = definitionNode;
                            definitionMap[definitionReference.id] = definitionNode;
                        }
                    }
                });
                performance.addSplitTiming("created definition models");

                buildDefinitions = buildDefinitions.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.text(), b.text()));
                xamlDefinitions = xamlDefinitions.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.text(), b.text()));
                performance.addSplitTiming("sorted definition models");

                // drafts
                var draftNodes: DefinitionExplorerTreeNode[] = [];
                $.each(buildDrafts, (index: number, draftNode: DefinitionExplorerDraftTreeNode) => {
                    var buildDefinition = <BuildDefinitionModel.BuildDefinitionModel>draftNode.value();
                    var definitionNode: DefinitionExplorerTreeNode = definitionMap[buildDefinition.parentDefinitionId()];

                    if (!!definitionNode) {
                        definitionNode.nodes.push(draftNode);
                    }
                    else {
                        draftNodes.push(draftNode);
                    }
                });
                performance.addSplitTiming("added draft nodes");

                if (!this._options.xamlOnly) {
                    buildDefinitions.unshift(this.allBuildDefinitionsNode);
                    buildDefinitions = buildDefinitions.concat(draftNodes.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.value().name(), b.value().name())));
                }

                xamlDefinitions.unshift(this.allXamlDefinitionsNode);

                this._setNodes(BuildResources.BuildDefinitions, buildDefinitions);
                this._setNodes(BuildResources.XamlDefinitions, xamlDefinitions);
                performance.addSplitTiming("set tree nodes");

                // Keep these at last, these use _definitonUri_treeNodeMap
                var myFavoritesPromise = this._initializeMyFavorites(performance);
                var teamFavoritesPromise = this._initializeTeamFavorites(performance);

                return Q.all([myFavoritesPromise, teamFavoritesPromise]).then(() => {
                    performance.addSplitTiming("initialized favorites");
                });
            });
    }

    private _setNodes(key: string, nodes: DefinitionExplorerTreeNode[]) {
        let sectionNode = this._definitionSectionNodes[key];
        if (sectionNode) {
            sectionNode.nodes(nodes);
        }
    }

    private _getDashboardSubMenu = (definition: BaseDefinitionModel.BaseDefinitionModel): Menus.IMenuItemSpec => {
        var widgetTypeId: string = TFS_Dashboards_PushToDashboardConstants.BuildChart_WidgetTypeID;

        var artifact: TFS_Dashboards_BuildArtifact.BuildArtifact = {
            uri: definition.uri(),
            type: definition.definitionType(),
            projectId: definition.value.project.id
        };
        var data: string = JSON.stringify(artifact);

        var widgetData = new TFS_Dashboards_WidgetDataForPinning.WidgetDataForPinning(definition.name.peek(), widgetTypeId, data);

        return TFS_Dashboards_PushToDashboard.PushToDashboard.createMenu(TFS_Host_TfsContext.TfsContext.getDefault().contextData, widgetData, (args: TFS_Dashboards_PushToDashboardInternal.PinArgs) => {});
    }

    private _addFavoriteItemToStore(definition: BaseDefinitionModel.BaseDefinitionModel, favoriteStore: TFS_OM_Common.FavoriteStore) {
        Favorites.addFavoriteItemToStore(definition.value, favoriteStore).then(() => {
            this.refresh(false);
        }, (error) => {
            VSS.handleError(error);
        });
    }

    private _removeFavoriteItemFromStore(favItem: TFS_OM_Common.FavoriteItem) {
        Favorites.removeFavoriteItemFromStore(favItem).then(() => {
            this.refresh(false);
        }, (error) => {
            VSS.handleError(error);
        });
    }

    /**
     * Select the "all definitions" node
     */
    public selectAllDefinitionsNode(type: BuildContracts.DefinitionType) {
        this._initPromise.then(() => {
            this.definitionTree.selectNode((treeNode: KoTree.ITreeNode) => {
                if (treeNode instanceof DefinitionExplorerAllNode && (<DefinitionExplorerAllNode>treeNode).type.peek() === type) {
                    return true;
                }
                return false;
            });
        });
    }

    /**
     * Select the node with the specified id
     * @param definitionId The definition id
     */
    public selectNode(definitionId: number, isFav: boolean = false) {
        this._initPromise.then(() => {
            this.definitionTree.selectNode((treeNode: KoTree.ITreeNode) => {
                var model: BaseDefinitionModel.BaseDefinitionModel = null;
                // Capture nodes under favorite section only if isFav is set
                // Otherwise, just grab the node under definitions section
                if (treeNode instanceof DefinitionExplorerFavTreeNode) {
                    if (isFav) {
                        model = (<DefinitionExplorerFavTreeNode>treeNode).value();
                    }
                }
                else if (treeNode instanceof DefinitionExplorerTreeNode) {
                    model = (<DefinitionExplorerTreeNode>treeNode).value();
                }
                if (!!model) {
                    return model.id() === definitionId;
                }
                return false;
            });
        });
    }

    public refresh(reloadDefinitionCache: boolean = true): void {
        var performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "RefreshDefinitionTree");
        performance.addData({
            reloadDefinitioncache: reloadDefinitionCache
        });

        this._initPromise = this._initializeDefinitions(reloadDefinitionCache, performance).then(() => {
            performance.end();
            Events.getService().fire(ViewsCommon.PerformanceEvents.RefreshDefinitionTree);
        });
    }

    public removeNewDefinitionNode(): void {
        let sectionNode = this._definitionSectionNodes[BuildResources.BuildDefinitions];
        if (sectionNode) {
            let definitionNodes = sectionNode.nodes;
            let firstNode = definitionNodes()[0];
            if (firstNode instanceof DefinitionExplorerNewDefinitionNode) {
                // If already exists, remove it
                definitionNodes.splice(0, 1);
            }
        }
    }

    public addNewDefinitionNode(model: BuildDefinitionModel.BuildDefinitionModel): void {
        let sectionNode = this._definitionSectionNodes[BuildResources.BuildDefinitions];
        if (sectionNode) {
            // Remove new definition node if exists
            this.removeNewDefinitionNode();

            // Add new one
            var name = model.name();
            var newDefinitionNode = new DefinitionExplorerNewDefinitionNode(" * " + name);
            newDefinitionNode.value(model);
            sectionNode.nodes.unshift(newDefinitionNode);

            // Get it selected
            this.definitionTree.selectedNode(newDefinitionNode);
        }
    }

    public addToMyFavoritesNode(model: BaseDefinitionModel.BaseDefinitionModel): void {
        if (!Favorites.getFavoriteItemFromStore(model.uri(), this._myFavoritesStore)) {
            // Not found so create one
            if (this._myFavoritesStore) {
                this._addFavoriteItemToStore(model, this._myFavoritesStore);
            }
        }
    }

    public addToTeamFavoritesNode(model: BaseDefinitionModel.BaseDefinitionModel): void {
        if (!Favorites.getFavoriteItemFromStore(model.uri(), this._teamFavoritesStore)) {
            // Not found so create one
            if (this._teamFavoritesStore) {
                this._addFavoriteItemToStore(model, this._teamFavoritesStore);
            }
        }
    }

    public removeFromTeamFavoritesNode(model: BaseDefinitionModel.BaseDefinitionModel): void {
        var favItem = Favorites.getFavoriteItemFromStore(model.uri(), this._teamFavoritesStore);
        if (favItem) {
            this._removeFavoriteItemFromStore(favItem);
        }
    }

    public removeFromMyFavoritesNode(model: BaseDefinitionModel.BaseDefinitionModel): void {
        var favItem = Favorites.getFavoriteItemFromStore(model.uri(), this._myFavoritesStore);
        if (favItem) {
            this._removeFavoriteItemFromStore(favItem);
        }
    }

    public filterSections(searchText: string) {

        searchText = searchText ? searchText.toLowerCase() : searchText;

        // Expand all sections by default
        $.each(this._definitionSectionNodes, (sectionName: string, sectionNode: DefinitionExplorerSectionNode) => {
            sectionNode.expanded(true);
            let originalNodes = sectionNode.nodes();
            this._originalNodes[sectionNode.text.peek()] = originalNodes;
            let filteredNodes = originalNodes.filter((node) => {
                return node.text().toLowerCase().indexOf(searchText) >= 0
            });
            sectionNode.nodes(filteredNodes);
        });
    }

    public resetFilteredSections() {
        $.each(this._definitionSectionNodes, (sectionName: string, sectionNode: DefinitionExplorerSectionNode) => {
            let previousNodes = this._originalNodes[sectionNode.text.peek()];
            if (previousNodes) {
                sectionNode.nodes(previousNodes);
            }

        });
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Explorer.DefinitionTree", exports);
