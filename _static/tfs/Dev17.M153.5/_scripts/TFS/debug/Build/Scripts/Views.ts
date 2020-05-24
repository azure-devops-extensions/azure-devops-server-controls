/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import AdminSecurity = require("Admin/Scripts/TFS.Admin.Security");

import BaseDefinitionModel = require("Build/Scripts/BaseDefinitionModel");
import BuildDefinitionViewModel = require("Build/Scripts/BuildDefinitionViewModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import Context = require("Build/Scripts/Context");
import DefinitionManager = require("Build/Scripts/DefinitionManager");
import DefinitionTree = require("Build/Scripts/Explorer.DefinitionTree");
import KnockoutExtensions = require("Build/Scripts/KnockoutExtensions");
import * as BuildPerformance from "Build/Scripts/Performance";
import PlanTree = require("Build/Scripts/Explorer.BuildPlanTree");
import SourceProviderManager = require("Build/Scripts/SourceProviderManager");
import Telemetry = require("Build/Scripts/Telemetry");
import ViewsCommon = require("Build/Scripts/Views.Common");

import * as BuildClient from "Build.Common/Scripts/Api2.2/ClientServices";
import { GetBuildsResult, IBuildFilter } from "Build.Common/Scripts/ClientContracts";
import { BuildHttpClient as XamlBuildHttpClient } from "Build.Common/Scripts/Generated/TFS.Build.Xaml.WebApi";
import { BuildCustomerIntelligenceInfo } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { IBuildClient } from "Build.Common/Scripts/IBuildClient";

import AddTemplatesWizard_NO_REQUIRE = require("Build/Scripts/Controls.AddTemplatesWizard");
import DeleteDialog_NO_REQUIRE = require("Build/Scripts/Controls.DeleteDefinitionDialog");
import SaveDialog_NO_REQUIRE = require("Build/Scripts/Controls.SaveDefinitionDialog");

import { BuildActions, DesignerActions, ExplorerActions, UserActions } from "Build.Common/Scripts/Linking";

import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");

import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { SidebarSearch } from "Presentation/Scripts/TFS/TFS.UI.Controls.SidebarSearch";

import BuildContracts = require("TFS/Build/Contracts");

import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Events = require("VSS/Events/Services");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import Navigation_Services = require("VSS/Navigation/Services");
import { getScenarioManager } from "VSS/Performance";
import Service = require("VSS/Service");
import Splitter = require("VSS/Controls/Splitter");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

KnockoutExtensions.KnockoutCustomHandlers.initializeKnockoutHandlers();

export class BuildView extends Controls.BaseControl {
    private _state: any;
    private _flashMessageSubscription: IDisposable;
    protected _titleElement: JQuery;

    public _leftPane: JQuery;
    public _rightPane: JQuery;
    public _menuBar: Menus.MenuBar;

    constructor(options?: any) {
        super(options);
    }

    initialize(): void {
        super.initialize();
        this._menuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar,
            this.getElement().find(".hub-pivot-toolbar"), {
                items: []
            });

        this._leftPane = this._element.find(".buildvnext-view-left-pane-content");
        this._rightPane = this.getElement();

        // hook all menus
        Menus.menuManager.attachExecuteCommand(Utils_Core.delegate(this, this._onToolbarItemClick));
    }

    public _onToolbarItemClick(sender: any, args?: any) {
    }

    public getTabs(): KnockoutPivot.PivotTab[] {
        return [];
    }

    public onNavigate(state: any) {
        this._state = state;
        var flashMessageElement = this.getElement().parents(".rightPane").find(".hub-message");

        // Hide the flash message div by default ( It has a background-border set, so hide it..)
        flashMessageElement.hide();

        // splitter : Left: Tree , Right: Definition
        var mainSplitter = <Splitter.Splitter>Controls.Enhancement.getInstance(Splitter.Splitter, $(".hub-content > .splitter.horizontal"));
        if (mainSplitter) {
            if (state.hideLeftPane) {
                mainSplitter.toggleSplit(false);
            }
            else {
                mainSplitter.toggleSplit(true);
            }
        }
        // splitter: Left: Build step Grid , Right: Build inputs
        var buildStepSplitter = <Splitter.Splitter>Controls.Enhancement.getInstance(Splitter.Splitter, $(".buildvnext-view-right-pane .splitter.horizontal"));
        if (buildStepSplitter) {
            buildStepSplitter.resize(buildStepSplitter.getFixedSidePixels(), true);
        }
        if (this._flashMessageSubscription) {
            this._flashMessageSubscription.dispose();
        }
        this._flashMessageSubscription = Context.viewContext.flashMessage.subscribe((newMessage) => {
            if (newMessage) {
                flashMessageElement.text(newMessage).stop().fadeIn().fadeOut(10000);
            }
        });
    }

    public _getCurrentState(): any {
        return this._state;
    }

    public updateName(name: string): void {
    }

    public refresh(): void {
    }

    public dirty(): boolean {
        return false;
    }

    _dispose(): void {
        super._dispose();
        if (this._flashMessageSubscription) {
            this._flashMessageSubscription.dispose();
        }
    }

    public static deleteTemplate(template: BuildContracts.BuildDefinitionTemplate): IPromise<any> {
        var deferred = Q.defer();
        if (window.confirm(Utils_String.localeFormat(BuildResources.ConfirmDeleteDefinitionTemplate, template.name))) {
            return Context.viewContext.buildDefinitionManager.deleteDefinitionTemplate(template.id).then(() => {
                deferred.resolve(null);
            });
        }

        else {
            deferred.reject(null);
        }

        return deferred.promise;
    }
}

var buildViewStore: { [id: number]: any } = {};
var buildViewSelector = ".buildvnext-view";

export class Utils {
    public registerBuildView(viewType: ViewsCommon.BuildViewType, type: any): void {
        // Add new type to the store
        buildViewStore[viewType] = type;

        // Trigger navigate for new build view
        var buildView = this.getRegisteredBuildView(viewType);
        if (buildView) {
            buildView.onNavigate(Navigation_Services.getHistoryService().getCurrentState());
        }
    }

    public getRegisteredBuildView(viewType: ViewsCommon.BuildViewType) {
        var buildView = <BuildView2>Controls.Enhancement.getInstance(BuildView2, $(buildViewSelector));
        if (buildView) {
            var currentViewType = buildView.currentViewType();
            if (currentViewType === ViewsCommon.BuildViewType.Unknown || currentViewType === viewType) {
                return buildView;
            }
        }
        return null;
    }
}

export var buildViewUtils = new Utils();

// the registerEnhancement call for BuildView2 is in Views.Index.ts, which is dropped on the page by Index.aspx
// there's also a registerEnhancement for BuildView3, which inherits from BuildView2, in Scenarios/BuildDetail/BuildView3.ts
// there's a XamlView that inherits from BuildView2 in Views.Xaml.tsx
export class BuildView2 extends Navigation.NavigationView {
    private _action: string;
    private _state: any;
    private _viewType: ViewsCommon.BuildViewType;
    private _view: BuildView;

    private _definitionTreeRefreshed: boolean = false;
    private _gridUpdated: boolean = false;

    private _definitionTree: DefinitionTree.DefinitionExplorerTab;
    private _definitionSearch: BuildDefinitionsSearchControl;
    private _planTree: PlanTree.BuildPlanNodesTreeTab;
    private _toolbar: Menus.MenuBar;
    private _filterActionDelegate: any;
    private _definitionActionDelegate: any;

    // flags to ensure actions only happen once
    private _queueNewBuild: Boolean;
    private _newDefinitionDialog: Boolean;

    private _selectedDefinition: KnockoutObservable<BaseDefinitionModel.BaseDefinitionModel>;
    private _selectedDefinitionType: KnockoutObservable<BuildContracts.DefinitionType>;

    private _toolbarElement: JQuery;
    private _definitionSearchbarElement: JQuery;

    private _disposables: IDisposable[] = [];

    constructor(options?: any) {
        super(options);
        this._viewType = ViewsCommon.BuildViewType.Unknown;

        var sourceProviderManager = new SourceProviderManager.SourceProviderManager(this._options);
        var buildDefinitionManager = new DefinitionManager.BuildDefinitionManager(sourceProviderManager, this._options);

        var buildClient: IBuildClient = this._options.buildClient;
        if (!buildClient) {
            buildClient = this.createBuildClient();
        }

        // initialize context
        Context.viewContext = this.createViewContext(sourceProviderManager, buildDefinitionManager, buildClient);

        this._selectedDefinition = Context.definitionContext.selectedDefinition;
        this._selectedDefinitionType = Context.definitionContext.selectedDefinitionType;
        this._filterActionDelegate = delegate(this, this._filterAction);
        this._definitionActionDelegate = delegate(this, this._definitionAction);
        this._queueNewBuild = true;
        this._newDefinitionDialog = true;
    }

    public currentViewType(): ViewsCommon.BuildViewType {
        return this._viewType;
    }

    public getCurrentView(): BuildView {
        return this._view;
    }

    protected xamlOnly(): boolean {
        return false;
    }

    protected createBuildClient(): IBuildClient {
        const tfsConnection = new Service.VssConnection(this._options.tfsContext.contextData);
        return tfsConnection.getService<BuildClient.BuildClientService>(BuildClient.BuildClientService);
    }

    dispose(): void {
        $.each(this._disposables, (index, value: IDisposable) => {
            value.dispose();
        });
        if (this._definitionSearch) {
            this._definitionSearch.dispose();
        }
        if (this._toolbar) {
            this._toolbar.dispose();
        }
    }

    initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            attachNavigate: true
        }, options));
    }

    private _isSummaryPage(): boolean {
        return this._action === BuildActions.Summary;
    }

    private _initToolBar() {
        var $toolbarContainer = this.getElement().find(".buildvnext-view-left-pane-content.left-toolbar");

        if (!this._isSummaryPage()) {
            if (this._toolbar) {
                this._toolbar.dispose();
            }
            else {
                // create element
                this._toolbarElement = $("<div />")
                    .addClass("left-toolbar toolbar")
                    .appendTo($toolbarContainer);
            }

            if (!this._definitionSearch) {
                // create element
                this._definitionSearchbarElement = $("<div />")
                    .addClass("left-searchbar")
                    .appendTo($toolbarContainer);
                this._definitionSearch = <BuildDefinitionsSearchControl>Controls.BaseControl.createIn(BuildDefinitionsSearchControl, this._definitionSearchbarElement, {
                    definitionTree: this._definitionTree
                });
            }

            this._toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, this._toolbarElement, {
                items: this._createDefinitionListMenuItems()
            });

            $toolbarContainer.show();
        }
        else {
            $toolbarContainer.hide();
        }
    }

    protected getPageLoadScenarioName(): string {
        return BuildPerformance.PageLoadScenarios.Explorer;
    }

    initialize(): void {
        super.initialize();

        BuildPerformance.startPageLoadScenario(this.getPageLoadScenarioName());

        Events.getService().attachEvent(ViewsCommon.PerformanceEvents.RefreshDefinitionTree, () => { this._onDefinitionTreeRefreshed(); });
        Events.getService().attachEvent(ViewsCommon.PerformanceEvents.UpdateGrid, () => { this._onGridUpdated(); });

        this._initToolBar();

        this._disposables.push(ko.computed(() => {
            let selectedDefinition = this._selectedDefinition();
            let selectedDefinitionType: BuildContracts.DefinitionType;
            if (this.xamlOnly()) {
                selectedDefinitionType = BuildContracts.DefinitionType.Xaml;
            }
            else if (!selectedDefinition) {
                selectedDefinitionType = this._selectedDefinitionType();
            }

            let nodeSelectedByClick = this._definitionTree && this._definitionTree.definitionTree && this._definitionTree.definitionTree.nodeSelectedByClick === true;
            // Navigate only if the user clicked the node
            if (nodeSelectedByClick) {
                var action = ExplorerActions.CompletedBuilds;
                if (Utils_String.localeIgnoreCaseComparer(this._action, ExplorerActions.QueuedBuilds) === 0) {
                    // Default action is "completed" but keep "queued" if it was already selected before
                    action = ExplorerActions.QueuedBuilds;
                }
                else if (Utils_String.localeIgnoreCaseComparer(this._action, BuildActions.Summary) === 0) {
                    // navigating to a build from the all definitions node changes the selected definition. in this case, we want to leave the action as summary
                    action = BuildActions.Summary;
                }

                // Assign data using definition id
                let data = null;
                if (selectedDefinition) {
                    let id = selectedDefinition.id.peek();
                    let selectedNode = null;
                    if (this._definitionTree && this._definitionTree.definitionTree) {
                        selectedNode = this._definitionTree.definitionTree.selectedNode();
                    }
                    if (selectedNode instanceof DefinitionTree.DefinitionExplorerFavTreeNode) {
                        data = { favDefinitionId: id, definitionId: null };
                    }
                    else {
                        data = { definitionId: id, favDefinitionId: null };
                    }
                }
                else {
                    // This removes definition id from the url
                    data = {
                        definitionId: null,
                        favDefinitionId: null,
                        definitionType: selectedDefinitionType
                    };
                }

                // Override default values
                data = $.extend(ViewsCommon.BuildActionIds.getDefaultState(), data);

                // Add history point to get queued or completed builds loaded
                Navigation_Services.getHistoryService().addHistoryPoint(action, data);
            }
        }));

        this.getElement().on("definitionTreeUpdate", (evt: JQueryEventObject, args: any) => {
            if (this._definitionTree) {
                switch (args.command) {
                    case "new":
                        // Add new definition
                        this._definitionTree.addNewDefinitionNode(args.model);
                        break;
                    case "refresh":
                        // Refresh tree
                        this._definitionTree.refresh();
                        break;
                    case "delete-new-node":
                        // deletes new node from the tree and tries to select a node
                        this._trySelectDefinition(this._state);
                        break;
                }
            }
        });

        BuildPerformance.addPageLoadSplitTiming("initialized");
    }

    private _filterAction(skip: boolean = false): boolean {
        if (!skip && ViewsCommon.BuildActionIds.getViewType(this._action) === ViewsCommon.BuildViewType.Designer) {
            if (this._view && this._view.dirty()) {
                if (!confirm(BuildResources.BuildDefinitionLeaveDesignerMessage)) {
                    // Cancel operation
                    return true;
                }
                else {
                    // Remove new definition node if a new definition is being edited
                    if (this._definitionTree) {
                        this._definitionTree.removeNewDefinitionNode();
                    }
                }
            }
        }

        return false;
    }

    private _definitionAction(actionId: string, definition: BaseDefinitionModel.BaseDefinitionModel): void {
        switch (actionId) {
            case "save-template-definition":
                this._saveDefinitionTemplate(definition);
                break;
            case "delete-definition":
                this._deleteDefinition(definition);
                break;
            case "view-definition-security":
                this._showDefinitionSecurity(definition);
                break;
            case "rename-definition":
                this._renameDefinition(definition);
                break;
            case "add-to-my-favorites":
                this._addToMyFavorites(definition);
                break;
            case "add-to-team-favorites":
                this._addToTeamFavorites(definition);
                break;
            case "remove-from-team-favorites":
                this._removeFromTeamFavorites(definition);
                break;
            case "remove-from-my-favorites":
                this._removeFromMyFavorites(definition);
                break;
        }
    }

    private _performRename(name: string, comment: string, definition: BuildContracts.BuildDefinition): void {
        definition.name = name;
        Context.viewContext.buildDefinitionManager.updateDefinition(definition, comment).then(
            (savedDefinition: BuildContracts.BuildDefinition) => {
                // Refresh definition tree
                if (this._definitionTree) {
                    this._definitionTree.refresh();
                    this._trySelectDefinition(this._state);
                }

                // Checking to see active definition in the designer is renamed?
                if (this._viewType === ViewsCommon.BuildViewType.Designer) {
                    var selectedDefinition = Context.definitionContext.selectedDefinition();
                    if (selectedDefinition && selectedDefinition.id() === definition.id) {
                        this._view.updateName(name);
                    }
                }
            }, VSS.handleError);
    }

    private _renameDefinition(definition: BaseDefinitionModel.BaseDefinitionModel): void {
        var name = ko.observable(definition.name());
        var comment = ko.observable("");
        VSS.using(["Build/Scripts/Controls.SaveDefinitionDialog"], (SaveDialog: typeof SaveDialog_NO_REQUIRE) => {
            let saveDefinitionViewModel = new SaveDialog.SaveDefinitionDialogModel(name, comment, ko.observable(definition.path));
            let saveDefinitionOptions = {
                name: name,
                comment: comment,
                title: BuildResources.SaveDefinitionLabel,
                commentPlaceHolder: BuildResources.DescriptionPlaceHolder,
                commentLabel: BuildResources.DescriptionLabel,
                disableName: false,
                okCallback: () => {
                    if (!definition.isFullViewModel()) {
                        Context.viewContext.buildDefinitionManager.getDefinition(definition.id())
                            .then((fullDefinition: BuildContracts.BuildDefinition) => {
                                this._performRename(name(), comment(), fullDefinition);
                            });
                    } else {
                        this._performRename(name(), comment(), (<BuildDefinitionViewModel.BuildDefinitionViewModel>definition).getOriginalDefinition());
                    }
                }
            };

            Dialogs.show(SaveDialog.SaveDefinitionDialog, $.extend(saveDefinitionViewModel, saveDefinitionOptions));
        });
    }

    private _addToMyFavorites(definition: BaseDefinitionModel.BaseDefinitionModel): void {
        this._definitionTree.addToMyFavoritesNode(definition);
    }

    private _addToTeamFavorites(definition: BaseDefinitionModel.BaseDefinitionModel): void {
        this._definitionTree.addToTeamFavoritesNode(definition);
    }

    private _removeFromTeamFavorites(definition: BaseDefinitionModel.BaseDefinitionModel): void {
        this._definitionTree.removeFromTeamFavoritesNode(definition);
    }

    private _removeFromMyFavorites(definition: BaseDefinitionModel.BaseDefinitionModel): void {
        this._definitionTree.removeFromMyFavoritesNode(definition);
    }

    private _deleteDefinition(definition: BaseDefinitionModel.BaseDefinitionModel): void {
        var definitionId = definition.id();
        var selectedDefinition = Context.definitionContext.selectedDefinition();
        var alertTitle = Utils_String.localeFormat(BuildResources.ConfirmDeleteDefinition, definition.name());
        var isDraft: boolean = false;
        var params: IBuildFilter = <IBuildFilter>{
            top: 1,
            definitions: definitionId.toString()
        };
        if (!(definition.getParentDefinitionId() < 1)) {
            // This is a draft
            alertTitle = Utils_String.localeFormat(BuildResources.ConfirmDeleteDraft, definition.name());
            isDraft = true;
        }

        Context.viewContext.buildClient.getBuilds(params).then(
            (results: GetBuildsResult) => {
                if (results.builds.length > 0) {
                    if (isDraft) {
                        alertTitle = Utils_String.localeFormat(BuildResources.ConfirmDeleteDraftAndBuilds, definition.name());
                    }
                    else {
                        alertTitle = Utils_String.localeFormat(BuildResources.ConfirmDeleteDefinitionAndBuilds, definition.name());
                    }
                }
                VSS.using(["Build/Scripts/Controls.DeleteDefinitionDialog"], (_DeleteDialog: typeof DeleteDialog_NO_REQUIRE) => {
                    Dialogs.show(_DeleteDialog.DeleteDefinitionDialog, {
                        name: definition.name(),
                        isDraft: isDraft,
                        okCallback: () => {
                            let deleteDefinitionPromise = null;
                            if (definition.definitionType.peek() === BuildContracts.DefinitionType.Xaml) {
                                deleteDefinitionPromise = Context.viewContext.buildDefinitionManager.deleteXamlDefinition(definitionId);
                            }
                            else {
                                deleteDefinitionPromise = Context.viewContext.buildDefinitionManager.deleteDefinition(definitionId);
                            }

                            deleteDefinitionPromise.then(
                                () => {
                                    // Update map
                                    Context.definitionIdsAndDraftInfo[definition.getParentDefinitionId()] = null;
                                    // Refresh definition tree
                                    if (this._definitionTree) {
                                        this._definitionTree.refresh();
                                    }
                                    if ((selectedDefinition && selectedDefinition.id() === definitionId) || (selectedDefinition && selectedDefinition.isDescendent(definitionId))) {
                                        // Trying to delete active definition, switch to default view
                                        Navigation_Services.getHistoryService().replaceHistoryPoint(ExplorerActions.CompletedBuilds,
                                            $.extend(ViewsCommon.BuildActionIds.getDefaultState(), {}));
                                    } else {
                                        // Select previous node after refresh
                                        this._trySelectDefinition(this._state);
                                    }

                                    // now remove it from favorites
                                    this._definitionTree.removeFromMyFavoritesNode(definition);
                                    this._definitionTree.removeFromTeamFavoritesNode(definition);

                                }, VSS.handleError);
                        }
                    });
                });
            }, VSS.handleError);
    }

    private _showDefinitionSecurity(definition: BaseDefinitionModel.BaseDefinitionModel): void {
        var token = null,
            title = this._options.tfsContext.navigation.project;
        if (definition) {
            token = definition.id.peek();
            title = definition.name.peek();

            // for xaml definitions  path would be null
            if (definition.path && definition.path != "\\") {
                // set token per folder
                token = this._getSecurityTokenPath(definition.path) + this._options.separator + token;
            }
        }
        var securityManager = AdminSecurity.SecurityManager.create(this._options.permissionSet, {
            scope: this._options.projectGuid,
            separator: this._options.separator
        });
        securityManager.showPermissions(token, title);
    }

    private _getSecurityTokenPath(path: string) {
        path = path.replace(/\\/g, this._options.separator);
        if (path[0] == this._options.separator) {
            //unroot the path
            path = path.slice(1, path.length);
        }
        return path;
    }

    private _performTemplateSave(name: string, comment: string, definition: BuildContracts.BuildDefinition): void {
        if (name.length > 260) {
            var error: TfsError = {
                name: "400", // same error type we get without catching it
                message: BuildResources.DefinitionTemplateNameTooLong // descriptive error message
            };
            VSS.handleError(error);
            return;
        }

        var template: any = {
            description: comment,
            id: name.replace(/[^0-9a-zA-Z-_.]/g, ''),
            name: name,
            template: definition
        };

        // this allows overwriting templates that map to the same id, by design
        Context.viewContext.buildDefinitionManager.putDefinitionTemplate(template.id, template)
            .then(null, VSS.handleError);
    }

    private _saveDefinitionTemplate(definition: BaseDefinitionModel.BaseDefinitionModel): void {
        var name = ko.observable(definition.name());
        var comment = ko.observable("");
        VSS.using(["Build/Scripts/Controls.SaveDefinitionDialog"], (SaveDialog: typeof SaveDialog_NO_REQUIRE) => {
            let saveDefinitionViewModel = new SaveDialog.SaveDefinitionDialogModel(name, comment, ko.observable(definition.path));
            let saveDefinitionOptions = {
                name: name,
                comment: comment,
                title: BuildResources.SaveTemplateDefinitionTitle,
                commentPlaceHolder: BuildResources.DescriptionPlaceHolder,
                commentLabel: BuildResources.DescriptionLabel,
                description: BuildResources.SaveDefinitionAsTemplateDescription,
                okCallback: () => {
                    if (!definition.isFullViewModel()) {
                        Context.viewContext.buildDefinitionManager.getDefinition(definition.id())
                            .then((fullDefinition: BuildContracts.BuildDefinition) => {
                                // For drafts
                                fullDefinition.quality = BuildContracts.DefinitionQuality.Definition;
                                this._performTemplateSave(name(), comment(), fullDefinition);
                            });
                    } else {
                        // For drafts
                        var fullDefinition = (<BuildDefinitionViewModel.BuildDefinitionViewModel>definition).getOriginalDefinition();
                        fullDefinition.quality = BuildContracts.DefinitionQuality.Definition;
                        this._performTemplateSave(name(), comment(), fullDefinition);
                    }
                }
            };

            Dialogs.show(SaveDialog.SaveDefinitionDialog, $.extend(saveDefinitionViewModel, saveDefinitionOptions));
        });
    }

    private _createDefinitionListMenuItems(): Menus.IMenuItemSpec[] {
        var items: Menus.IMenuItemSpec[] = [
            {
                id: "refresh-definitions",
                title: BuildResources.Refresh,
                icon: "icon-refresh",
                showText: false,
                action: () => {
                    if (this._view) {
                        this._view.refresh();
                    }
                    this._definitionTree.refresh();
                }
            },
            { separator: true }
        ];

        if (!this.xamlOnly() && !this._isSummaryPage()) {
            items.push({
                id: "new-actions",
                title: BuildResources.ActionsMenuItemText,
                text: BuildResources.ActionsMenuItemText,
                icon: "icon-add",
                showText: false,
                action: () => {
                    this._templateAction();
                }
            });
        }
        return items;
    }

    private _templateAction(): void {
        var newActions = this._toolbar.getItem("new-actions");
        if (newActions) {
            VSS.using(["Build/Scripts/Controls.AddTemplatesWizard"], (AddTemplatesWizard: typeof AddTemplatesWizard_NO_REQUIRE) => {
                var wizardOptions: AddTemplatesWizard_NO_REQUIRE.ITemplatesWizardOptions = {
                    deleteCallback: BuildView.deleteTemplate,
                    selectedTemplateId: "vsBuild",
                    refreshTemplatesOnLoad: true,
                    openCreatedDefinitionInNewTab: false,
                    successCallback: (data: AddTemplatesWizard_NO_REQUIRE.ITemplateWizardCompleteResult) => { this.onSavedDefinitionFromWizard(data) }
                };

                var wizardModel = new AddTemplatesWizard.TemplatesWizardDialogModel(wizardOptions);
                Dialogs.show(AddTemplatesWizard.TemplatesWizardDialog, wizardModel);
            });
        }
    }

    private onSavedDefinitionFromWizard(data: AddTemplatesWizard_NO_REQUIRE.ITemplateWizardCompleteResult) {
        Navigation_Services.getHistoryService().addHistoryPoint(DesignerActions.SimpleProcess,
            $.extend(ViewsCommon.BuildActionIds.getDefaultState(), {
                templateId: data.templateId,
                isNew: 1,
                repoId: data.repoId,
                repoType: data.repoType,
                branchName: data.branchName,
                enableCI: data.enableCI,
                queueId: data.queue.id,
                folderPath: data.folderPath
            }));
    }

    public onNavigate(state: any): void {
        this.fixState(state);

        // Keep references to action and state
        this._action = <string>state.action;
        this._state = state;

        this._initToolBar();

        // Extract the view type from action (explorer|result|designer)
        var viewType = this.getViewType();
        if (viewType !== this._viewType) {
            // Show left content according to the type
            this._showLeftTree(viewType, state);
            // Show right content according to the type
            this._showView(viewType, state);
        }

        // Try selecting appropriate definition using state params
        this._trySelectDefinition(state);

        if (this.xamlOnly()) {
            Context.definitionContext.selectedDefinitionType(BuildContracts.DefinitionType.Xaml);
        }
        else if (state.definitionType) {
            var definitionType = parseInt(state.definitionType);
            if (definitionType > 0) {
                Context.definitionContext.selectedDefinitionType(definitionType);
            }
        }

        if (state.action === UserActions.QueueNewBuild && this._queueNewBuild) {
            this._tryQueueBuild(state);
        }
        else if (state.action === UserActions.NewDefinition && this._newDefinitionDialog) {
            this._tryCreateNewDefinition(state);
        }

        // Notify view about the current URL state
        if (this._view) {
            this._view.onNavigate(state);
        }
    }

    protected getViewType(): ViewsCommon.BuildViewType {
        return ViewsCommon.BuildActionIds.getViewType(this._action);
    }

    protected fixState(state: any): void {
        // fix case-sensitive query parameters
        for (let key of ["buildId", "definitionId", "favDefinitionId", "definitionType", "templateId", "cloneId", "action", "hideLeftPane"]) {
            this._fixStateParameter(state, key);
        }

        // redirect VS calls to view drop / diagnostic logs to the build summary page where both can be found
        if (state.action === BuildActions.Drop ||
            state.action === BuildActions.Diagnostics) {
            state.action = BuildActions.Summary;

            var uri: string = state.buildUri;
            if (uri) {
                var splitUri = uri.split("/");
                state.buildId = splitUri[splitUri.length - 1];
            }
        }

        // if there's no action specified, choose a default based on what we do know
        if (!state.action) {
            if (state.buildId) {
                state.action = BuildActions.Summary;
            }
            else {
                state.action = ExplorerActions.CompletedBuilds;
            }
        }
    }

    protected createViewContext(sourceProviderManager: SourceProviderManager.SourceProviderManager, buildDefinitionManager: DefinitionManager.BuildDefinitionManager, buildClient: IBuildClient): Context.ViewContext {
        const tfsConnection = ProjectCollection.getConnection(this._options.tfsContext);
        const xamlClient = tfsConnection.getHttpClient(XamlBuildHttpClient);
        return new Context.ViewContext(this._options.tfsContext, sourceProviderManager, buildDefinitionManager, buildClient, xamlClient);
    }

    private _fixStateParameter(state: any, targetKey: string): void {
        if (!state[targetKey]) {
            for (let key of Object.keys(state)) {
                if (Utils_String.ignoreCaseComparer(key, targetKey) === 0) {
                    state[targetKey] = state[key];
                    delete state[key];
                    break;
                }
            }
        }
    }

    private _trySelectDefinition(state: any): void {
        if (this._definitionTree && this._definitionTree.visible()) {
            // Do not try selecting if new definition clicked
            // Definition designer will handle it
            if (state && !state.templateId && !state.cloneId) {
                // Remove any new definition node
                this._definitionTree.removeNewDefinitionNode();
                if (state.definitionId) {
                    // Select specified definition
                    this._definitionTree.selectNode(parseInt(state.definitionId, 10));
                }
                else if (state.favDefinitionId) {
                    // Select specified definition
                    this._definitionTree.selectNode(parseInt(state.favDefinitionId, 10), true);
                }
                else {
                    // Select "All build definitions" node
                    this._definitionTree.selectAllDefinitionsNode(state.definitionType || BuildContracts.DefinitionType.Build);
                }
            }
        }
    }

    private _tryQueueBuild(state: any): void {
        // wait until initial selectedDefinition value is set before opening queue build dialog
        var subscription = Context.definitionContext.selectedDefinition.subscribe((newValue) => {
            if (newValue) {
                var performance = getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "QueueBuild");
                // we're queueing the build because a query parameter said to
                Context.viewContext.queueBuild(newValue, performance, Telemetry.Sources.QueryParameter).then(() => {
                    performance.end();
                });

                // remove subscription after running once. we only want a single queue build dialog open
                subscription.dispose();
            }
        });

        // subscription has already been created, don't create more
        this._queueNewBuild = false;
        state.action = ExplorerActions.QueuedBuilds;
    }

    private _tryCreateNewDefinition(state: any): void {
        this._newDefinitionDialog = false;
        state.action = ExplorerActions.CompletedBuilds;

        // open template dialog
        this._templateAction();
    }

    private _showLeftTree(viewType: ViewsCommon.BuildViewType, state: any) {
        if (viewType === ViewsCommon.BuildViewType.Explorer || viewType === ViewsCommon.BuildViewType.Designer) {
            // Hide plan tree if visible
            if (this._planTree) {
                this._planTree.visible(false);
            }

            // Ensure the existence of definition tree
            if (!this._definitionTree) {
                this._definitionTree = new DefinitionTree.DefinitionExplorerTab({
                    xamlOnly: this.xamlOnly(),
                    filterAction: this._filterActionDelegate,
                    definitionAction: this._definitionActionDelegate
                });
                this._disposables.push(this._definitionTree);
                ko.applyBindings(this._definitionTree, this.getElement().find(".buildvnext-view-left-pane-content.definition-tree")[0]);

                // Now set the definitiontree that is created
                // this_definitionSearch should be initialized by now, in any case, since _showLeftTree is always called after initToolbar
                // but, adding check just in case to be safe..
                if (this._definitionSearch) {
                    this._definitionSearch.definitionTree = this._definitionTree;
                }
            }

            // Show definition tree
            this._definitionTree.visible(true);
        }
        else if (viewType === ViewsCommon.BuildViewType.Result) {
            // Hide definition tree if visible
            if (this._definitionTree) {
                this._definitionTree.visible(false);
            }

            // Ensure the existence of plan tree
            if (!this._planTree) {
                this._planTree = new PlanTree.BuildPlanNodesTreeTab();
                ko.applyBindings(this._planTree, this.getElement().find(".buildvnext-view-left-pane-content.plan-tree")[0]);
            }

            // Show plan tree
            this._planTree.visible(true);
        }
    }

    private _showView(viewType: ViewsCommon.BuildViewType, state: any): void {
        // Hide existing view
        if (this._view) {
            this._view.dispose();
            this._view = null;
        }

        var type = buildViewStore[viewType];
        if (type) {
            // Set current view type
            this._viewType = viewType;

            // Get instance name of the view
            var instanceName = <string>type.INSTANCE_NAME;

            // Get proper left tree to pass the view
            var leftTree: KnockoutPivot.BasicPivotTab = null;
            if (viewType === ViewsCommon.BuildViewType.Explorer || viewType === ViewsCommon.BuildViewType.Designer) {
                leftTree = this._definitionTree;
            } else if (viewType === ViewsCommon.BuildViewType.Result) {
                leftTree = this._planTree;
            }

            // Add element for right content
            var element = $("<div />")
                .attr("id", "buildvnext-view-" + instanceName)
                .attr("data-bind", "template: 'buildvnext_view_" + instanceName + "_rightpane'")
                .appendTo(this.getElement().find(".right-hub-content"));

            // Enhance the view using new DOM element
            this._view = <BuildView>Controls.Enhancement.enhance(type, element, { leftTree: leftTree });

            // Set appropriate class name for the whole view
            this._setViewClass(viewType);
        }
    }

    private _setViewClass(viewType: ViewsCommon.BuildViewType): void {
        this.getElement()
            .removeClass("buildvnext-definition-explorer-view")
            .removeClass("buildvnext-definition-details-view")
            .removeClass("buildvnext-definition-designer");

        switch (viewType) {
            case ViewsCommon.BuildViewType.Explorer:
                this.getElement().addClass("buildvnext-definition-explorer-view");
                break;

            case ViewsCommon.BuildViewType.Result:
                this.getElement().addClass("buildvnext-definition-details-view");
                break;

            case ViewsCommon.BuildViewType.Designer:
                this.getElement().addClass("buildvnext-definition-designer");
                break;
        }
    }

    private _onDefinitionTreeRefreshed() {
        this._definitionTreeRefreshed = true;
        this._endPerformanceScenario();
    }

    private _onGridUpdated() {
        this._gridUpdated = true;
        this._endPerformanceScenario();
    }

    private _endPerformanceScenario() {
        if (this._definitionTreeRefreshed && this._gridUpdated) {
            BuildPerformance.endPageLoadScenario();
        }
    }
}

export class BuildDefinitionsSearchControl extends SidebarSearch {
    public definitionTree: DefinitionTree.DefinitionExplorerTab;

    constructor(options?) {
        super(options);
        if (options.definitionTree) {
            this.definitionTree = options.definitionTree;
        }
        super(options);
    }

    public getSearchWaterMarkText() {
        return BuildResources.BuildListViewSearchDefinitons;
    }

    public initialize() {
        super.initialize();
    }

    public executeSearch(searchText) {
        if (this.definitionTree) {
            this.definitionTree.filterSections(searchText);
        }
    }

    public clearSearch() {
        if (this.definitionTree) {
            this.definitionTree.resetFilteredSections();
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Views", exports);
