/// <reference types="jquery" />

import Q = require("q");

import VSS = require("VSS/VSS");
import Navigation = require("VSS/Controls/Navigation");
import Splitter = require("VSS/Controls/Splitter");
import Controls = require("VSS/Controls");
import Service = require("VSS/Service");
import Diag = require("VSS/Diag");
import Contributions_Services = require("VSS/Contributions/Services");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Telemetry = require("VSS/Telemetry/Services");

import TFS_Agile = require("Agile/Scripts/Common/Agile");
import Utils_String = require("VSS/Utils/String");
import AgileProductBacklogResources = require("Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog");
import { BacklogsToolPanel } from "Agile/Scripts/Backlog/ProductBacklogMru";
import Events = require("Agile/Scripts/Backlog/Events");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import { PromiseState } from 'TFSUI/Common/Constants';
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { RightPanelExtensionIds } from "Agile/Scripts/Generated/HubConstants";

// Important: Only use type information from the imports.
// Otherwise it will be a real dependency and break the async loading.
import CapacityPanel_Async = require("Agile/Scripts/Capacity/CapacityPanel");
import MappingPanel_Async = require("Agile/Scripts/Backlog/ProductBacklogMappingPanel");
import { IContributedPanel } from "Agile/Scripts/Common/Agile";

const PANEL_SPLITTER_MIN_WIDTH = 210;

export abstract class BacklogsPanelPivotFilterManager {

    static TELEMETRY_EVENT_BACKLOG_PANEL_CHANGED = "BacklogsPanelSelectionChanged";
    static TELEMETRY_EVENT_BACKLOG_PANEL_SELECTION_ONLOAD = "BacklogsPanelSelectionOnLoad";

    protected _backlogsPaneFilter: Navigation.PivotFilter;
    protected _splitter: Splitter.Splitter;
    protected _currentContributedToolPanel: IContributedPanel;
    protected _getSelectedWorkItems: () => Events.IBacklogGridItem[];
    protected _eventHelper: ScopedEventHelper;
    private _toolPanelItems: Navigation.IPivotFilterItem[] = [];

    protected _getBacklogsRightPanePivotFilterContainer = () => $(".backlogs-right-pane-pivot-filter");
    protected _getDefaultToolPanelContainer = () => $(".backlogs-default-tool-panel-container");
    protected _getExtensionToolPanelContainer = () => $(".backlogs-extension-tool-panel-container");

    constructor(selectedWorkItems: () => Events.IBacklogGridItem[], eventHelper: ScopedEventHelper) {
        this._getSelectedWorkItems = selectedWorkItems;
        this._eventHelper = eventHelper;

        // Get the splitter and store a reference
        this._splitter = <Splitter.Splitter>Controls.Enhancement.ensureEnhancement(Splitter.Splitter, $(".right-hub-splitter"));

        // For backlogs, the setting for expanding / collapsing the right pane is stored on the client, not the server
        // Set the below member to null to force the server flag to be ignored
        if (this._splitter) {
            this._splitter.expandState = null;
        }

        this._setSplitterMinWidth();
    }

    private _setSplitterMinWidth() {
        if (this._splitter) {
            this._splitter.setMinWidth(PANEL_SPLITTER_MIN_WIDTH);
        }
    }

    protected _initialize() {
        this._createOrRefreshPivotFilters();

        this._eventHelper.attachEvent(Events.BacklogNotifications.BACKLOG_GRID_SELECTION_CHANGED,
            (source, args: Events.IBacklogGridSelectionChangedEventArgs) => {
                this._notifyExtensionForSelectionChange(args.selectedWorkItems);
            }
        );
    }

    protected _isPivotFilterAvailable(): boolean {
        return true;
    }

    protected _createOrRefreshPivotFilters() {
        if (!this._isPivotFilterAvailable()) {
            // Hide splitter and pivot filters
            let $backlogsPanelPivotFilter = this._getBacklogsRightPanePivotFilterContainer();
            $backlogsPanelPivotFilter.addClass("agile-important-hidden");
            $backlogsPanelPivotFilter.empty();
            this._backlogsPaneFilter = null;
            this._toolPanelItems = [];
            this._splitter.noSplit();
            return;
        }

        let promises: IPromise<Navigation.IPivotFilterItem[]>[] = [];
        promises.push(this._getContributedMenuItems());

        const extensionsLoaded = Q.allSettled(promises).then(
            (settledPromises) => {
                this._toolPanelItems = [];
                let extensionsInstalled = false;
                for (let promise of settledPromises) {
                    if (promise.state === PromiseState.Fulfilled) {
                        this._toolPanelItems.push(...promise.value);
                        extensionsInstalled = promise.value.length > 0;
                    }
                }
                this._toolPanelItems.splice(0, 0, ...this._getDefaultMenuItems(extensionsInstalled));

                let $backlogsPanelPivotFilter = this._getBacklogsRightPanePivotFilterContainer();
                if (this._toolPanelItems && this._toolPanelItems.length === 1 &&
                    Utils_String.equals(this._toolPanelItems[0].value, BacklogsPanelPivotFilterValues.ToolPanel_Hidden, true)) {
                    // Hide splitter and pivot filters
                    $backlogsPanelPivotFilter.addClass("agile-important-hidden");
                    this._splitter.noSplit();
                } else {
                    // Set selected item
                    let mrustate = this._getMRUPane() || this._getDefaultPivotFilterSelection();
                    for (let menuItem of this._toolPanelItems) {
                        menuItem.selected = Utils_String.equals(mrustate, menuItem.value, true);
                    }

                    let $container = this._getBacklogsRightPanePivotFilterContainer();
                    $container.empty();

                    // Initialize pivot filter and store a reference                       
                    let pivotFilterOptions: Navigation.IPivotFilterOptions = {
                        text: this._getDefaultFilterTitle(extensionsInstalled),
                        items: this._toolPanelItems,
                        change: (item: Navigation.IPivotFilterItem) => {
                            this._setMRUPane(item.value);
                            this._handleTogglePivotFilter(item.value, true);
                            RecordBacklogsPanelTelemetry(
                                BacklogsPanelPivotFilterManager.TELEMETRY_EVENT_BACKLOG_PANEL_CHANGED,
                                this._getBacklogsPanelArea(),
                                item.value
                            );
                        }
                    };

                    if (extensionsInstalled) {
                        pivotFilterOptions.behavior = "dropdown";
                    }
                    else {
                        pivotFilterOptions.behavior = "select";
                    }
                    this._backlogsPaneFilter = <Navigation.PivotFilter>Controls.BaseControl.create(Navigation.PivotFilter, $container, pivotFilterOptions);
                    $backlogsPanelPivotFilter.removeClass("agile-important-hidden");

                    let selectedPivotFilterValue = this._backlogsPaneFilter.getSelectedItem().value;
                    this._handleTogglePivotFilter(selectedPivotFilterValue, false);

                    RecordBacklogsPanelTelemetry(
                        BacklogsPanelPivotFilterManager.TELEMETRY_EVENT_BACKLOG_PANEL_SELECTION_ONLOAD,
                        this._getBacklogsPanelArea(),
                        selectedPivotFilterValue
                    );
                }
            },
            (reason) => {
                // Hide splitter and pivot filters
                let $backlogsPanelPivotFilter = this._getBacklogsRightPanePivotFilterContainer();
                $backlogsPanelPivotFilter.addClass("agile-important-hidden");
                this._splitter.noSplit();
            }
        );

        ProgressAnnouncer.forPromise(extensionsLoaded, {
            announceStartMessage: AgileProductBacklogResources.ProductBacklogLoading_RightPaneExtesionStart,
            announceEndMessage: AgileProductBacklogResources.ProductBacklogLoading_RightPaneExtesionEnd,
            announceErrorMessage: AgileProductBacklogResources.ProductBacklogLoading_RightPaneError
        });
    }

    protected _handleTogglePivotFilter(value: string, userToggle: boolean): void {
        switch (value) {
            case BacklogsPanelPivotFilterValues.ToolPanel_Hidden:
                this._splitter.noSplit();
                break;
            default:
                let showContributedToolPanel = false;
                for (let item of this._toolPanelItems) {
                    if (Utils_String.equals(item.value, value, true)) {
                        showContributedToolPanel = true;
                    }
                }
                if (showContributedToolPanel) {
                    this._showContributedToolPanel(value);
                }
                else {
                    this._splitter.noSplit();
                }
                break;
        }
    }

    protected _getDefaultMenuItems(isDropdown: boolean): Navigation.IPivotFilterItem[] {
        return [{
            id: BacklogsPanelPivotFilterValues.ToolPanel_Hidden,
            text: AgileProductBacklogResources.ToolPanel_Off,
            value: BacklogsPanelPivotFilterValues.ToolPanel_Hidden,
        }];
    }

    protected _getDefaultFilterTitle(isDropdown: boolean): string {
        return isDropdown ? AgileProductBacklogResources.ToolPanel_FilterTitle : AgileProductBacklogResources.ToolPanel_Mapping;
    }

    protected _getContributedMenuItems(): IPromise<Navigation.IPivotFilterItem[]> {
        let targets = this._getTargetsForContributedToolPanel();
        if (targets && targets.length > 0) {
            return Service.getService(Contributions_Services.ExtensionService).getContributionsForTargets(targets).then((contributions: Contribution[]) => {
                let contributedMenuItems: Navigation.IPivotFilterItem[] = [];
                if (contributions && contributions.length > 0) {
                    for (let contribution of contributions) {
                        let contributionId = contribution.id;
                        let contributionTitle = contribution.properties["title"];
                        let contributionName = contribution.properties["name"];
                        contributedMenuItems.push({
                            id: contributionId,
                            text: contributionName,
                            title: contributionTitle || contributionName,
                            value: contributionId,
                        });
                    };
                }
                return contributedMenuItems;
            });
        }
        else {
            return Q([]);
        }
    }

    protected _showContributedToolPanel(contributionId: string) {
        this._getDefaultToolPanelContainer().hide();
        let $contributedContent = this._getExtensionToolPanelContainer();
        $contributedContent.show();
        $contributedContent.empty();
        this._currentContributedToolPanel = null;
        Contributions_Controls.createExtensionHost($contributedContent, contributionId, {}).then((host) => {
            Service.getService(Contributions_Services.ExtensionService).getContribution(contributionId).then((contribution) => {

                host.getRegisteredInstance<IContributedPanel>(contribution.properties["registeredObjectId"]).then((instance) => {
                    this._currentContributedToolPanel = instance;
                    let selectedWorkItems: Events.IBacklogGridItem[] = $.isFunction(this._getSelectedWorkItems) ? this._getSelectedWorkItems() : [];
                    this._notifyExtensionForSelectionChange(selectedWorkItems);
                });
            });
        });

        this._splitter.split();
    }

    protected _notifyExtensionForSelectionChange(selectedWorkItems: Events.IBacklogGridItem[]) {
        if (this._currentContributedToolPanel) {
            if (this._currentContributedToolPanel.workItemSelectionChanged && typeof (this._currentContributedToolPanel.workItemSelectionChanged) === "function") {
                let eventArgs = [];
                for (let item of selectedWorkItems) {
                    eventArgs.push({
                        workItemId: item.workItemId,
                        workItemType: item.workItemType
                    });
                }
                this._currentContributedToolPanel.workItemSelectionChanged(eventArgs);
            }
        }
    }

    protected _getMRUPane(): string {
        return BacklogsPanelPivotFilterValues.ToolPanel_Hidden;
    }


    protected _getTargetsForContributedToolPanel(): string[] {
        return null;
    }

    protected _getDefaultPivotFilterSelection(): string {
        return BacklogsPanelPivotFilterValues.ToolPanel_Hidden;
    }

    protected abstract _setMRUPane(value: string): void;

    protected abstract _getBacklogsPanelArea(): string;
}

export class ProductBacklogsPanelPivotFilterManager extends BacklogsPanelPivotFilterManager {

    private _isRootBacklog: boolean;
    private _mappingPanelOptions: MappingPanel_Async.IMappingPanelOptions;

    constructor(isRootBacklog: boolean, mappingPanelOptions: MappingPanel_Async.IMappingPanelOptions, selectedWorkItems: () => Events.IBacklogGridItem[], eventHelper: ScopedEventHelper) {
        super(selectedWorkItems, eventHelper);
        this._isRootBacklog = isRootBacklog;
        this._mappingPanelOptions = mappingPanelOptions;
        this._eventHelper = eventHelper;
        this._initialize();
    }

    public refreshPivotFilters(isRootBacklog: boolean, mappingPanelOptions: MappingPanel_Async.IMappingPanelOptions) {
        this._isRootBacklog = isRootBacklog;
        this._mappingPanelOptions = mappingPanelOptions;
        this._createOrRefreshPivotFilters();
    }

    protected _getDefaultMenuItems(isDropdown: boolean): Navigation.IPivotFilterItem[] {
        let areAdvancedFeaturesEnabled = TFS_Agile.areAdvancedBacklogFeaturesEnabled(false);
        let portfolioBacklogExists = BacklogConfigurationService.getBacklogConfiguration().portfolioBacklogs.length !== 0;

        let menuItems = super._getDefaultMenuItems(isDropdown);
        if (!this._isRootBacklog && areAdvancedFeaturesEnabled && portfolioBacklogExists) {
            menuItems.push({
                id: BacklogsPanelPivotFilterValues.ToolPanel_Mapping,
                text: isDropdown ? AgileProductBacklogResources.ToolPanel_Mapping : AgileProductBacklogResources.MappingPane_On,
                value: BacklogsPanelPivotFilterValues.ToolPanel_Mapping,
            });
        }
        return menuItems;
    }

    protected _isPivotFilterAvailable(): boolean {
        return !this._isRootBacklog;
    }

    protected _handleTogglePivotFilter(value: string, userToggle: boolean): void {
        switch (value) {
            case BacklogsPanelPivotFilterValues.ToolPanel_Mapping:
                Diag.logTracePoint('Backlog.MappingPaneToggleOn.start');
                const mappingPanelAnnouncer = new ProgressAnnouncer({
                    announceStartMessage: AgileProductBacklogResources.ProductBacklogLoading_MappingPaneStart,
                    announceEndMessage: AgileProductBacklogResources.ProductBacklogLoading_MappingPaneEnd
                })
                VSS.requireModules(["Agile/Scripts/Backlog/ProductBacklogMappingPanel"])
                    .spread((MappingPanel: typeof MappingPanel_Async) => {
                        this._afterMappingPanelLoaded(MappingPanel, /* setFocus: */ userToggle, mappingPanelAnnouncer);
                    });
                break;
            default:
                super._handleTogglePivotFilter(value, userToggle);
                break;
        }
    }

    protected _afterMappingPanelLoaded(MappingPanel: typeof MappingPanel_Async, setFocus: boolean, mappingPanelAnnouncer: ProgressAnnouncer): void {
        if (this._mappingPanelOptions) {
            this._mappingPanelOptions.setFocus = setFocus;
            this._mappingPanelOptions.announcer = mappingPanelAnnouncer;
            this._mappingPanelOptions.eventHelper = this._eventHelper;
        }
        MappingPanel.createOrRefreshMappingPanel(this._mappingPanelOptions);
        this._getExtensionToolPanelContainer().hide();
        this._getDefaultToolPanelContainer().show();
        this._splitter.split();
    }

    protected _getMRUPane(): string {
        return BacklogsToolPanel.getMRUPanel(this._getBacklogsPanelArea());
    }

    protected _setMRUPane(value: string): void {
        BacklogsToolPanel.setMRUPanel(this._getBacklogsPanelArea(), value);
    }

    protected _getTargetsForContributedToolPanel(): string[] {
        const isRequirementBacklog = TFS_Agile.BacklogContext.getInstance().isRequirement;
        return [(isRequirementBacklog ? RightPanelExtensionIds.RequirementBacklog : RightPanelExtensionIds.PortfolioBacklog)];
    }

    protected _getBacklogsPanelArea(): string {
        return BacklogsToolPanel.AREA_PRODUCTBACKLOG;
    }
}

export class IterationBacklogPivotFilterManager extends BacklogsPanelPivotFilterManager {
    protected _options: CapacityPanel_Async.ICapacityPanelOptions;

    constructor(options: CapacityPanel_Async.ICapacityPanelOptions, selectedWorkItems: () => Events.IBacklogGridItem[], eventHelper: ScopedEventHelper) {
        super(selectedWorkItems, eventHelper);
        this._options = options;
        this._initialize();
    }

    protected _getDefaultMenuItems(isDropdown: boolean): Navigation.IPivotFilterItem[] {
        let menuItems = super._getDefaultMenuItems(isDropdown);
        menuItems.push({
            id: BacklogsPanelPivotFilterValues.ToolPanel_Capacity,
            text: isDropdown ? AgileProductBacklogResources.ToolPanel_Capacity : AgileProductBacklogResources.MappingPane_On,
            value: BacklogsPanelPivotFilterValues.ToolPanel_Capacity,
        });
        return menuItems;
    }

    protected _getDefaultFilterTitle(isDropdown: boolean): string {
        return isDropdown ? AgileProductBacklogResources.ToolPanel_FilterTitle : AgileProductBacklogResources.ToolPanel_Capacity;
    }

    protected _handleTogglePivotFilter(value: string, userToggle: boolean): void {
        switch (value) {
            case BacklogsPanelPivotFilterValues.ToolPanel_Capacity:
                let updateToolPanelContainer = () => {
                    this._getExtensionToolPanelContainer().hide();
                    this._getDefaultToolPanelContainer().show();
                    this._splitter.split();
                };
                if ($(".capacity-pane").length === 0) {
                    VSS.requireModules(["Agile/Scripts/Capacity/CapacityPanel"])
                        .spread((CapacityPanel: typeof CapacityPanel_Async) => {
                            new CapacityPanel.CapacityPanel(this._options);
                            updateToolPanelContainer();
                        });
                }
                else {
                    updateToolPanelContainer();
                }
                break;
            default:
                super._handleTogglePivotFilter(value, userToggle);
                break;
        }
    }

    protected _getTargetsForContributedToolPanel(): string[] {
        return [RightPanelExtensionIds.IterationBacklog];
    }

    protected _getMRUPane(): string {
        return BacklogsToolPanel.getMRUPanel(this._getBacklogsPanelArea());
    }

    protected _setMRUPane(value: string): void {
        BacklogsToolPanel.setMRUPanel(this._getBacklogsPanelArea(), value);
    }

    protected _getBacklogsPanelArea(): string {
        return BacklogsToolPanel.AREA_ITERATIONBACKLOG;
    }

    protected _getDefaultPivotFilterSelection(): string {
        return BacklogsPanelPivotFilterValues.ToolPanel_Capacity;
    }
}

export class CapacityPlanningPivotFilterManager extends IterationBacklogPivotFilterManager {
    protected _getTargetsForContributedToolPanel(): string[] {
        return [];
    }

    protected _getContributedMenuItems(): IPromise<Navigation.IPivotFilterItem[]> {
        return Q([]);
    }

    protected _getMRUPane(): string {
        return BacklogsToolPanel.getMRUPanel(this._getBacklogsPanelArea());
    }

    protected _setMRUPane(value: string): void {
        BacklogsToolPanel.setMRUPanel(this._getBacklogsPanelArea(), value);
    }

    protected _getBacklogsPanelArea(): string {
        return BacklogsToolPanel.AREA_CAPACITYPLANNING;
    }
}

export module BacklogsPanelPivotFilterValues {
    export const ToolPanel_Hidden = "AGILE_TOOL_PANEL_HIDDEN";
    export const ToolPanel_Mapping = "AGILE_TOOL_PANEL_MAPPING";
    export const ToolPanel_Capacity = "AGILE_TOOL_PANEL_CAPACITY";
}

function RecordBacklogsPanelTelemetry(scenario: string, area: string, panelId: string) {
    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
        CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
        CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_BACKLOGS_PANEL,
        {
            scenario: scenario,
            area: area,
            panelId: panelId
        }
    ));
}
