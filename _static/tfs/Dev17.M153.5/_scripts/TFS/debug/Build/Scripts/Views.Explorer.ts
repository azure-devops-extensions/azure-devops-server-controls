/// <reference types="jquery" />

import ko = require("knockout");
import Q = require("q");

import BaseDefinitionModel = require("Build/Scripts/BaseDefinitionModel");
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");
import BuildsTab = require("Build/Scripts/Explorer.BuildsTab");
import BuildTags = require("Build/Scripts/Controls.Tags");
import BuildViews = require("Build/Scripts/Views");
import CompletedBuildsTab = require("Build/Scripts/Explorer.CompletedBuildsTab");
import Context = require("Build/Scripts/Context");
import DeletedBuildsTab = require("Build/Scripts/Explorer.DeletedBuildsTab");
import PivotFilter = require("Build/Scripts/Controls.PivotFilter");
import QueuedBuildsTab = require("Build/Scripts/Explorer.QueuedBuildsTab");
import Telemetry = require("Build/Scripts/Telemetry");
import ViewsCommon = require("Build/Scripts/Views.Common");
import XamlBuildControls = require("Build/Scripts/Controls.Xaml");

import { DesignerActions, ExplorerActions } from "Build.Common/Scripts/Linking";
import { BuildCustomerIntelligenceInfo } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import KnockoutPivot = require("DistributedTasksCommon/TFS.Knockout.HubPageExplorerPivot");

import BuildContracts = require("TFS/Build/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

var domElem = Utils_UI.domElem;

// represents the list views - queued, completed, deleted. tree on the left, grid on the right
class ListViewModel extends KnockoutPivot.BaseTabViewModel {
    // main tabs
    private _queuedTab: QueuedBuildsTab.QueuedBuildsTab;
    private _completedTab: CompletedBuildsTab.CompletedBuildsTab;
    private _deletedTab: DeletedBuildsTab.DeletedBuildsTab;

    public filters: KnockoutComputed<PivotFilter.PivotFilter[]>;

    constructor() {
        super();

        // main tabs
        this._queuedTab = new QueuedBuildsTab.QueuedBuildsTab();
        this._completedTab = new CompletedBuildsTab.CompletedBuildsTab();
        this._deletedTab = new DeletedBuildsTab.DeletedBuildsTab();

        this.tabs.push(this._queuedTab);
        this.tabs.push(this._completedTab);
        this.tabs.push(this._deletedTab);

        this.filters = ko.computed({
            read: () => {
                var selectedTab: string = this.selectedTab();

                if (Utils_String.localeIgnoreCaseComparer(selectedTab, this._queuedTab.id) === 0) {
                    return this._queuedTab.filters();
                }
                else if (Utils_String.localeIgnoreCaseComparer(selectedTab, this._completedTab.id) === 0) {
                    return this._completedTab.filters();
                }
                else if (Utils_String.localeIgnoreCaseComparer(selectedTab, this._deletedTab.id) === 0) {
                    return this._deletedTab.filters();
                }
            }
        });
    }

    public refresh(): Q.IPromise<any> {
        if (this._queuedTab.isSelected()) {
            return this._queuedTab.refresh();
        }
        else if (this._completedTab.isSelected()) {
            return this._completedTab.refresh();
        }
        else if (this._deletedTab.isSelected()) {
            return this._deletedTab.refresh();
        }
        else {
            return Q(null);
        }
    }

    public dispose(): void {
        if (this.filters) {
            this.filters.dispose();
            this.filters = null;
        }
    }

    _onSelectedTabChanged(tab: string): void {
        super._onSelectedTabChanged(tab);
        var historySvc = Navigation_Services.getHistoryService();
        historySvc.addHistoryPoint(tab, historySvc.getCurrentState());
    }
}

class ViewModel extends Adapters_Knockout.TemplateViewModel {
    public listView: ListViewModel;

    public selectedTab: KnockoutComputed<string>;
    public hubTitle: KnockoutComputed<string>;
    public description: KnockoutComputed<string>;
    public isDefinition: KnockoutComputed<boolean>;
    public canEditDefinition: KnockoutComputed<boolean>;

    // tags
    public tags: BuildTags.TagsViewModel;

    constructor() {
        super();

        // main views
        this.listView = new ListViewModel();

        // selected tab
        this.selectedTab = ko.computed({
            read: () => {
                return this.listView.selectedTab();
            },
            write: (newValue: string) => {
                // select tab
                this.listView.selectedTab(newValue);
            }

        });
        this._addDisposable(this.selectedTab);

        // is the selected item a definition?
        this.isDefinition = ko.computed({
            read: () => {
                return !!Context.definitionContext.selectedDefinition();
            }
        });
        this._addDisposable(this.isDefinition);

        // if the selected item is a definition, can it be edited?
        this.canEditDefinition = ko.computed(() => {
            var selectedDefinition = Context.definitionContext.selectedDefinition();
            if (selectedDefinition) {
                return selectedDefinition.definitionType() === BuildContracts.DefinitionType.Build;
            }
        });
        this._addDisposable(this.canEditDefinition);

        // hub title
        this.hubTitle = ko.computed({
            read: () => {
                var selectedDefinition = Context.definitionContext.selectedDefinition();
                if (selectedDefinition) {
                    return selectedDefinition.name();
                }
                else if (Context.definitionContext.selectedDefinitionType() === BuildContracts.DefinitionType.Xaml) {
                    return BuildResources.AllXamlDefinitions;
                }
                else {
                    return BuildResources.AllBuildDefinitions;
                }
            }
        });
        this._addDisposable(this.hubTitle);

        // description
        this.description = ko.computed({
            read: () => {
                var selectedDefinition = Context.definitionContext.selectedDefinition();
                if (!selectedDefinition) {
                    return "";
                }

                return selectedDefinition.description();
            }
        });
        this._addDisposable(this.description);

        // tags
        this.tags = new BuildTags.TagsViewModel({
            tagLabel: BuildResources.TagFilterLabel
        });

        this._addDisposable(this.tags.tags.subscribe((newValue: string[]) => {
            Context.viewContext.tags(newValue);
        }));

        this._addDisposable(this.listView.filters);
    }

    dispose(): void {
        super.dispose();
        if (this.listView) {
            this.listView.dispose();
        }
    }

    public refresh(): Q.IPromise<void> {
        return this.listView.refresh();
    }
}

export class BuildDefinitionExplorerView extends BuildViews.BuildView {
    public static INSTANCE_NAME = "explorer";
    private _viewModel: ViewModel;
    private _tagsControl: BuildTags.TagsControl;
    private _editLinkHandler: JQueryEventHandler;
    private _menuReactor: KnockoutComputed<any>;

    private _performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "BuildDefinitionExplorerView");

    constructor(options?: any) {
        super(options);
    }

    public initialize() {
        // Apply right pane
        this._viewModel = new ViewModel();
        ko.applyBindings(this._viewModel, this.getElement()[0]);

        // Apply hub-title
        this._titleElement = $("<div />")
            .attr("data-bind", "template: 'buildvnext_view_" + BuildDefinitionExplorerView.INSTANCE_NAME + "_hubtitle'")
            .appendTo(".hub-title.ko-target");

        ko.applyBindings(this._viewModel, this._titleElement[0]);
        super.initialize();
        this._titleElement.on("click", ".edit-definition", this._editLinkHandler = (evt: JQueryEventObject) => {
            var definition = Context.definitionContext.selectedDefinition();
            if (definition) {
                Navigation_Services.getHistoryService().addHistoryPoint(DesignerActions.SimpleProcess, $.extend(ViewsCommon.BuildActionIds.getDefaultState(), { definitionId: definition.id(), favDefinitionId: null }));
            }

            return false;
        });

        // tags
        var $tags: JQuery = this._element.find(".build-list-tags");
        this._tagsControl = <BuildTags.TagsControl>Controls.BaseControl.createIn(BuildTags.TagsControl, $tags, this._viewModel.tags);

        this._menuReactor = ko.computed({
            read: () => {
                var definitionIsSelected = (this._viewModel && this._viewModel.isDefinition()) || false;
                var selectedGridRow: BuildContracts.Build = BuildsTab.selectedGridRow();
                var menuItems: any[] = [];

                // get the deleted tab for show/hide based on selected definition type
                var deletedTab;
                if (this._viewModel) {
                    var tabs = this._viewModel.listView.tabs();
                    deletedTab = tabs.filter((tab) => {
                        return tab.id === Context.BuildExplorerActionIds.Deleted;
                    })[0];
                }

                menuItems.push({
                    id: "refresh-grid",
                    title: BuildResources.Refresh,
                    icon: "icon-refresh",
                    showText: false,
                    action: () => {
                        if (this._viewModel) {
                            this._viewModel.refresh();
                        }
                    }
                });
                menuItems.push({ separator: true });
                menuItems.push({
                    id: "queue-new-build",
                    text: BuildResources.QueueBuildMenuItemText,
                    title: BuildResources.QueueBuildMenuItemTooltip,
                    setTitleOnlyOnOverflow: true,
                    noIcon: false,
                    icon: "icon-queue-build",
                    action: () => {
                        var definitionModel = Context.definitionContext.selectedDefinition();
                        var performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "QueueBuild");

                        if (!definitionModel) {
                            if (selectedGridRow) {
                                let definitionPromise = null;
                                const definitionId = selectedGridRow.definition.id;
                                if (selectedGridRow.definition.type === BuildContracts.DefinitionType.Xaml) {
                                    definitionPromise = Context.viewContext.buildDefinitionManager.getXamlDefinition(definitionId);
                                }
                                else {
                                    definitionPromise = Context.viewContext.buildDefinitionManager.getDefinition(definitionId);
                                }

                                definitionPromise.then((definition: BuildContracts.BuildDefinition) => {
                                    performance.addSplitTiming("retrieved definition");
                                    definitionModel = new BaseDefinitionModel.BaseDefinitionModel(definition);
                                    Context.viewContext.queueBuild(definitionModel, performance, Telemetry.Sources.Explorer).then(() => {
                                        performance.end();
                                    });
                                });
                            }
                        }
                        else {
                            Context.viewContext.queueBuild(definitionModel, performance, Telemetry.Sources.Explorer).then(() => {
                                performance.end();
                            });
                        }
                    },
                    disabled: !definitionIsSelected && !selectedGridRow
                });
                // If the definition is selected and cannot be edited, this should be xaml
                // or if all xaml nodes is selected
                var xamlDefSelected = definitionIsSelected && (this._viewModel && !this._viewModel.canEditDefinition());
                var xamlAllNodesSelected = (this._viewModel && (this._viewModel.hubTitle() === BuildResources.AllXamlDefinitions)) || false;
                if (xamlDefSelected || xamlAllNodesSelected) {
                    // don't show the deleted tab for xaml
                    if (deletedTab) {
                        deletedTab.hide();
                    }

                    // don't show the tags for xaml
                    if (this._tagsControl) {
                        this._tagsControl.hideElement();
                    }

                    menuItems.push({
                        id: "manage-build-qualities",
                        title: BuildResources.ManageBuildQualitiesToolbarText,
                        text: BuildResources.ManageBuildQualitiesToolbarText,
                        setTitleOnlyOnOverflow: true,
                        showText: true,
                        noIcon: true,
                        action: () => {
                            XamlBuildControls.BuildDialogs.manageXamlQualities({
                                okCallback: (buildQualityInfo: any) => {
                                    var itemsAdded = buildQualityInfo.pendingAdds;
                                    var itemsRemoved = buildQualityInfo.pendingDeletes
                                    Context.viewContext.buildClient.updateXamlQualities(itemsAdded, itemsRemoved).then(() => {
                                        Context.viewContext.xamlQualities(buildQualityInfo.sourceList || []);
                                    });
                                },
                                qualities: ko.utils.arrayPushAll([], Context.viewContext.xamlQualities.peek())
                            });
                        }
                    });
                }
                else {
                    // show deleted tab
                    if (deletedTab) {
                        deletedTab.show();
                    }

                    // show tags
                    if (this._tagsControl) {
                        this._tagsControl.showElement();
                    }
                }
                this._menuBar.updateItems(menuItems);
            }
        });

        this._viewModel.listView.renderPivotView(this.getElement());

        this._performance.addSplitTiming("initialized");
        this._performance.end();
    }

    public dispose(): void {
        if (this._editLinkHandler) {
            this._titleElement.off("click", ".edit-definition");
            this._editLinkHandler = null;
        }

        // Clean hub-title
        if (this._titleElement) {
            ko.cleanNode(this._titleElement[0]);
            this._titleElement.remove();
            this._titleElement = null;
        }

        // Dispose view model
        if (this._viewModel) {
            this._viewModel.dispose();
            this._viewModel = null;
        }

        // Dispose queued build control
        var queuedBuildControl = Controls.BaseControl.getInstance(Controls.BaseControl, this.getElement().find(".buildvnext-explorer-queued-build-grid").parent());
        if (queuedBuildControl) {
            queuedBuildControl.dispose();
        }

        // Dispose completed build control
        var completedBuildControl = Controls.BaseControl.getInstance(Controls.BaseControl, this.getElement().find(".buildvnext-explorer-completed-build-grid").parent());
        if (completedBuildControl) {
            completedBuildControl.dispose();
        }

        // Dispose tags control
        if (this._tagsControl) {
            this._tagsControl.dispose();
            this._tagsControl = null;
        }

        super.dispose();
    }

    public onNavigate(state: any) {
        super.onNavigate(state);
        this._updateState(state);
    }

    private _updateState(state: any) {
        if (this._viewModel && state) {
            if (ViewsCommon.BuildActionIds.getViewType(state.action) === ViewsCommon.BuildViewType.Explorer) {
                var performance = Performance.getScenarioManager().startScenario(BuildCustomerIntelligenceInfo.Area, "BuildDefinitionExplorerUpdateState");
                
                var refreshPromise: Q.IPromise<any> = Q(null);

                BuildsTab.selectedGridRow(null);
                var originalTab = this._viewModel.selectedTab.peek();
                this._viewModel.selectedTab(state.action || ExplorerActions.CompletedBuilds);

                if (state.refresh && this._viewModel.selectedTab.peek() === originalTab) {
                    performance.addSplitTiming("Refresh viewModel");
                    refreshPromise = this._viewModel.refresh().then(() => {
                        performance.addSplitTiming("Refresh complete");
                    });

                    state.refresh = null;
                    Navigation_Services.getHistoryService().replaceHistoryPoint(state.action, state, null, true);
                }

                // tags
                if (state.tags) {
                    performance.addSplitTiming("Start update tags viewmodel");
                    this._viewModel.tags.tags(state.tags.split(","));
                    performance.addSplitTiming("Finish update tags viewmodel");
                }

                refreshPromise.then(() => {
                    performance.end();
                });
            }
        }
    }
}

BuildViews.buildViewUtils.registerBuildView(ViewsCommon.BuildViewType.Explorer, BuildDefinitionExplorerView);

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Views.Explorer", exports);

