import Q = require("q");
import { Control, Enhancement, create} from "VSS/Controls";
import Utils_UI = require("VSS/Utils/UI");
import Performance = require("VSS/Performance");
import VSS = require("VSS/VSS");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import * as Events_Action from "VSS/Events/Action";

import { Widget, WidgetScope, WidgetSize, WidgetMetadataResponse, DashboardGroup, Dashboard } from "TFS/Dashboards/Contracts";
import { DashboardEvents } from "Dashboards/Scripts/DashboardEvents";
import {ISettings, IWidgetHost} from "Dashboards/Scripts/Contracts";
import {BaseView} from "Dashboards/Scripts/BaseView";
import { DomClassNames } from "Dashboards/Scripts/Generated/Constants";
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import { DashboardGridOptions, DashboardGrid} from "Dashboards/Scripts/Grid";
import { WidgetSource } from "Dashboards/Scripts/WidgetSource";
import { DashboardPageExtension, DashboardHttpClientFactory, RefreshTimerEvents} from "Dashboards/Scripts/Common";
import {
    IWidgetBladeContext,
    IBlade,
    IBladeMenu,
    IBladeMenuOptions,
    IBladeOptions,
    IBladeActions,
    IBladeCatalogOptions,
    IWidgetPreviewOptions,
    IWidgetConfigurationContextOption,
    IBladeConfigurationOptions} from  "Dashboards/Scripts/BladeContracts";
import {BladeDimensions, BladeLevelConstants} from "Dashboards/Scripts/BladeConstants";
import {WidgetPreview} from "Dashboards/Scripts/Preview";
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";
import { KeyboardShortcuts } from "Dashboards/Scripts/KeyboardShortcuts";
import * as CreateDashboardDialog from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialog";

import BladeMenu = require("Dashboards/Scripts/BladeMenu");
import BladeCatalog = require("Dashboards/Scripts/BladeCatalog");
import Blade = require("Dashboards/Scripts/BladeCommon");
import BladeConfiguration = require("Dashboards/Scripts/BladeConfiguration");

export class AdminView extends BaseView {

    protected editMenu: DashboardEditMenu;
    protected dashboardMode: DashboardMode;
    protected bladeMenu: IBladeMenu;
    protected widgetPreview: WidgetPreview;
    protected isPreviewOpen: boolean;
    protected widgetsAdded: number = 0;
    protected requestToOpenQueued: boolean = false;

    public static CssClassGridBackgroundShow = "grid-background-show";

    private widgetWithActiveConfiguration: IWidgetHost;
    private static EscKeyEventNamespace = "keydown.adminView";

    constructor(options) {
        super(options);
         this.dashboardMode = new DashboardMode(true);
    }

    public initialize() {
        super.initialize();
        this.dashboardMode.onDashboardModeChange = (isEditMode: boolean) => this.onDashboardModeChange(isEditMode);

        Events_Action.getService().registerActionWorker(DashboardEvents.ToggleEditMode, (actionArgs: any, next: any) => {
            if (actionArgs.isEditing && (!this.bladeMenu || (this.bladeMenu && this.bladeMenu.isClosed()))) {
                this.openCatalog();
            }
            this.onModeToggle(actionArgs.isEditing);
            next(actionArgs);
        });

        Events_Action.getService().registerActionWorker(DashboardEvents.AddWidgetButtonClicked, (actionArgs: any, next: any) => {
            this.openCatalog();
            next(actionArgs);
        });

        Events_Action.getService().registerActionWorker(DashboardEvents.AddDashboardButtonClicked, (actionArgs: any, next: any) => {
            CreateDashboardDialog.show();
            next(actionArgs);
        });

        Events_Action.getService().registerActionWorker(DashboardEvents.ManageDashboardsButtonClicked, (actionArgs: any, next: any) => {
            this.onModeToggle(false);
            next(actionArgs);
        });

        Events_Action.getService().registerActionWorker(RefreshTimerEvents.OnRefresh,
            (actionArgs: any, next: any) => {
                this.onModeToggle(false);
                next(actionArgs);
            });

        if (DashboardPageExtension.isNewDashboardExperience()){
            this.addEscKeyEvent();
        }
    }

    public dispose(): void {
        Events_Action.getService().unregisterActionWorkers(DashboardEvents.ToggleEditMode);
        Events_Action.getService().unregisterActionWorkers(DashboardEvents.AddWidgetButtonClicked);
        Events_Action.getService().unregisterActionWorkers(DashboardEvents.AddDashboardButtonClicked);
        Events_Action.getService().unregisterActionWorkers(DashboardEvents.ManageDashboardsButtonClicked);
        Events_Action.getService().unregisterActionWorkers(RefreshTimerEvents.OnRefresh);

        this.removeEscKeyEvent();

        super.dispose();
    }

    private addEscKeyEvent(): void {
        $(document).on(AdminView.EscKeyEventNamespace, (eventObject: JQueryKeyEventObject): any => {
            var keyCode = eventObject.keyCode || eventObject.which;
            if (keyCode === Utils_UI.KeyCode.ESCAPE &&
                this.dashboardMode.isEditMode() && 
                this.bladeMenu)
            {
                if (this.bladeMenu.getActiveBlade().getLevel()
                    === BladeLevelConstants.CatalogBladeLevel) {
                    this.onModeToggle(false);
                    this.requestEditMode(false);
                }
            }
        });
    }

    public removeEscKeyEvent(): void {
        $(document).off(AdminView.EscKeyEventNamespace);
    }

    protected isEditMode(): boolean {
        return this.dashboardMode.isEditMode();
    }

    protected onBeforeDashboardUpdate(): IPromise<any> {
        if (this.bladeMenu) {
            return this.getBladeMenuInstance().requestCloseBlades().then(null, () => {
                // no-op if closing is rejected, i.e. user clicked "cancel" on confirmation dialog for dirty state
            });
        }
        else {
            return Q.resolve(null);
        }
    }

    protected onAfterDashboardUpdate(): IPromise<any> {
        if (this.editMenu) {
            this.editMenu.setFocus();
        }
        return Q.resolve(null);
    }

    protected loadDashboard(): void {
        super.loadDashboard();
        if (UserPermissionsHelper.CanEditDashboard()) {
            this.attachEditMenu();
        }

        // When dashboard is navigated from L2 new dashboard creation, change view to edit mode and open catalog
        if (DashboardPageExtension.isNewDashboard()) {
            DashboardPageExtension.removeIsNewFromUrl();
            if (DashboardPageExtension.isNewDashboardExperience()) {
                this.requestEditMode(true);
            }
            else {
                this.openCatalog();
            }
        }
    }

    protected requestEditMode(isEditing: boolean): void {
        Events_Action.getService().performAction(DashboardEvents.RequestEditModeToggle, { isEditing: isEditing });
    }

    protected requestHeaderUpdate(): void {
        Events_Action.getService().performAction(DashboardEvents.HeaderUpdate);
    }

    protected updateDashboard(dashboardId: string, isAutoRefresh: boolean = false): IPromise<void> {
        return super.updateDashboard(dashboardId, isAutoRefresh).then(() => {
            if (this.editMenu) {
                this.editMenu.closeMenu();
            }
            return Q.resolve<void>(null);
        });
    }

    /**
      * Notifies the grid and edit menu whether it has been obscured by something, such as a dialog or dashboard blade, so it can take any necessary actions.
      * @param {boolean} isObscured - True if the grid is hidden underneath a dialog, curtain, blade, etc.
      */
    protected setViewObscured(isObscured: boolean): void {
        this.dashboardGridControl.setObscured(isObscured);
    }

    /**
     * Toggle between edit and view mode
     *  - This will change the Dashboards.Views Mode
     *  - This will change the Dashboards.Views Mode
     *  - This will handle refresh IF the dashboard has one
     * @param {boolean} isEditMode : True if Edit Mode; False if View Mode
     */
    protected onModeToggle(isEditMode: boolean): void {
        if (isEditMode) {
            this.dashboardMode.switchToEditMode();
            this.stopTimer();
            TFS_Dashboards_Telemetry.DashboardsTelemetry.onDashboardEditMenu("open");
        } else {
            this.requestBladeOpenClose(false);
            this.dashboardMode.switchToViewMode();
            this.resetTimer();
            TFS_Dashboards_Telemetry.DashboardsTelemetry.onDashboardEditMenu("close");
        }
    }

    /**
    * Opens the widget catalog to add a widget
    */
    protected openCatalog() {
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onAddWidget(this.dashboardMode.isEditMode());
        if (this.editMenu) {
            this.editMenu.openMenu();
        }
        this.resetTimer();
        this.getBladeMenuInstance().requestOpenBlade(BladeLevelConstants.CatalogBladeLevel, null, null, true);
        if (this.editMenu) {
            this.editMenu.canListenEvents(false);
        }
    }

    /**
     * Creates the dashboard edit menu
     */
    private attachEditMenu() {
        if (!DashboardPageExtension.isNewDashboardExperience()) {
            this.editMenu = <DashboardEditMenu>Control.createIn(
                DashboardEditMenu,
                $("#dashboard-edit-menu"),
                <IDashboardEditMenuOptions>{
                    canToggleMenu: () => !this.dashboardGridControl.isUserDragging(),
                    onToggleMenu: () => this.onModeToggle(this.editMenu.getMenuPinnedOpen()),
                    onAddWidgetClick: () => this.openCatalog()
                });
        }
    }

    private setupPreview(): void {
        this.isPreviewOpen = false;
        this.widgetPreview = new WidgetPreview(<IWidgetPreviewOptions>{
            onClosed: (isFromCatalog: boolean) => {
                if (!isFromCatalog) {
                    this.getBladeMenuInstance().removeEvents(); //Maybe already close, but maybe not (depend of how we closed the preview)
                    if (this.widgetWithActiveConfiguration) {
                        this.widgetWithActiveConfiguration.focusConfigurationMenu();
                    }
                }
                this.isPreviewOpen = false;
            }
            , widthOffset: BladeDimensions.BladeWidth
        });
    }

    private setupBlades(): IBladeMenu {
        var $bladeMenu = $('#' + BladeMenu.BladeMenu.BladeMenuID);
        var bladeHtmlElements: Array<IBlade<IBladeOptions>> = new Array();

        bladeHtmlElements.push(
            Control.create(
                BladeCatalog.BladeCatalog,
                $bladeMenu,
                <IBladeCatalogOptions>{
                    level: BladeLevelConstants.CatalogBladeLevel,
                    scope: WidgetScope.Project_Team,
                    addWidgetCallback: (widget: Widget, source: WidgetSource) => {

                        var addWidgetScenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(
                            TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.Area,
                            TFS_Dashboards_Telemetry.DashboardScenarios.CatalogAdd);

                        var promise = this.dashboardGridControl.addWidget(widget, source).then(
                            (newWidget: Widget) => {
                                addWidgetScenario.end();

                                Utils_Accessibility.announce(Utils_String.format(TFS_Dashboards_Resources.WidgetCatalog_AnnounceWidgetAddedFormat, widget.name, newWidget.position.column, newWidget.position.row), false /*assertive*/);

                                return newWidget;
                            }, () => {
                                addWidgetScenario.abort();
                            });

                        TFS_Dashboards_Telemetry.DashboardsTelemetry.onAddWidgetFromCatalog(widget.contributionId, this.dashboardController.dashboardData.id, this.widgetSourceToTelemetryString(source));
                        this.widgetsAdded++;

                        return promise;
                    },
                    onBladeClose: () => {
                        TFS_Dashboards_Telemetry.DashboardsTelemetry.onCatalogClosed(this.widgetsAdded);
                        this.widgetsAdded = 0;
                    },
                    heading: TFS_Dashboards_Resources.BladeCatalogTitle,
                    withCurtain: false
                }));

        bladeHtmlElements.push(
            Control.create(
                BladeConfiguration.BladeConfiguration,
                $bladeMenu,
                <IBladeConfigurationOptions>{
                    saveWidgetCallback: (b, w, s) => {
                        return this.saveWidgetCallback(b, w, s);
                    },
                    level: BladeLevelConstants.CatalogConfigurationLevel,
                    heading: TFS_Dashboards_Resources.BladeConfigurationTitle,
                    onBladeClose: (closingBlade: IBlade<IBladeOptions>) => {
                        this.widgetPreview.close();
                        this.resetTimer();
                    },
                    onSettingChanged: (settings: ISettings) => {
                        return this.widgetPreview.refresh(settings);
                    },
                    onSizeChanged: (size: WidgetSize) => {
                        this.widgetPreview.updatePreviewSize(size);
                    },
                    withCurtain: true
                }));

        var bladeMenu: IBladeMenu = <any>Enhancement.enhance(
            BladeMenu.BladeMenu, $bladeMenu, <IBladeMenuOptions>{
                onClose: () => {
                    Events_Action.getService().performAction(DashboardEvents.BladeToggled, { isOpen: false });
                    this.widgetPreview.close();
                    this.resetTimer();
                    this.setViewObscured(false);
                    if (this.editMenu) {
                        this.editMenu.canListenEvents(true);
                    }
                },
                onOpen: (bladeLevel: BladeLevelConstants) => {
                    Events_Action.getService().performAction(DashboardEvents.BladeToggled, { isOpen: true, bladeLevel: bladeLevel });
                },
                obscureView: (value: boolean) => {
                    this.setViewObscured(value);
                },
                blades: bladeHtmlElements,
                onWidgetSelected: (widget: Widget, source: IBlade<IBladeOptions>) => {
                    this.widgetPreview.open(widget, source != null);
                }
            });

        return bladeMenu;
    }

    /**
     * This is the callback used by the configuration blade to save configuration on a new or an existing widget.
     * In the case of a new widget, the Promise is useful to get the ID an thus being able to locate the position
     * that Gridster gave to the new widget. This is used by the animation to move the preview into the new position
     * before fading out.
     * 
     * @param {widget} widget - Widget saved
     * @param {ISettings} - settings - All settings, new or old, modified or not.
     * @returns {IPromise} Promise that resolves when the widget has been saved.
     */
    private saveWidgetCallback(bladeSource: IBlade<IBladeOptions>, widget: Widget, settings: ISettings): IPromise<any> {
        if (widget.id) {
            if (this.dashboardGridControl.widgetResizing(widget.id)) {
                // Since it's resizing, the refresh call will update all other widgets on the page too
                this.dashboardGridControl.refreshWidgetSettings(widget.id, settings);
                return Q();
            }
            else {
                return this.dashboardController.updateWidget(widget).then(() => {
                    this.dashboardGridControl.refreshWidgetSettings(widget.id, settings);
                });
            }
        } else {
            //Insert the new one into the grid
            return this.dashboardGridControl.addWidget(widget, WidgetSource.AddButton)
                .then((widget: Widget) => {
                    this.getBladeMenuInstance().requestOpenBlade(BladeLevelConstants.CatalogBladeLevel, bladeSource);
                    this.widgetPreview.close();
                    //NOTE: We don't know the source here (could be add button or double click) but this is not needed since we only care about differentiation when drag and drop is enabled
                    TFS_Dashboards_Telemetry.DashboardsTelemetry.onAddWidgetFromCatalog(widget.contributionId, this.dashboardController.dashboardData.id, null);
                    this.widgetsAdded++;

                    return Q.resolve(widget);
                });
        }
    }

    private getBladeMenuInstance(): IBladeMenu {
        if (!this.bladeMenu) {
            this.setupPreview();
            this.bladeMenu = this.setupBlades();
        }

        return this.bladeMenu;
    }

    private requestBladeOpenClose(open: boolean): void {
        if (open) {
            this.getBladeMenuInstance().requestOpenBlade(BladeLevelConstants.CatalogBladeLevel).then(
                () => { },
                () => {
                    this.requestToOpenQueued = true;
                });
        } else {
            this.getBladeMenuInstance().requestCloseBlades().then(() => {
                if (this.requestToOpenQueued) {
                    this.requestToOpenQueued = false;
                    this.requestBladeOpenClose(true);
                };
            }, () => {
                // no-op if closing is rejected, i.e. user clicked "cancel" on confirmation dialog for dirty state
            });
        }
    }

    protected gridOptions(): DashboardGridOptions {
        var options: DashboardGridOptions = super.gridOptions();
        options.dashboardPermission = { canEdit: true };
        options.configureWidget = (w) => {
            this.configureWidget(w);
        };

        options.widgetDoneDragCallback = () => { this.resetTimer(); };
        options.widgetStartDragCallback = () => { this.stopTimer(); };
        options.widgetRemoveCallback = (widget: Widget) => {
            Utils_Accessibility.announce(
                Utils_String.format(
                    TFS_Dashboards_Resources.Grid_AnnounceWidgetRemovedFormat,
                    widget.name,
                    widget.position.column,
                    widget.position.row), false /*assertive*/);
            this.resetTimer();
        };
        options.isEditMode = () => { return this.dashboardMode.isEditMode(); };
        options.toggleBladeMenu = (b: boolean) => { this.requestBladeOpenClose(b); };
        options.isBladeMenuClosed = () => {
                return Q.resolve(this.getBladeMenuInstance().isClosed());
        };

        return options;
    }

    private configureWidget(widgetHost: IWidgetHost): void {
        var widget = widgetHost.getWidget();
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onConfigureWidget(widget.contributionId, DashboardPageExtension.getActiveDashboard(), widget.id);

        // The configuration experience needs allowed sizes for the widgets from the widget's metadata 
        // we make a call to the server to fetch it before opening up the config blade. This was decided to be 
        // better than the alternative of sending widget allowed sizes down with every widget on page load as it reduces 
        // the overall widget payload and inflicts only a minor delay when opening the configuration blade.
        var client = DashboardHttpClientFactory.getClient();
        client.getWidgetMetadata(widget.contributionId)
            .then((response: WidgetMetadataResponse) => {
                this.stopTimer();
                requestAnimationFrame(() => {
                    this.openConfiguration(widgetHost, response);
                });
            });
    }

    /**
     * This does not guarantee that we will open the configuration. In the case that the preview is still showing (can take some time because of
     * the animation), this will not open.
     * @param widgetHost 
     * @param widgetMetadata 
     */
    private openConfiguration(widgetHost: IWidgetHost, widgetMetadata: WidgetMetadataResponse): void {
        if (!this.isPreviewOpen) {
            this.widgetWithActiveConfiguration = widgetHost;
            widgetHost.getWidget().allowedSizes = widgetMetadata.widgetMetadata.allowedSizes;
            this.getBladeMenuInstance().requestOpenBlade(
                BladeLevelConstants.CatalogConfigurationLevel,
                this.getBladeMenuInstance().getActiveBlade(), widgetHost, true);
            if (this.editMenu) {
                this.editMenu.canListenEvents(false);
            }
            this.isPreviewOpen = true;
        }
    }

    /**
     * This is trigged when the dashboard mode change (view -> edit, or edit -> view)
     * @param {boolean} isEditMode : Indicate if we are in edit mode or not
     */
    private onDashboardModeChange(isEditMode: boolean): void {
        if (!DashboardPageExtension.isNewDashboardExperience()) {
            $('.' + AdminView.CssClassDashboardView).toggleClass(AdminView.CssClassGridBackgroundShow, isEditMode);            
        }
        else {
            $('.dashboard-hub-content').toggleClass(AdminView.CssClassGridBackgroundShow, isEditMode);
        }
        this.dashboardGridControl.onModeChange(isEditMode);
    }

    /**
     * Convert source to a string recognized by telemetry. We don't do an automatic conversion here (i.e., WidgetSource[source]) because 
     * we want to maintain consistency if the enum properties are renamed.
     */
    private widgetSourceToTelemetryString(source: WidgetSource) {
        var string = null;
        switch (source) {
            case WidgetSource.AddButton:
                string = "AddButton";
                break;
            case WidgetSource.DoubleClick:
                string = "DoubleClick";
                break;
            case WidgetSource.DragAndDrop:
                string = "DragAndDrop";
                break;
        }
        return string;
    }
} 

/**
 * Handle the Dashboard Mode by having a state which can be View or Edit.
 */
export class DashboardMode {

    /**
     * Dashboard can be in 2 modes:
     * 1) View : Allow to drag and drop, context menu for non team persisted action.
     * 2) Edit : Allow to administrator to be able to move, add, edit widgets but also configure the dashboards by creating, modifying, deleting or configuring (refresh)
     */
    private isEditModeState: boolean;

    /**
     * True if the user is an administrator, thus can edit the dashboard; False if the user cannot go into edit mode.
     */
    private canEdit: boolean;

    private _keyboardShortcuts: KeyboardShortcuts;

    /**
     * By default the state is NOT in edit mode.
     * We are not using the switch method of this class because we this trigger callback when state change
     * @param {boolean} canEdit- True if the use can edit the dashboard (admin); False if not an admin
     */
    public constructor(canEdit: boolean) {
        this.isEditModeState = false;
        this.canEdit = canEdit;
    }

    /**
     * Switch into edit mode only if this one is not already in edit mode.
     * We can also switch only if we are admin
     */
    public switchToEditMode(): void {
        if (!this.isEditMode()) {
            if (this.canEdit) {
                this.isEditModeState = true;
                this.modeChanged();
                this.showKeyboardShortcuts();
            }
        }
    }

    /**
     * Switch in view mode if this one is in edit mode only
     */
    public switchToViewMode(): void {
        if (this.isEditMode()) {
            this.isEditModeState = false;
            this.modeChanged();
            this.hideKeyboardShortcuts();
        }
    }

    /**
     * Return if the dashboard is in edit mode
     * @returns {boolean} True if in Edit Mode; False if in View Mode 
     */
    public isEditMode(): boolean {
        return this.isEditModeState;
    }

    /**
     * Return if the dashboard is in view mode
     * @returns {boolean} True if in View Mode; False if in Edit Mode 
     */
    public isViewMode(): boolean {
        return !this.isEditMode();
    }

    private showKeyboardShortcuts() {
        this._keyboardShortcuts = new KeyboardShortcuts();
    }

    private hideKeyboardShortcuts() {
        if (this._keyboardShortcuts) {
            this._keyboardShortcuts.dispose();
            this._keyboardShortcuts = null;
        }
    }

    /**
     * Trigger the onSwitch callback.
     */
    private modeChanged(): void {
        this.onDashboardModeChange(this.isEditMode());
    }

    /**
     * This is the callback method that need to be defined by the consumer of this class if it want
     * to be notified when the state change.  
     * @param {boolean} isEditMode - True if in edit mode, False if in view mode
     */
    public onDashboardModeChange(isEditMode: boolean): void { }
}

/**
 * Container for information required to build a menu button
 */
export interface IDashboardEditMenuButtonSpec {
    iconClass: string;
    cssClass: string;
    onClick: () => void;
    title: string;
}

/**
 * Event handlers for a menu button
 */
export interface IDashboardEditMenuOptions {
    /** Returns true if the menu can be toggled (i.e., edit mode can be changed) */
    canToggleMenu: () => boolean;

    /** Called after the menu has been toggled */
    onToggleMenu: () => void;

    /** Callback when the add widget button is clicked */
    onAddWidgetClick: () => void;
}


/**
 * This is the main menu (located on the bottom-right of the screen) that admins use to control 
 * their dashboard (e.g., switch to edit mode, add /remove widgets)
 */
export class DashboardEditMenu extends Control<IDashboardEditMenuOptions> {
    public static ClassContainer = "dashboard-edit-menu-container";
    public static ClassMenu = "edit-menu";
    public static ClassButton = "button";
    public static ClassMenuToggleButton = DomClassNames.ToggleForDashboardEdit;
    public static ClassMenuOpen = "menu-open";
    public static ClassMenuPinnedOpen = "menu-pinned-open";
    public static ClassMenuButtonIcon = "button-icon";
    public static ClassMenuClosedIcon = "closed-icon";
    public static ClassMenuOpenIcon = "open-icon";
    public static EscKeyEventNamespace = "keydown.dashboardMode";

    private $container: JQuery;

    /**
     * When the user clicks the toggle button, the menu will be "pinned" open and 
     * will not close even on hover out.
     */
    private menuPinnedOpen: boolean = false;
    public $menuToggleButton: JQuery;
    private menuToggleTooltip: RichContentTooltip;

    constructor(options: IDashboardEditMenuOptions) {
        super(options);
    }

    public initialize() {
        super.initialize();

        this.createMenuWithButtons([
            {
                // Add widget button
                iconClass: "bowtie-math-plus",
                cssClass: DomClassNames.DashboardAddWidget,
                onClick: this._options.onAddWidgetClick,
                title: TFS_Dashboards_Resources.AddWidgetButtonText
            }
        ]);
    }

    /**
     * Ensures the menu is open
     */
    public openMenu() {
        if (!this.menuPinnedOpen) {
            this.toggleMenu();
        }
    }

    /**
     * Ensures the menu is closed
     */
    public closeMenu() {
        if (this.menuPinnedOpen) {
            this.toggleMenu();
        }
    }

    public getMenuPinnedOpen() {
        return this.menuPinnedOpen;
    }

    /**
     * View notifies whether Edit menu is obscured by dialog or blade, in which case edit menu should not listen to events
     * @param {boolean} listen - True if edit menu can listen to events False cannot listen to events
     */
    public canListenEvents(listen: boolean): void {
        listen ? this._addEscKeyEvent() : this._removeEscKeyEvent();
    }

    /**
     * Attach keydown event listener when edit menu is opened
     * Hitting ESC will switch from Edit to View mode
     */
    public _addEscKeyEvent(): void {
        $(document).on(DashboardEditMenu.EscKeyEventNamespace, (eventObject: JQueryKeyEventObject): any => {
            var keyCode = eventObject.keyCode || eventObject.which;
            // Check before toggle via escape since we don't want the user to exit edit mode while interacting with the grid (e.g., mid-drag)
            if (keyCode === Utils_UI.KeyCode.ESCAPE && this._options.canToggleMenu()) {
                this.toggleMenu();
            }
        });
    }

    /**
     * Remove keydown event listener when switching to View mode
     */
    public _removeEscKeyEvent(): void {
        $(document).off(DashboardEditMenu.EscKeyEventNamespace);
    }

    private createMenuWithButtons(buttons: IDashboardEditMenuButtonSpec[]) {
        this.$container = this.getElement()
            .addClass(DashboardEditMenu.ClassContainer)
            .hover(() => this.showMenuOnHoverIn(), () => this.hideMenuOnHoverOut());

        var $menu = $("<div>")
            .addClass(DashboardEditMenu.ClassMenu);

        this.$menuToggleButton = $("<div>")
            .attr("role", "button")
            .addClass(DashboardEditMenu.ClassButton)
            .addClass(DashboardEditMenu.ClassMenuToggleButton)
            .mousedown((e) => e.preventDefault()) // Disable focus on click so that the outline doesn't show
            .click(() => this.toggleMenu());

        this.menuToggleTooltip = RichContentTooltip.add(TFS_Dashboards_Resources.DashboardEditMenuOpenEditMode, this.$menuToggleButton);
        this.setMenuPinnedOpen(false);
        Utils_UI.accessible(this.$menuToggleButton);

        // Attach keydown event handler to handle SHIFT+TAB key event from the Toggle button when in Edit Mode       
        this.$menuToggleButton.on("keydown", (eventObject: JQueryKeyEventObject) => this.onKeyDownOnToggle(eventObject));

        var $menuClosedIcon = $("<div>")
            .addClass(DashboardEditMenu.ClassMenuButtonIcon)
            .addClass(DashboardEditMenu.ClassMenuClosedIcon)
            .addClass("bowtie-edit");

        var $menuOpenIcon = $("<div>")
            .addClass(DashboardEditMenu.ClassMenuButtonIcon)
            .addClass(DashboardEditMenu.ClassMenuOpenIcon)
            .addClass("bowtie-check");

        this.$menuToggleButton
            .append($menuClosedIcon)
            .append($menuOpenIcon);

        buttons.forEach(button => {
            var $button = $("<div>")
                .attr("role", "button")
                .attr("aria-label", button.title)
                .addClass(DashboardEditMenu.ClassButton)
                .addClass(button.cssClass)
                .mousedown((e) => e.preventDefault()) // Disable focus on click so that the outline doesn't show
                .click(() => button.onClick());

            RichContentTooltip.add(button.title, $button);
            Utils_UI.accessible($button);

            var $icon = $("<div>")
                .addClass(DashboardEditMenu.ClassMenuButtonIcon)
                .addClass(button.iconClass);

            $button.append($icon);

            $menu.append($button);
        });

        this.$container.append(this.$menuToggleButton);
        this.$container.append($menu);
    }

    /**
     * For SHIFT+TAB keyboard event on the Toggle button in Edit Mode, 
     * this will set focus on the last widget edit button on the dashboard
     * @param {JQueryKeyEventObject} - JQuery Keyboard event object
     * @returns {any} : Keeping parity with JQuery return type
     */
    private onKeyDownOnToggle(eventObject: JQueryKeyEventObject): any {
        var keyCode = eventObject.keyCode || eventObject.which;
        if (keyCode === Utils_UI.KeyCode.TAB && this.menuPinnedOpen && eventObject.shiftKey) {
            var editMenuButtons = $("." + DomClassNames.WidgetEditMenuButton);
            if (editMenuButtons && editMenuButtons.length > 0) {
                eventObject.preventDefault();
                editMenuButtons.last().focus();
            }
        }
    }

    private setMenuPinnedOpen(newValue: boolean): void {
        this.menuPinnedOpen = newValue;

        let tooltipText = "";
        if (this.menuPinnedOpen) {
            tooltipText = TFS_Dashboards_Resources.DashboardEditMenuCloseEditMode;
            this.canListenEvents(true);
        } else {
            tooltipText = TFS_Dashboards_Resources.DashboardEditMenuOpenEditMode;
            this.canListenEvents(false);
        }
        
        if (this.menuToggleTooltip != null) {
            this.menuToggleTooltip.setTextContent(tooltipText);
        }
        this.$menuToggleButton.attr('aria-label', tooltipText);

        this.$container.toggleClass(DashboardEditMenu.ClassMenuOpen, this.menuPinnedOpen);
        this.$container.toggleClass(DashboardEditMenu.ClassMenuPinnedOpen, this.menuPinnedOpen);
    }

    private toggleMenu() {
        this.setMenuPinnedOpen(!this.menuPinnedOpen);
        this._options.onToggleMenu();
    }

    private showMenuOnHoverIn() {
        this.$container.addClass(DashboardEditMenu.ClassMenuOpen);
    }

    private hideMenuOnHoverOut() {
        if (!this.menuPinnedOpen) {
            this.$container.removeClass(DashboardEditMenu.ClassMenuOpen);
        }
    }

    public setFocus(): void {
        this.$container.focus();
    }
}