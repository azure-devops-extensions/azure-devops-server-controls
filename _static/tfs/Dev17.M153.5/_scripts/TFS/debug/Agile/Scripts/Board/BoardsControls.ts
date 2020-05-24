/* tslint:disable:member-ordering */
///<amd-dependency path="VSS/Utils/Draggable"/>
///<amd-dependency path="jQueryUI/droppable"/>
///<reference types="jquery" />

import "VSS/LoaderPlugins/Css!Boards";

import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import AgileControls = require("Agile/Scripts/Common/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import AgileUtils = require("Agile/Scripts/Common/Utils");
import ProductBacklogMRU = require("Agile/Scripts/Backlog/ProductBacklogMru");
import TfsCommon_Shortcuts = require("TfsCommon/Scripts/KeyboardShortcuts");
import Boards = require("Agile/Scripts/TFS.Agile.Boards");
import BoardsGenerator = require("Agile/Scripts/Board/BoardsGenerator");
import { BoardsHubUsageTelemetryConstants } from "Agile/Scripts/BoardsHub/Constants";
import Controls = require("VSS/Controls");
import Notifications = require("VSS/Controls/Notifications");
import ControlsSearch = require("VSS/Controls/Search");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Navigation = require("VSS/Controls/Navigation");
import TfsCommon_Resources = require("TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon");
import BoardResources = require("Agile/Scripts/Resources/TFS.Resources.AgileTaskboard");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import TFS_Agile_ContributableTabsUtils = require("Agile/Scripts/Common/ContributableTabsUtils");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Menus = require("VSS/Controls/Menus");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITControlsRecycleBin = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin");
import { RecycleBinConstants, RecycleBinTelemetryConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Cards = require("Agile/Scripts/Card/Cards");
import CardControls = require("Agile/Scripts/Card/CardsControls");
import AnnotationManager = require("Agile/Scripts/Card/CardsAnnotationManager");
import Annotations = require("Agile/Scripts/Card/CardsAnnotationsCommon");
import Q = require("q");
import ContentRendering = require("Presentation/Scripts/TFS/TFS.ContentRendering");
import Work_Contracts = require("TFS/Work/Contracts");
import Work_WebApi = require("TFS/Work/RestClient");
import TreeView = require("VSS/Controls/TreeView");
import Performance = require("VSS/Performance");
import BoardAutoRefreshCommon = require("Agile/Scripts/Board/BoardsAutoRefreshCommon");
import Util_Cards = require("Agile/Scripts/Card/CardUtils");
import TFS_UI_Controls_Common = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import TeamServices = require("TfsCommon/Scripts/Team/Services");
import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");
import ConfigurationsConstants = require("Presentation/Scripts/TFS/TFS.Configurations.Constants");
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import Configurations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Configurations");
import Board_Settings_Controls_NO_REQUIRE = require("Agile/Scripts/Board/BoardsSettingsControls");
import StyleCustomization_NO_REQUIRE = require("Agile/Scripts/Card/CardCustomizationStyle");
import Agile_Utils_CSC_NO_REQUIRE = require("Agile/Scripts/Settings/CommonSettingsConfiguration");
import BoardAutoRefreshHub_NO_REQUIRE = require("Agile/Scripts/Board/BoardsAutoRefreshHub");
import Events_Services = require("VSS/Events/Services");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");

import { EmbeddedHelper } from "Agile/Scripts/Common/EmbeddedHelper";
import { RuleType, StyleRuleHelper } from "Agile/Scripts/Card/CardCustomizationStyle";
import { NavigationUtils } from "Agile/Scripts/Common/NavigationUtils";
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { PopupContentControl, IPositionOptions } from "VSS/Controls/PopupContent";
import { BoardsHubHelper } from "Agile/Scripts/Board/Common/BoardsHubHelper";
import { LegacyBoardHelper } from "Agile/Scripts/Board/LegacyBoardHelper";
import BoardToolbar = require("Agile/Scripts/Board/LegacyBoardToolbarHelper");
import BoardViewToolbarContracts = require("Agile/Scripts/Board/Common/BoardViewToolbarContracts");
import { registerCommonTemplates } from "Agile/Scripts/Board/Templates";
import { FilterState, isFilterStateEmpty } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { FilterStateManager } from "WorkItemTracking/Scripts/Filtering/FilterStateManager";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as Telemetry from "VSS/Telemetry/Services";

import * as BoardFiltering_NO_REQUIRE from "Agile/Scripts/Board/BoardFiltering";
import * as TextFilterProvider_NO_REQUIRE from "WorkItemTracking/Scripts/Filtering/TextFilterProvider";
import * as WorkItemFilter_NO_REQUIRE from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import * as BoardsFilterValueProviders_NO_REQUIRE from "Agile/Scripts/Board/BoardFilterValueProviders";
import * as WorkItemFilterValueProviders_NO_REQUIRE from "WorkItemTracking/Scripts/Controls/Filters/FilterValueProviders";
import * as BoardFilterDataSource_NO_REQUIRE from "Agile/Scripts/Board/BoardFilterDataSource";

import { getDefaultWebContext } from "VSS/Context";
import { ITeam } from "Agile/Scripts/Models/Team";
import { BoardsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { CommonContextMenuItems } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Accessories";
import { AnnotationCollectionViewModel } from "Agile/Scripts/Card/CardCustomizationAnnotationViewModel";
import VSSError = require("VSS/Error");
import { Level } from "VSS/ClientTrace/Contracts";

const delegate = Utils_Core.delegate;
const domElem = Utils_UI.domElem;
const DatabaseCoreFieldRefName = AgileUtils.DatabaseCoreFieldRefName;
const nodeViewTypeFactory: any = new TFS_Core_Utils.TypeFactory();
const FieldRendererHelper = CardControls.FieldRendererHelper;
const scrollBarWidth = AgileUtils.ControlUtils.widthOfScrollBar();
const eventActionService = Events_Action.getService();
const BoardGenerator = BoardsGenerator.BoardGenerator;
const globalEvents = Service.getLocalService(Events_Services.EventService);

/**
 *  Keyboard shortcuts classes for Kanban board
 */
namespace KeyboardShorcutBasedEvent {
    export const SelectFirstCard = "VSS.Agile.Boards.SelectFirstCard";
    export const AddChild = "VSS.Agile.Boards.AddChild";
    export const OpenCard = "VSS.Agile.Boards.OpenCard";
    export const ExpandCard = "VSS.Agile.Boards.ExpandCard";
    export const RenameCard = "VSS.Agile.Boards.RenameCard";
    export const ExpandSwimlanes = "VSS.Agile.Boards.ExpandSwimlanes";
    export const CollapseSwimLanes = "VSS.Agile.Boards.CollapseSwimLanes";
    export const SelectSwimLaneAbove = "VSS.Agile.Boards.SelectSwimLaneAbove";
    export const SelectSwimLaneBelow = "VSS.Agile.Boards.SelectSwimLaneBelow";
}

class ChecklistShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {
    private _combos: string[];
    private _eventsHelper: ScopedEventHelper;
    private _addChildItemInFocusIfAnyDelegate: Function;

    constructor(eventsHelper: ScopedEventHelper) {
        super(AgileControlsResources.KeyboardShortcutGroup_KanbanBoard);
        this._combos = [];
        this._eventsHelper = eventsHelper;
        this.registerShortcuts();
    }

    public dispose() {
        this._unRegisterDefaultActions();
        this.removeShortcutGroup();
    }

    public unRegisterShortcuts() {
        this.unRegisterShortcut("c");
        this._combos = [];
        this._unRegisterDefaultActions();
    }

    /**
     *  Register default keyboard shortcuts to framework provided Shortcuts manager
     */
    public registerShortcuts() {
        if (this._combos.length !== 0) {
            this.unRegisterShortcuts();
        }
        this._registerDefaultActions();
        this.registerShortcut(
            "c",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_AddChildForItemInFocus,
                action: () => {
                    this._eventsHelper.fire(KeyboardShorcutBasedEvent.AddChild);

                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_ADDCHILD_KEYBOARD_SHORTCUT, { "Key": "c" });
                }
            });
        this._combos.push("c");
    }

    /**
     *  Attach Events to Handler using Event Service for default keyboard shortcuts
     */
    private _registerDefaultActions() {
        this._addChildItemInFocusIfAnyDelegate = delegate(this, this._addChildItemInFocusIfAny);
        this._eventsHelper.attachEvent(KeyboardShorcutBasedEvent.AddChild, this._addChildItemInFocusIfAnyDelegate);
    }

    /**
     *  Detach Events and Handler using Event Service for default keyboard shortcuts
     */
    private _unRegisterDefaultActions() {
        if (this._addChildItemInFocusIfAnyDelegate) {
            this._eventsHelper.detachEvent(KeyboardShorcutBasedEvent.AddChild, this._addChildItemInFocusIfAnyDelegate);
            this._addChildItemInFocusIfAnyDelegate = null
        }
    }

    /**
     *  Rename the card in focus, if any
     */
    private _addChildItemInFocusIfAny() {
        if (!document.activeElement || $(document.activeElement).is("body")) {
            return;
        }
        else {
            const $tile = $(document.activeElement);
            if ($tile.is(".board-tile")) {
                const tileItem = Controls.Enhancement.getInstance(Tile, $tile) as Tile;
                this._eventsHelper.fire(Cards.Notifications.CardWorkItemListAddChild, null, { id: tileItem.id() });
            }
        }
    }
}

class BoardShortcutGroup extends TfsCommon_Shortcuts.ShortcutGroupDefinition {

    private _eventsHelper: ScopedEventHelper;

    constructor(private _boardView: BoardView) {
        super(AgileControlsResources.KeyboardShortcutGroup_KanbanBoard);
        this._eventsHelper = this._boardView.eventsHelper;
        this._registerDefaultShortcuts();

        // In embedded mode we don't want to register the global shortcuts - many of these will navigate the page.
        if (EmbeddedHelper.isEmbedded()) {
            this._removeGlobalShortcuts();
        }
    }

    public dispose() {
        this._unRegisterDefaultActions();
        this.removeShortcutGroup();
        this._boardView = null;
    }

    private _removeGlobalShortcuts(): void {
        this.shortcutManager.removeShortcutGroup(TfsCommon_Resources.KeyboardShortcutGroup_Global);
    }

    /**
     *  Attach Events to Handler using Event Service for default keyboard shortcuts
     */
    private _registerDefaultActions() {
        // Attaching the actions for the shortcuts on Kanban board
        this._eventsHelper.attachEvent(KeyboardShorcutBasedEvent.SelectFirstCard, this._setFocusOnFirstTile);
        this._eventsHelper.attachEvent(KeyboardShorcutBasedEvent.ExpandSwimlanes, this._expandSwimlanes);
        this._eventsHelper.attachEvent(KeyboardShorcutBasedEvent.CollapseSwimLanes, this._collapseSwimlanes);
        this._eventsHelper.attachEvent(KeyboardShorcutBasedEvent.SelectSwimLaneAbove, this._selectSwimlaneAbove);
        this._eventsHelper.attachEvent(KeyboardShorcutBasedEvent.SelectSwimLaneBelow, this._selectSwimlaneBelow);

        // Attaching the actions for the shortcuts on Kanban board cards
        this._eventsHelper.attachEvent(KeyboardShorcutBasedEvent.OpenCard, this._openTileInFocusIfAny);
        this._eventsHelper.attachEvent(KeyboardShorcutBasedEvent.ExpandCard, this._expandTileInFocusIfAny);
        this._eventsHelper.attachEvent(KeyboardShorcutBasedEvent.RenameCard, this._renameTileInFocusIfAny);
    }

    /**
     *  Detach Events and Handler using Event Service for default keyboard shortcuts
     */
    private _unRegisterDefaultActions() {
        // Detaching the actions for the shortcuts on Kanban board
        this._eventsHelper.detachEvent(KeyboardShorcutBasedEvent.SelectFirstCard, this._setFocusOnFirstTile);
        this._eventsHelper.detachEvent(KeyboardShorcutBasedEvent.ExpandSwimlanes, this._expandSwimlanes);
        this._eventsHelper.detachEvent(KeyboardShorcutBasedEvent.CollapseSwimLanes, this._collapseSwimlanes);
        this._eventsHelper.detachEvent(KeyboardShorcutBasedEvent.SelectSwimLaneAbove, this._selectSwimlaneAbove);
        this._eventsHelper.detachEvent(KeyboardShorcutBasedEvent.SelectSwimLaneBelow, this._selectSwimlaneBelow);

        // Detaching the actions for the shortcuts on Kanban board cards
        this._eventsHelper.detachEvent(KeyboardShorcutBasedEvent.OpenCard, this._openTileInFocusIfAny);
        this._eventsHelper.detachEvent(KeyboardShorcutBasedEvent.ExpandCard, this._expandTileInFocusIfAny);
        this._eventsHelper.detachEvent(KeyboardShorcutBasedEvent.RenameCard, this._renameTileInFocusIfAny);
    }

    /**
     *  Register default keyboard shortcuts to framework provided Shortcuts manager
     */
    private _registerDefaultShortcuts() {

        this._registerDefaultActions();

        this.registerShortcut(
            "home",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_FocusFirstItem,
                action: () => {
                    this._eventsHelper.fire(KeyboardShorcutBasedEvent.SelectFirstCard, this._boardView);

                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_SELECTFIRSTTILE_KEYBOARD_SHORTCUT, { "Key": "home" });
                },
                allowPropagation: true  // Since home key is used for browser shortcut
            });

        this.registerShortcut(
            "enter",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_OpenItemInFocus,
                action: () => {
                    this._eventsHelper.fire(KeyboardShorcutBasedEvent.OpenCard);

                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_OPENTILE_KEYBOARD_SHORTCUT, { "Key": "enter" });
                },
                allowPropagation: true  // Since Enter key is used for other common shortcuts/buttons also
            });

        this.registerShortcut(
            "mod+shift+f",
            {
                description: WITResources.KeyboardShortcutDescription_FilterResults,
                action: () => {
                    if (BoardsHubHelper.isXHRHub()) {
                        this._eventsHelper.fire(Boards.Notifications.ToggleBoardsHubFilterON, this);
                    } else {
                        this._boardView.activateFilter();
                    }

                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_LAUNCHFILTER_KEYBOARD_SHORTCUT, { "Key": "mod+shift+f" });
                },
                globalCombos: ["mod+shift+f"]
            }
        );

        this.registerShortcut(
            "mod+up",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemUp,
                action: () => {
                    // For discoverablitity and Telemetry. Action is implemented on keydown event in Tile class
                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_MOVETILEUP_KEYBOARD_SHORTCUT, { "Key": "mod+up" });
                }
            });

        this.registerShortcut(
            "mod+down",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemDown,
                action: () => {
                    // For discoverablitity and Telemetry. Action is implemented on keydown event in Tile class
                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_MOVETILEDOWN_KEYBOARD_SHORTCUT, { "Key": "mod+down" });
                }
            });

        this.registerShortcut(
            "mod+left",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemLeft,
                action: () => {
                    // For discoverablitity and Telemetry. Action is implemented on keydown event in Tile class
                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_MOVETILELEFT_KEYBOARD_SHORTCUT, { "Key": "mod+left" });
                }
            });

        this.registerShortcut(
            "mod+right",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemRight,
                action: () => {
                    // For discoverablitity and Telemetry. Action is implemented on keydown event in Tile class
                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_MOVETILERIGHT_KEYBOARD_SHORTCUT, { "Key": "mod+right" });
                }
            });

        this.registerShortcut(
            "mod+home",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemTopOfColumn,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in Tile class
                },
                allowPropagation: true  // Since ctrl + home key is used for browser shortcut
            });

        this.registerShortcut(
            "mod+end",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemBottomOfColumn,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in Tile class
                },
                allowPropagation: true  // Since ctrl + end key is used for browser shortcut
            });

        this.registerShortcut(
            "mod+shift+up",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemUpSwimlane,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in Tile class
                }
            });

        this.registerShortcut(
            "mod+shift+down",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_MoveItemDownSwimlane,
                action: () => {
                    // For discoverablitity. Action is implemented on keydown event in Tile class
                }
            });

        this.registerShortcut(
            "f2",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_RenameItemInFocus,
                action: () => {
                    this._eventsHelper.fire(KeyboardShorcutBasedEvent.RenameCard);

                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_RENAMETILE_KEYBOARD_SHORTCUT, { "Key": "f2" });
                }
            });

        this.registerShortcut(
            "e",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_ExpandItemInFocus,
                action: () => {
                    this._eventsHelper.fire(KeyboardShorcutBasedEvent.ExpandCard);

                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_EXPANDTILE_KEYBOARD_SHORTCUT, { "Key": "e" });
                }
            });

        this.registerShortcut(
            "o",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_ExpandSwimlanes,
                action: () => {
                    this._eventsHelper.fire(KeyboardShorcutBasedEvent.ExpandSwimlanes);

                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_EXPANDSWIMLANES_KEYBOARD_SHORTCUT, { "Key": "o" });
                }
            });

        this.registerShortcut(
            "u",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_CollapseSwimlanes,
                action: () => {
                    this._eventsHelper.fire(KeyboardShorcutBasedEvent.CollapseSwimLanes);

                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_COLLAPSESWIMLANES_KEYBOARD_SHORTCUT, { "Key": "u" });
                }
            });

        this.registerShortcut(
            "shift+pageup",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_SelectSwimLaneAbove,
                action: () => {
                    this._eventsHelper.fire(KeyboardShorcutBasedEvent.SelectSwimLaneAbove);

                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_SELECTSWIMLANEABOVE_KEYBOARD_SHORTCUT, { "Key": "shift+pageup" });
                }
            });

        this.registerShortcut(
            "shift+pagedown",
            {
                description: AgileControlsResources.KeyboardShortcutkeyDescription_SelectSwimLaneBelow,
                action: () => {
                    this._eventsHelper.fire(KeyboardShorcutBasedEvent.SelectSwimLaneBelow);

                    Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_SELECTSWIMLANEBELOW_KEYBOARD_SHORTCUT, { "Key": "shift+pagedown" });
                }
            });
    }

    /**
     *  Set focus on the First card in the Board
     *  @param {BoardView} boardView - Board control on which the first card is focussed
     */
    private _setFocusOnFirstTile(boardView: BoardView) {
        boardView.focusFirstTileOnBoard();
    }

    /**
     *  Expands all the existing swimlanes in the Board
     */
    private _expandSwimlanes(): void {
        var clickIfCollapsed = (index: any, swimlaneHeader: JQuery) => {
            if ($(swimlaneHeader).is(".swimlane-collapsed")) {
                swimlaneHeader.click();
            }
        };
        var $swimlaneHeaders = $(".member-header.ui-droppable");
        $.each($swimlaneHeaders, clickIfCollapsed);
    }

    /**
     *  Collapses all the existing swimlanes in the Board
     */
    private _collapseSwimlanes(): void {
        var clickIfExpanded = (index: any, swimlaneHeader: JQuery) => {
            if (!$(swimlaneHeader).is(".swimlane-collapsed")) {
                swimlaneHeader.click();
            }
        };
        var $swimlaneHeaders = $(".member-header.ui-droppable");
        $.each($swimlaneHeaders, clickIfExpanded);
    }

    /**
     *  Sets the focus on the chevron associated with the swimlane above.
     *  If the focus is on any tile, within a swimlane, sets the focus on the chevron associated with that swimlane.
     *  If the focus is on a swimlane already, tries to set the focus on the next swimlane, if available, else does nothing.
     *  If the no element has focus or if the body element has been chosen, sets th focus on the first swimlane.
     */
    private _selectSwimlaneAbove(): void {
        let handled: boolean;
        if (document.activeElement) {
            const $activeElement = $(document.activeElement);
            let $chevron: JQuery;
            if ($activeElement.is(Tile.TILE_ITEM_SELECTOR)) { // Check if the focus is on a tile within a swimlane
                $chevron = $activeElement.closest(".member-vertical").find(NodeViewVertical.CHEVRON_CSS_SELECTOR);
            }
            else if ($activeElement.is(NodeViewVertical.CHEVRON_CSS_SELECTOR)) { // Check if the focus is on a swimlane header
                $chevron = $activeElement.closest(".member-vertical").prev().find(NodeViewVertical.CHEVRON_CSS_SELECTOR);
            }
            // Set focus, if found the nearest swimlane
            if ($chevron && $chevron.length > 0) {
                $chevron.focus();
                handled = true;
            }
        }

        if (!handled) {
            // Set focus on the first swimlane, if available
            const $swimlanes = $("body").find(".swimlanes .member-vertical");
            if ($swimlanes.length > 0) {
                $swimlanes.first().find(NodeViewVertical.CHEVRON_CSS_SELECTOR).focus();
            }
        }
    }

    /**
     *  Sets the focus on the chevron associated with the below swimlane, if the focus is on a swimlane already.
     *  Else, tries to set the focus on the last swimlane, if available, else does nothing.
     */
    private _selectSwimlaneBelow(): void {
        let handled: boolean;
        if (document.activeElement) {
            const $activeElement = $(document.activeElement);
            if ($activeElement.is(Tile.TILE_ITEM_SELECTOR) // Check if the focus is on a tile within a swimlane
                || $activeElement.is(NodeViewVertical.CHEVRON_CSS_SELECTOR)) { // Check if the focus is on a swimlane header
                const $chevron = $activeElement.closest(".member-vertical").next().find(NodeViewVertical.CHEVRON_CSS_SELECTOR);
                // Set focus, if found the next swimlane
                if ($chevron.length > 0) {
                    $chevron.focus();
                    handled = true;
                }
            }
        }

        if (!handled) {
            // Set focus on the last swimlane, if available
            const $swimlanes = $("body").find(".swimlanes .member-vertical");
            if ($swimlanes.length > 0) {
                $swimlanes.last().find(NodeViewVertical.CHEVRON_CSS_SELECTOR).focus();
            }
        }
    }

    /**
     *  Open the card in focus, if any
     */
    private _openTileInFocusIfAny() {
        if (!document.activeElement || $(document.activeElement).is("body")) {
            return;
        }
        else {
            var $tile = $(document.activeElement);
            if ($tile.is(Tile.TILE_ITEM_SELECTOR)) {
                var tileItem = <Tile>Controls.Enhancement.getInstance(Tile, $tile);
                tileItem.openItemOnEvent();
            }
        }
    }

    /**
     *  Expands card to display the fields of the card in focus, if any
     */
    private _expandTileInFocusIfAny() {
        if (!document.activeElement || $(document.activeElement).is("body")) {
            return;
        }
        else {
            var $tile = $(document.activeElement);
            if ($tile.is(Tile.TILE_ITEM_SELECTOR)) {
                var tileItem = <Tile>Controls.Enhancement.getInstance(Tile, $tile);
                tileItem.toggleCardExpandState();
            }
        }
    }

    /**
     *  Rename the card in focus, if any
     */
    private _renameTileInFocusIfAny() {
        if (!document.activeElement || $(document.activeElement).is("body")) {
            return;
        }
        else {
            var $tile = $(document.activeElement);
            if ($tile.is(Tile.TILE_ITEM_SELECTOR)) {
                var tileItem = <Tile>Controls.Enhancement.getInstance(Tile, $tile);
                tileItem.beginFieldEdit(DatabaseCoreFieldRefName.Title);
            }
        }
    }
}

export interface MemberCounterOptions {
    source: Boards.BoardMember;
    showTitle: boolean;
    cssClass: string;
}

export class MemberCounter extends Controls.Control<MemberCounterOptions> {
    private _$value: JQuery;
    private _$title: JQuery;
    private _$container: JQuery;
    private _source: Boards.BoardMember;
    private _sourceUpdated: IArgsFunctionR<void>;
    private _tooltip: RichContentTooltip;

    constructor(options?: MemberCounterOptions) {
        /// <summary>Display and manage a limit values for a set of controls.</summary>
        super(options);
    }

    public initializeOptions(options?: MemberCounterOptions) {
        /// <param name="options" type="SwimlaneHeaderOption" />
        super.initializeOptions($.extend({
            coreCssClass: options.cssClass
        }, options));
    }

    public initialize() {
        /// <summary>Initialize the control.</summary>
        super.initialize();
        this._sourceUpdated = delegate(this, this._update);
        this._createLayout();
        this.source(this._options.source);
    }

    public source(source: Boards.BoardMember): Boards.BoardMember {
        /// <summary>Attach event to the source and update dom with count</summary>
        Diag.Debug.assertParamIsType(source, Boards.BoardMember, "source", true);

        if (source !== undefined) {
            if (this._source) {
                this._detachEvents(this._source);
            }
            this._attachEvents(source);
            this._source = source;
            this._update(source, source.getItemCount());
        }
        return this._source;
    }

    public setValue(value: number, title: string) {
        /// <summary>Update the current value for the control.</summary>
        /// <param name="value" type="Number">The current count of items.</param>
        Diag.Debug.assertParamIsInteger(value, "value");
        if (value === 0) {
            this._$container.addClass("hidden-header");
        }
        else {
            this._$value.text(value);
            this._$container.removeClass("hidden-header");
        }
    }

    public dispose() {
        if (this._source) {
            this._detachEvents(this._source);
        }
        if (this._tooltip && !this._tooltip.isDisposed()) {
            this._tooltip.dispose();
        }
        super.dispose();
    }

    private _createLayout() {
        this._$container = this.getElement();
        this._$value = $(domElem("span"));
        this._$container[0].appendChild(this._$value[0]);
        if (this._options.showTitle) {
            this._$title = $(domElem("span"))
                .text(this._options.source.title());
            this._tooltip = RichContentTooltip.addIfOverflow(this._options.source.title(), this._$container);
            this._$container[0].appendChild(this._$title[0]);
        }
    }

    private _update(sender: Boards.BoardMember, counts: Boards.IBoardMemberCount) {
        this.setValue(counts.count, sender.title());
    }

    private _attachEvents(source) {
        Diag.Debug.assertParamIsType(source, Boards.BoardMember, "source");
        source.attachEvent(Boards.Notifications.BoardMemberItemCountChanged, this._sourceUpdated);
    }

    private _detachEvents(source) {
        Diag.Debug.assertParamIsType(source, Boards.BoardMember, "source");
        source.detachEvent(Boards.Notifications.BoardMemberItemCountChanged, this._sourceUpdated);
    }

}

export interface LimitDisplayOptions {
    limit: number;
    source: Boards.BoardMember[];
    exceedHighlight: JQuery;
}

export class LimitDisplay extends Controls.Control<LimitDisplayOptions> {

    public static CoreCssClass: string = "boards-controls-limit kanban-customize";

    private _value: number;
    private _limit: number;
    private _$value: JQuery;
    private _$limit: JQuery;
    private _source: Boards.BoardMember[];
    private _sourceUpdated: IArgsFunctionR<void>;
    private _$displayDiv: JQuery;
    private _tooltip: RichContentTooltip;

    constructor(options?: LimitDisplayOptions) {
        /// <summary>Display and manage a limit values for a set of controls.</summary>

        super(options);
    }

    public initializeOptions(options?: LimitDisplayOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: LimitDisplay.CoreCssClass
        }, options));
    }

    public initialize() {
        /// <summary>Initialize the control.</summary>

        this._sourceUpdated = delegate(this, this._update);
        this._limit = this._options.limit;

        this._createLayout();
        this.source(this._options.source);
        this._setTooltip();
    }

    public source(source: Boards.BoardMember[]): Boards.BoardMember[] {
        Diag.Debug.assertParamIsType(source, Array, "source", true);

        if (source !== undefined) {
            if (this._source) {
                this._detachEvents(this._source);
            }
            this._attachEvents(source);
            this._source = source;
            this._update(null /* TODO: [nisong] fix this */);
        }

        return this._source;
    }

    public setValue(value: number) {
        /// <summary>Update the current value for the control.</summary>
        /// <param name="value" type="Number">The current count of items.</param>
        Diag.Debug.assertParamIsInteger(value, "value");

        var element = this.getElement(),
            cssClass,
            effectiveLimit = this._limit || 1000;

        this._value = value;
        this._$value.text(value);

        // determine whether we're under, matching or exceeding the limits
        if (value < effectiveLimit) {
            cssClass = "under";
        } else if (value > effectiveLimit) {
            cssClass = "exceed";
        } else {
            Diag.Debug.assert(value === effectiveLimit, Utils_String.format("Expected value and limit to be equal. value:{0}; limit:{1}", value, effectiveLimit));
            cssClass = "match";
        }

        element.addClass(cssClass);
        element.removeClass("under exceed match".replace(cssClass, ""));

        if (this._options.exceedHighlight) {
            this._options.exceedHighlight.toggleClass("exceed", value > effectiveLimit);
        }
    }

    public getValue(): number {
        /// <summary>Get the value</summary>
        return this._value;
    }

    public dispose() {
        if (this._source) {
            this._detachEvents(this._source);
            this._source = null;
        }
        if (this._tooltip) {
            this._tooltip.dispose();
            this._tooltip = null;
        }
        super.dispose();
    }

    private _setTooltip() {

        const limit = this._limit;
        var tooltip;
        if (!limit) {
            if (this._value === 1) {
                tooltip = Utils_String.format(BoardResources.No_WIP_Limit_Count_Tooltip_Single, this._value);
            }
            else {
                tooltip = Utils_String.format(BoardResources.No_WIP_Limit_Count_Tooltip_Plural, this._value);
            }
        }
        else {
            if (this._value === 1 && limit === 1) {
                tooltip = Utils_String.format(BoardResources.Limit_Tooltip_Single_Single, this._value, limit);
            }
            else if (this._value === 1) {
                tooltip = Utils_String.format(BoardResources.Limit_Tooltip_Single_Plural, this._value, limit);
            }
            else if (limit === 1) {
                tooltip = Utils_String.format(BoardResources.Limit_Tooltip_Plural_Single, this._value, limit);
            }
            else {
                tooltip = Utils_String.format(BoardResources.Limit_Tooltip_Plural_Plural, this._value, limit);
            }
        }

        if (this._tooltip) {
            this._tooltip.setTextContent(tooltip);
        }
        else {
            this._tooltip = RichContentTooltip.add(tooltip, this.getElement(), { setAriaDescribedBy: true });
        }
    }

    private _createLayout() {
        var $element = this.getElement();

        this._$displayDiv = $("<div>");
        this._$value = $(domElem("span", "current")).appendTo(this._$displayDiv);

        if (this._limit) {
            $(domElem("span", "separator")).text("/").appendTo(this._$displayDiv);
        }

        this._$limit = $(domElem("span", "limit")).appendTo(this._$displayDiv);
        this._$limit.text(this._limit ? this._limit : "");

        $element[0].appendChild(this._$displayDiv[0]);
    }

    private _update(sender: Boards.BoardMember, counts?: Boards.IBoardMemberCount) {
        var value = 0;
        this._source.forEach((childSource: Boards.BoardMember, index: number) => {
            var count = childSource.getItemCount().wip;
            value += count;
        });
        this._source.forEach((childSource: Boards.BoardMember, index: number) => {
            childSource.totalGroupMemberCount = value;
        });
        this.setValue(value);
        this._setTooltip();
    }

    private _attachEvents(source: Boards.BoardMember[]) {
        source.forEach((childSource: Boards.BoardMember, index: number) => {
            Diag.Debug.assertParamIsType(childSource, Boards.BoardMember, "childSource");
            childSource.attachEvent(Boards.Notifications.BoardMemberItemCountChanged, this._sourceUpdated);
        });
    }

    private _detachEvents(source: Boards.BoardMember[]) {
        source.forEach((childSource: Boards.BoardMember, index: number) => {
            Diag.Debug.assertParamIsType(childSource, Boards.BoardMember, "childSource");
            childSource.detachEvent(Boards.Notifications.BoardMemberItemCountChanged, this._sourceUpdated);
        });
    }
}

export interface ITileOptions {
    team: ITeam;
    item: Boards.WorkItemItemAdapter;
    eventsHelper: ScopedEventHelper;
    board: Boards.Board;
}

//exporting for unit testing
export class Tile extends Controls.Control<ITileOptions> {
    public board: Boards.Board;

    public static enhancementTypeName: string = "tfs.agile.boards.tile";

    public static CoreCssClass: string = "board-tile";
    public static DataKeyId: string = "item-id";
    public static DataKeyType: string = "item-type";
    public static BoardType: string = AgileUtils.BoardType.Kanban;
    public static RefreshContentsDelay: number = 500;
    public static DragZIndex: number = 1000;
    public static DRAG_START_DISTANCE: number = 5;
    public static DATA_REBIND_CLICK: string = "rebind-click";
    public static EFFORT_TYPE_NAME: string = "Effort";
    public static ORDER_TYPE_NAME: string = "Order";
    private static MAX_TAGS = "10";
    private static TAG_CHARACTER_LIMIT = "20";
    public static VISIBLE_TILE_ITEM_CLASS: string = "board-tile:visible";
    public static VISIBLE_TILE_ITEM_SELECTOR: string = "." + Tile.VISIBLE_TILE_ITEM_CLASS;
    // selector for tiles that don't have filterHide (this works for collapsed columns & rows)
    public static FILTERED_TILE_ITEM_SELECTOR = ".board-tile:not(.filterHide)";
    public static TILE_ITEM_SELECTOR = ".board-tile";
    public static TILE_ANNOTATIONS_CLASS = "board-tile-annotations";
    public static TILE_CONTENT_CLASS = "board-tile-content";
    public static TILE_CONTENT_CONTAINER_CLASS = "board-tile-content-container";
    public static TILE_CONTENT_DETAILS = "board-content-details";
    public static TILE_CONTENT_BOTTOM_BORDER_CLASS = "board-tile-content-bottom-border";
    public static FILTERHIDE_CLASS = "filterHide";
    public static TILE_IS_PROCESSING_CLASS = "is-processing";
    public static TILE_SAVED = "tile-saved";
    public static TILE_RESET_AFTER_EDIT = "tile-reset-after-edit";
    public static TILE_START_DRAG = "tile-start-drag";
    public static TILE_ITEM_SAVED = "tile-item-saved";
    public static TILE_REORDERED_ITEM = "tile-reordered-item";

    public static CHECKLIST_REPARENT_FAILED = "checklist-reparent-failed";
    public static CHECKLIST_STATE_TRANSITION_FAILED = "checklist-state-transition-failed";

    private static TILE_EDITING_CLASS = "tile-editing";

    public static getId($element: JQuery): number {
        Diag.Debug.assertParamIsJQueryObject($element, "$element");
        return $element.data(Tile.DataKeyId);
    }

    public static setId($element: JQuery, id: number) {
        Diag.Debug.assertParamIsJQueryObject($element, "$element");
        $element.data(Tile.DataKeyId, id);
    }

    public static getType($element: JQuery): string {
        Diag.Debug.assertParamIsJQueryObject($element, "$element");
        return $element.data(Tile.DataKeyType);
    }

    public static setType($element: JQuery, type: string) {
        Diag.Debug.assertParamIsJQueryObject($element, "$element");
        $element.data(Tile.DataKeyType, type);
    }

    private _item: Boards.WorkItemItemAdapter;
    private _effortField: string;
    private _animating: boolean;
    private _delayedRefreshContents: Utils_Core.DelayedFunction;
    private _itemChangedHandler: Function;
    private _resetDelayedRefreshContentsHandler: Function;
    private _invokeDelayedRefreshContentsHandler: Function;
    private _needsUpdateHandler: Function;
    private _beginEditWorkItemListHandler: Function;
    private _endEditWorkItemListHandler: Function;
    private _updateItem: any;
    private _isEditable: boolean;
    private _mousedownX: number;
    private _mousedownY: number;
    private _isRequirementBacklog: boolean;
    private _itemType: string;
    private _cardSettings: Cards.CardSettings;
    private _cardStyleRules: Cards.IStyleRule[];
    private _sourceMemberOnDragStart: Boards.BoardMember;
    private static _cardRenderer: CardControls.ICardRenderer;
    private static _cardEditController: CardControls.ICardEditController;
    private _annotationManager: AnnotationManager.AnnotationManager;
    private _$cardContextMenuContainer: JQuery;
    private _$cardRenderExpandButtonContainer: JQuery;
    private _$tileContent: JQuery;
    private _tileColor: string;
    private _tileContentBorderColor: string;
    private _contextMenu: Menus.PopupMenu;
    private _disposeContextMenuDelegate: Function;
    private _userOverrideShowEmptyFields: boolean = false;
    private _tileHasFocus: boolean = false;
    private _touchMoved: boolean = false;
    private _eventsHelper: ScopedEventHelper = null;

    constructor(options?: ITileOptions) {
        /// <summary>UI Control for representing and managing a tile on a board.</summary>
        /// <param name="options" type="Object">Control options.</param>

        super(options);

        Diag.Debug.assertParamIsType(options, "object", "options");
        Diag.Debug.assertParamIsType(options.item, Boards.Item, "options.item");
        Diag.Debug.assertParamIsType(options.board, Boards.Board, "options.board");
        Diag.Debug.assert(!!options.eventsHelper, "Events helper must be specified.");

        this._item = options.item;
        this._itemType = this._item.type();
        this._animating = false;
        this._eventsHelper = options.eventsHelper;

        this.board = options.board;

        this._annotationManager = new AnnotationManager.AnnotationManager({
            team: this._options.team,
            source: this._item,
            $annotationDetailPaneArea: null,
            $badgeArea: null,
            onAnnotationDetailPaneStateChange: delegate(this, this._onAnnotationDetailPaneStateChange),
            eventsHelper: this._eventsHelper
        });

        if (!Tile._cardRenderer) {
            Tile._cardRenderer = CardControls.CardRendererFactory.createInstance(this.board.itemSource().type());
        }
        var cardSettingsProvider: Cards.CardSettingsProvider = this.board.getCardSettingsProvider();
        if (cardSettingsProvider) {
            this._cardSettings = cardSettingsProvider.getCardSettingsForItemType(this._itemType);
            this._cardStyleRules = cardSettingsProvider.getCardSettings().styles;
        }

        this._effortField = this.board.getField(Tile.EFFORT_TYPE_NAME);  // TODO: Get "Effort" value from shared enum with .cs files
        this._delayedRefreshContents = new Utils_Core.DelayedFunction(this, Tile.RefreshContentsDelay, "board-tile-refreshContents", this._refreshContents);

        // retrieve whether or not this is a requirement backlog
        var isWebAccessAsyncEnabled = TFS_Agile.IsWebAccessAsyncEnabled();
        this._isRequirementBacklog = false;

        if (!isWebAccessAsyncEnabled) {
            var backlogContext = TFS_Agile.BacklogContext.getInstance();
            this._isRequirementBacklog = backlogContext.isRequirement;
        }

        this._isEditable = TFS_Agile.areAdvancedBacklogFeaturesEnabled(this._isRequirementBacklog) && !this._item.isReadOnly();

        //If the "WebAccess.Agile.Board.CardCustomization" is off we need to initailize with default card settings
        if (!this._cardSettings) {
            this._cardSettings = new Cards.CardSettings(this._getDefaultValueForCardSettings());
        }
    }

    public initializeOptions(options?: ITileOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend(<Controls.EnhancementOptions>{
            coreCssClass: Tile.CoreCssClass,
            role: 'group'
        }, options));
    }

    public initialize() {
        /// <summary>Initialize the control.</summary>

        var that = this,
            id = this.id(),
            $element = this.getElement();

        this._createTile(id, $element);
        this._attachItemEvents();
        this._refreshContents();

        // The needs-update handler handles scenarios when a work item is 'opened' as part of another update operation.
        // NOTE: See the comment in VSS.Agile.Boards about moving this notification to using ActionManager.performAction instead.
        this._needsUpdateHandler = function (sender, args) {
            if (args.id === id) {
                that._updateItem = args.update;
            }
        };

        this._attachChecklistHandlers();
    }

    public dispose() {
        if (this._delayedRefreshContents) {
            this._delayedRefreshContents.cancel();
            this._delayedRefreshContents = null;
        }

        this._detachItemEvents();
        this._detachChecklistHandlers();
        this._disableTileTitleEvents();
        const element = this.getElement();
        if (element) {
            element.off("keydown click contextmenu focus blur mouseover mouseout mousedown mouseup touchend touchmove");
        }

        Tile._cardRenderer.disposeCard(element);

        if (this._$cardContextMenuContainer) {
            this._$cardContextMenuContainer.off("keydown click focus blur");
            this._$cardContextMenuContainer = null;
        }

        if (this._$cardRenderExpandButtonContainer) {
            this._$cardRenderExpandButtonContainer.off("click");
            this._$cardRenderExpandButtonContainer = null;
        }

        if (this._item) {
            this._item.dispose();
            this._item = null;
        }

        if (this._disposeContextMenuDelegate) {
            this._eventsHelper.detachEvent(Tile.TILE_START_DRAG, this._disposeContextMenuDelegate);
            this._disposeContextMenuDelegate = null;
        }
        this.board = null;

        if (this._annotationManager) {
            // Remove the droppable for the tile.
            if (this._$tileContent && this._$tileContent.hasClass("ui-droppable")) {
                this._annotationManager.removeDroppable(this._$tileContent);
            }

            this._annotationManager.dispose();
            this._annotationManager = null;
        }

        if (this._$tileContent) {
            this._$tileContent.off();
            this._$tileContent = null;
        }

        this._sourceMemberOnDragStart = null;

        super.dispose();
    }

    public id(): number {
        /// <summary>Get the tile id</summary>
        /// <returns type="Number">The id</returns>
        return this._item.id();
    }

    public item(): Boards.WorkItemItemAdapter {
        /// <summary>Get the associated item</summary>
        /// <returns type="any">The item</returns>
        return this._item;
    }

    public getCardEditController(): CardControls.ICardEditController {
        /// <summary>Gets the card editor</summary>
        /// <returns type="ICardEditController">The card editor</returns>
        if (!Tile._cardEditController) {
            Tile._cardEditController = new CardControls.BoardCardEditController(Tile._cardRenderer);
        }
        return Tile._cardEditController;
    }

    public setFocus(): void {
        this.getElement().focus();
    }

    public animating(value?: boolean): boolean {
        /// <summary>Sets value of _animating</summary>
        /// <param name="value" type="Boolean" optional="true">The new value</param>
        /// <returns type="boolean" />

        Diag.Debug.assertIsType(value, "boolean", "value", true);

        if (value !== undefined) {
            this._animating = value;
        }
        return this._animating;
    }

    public createHelper(offset: any, isVisible: boolean): JQuery {
        /// <summary>Create a helper of the tile that can be used in animations.</summary>
        /// <param name="offset" type="Object">The offset of the helper relative to body.</param>
        /// <param name="isVisible" type="Boolean">Extra Css rules for the helper.</param>
        /// <returns type="jQuery">The helper element.</returns>
        Diag.Debug.assertIsObject(offset, "offset");
        Diag.Debug.assertIsBool(isVisible, "isVisible");

        var $element = this.getElement(),
            $helper;

        $helper = $element.clone()
            .removeAttr("id")
            .appendTo(document.body)
            .css({
                position: "absolute",
                top: offset.top,
                left: offset.left,
                "background-color": $element.css("background-color"),
                "border-left-color": $element.css("border-left-color"),
                margin: "0px",
                width: $element.outerWidth()
            }).addClass("ui-draggable-dragging");

        $helper.css("visibility", (isVisible === true) ? "" : "hidden");

        return $helper;
    }

    /**
     * Get the position the tile should animate to.
     */
    private _getTileFinalAnimationPosition(): JQueryCoordinates {
        var $tile = this.getElement();
        var tileOffset;

        // The highest point in the window the helper tile can get, prevents the helper to go outside the board when animating drop in a scrollable column
        var $container = $tile.parent();

        // When animating into a collapsed row/column we want to animate to the location of that row/column.
        var $swimlaneParent = $tile.closest(".swimlane");
        if ($swimlaneParent.length !== 0) {
            if ($swimlaneParent.hasClass("swimlane-collapsed")) {
                var $swimlaneContainer = $swimlaneParent.closest(".member-vertical");

                $container = $swimlaneContainer;
                tileOffset = $swimlaneContainer.offset();
            }
        }
        else {
            var $parentMember = $tile.parentsUntil(".member-selector");
            var memberView: MemberView = <MemberView>Controls.Enhancement.getInstance(MemberView, $parentMember);

            if (memberView && memberView.isCollapsed()) {
                var $memberElement = memberView.getElement();
                $container = $memberElement;
                tileOffset = $memberElement.offset();
            }
        }

        // Wasn't a collapsed row/column or couldn't get offset, animate to tile.
        if (!tileOffset) {
            tileOffset = $tile.offset();
        }

        var maxTop: number;
        if (tileOffset.top < $container.offset().top) {
            maxTop = $container.offset().top;
        }
        else if (tileOffset.top > $container.offset().top + $container.height()) {
            maxTop = $container.offset().top + $container.height();
        }
        else {
            maxTop = tileOffset.top;
        }

        tileOffset.top = maxTop;
        return tileOffset;
    }

    /**
     * Animate the tile.
     * @param $helper - The UI helper object which is being animated instead of the actual tile.
     * @param callback - The callback to be called after animation is complete.
     */
    public animateTile($helper: JQuery, callback?: IResultCallback) {
        Diag.Debug.assertIsJQueryObject($helper, "$helper");

        this.animating(true);

        // get offsets for helper and original tile
        var $element = this.getElement();
        var helperOffset = $helper.offset();
        var tileOffset = this._getTileFinalAnimationPosition();

        // ensure the tile animate only upto the top of the board and slow slideup if the tile goes over the board.
        var isTopCoordinateAboveBoard = false;
        var boardTopOffset = this._getScrollableContentContainer().offset().top;
        var tileHeight = $element.height();

        if (tileOffset.top < boardTopOffset - tileHeight) {
            tileOffset.top = boardTopOffset;
            isTopCoordinateAboveBoard = true;
        }

        // calculate animation distance and duration
        var distance = Math.sqrt(Math.pow(helperOffset.top - tileOffset.top, 2) + Math.pow(helperOffset.left - tileOffset.left, 2));
        var animationDuration = (distance > MemberView.TILE_DROP_ANIMATION_DURATION_DISTANCE_THRESHOLD) ? MemberView.TILE_DROP_ANIMATION_DURATION_SLOW_TIME : MemberView.TILE_DROP_ANIMATION_DURATION_FAST_TIME;
        var animationProperties = {
            top: tileOffset.top,
            left: tileOffset.left
        };
        var animationCallback = () => {
            $helper.remove(); // remove helper from DOM
            $element.css("visibility", ""); // show original tile
            this.animating(false);
            Diag.logTracePoint("tile._animateTile.complete");

            if (callback) {
                callback();
            }
        };

        if (isTopCoordinateAboveBoard) {
            $helper.animate(
                animationProperties,
                {
                    duration: animationDuration,
                    complete: () => {
                        $helper.slideUp(
                            {
                                duration: 200,
                                easing: "easeOutCubic",
                                complete: animationCallback
                            });
                    }
                });
        }
        else {
            $helper.animate(
                animationProperties,
                {
                    duration: animationDuration,
                    easing: "easeOutCubic",
                    complete: animationCallback
                });
        }
    }

    public isProcessing(): boolean {
        /// <summary>Determines whether this tile is in a processing state</summary>
        /// <returns type="Boolean" />
        return Boolean(this._item.operation());
    }

    public hasError(): boolean {
        /// <summary>Determines whether this tile is in an error state</summary>
        /// <returns type="Boolean" />
        // TODO: Message indicates that an overlay should appear on the board. We should really make it more clear
        //       when the item is in an error state by differentiating between messages and errors. Currently
        //       message means that there is an error overlay.
        return Boolean(this._item.message());
    }

    /**
     *  Opens the WIT form corresponding to the workitem id of the current item
     */
    public openItemOnEvent() {
        if (this.isProcessing() || this.getElement().css("visibility") === "hidden") {
            // Tracking bug : 505203
            // TODO: Review --> For some reason when we drop a draggable in an invalid location
            // e.g. in the same column as it started the drag we are getting a click event being
            // fired. This doesn't happen with the jQuery-UI 'droppable' page.
            return;
        }

        // listen for notification from the board that an item may need updating after the drag operation is completed.
        this._eventsHelper.attachEvent(Boards.Notifications.BoardItemNeedsUpdate, this._needsUpdateHandler);

        this._openItem();
    }

    /**
     *  Toggle between expand and collapsed state of the card
     */
    public toggleCardExpandState(): void {
        this._userOverrideShowEmptyFields = !this._userOverrideShowEmptyFields;
        this._refreshContents();
    }

    /**
     * Updates current tile's aria label
     */
    private _refreshCurrentTileLabel(): void {
        if (this._item && this.board) {
            const title = this._item.fieldValue(AgileUtils.DatabaseCoreFieldRefName.Title);
            const label = this._getTileAriaLabel(title);
            this.getElement()
                .attr('aria-label', label)
                // Move 'aria-roledescription' to initializeOptions once its supported by the interface
                .attr('aria-roledescription', AgileControlsResources.KanbanCard_AriaRoleDescription);
        }
    }

    /**
     * Returns aria-label for kanban tile. Format: 'workItem-type-name card-title, column column-name doing-done-state, swimlane swimlane-name'
     * @param title kanban-card title. 
     */
    private _getTileAriaLabel(title: string): string {
        Diag.Debug.assertIsNotNull(this._item, "GetTileAriaLabel is called before options are initialized");
        Diag.Debug.assertIsNotNull(this.board, "GetTileAriaLabel is called before the board is set");

        let tileLabel = Utils_String.empty;
        const workItemTypeName = this._getCardContext().workItemTypeName;
        const currentMember: Boards.BoardMember = this.currentMember(); // Current tile (Note: this is 'null' if the card is being removed from the board)

        if (title && workItemTypeName && currentMember) {
            const currentColumnMember: Boards.BoardMember = currentMember.getColumnMember(); // Current column
            const currentLaneMember: Boards.BoardMember = currentColumnMember.node().parentMember(); // Current swimlane
            const columnName: string = currentColumnMember ? currentColumnMember.title() : Utils_String.empty;
            const swimlaneName: string = currentLaneMember ? currentLaneMember.title() : Utils_String.empty;
            const currentNodeFieldName: string = currentMember.node().fieldName();

            let doingDoneState: string = Utils_String.empty;
            if (AgileUtils.ControlUtils.checkIfFieldReferenceNameIsForDoingDone(currentNodeFieldName)) {
                const currentValue = currentMember.values()[0];
                if (Utils_String.equals(currentValue, "true", true)) {
                    doingDoneState = AgileControlsResources.KanbanDoneColumnAriaLabel;
                }
                else if (Utils_String.equals(currentValue, "false", true)) {
                    doingDoneState = AgileControlsResources.KanbanDoingColumnAriaLabel;
                }
            }

            tileLabel = `${workItemTypeName} ${title}`;

            if (columnName) {
                tileLabel = `${tileLabel}, ${AgileControlsResources.KanbanColumnAriaLabel} ${columnName} ${doingDoneState}`;
            }
            if (swimlaneName) {
                tileLabel = `${tileLabel}, ${AgileControlsResources.KanbanSwimlaneAriaLabel} ${swimlaneName}`;
            }
        }
        return tileLabel;
    }

    private _getCardContext(): CardControls.IRenderCardContext {
        return {
            teamId: this._options.team.id,
            projectName: TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name,
            workItemTypeName: this._getFieldValue(AgileUtils.DatabaseCoreFieldRefName.WorkItemType)
        };
    }

    private _setFocusBehaviorOnTile(): void {
        let $tile = this.getElement();
        let $tileContent = $tile.find("." + Tile.TILE_CONTENT_CLASS);

        // set focus behavior on the entire tile outline
        $tile.addClass("focus");

        // set the focus behavior on the tile content border
        if ($tileContent.length > 0) {
            // get the color of the default color of the border
            if (!this._tileHasFocus && this._tileContentBorderColor === undefined) {
                this._tileContentBorderColor = $tileContent.css("border-top-color");
            }
            $tileContent.css("border-color", this._tileColor);

            // set the focus behavior on the tile content details border, only when we set focus on the content also
            this._setFocusBehaviorOnAnnotationPane();
        }

        // update the state in member variable
        this._tileHasFocus = true;
    }

    private _resetFocusBehaviorOnTile(): void {
        let $tile = this.getElement();
        let $tileContent = $tile.find("." + Tile.TILE_CONTENT_CLASS);

        // set focus behavior on the entire tile outline
        $tile.removeClass("focus");

        // reset the focus behavior on the tile content border
        if (this._tileContentBorderColor) {
            if ($tileContent.length > 0) {
                $tileContent.css("border-color", this._tileContentBorderColor);
            }
        }

        // reset the focus behavior on the tile content details border
        this._resetFocusBehaviorOnAnnotationPane();

        // update the state in member variable
        this._tileHasFocus = false;
    }

    private _setFocusBehaviorOnAnnotationPane(): void {
        let $tileContentDetails = this.getElement().find("." + Tile.TILE_CONTENT_DETAILS);
        if ($tileContentDetails.length > 0) {
            $tileContentDetails.css("border-color", this._tileColor);
        }
    }

    private _resetFocusBehaviorOnAnnotationPane(): void {
        let $tileContentDetails = this.getElement().find("." + Tile.TILE_CONTENT_DETAILS);
        if (this._tileContentBorderColor) {
            if ($tileContentDetails.length > 0) {
                $tileContentDetails.css("border-color", this._tileContentBorderColor);
            }
        }
    }

    private _onFocus(event: JQueryEventObject): void {
        // set the UX change on the tile border
        this._setFocusBehaviorOnTile();
    }

    private _onBlur(event: JQueryEventObject): void {
        // reset the UX change on the tile border
        this._resetFocusBehaviorOnTile();
    }

    private _onAnnotationDetailPaneStateChange(annotationDetailPaneState: Annotations.AnnotationDetailPaneState): void {
        // update bottom border visibility of the TILE_CONTENT_CLASS
        switch (annotationDetailPaneState) {
            case Annotations.AnnotationDetailPaneState.OPENED:
                this._$tileContent.removeClass(Tile.TILE_CONTENT_BOTTOM_BORDER_CLASS);
                break;

            case Annotations.AnnotationDetailPaneState.CLOSED:
                this._$tileContent.addClass(Tile.TILE_CONTENT_BOTTOM_BORDER_CLASS);
                break;
        }

        // set the focus treatment on the TILE_CONTENT_DETAILS if the tile was in focus before state change
        if (this.hasFocus()) {
            this._setFocusBehaviorOnAnnotationPane();
        }
    }

    private _getDefaultValueForCardSettings(): Cards.ICardFieldSetting[] {
        // Default fields to be shown on the card
        var cardFieldSettings: Cards.ICardFieldSetting[];
        if (this._isRequirementBacklog) {
            cardFieldSettings = [{ fieldIdentifier: DatabaseCoreFieldRefName.Title }, { fieldIdentifier: DatabaseCoreFieldRefName.AssignedTo }, { fieldIdentifier: this._effortField }];
        }
        else {
            cardFieldSettings = [{ fieldIdentifier: DatabaseCoreFieldRefName.Title }, { fieldIdentifier: DatabaseCoreFieldRefName.AssignedTo }];
        }
        return cardFieldSettings;
    }

    private _handleItemChange(sender: any, args?: any) {
        /// <summary>Handle updates to the underlying item. Typically this means we'll refresh
        /// the contents of the tile if one of the fields changed appears on the tile.</summary>
        /// <param name="sender" type="Object">The sender of the change event.</param>
        /// <param name="args" type="Object">The event arguments.</param>

        // TODO: Filter the changes to only refresh when we're changing one of the tile's display fields.
        switch (args.change) {
            case Boards.ItemSource.ChangeTypes.Opened:
            case Boards.ItemSource.ChangeTypes.Saved:
            case Boards.ItemSource.ChangeTypes.MessageChange:
            case Boards.ItemSource.ChangeTypes.Reset:
            case Boards.ItemSource.ChangeTypes.Refresh:
            case Boards.ItemSource.ChangeTypes.ErrorChanged:
                //if there aren't any pending operations on the item trigger a refresh of tile
                //if there is a pending operation the completion of that operation will trigger the tile refresh
                //this check will avoid flickering of tile due to saving overlay shown before 500ms by _refreshContents()
                if (!this.item().operation()) {
                    this._refreshContents();
                }
                break;
            case Boards.ItemSource.ChangeTypes.ChecklistChanged:
            case Boards.ItemSource.ChangeTypes.AnnotationItemSourceChanged:
                if (!this.item().operation()) {
                    var itemChangeArgs: Boards.ItemChangeEventArgs;

                    var isAllChildAnnotationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations)
                    if (isAllChildAnnotationEnabled) {
                        itemChangeArgs = {
                            annotationItemSource: args.annotationItemSource,
                            change: args.change,
                            item: args.item,
                            workItemType: args.workItemType
                        };
                    } else {
                        itemChangeArgs = {
                            annotationItemSource: args.annotationItemSource,
                            change: args.change,
                            item: args.item
                        };
                    }

                    this._annotationManager.refreshAnnotations(itemChangeArgs);
                }
                break;
            default:
                break;
        }
    }

    public hasFocus(): boolean {
        return this._tileHasFocus;
    }

    private _clickHandler(event: JQueryEventObject) {
        /// <summary>Called on a tile when it is clicked. Brings the tile to focus</summary>
        /// <param name="event" type="JQueryEventObject">The originating browser event</param>

        if (!event.isDefaultPrevented()) {
            this.setFocus();
        }
    }

    private _enableTileTitleEvents(): void {
        let $element = this.getElement();
        let $clickableTitleLinkWrappper = $element.find(".clickable-title-link");
        let $clickableTitle = $element.find(".clickable-title");
        let workItemEditUrl = this._getWorkItemEditUrl();

        if ($clickableTitleLinkWrappper.length == 0 && $clickableTitle.length > 0) {
            let $title = $clickableTitle.first();
            // set tabindex to -1 to prevent undesire tab on title link to open work item.
            var $titleLink = $('<a href="' + workItemEditUrl + '" class="clickable-title-link"></a>').attr("tabindex", "-1");
            $title.wrap($titleLink);
            $title.unbind("click mouseenter mouseleave").on("click mouseenter mouseleave", (event) => {
                switch (event.type) {
                    case "click":
                        if (event.ctrlKey || event.metaKey) {
                            window.open(workItemEditUrl);
                            Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_OPENTILE_KEYBOARD_SHORTCUT, { "Key": "mod+click" });
                        } else {
                            this.openItemOnEvent();
                            Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_OPENTILE_KEYBOARD_SHORTCUT, { "Key": "click" });
                        }
                        return false; // Important to prevent the default operation of the href link
                    case "mouseenter":
                        var $tileContextMenu = $element.find("." + Tile.TILE_CONTENT_CONTAINER_CLASS);
                        if ($tileContextMenu && $tileContextMenu.length > 0) {
                            $tileContextMenu.off("contextmenu");
                        }
                        break;
                    case "mouseleave":
                        var $tileContextMenu = $element.find("." + Tile.TILE_CONTENT_CONTAINER_CLASS);
                        if ($tileContextMenu && $tileContextMenu.length > 0) {
                            $tileContextMenu.unbind("contextmenu").on("contextmenu", (event: JQueryEventObject) => {
                                this._handleCreateContextMenuEvent(this._$tileContent, this._$cardContextMenuContainer, event);
                            });
                        }

                        break;
                }

            });
        }
    }

    private _disableTileTitleEvents(): void {
        let $element = this.getElement();
        if ($element) {
            let $clickableTitleLinkWrappper = $element.find(".clickable-title-link");
            let $clickableTitle = $element.find(".clickable-title");

            if ($clickableTitleLinkWrappper.length > 0 && $clickableTitle.length > 0) {
                let $title = $clickableTitle.first();
                $title.unwrap();
                $title.unbind("click");
            }
        }
    }

    /* Constructs the Work Item Edit link for the current workitem id*/
    private _getWorkItemEditUrl(): string {
        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        return tfsContext.getActionUrl("edit", "workitems", {
            project: tfsContext.contextData.project.name,
            team: tfsContext.contextData.team && tfsContext.contextData.team.name || "",
            parameters: this.id()
        });
    }

    //made public for unit tests
    public _getScrollableContentContainer(): JQuery {
        return $(NodeViewHorizontal.SCROLLABLE_CONTENT_CONTAINER_SELECTOR);
    }

    private _openItem() {
        var perfScenario = Performance.getScenarioManager().startScenario(Boards.KanbanTelemetry.CI_AREA_AGILE, Boards.KanbanTelemetry.Perf_Scenario_OpenCard);
        var currentItem = this._item;
        var prevItem = this.getElement().prev();
        var workItemId = this.id();
        if (this.board && this.board.isAutoBoardRefreshOn()) {
            // Lock the card while it is open in WIT form, so that auto-refresh doesn't touch it and cause jaary user experience
            // where suddenly user loses control in the middle of editing and any unsaved changes get lost.
            this.lockMoveItem();
        }

        WITDialogShim.showWorkItemModal(workItemId, {
            close: (workItem: WITOM.WorkItem) => {
                // Unlock the card which was locked while opening the WIT form. Read comments above to know why was it locked.
                this.unlockMoveItem(workItemId);

                if (this.isDisposed()) {
                    return;
                }

                // Here we must do a pin operation again because when the work item form is closed, it wipes away all pin counts for the new item.
                if (workItemId < 0) {
                    if (workItem.id > 0) {
                        this._item.pinAndUnblockReorderOperation(workItem, workItemId);
                    }
                    else {
                        // if the work item id is (0 now but also could be negative) that means that the work item form was closed without save. In this case we need to abort the pending reorder
                        // to remove it from the running documents table
                        currentItem.operation().abort();
                    }
                }

                Utils_Core.delay(this, 0, () => {
                    //update the contents of the tile based on changes made when item was opened
                    if (this.getElement()) {
                        this.item().message(null);
                        if (this.item() && this.item().getPendingAutoRefreshEvent()) {
                            var pendingEvent = this.item().getPendingAutoRefreshEvent();
                            pendingEvent.forceRefresh = true;
                            this.item().setPendingAutoRefreshEvent(null);
                            this._eventsHelper.fire(BoardAutoRefreshCommon.Events.ItemsNeedAutoRefresh, this, [pendingEvent]);
                        } else {
                            this._refreshContents();
                            this._processItemUpdates();
                            this.setFocus();
                        }

                    } else if (prevItem.length > 0) {
                        prevItem.focus();
                    }
                });
            },
            onRenderComplete: (workItem) => {
                perfScenario.end();
                // While opening a workitem we skip loading extension fields, so if the extensions are not loaded we go and get it from the server
                if (workItem.extensions && workItem.extensions.length === 0) {
                    workItem.store.beginGetWorkItemTypeExtensions(workItem.extensionIds, (extensions) => {
                        workItem.setExtensions(extensions);
                    });
                }
            },
            save: (workItem: WITOM.WorkItem) => {
                if (this.isDisposed()) {
                    return;
                }

                // TODO: FIX BUG IN WORK ITEM FORM THAT CAUSES SAVE TO BE INVOKED TWICE
                // new work item was saved and successfully in WIT form after setting required fields
                if (workItemId < 0 && workItem.id > 0) {
                    this._item.pinAndUnblockReorderOperation(workItem, workItemId);
                }
            }
        });
    }

    private _createTile(id: number, $element: JQuery) {
        /// <summary>Create a tile to render an Item.</summary>
        /// <param name="id" type="Number">The id of the item.</param>
        Diag.Debug.assertParamIsType(id, "number", "id");
        Diag.Debug.assertParamIsJQueryObject($element, "$element");

        Tile.setId($element, id);

        var type = this.item().type();
        Tile.setType($element, type);

        $element.data(Tile.DATA_REBIND_CLICK, false)
            .on("keydown click focus blur", (event: JQueryEventObject) => {
                switch (event.type) {
                    case "keydown":
                        this._onKeyDown(event);
                        break;
                    case "click":
                        this._clickHandler(event);
                        break;
                    case "focus":
                        this._onFocus(event);
                        break;
                    case "blur":
                        this._onBlur(event);
                        break;
                }
            });

        Utils_UI.accessible($element); // handles tabindex and keydown handler for the tile

        if (this._isEditable) {
            // Delay the initialize of droppable to improve load performance.
            Utils_Core.delay(this, 0, () => {
                $element.draggable({
                    // Set the scope of the tile to match the sprint View Control's scope to support assign to Iteration
                    scope: TFS_Agile.DragDropScopes.WorkItem,
                    start: delegate(this, this._startDrag),
                    stop: delegate(this, this._stopDrag),
                    drag: delegate(this, this._drag),
                    scroll: false, // scroll is set to false since jQuery doesnt behave nicely with our view
                    scrollables: [".agile-content-container"], // scrollables is a custom plugin we wrote to scroll a container when we want to bypass jQuery scroll
                    helper: function (event) {
                        var tileWidth = $element.outerWidth();
                        var $helper = $element.clone().removeAttr("id").css({
                            position: "absolute",
                            width: tileWidth,
                            display: "none"
                        });
                        $helper.find(".menu-popup").remove(); // remove any popup that may have been cloned if the drag started with a pop up open
                        Tile.setId($helper, Tile.getId($element));
                        return $helper;
                    },
                    zIndex: Tile.DragZIndex,
                    scrollSensitivity: 60,
                    scrollSpeed: 10,
                    distance: Tile.DRAG_START_DISTANCE,
                    // This makes it so that when we drop off the board it does not animate back to its original position but there is no quick way to resolve this.
                    // The overload for revert that is to create a function only take a single parameter that is (dropped: boolean). This can't be used to differentiate
                    // between a drop off the board or on the same member.
                    revert: "false",
                    revertDuration: 300,
                    appendTo: document.body
                } as JQueryUI.DraggableOptions);

                // Ignore dragging on the card ID.  This allows users to copy the id without starting a drag event. 
                $element.draggable({ cancel: '.' + FieldRendererHelper.ID_CLASS });
            });

            this._attachCardEditEvents($element);

            this._disposeContextMenuDelegate = delegate(this, this._disposeContextMenu);
            this._eventsHelper.attachEvent(Tile.TILE_START_DRAG, this._disposeContextMenuDelegate);
        }

        this._setColor();
    }

    // Made public for testing
    public _onKeyDown(e?: JQueryEventObject) {
        if (this._isEditable && this.hasFocus()) {
            // e.metaKey -> Command key on Mac.
            if ((e.keyCode === Utils_UI.KeyCode.LEFT || e.keyCode === Utils_UI.KeyCode.RIGHT) && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
                this._changeColumnOnKeyDown(e);
            }
            else if (this.currentMember().isInProgress()
                && (e.keyCode === Utils_UI.KeyCode.UP || e.keyCode === Utils_UI.KeyCode.DOWN) && e.shiftKey && (e.ctrlKey || e.metaKey)) {
                this._changeLaneOnKeyDown(e);
            }
            else if (!this.currentMember().isOutgoing()
                && (e.keyCode === Utils_UI.KeyCode.UP || e.keyCode === Utils_UI.KeyCode.DOWN) && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
                this._reorderOnKeyDown(e);
            }
            else if (!this.currentMember().isOutgoing()
                && (e.keyCode === Utils_UI.KeyCode.HOME || e.keyCode === Utils_UI.KeyCode.END) && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
                this._reorderToExtremesOnKeyDown(e);
            }
            else if ((e.keyCode === Utils_UI.KeyCode.RIGHT || e.keyCode === Utils_UI.KeyCode.LEFT) && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                this._moveFocusOnTileAcrossMembers(e);  // For navigating RIGHT <-> LEFT
            }
            else if ((e.keyCode === Utils_UI.KeyCode.UP || e.keyCode === Utils_UI.KeyCode.DOWN) && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                this._moveFocusOnTileWithinMember(e); // For navigating UP <-> DOWN
            }
            else if ((e.keyCode === Utils_UI.KeyCode.F10) && e.shiftKey && this._$tileContent && this._$cardContextMenuContainer) {
                this._handleCreateContextMenuEvent(this.getElement(), this._$cardContextMenuContainer, e); // For opening context menu Shift + F10
            }
        }
    }

    private _setColor() {
        const typeColorAndIconsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
        this._tileColor = typeColorAndIconsProvider.getColor(this._getCardContext().projectName, this._itemType);
    }

    private _changeLaneOnKeyDown(e?: JQueryEventObject) {
        if (!this.isDraggable()) {
            return false;
        }

        var item = this.item();
        var currentMember: Boards.BoardMember = this.currentMember();
        var moveToMember: Boards.BoardMember;

        if (currentMember === null) {
            return;
        }

        if (e.keyCode === Utils_UI.KeyCode.UP) {
            moveToMember = currentMember.memberInPreviousLane();
        } else if (e.keyCode === Utils_UI.KeyCode.DOWN) {
            moveToMember = currentMember.memberInNextLane();
        }
        this._moveTileToMember(item, moveToMember);
    }

    private _changeColumnOnKeyDown(e?: JQueryEventObject) {
        if (!this.isDraggable()) {
            return false;
        }

        var item = this.item();
        var currentMember: Boards.BoardMember = this.currentMember();
        var moveToMember: Boards.BoardMember;

        if (currentMember === null || item.isNew()) {
            return;
        }

        e.preventDefault(); // Prevent default action to avoid unnecessary browser prompts
        if (e.keyCode === Utils_UI.KeyCode.LEFT) {
            moveToMember = currentMember.previousMember();
        } else if (e.keyCode === Utils_UI.KeyCode.RIGHT) {
            moveToMember = currentMember.nextMember();
        }
        this._moveTileToMember(item, moveToMember);
    }

    private _moveTileToMember(item: Boards.Item, moveToMember: Boards.BoardMember) {
        if (moveToMember && !moveToMember.disableAcquisitions) {
            moveToMember.executeUp((member: Boards.BoardMember) => {
                member.fire(Boards.Notifications.BoardExpandMember, this, null);
            });

            // update field values of item
            var fieldUpdateList = moveToMember.getFieldUpdateList();
            item.fieldValues(fieldUpdateList);

            // save item
            item.beginSave(
                () => {
                    // callback on successful save
                    this.setFocus();
                    this._eventsHelper.fire(Boards.Notifications.BoardTileMoved);
                    Diag.logTracePoint("Tile.saveOperation.complete");
                }, function (error) {
                    // error callback
                });
        }
    }

    private _moveItemOnKeyDown(e: JQueryEventObject, keyCodeToMoveUp: Utils_UI.KeyCode, keyCodeToMoveDown: Utils_UI.KeyCode, moveToExtreme?: boolean) {
        if (!this.isDraggable()) {
            return false;
        }

        var $originalItem = this.getElement();
        var children = $originalItem.parent().children(Tile.VISIBLE_TILE_ITEM_SELECTOR);
        var originalItemIndex = children.index($originalItem);
        if (originalItemIndex < 0) {
            return;
        }

        var moveToIndex = -1;
        var $moveToItem: JQuery;
        if (e.keyCode === keyCodeToMoveUp && originalItemIndex > 0) {
            moveToIndex = moveToExtreme ? 0 : originalItemIndex - 1;
            $moveToItem = children.eq(moveToIndex);
            $originalItem.insertBefore($moveToItem);
        } else if (e.keyCode === keyCodeToMoveDown && originalItemIndex < children.length - 1) {
            moveToIndex = moveToExtreme ? children.length - 1 : originalItemIndex + 1;
            $moveToItem = children.eq(moveToIndex);
            $originalItem.insertAfter($moveToItem);
        }

        if (moveToIndex > -1) {
            this._reorderItem(e, $originalItem, originalItemIndex, moveToIndex);
        }
    }

    private _reorderOnKeyDown(e?: JQueryEventObject): void {
        this._moveItemOnKeyDown(e, Utils_UI.KeyCode.UP, Utils_UI.KeyCode.DOWN);
    }
    private _reorderToExtremesOnKeyDown(e?: JQueryEventObject): void {
        this._moveItemOnKeyDown(e, Utils_UI.KeyCode.HOME, Utils_UI.KeyCode.END, true);

        // Telemetry
        if (e.keyCode === Utils_UI.KeyCode.HOME) {
            Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_MOVETILETOPOFCOLUMN_KEYBOARD_SHORTCUT, { "Key": "mod+home" });
        } else if (e.keyCode === Utils_UI.KeyCode.END) {
            Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_MOVETILEBOTTOMOFCOLUMN_KEYBOARD_SHORTCUT, { "Key": "mod+end" });
        }

        e.preventDefault();
        e.stopPropagation();
    }

    private _moveFocusOnTileAcrossMembers(e?: JQueryEventObject): void {
        if (!this.hasFocus()) {
            // If there is no focus on the tile, then don't honor navigation
            return;
        }

        var hasFocusChanged = false;
        var $currentItem = this.getElement();
        var parentMember = <MemberView>Controls.Enhancement.getInstance(MemberView, $currentItem.parent());
        var sibling: MemberView = null;

        // For UP we fetch the last tile in member to move the focus to
        if (e.keyCode === Utils_UI.KeyCode.UP) {
            sibling = parentMember.getAboveLaneSibling();
            if (sibling !== null) {
                let lastTileInSibling = sibling.getLastTileInMember();
                if (lastTileInSibling !== null) {
                    lastTileInSibling.setFocus();
                    hasFocusChanged = true;
                }
            }
        } else {
            // For RIGHT, LEFT and DOWN we fetch the first tile in member to move the focus to
            if (e.keyCode === Utils_UI.KeyCode.LEFT) {
                sibling = parentMember.getLeftSibling();
            } else if (e.keyCode === Utils_UI.KeyCode.RIGHT) {
                sibling = parentMember.getRightSibling();
            } else if (e.keyCode === Utils_UI.KeyCode.DOWN) {
                sibling = parentMember.getBelowLaneSibling();
            }

            if (sibling !== null) {
                let firstTileInSibling = sibling.getFirstTileInMember();
                if (firstTileInSibling !== null) {
                    firstTileInSibling.setFocus();
                    hasFocusChanged = true;
                }
            }
        }

        // Disable propagation of event to prevent unnecessary scrolling of browser
        if (hasFocusChanged) {
            // The change is focus will take care of the scrolling according to the view port
            e.preventDefault();
        }
    }

    private _moveFocusOnTileWithinMember(e?: JQueryEventObject): void {
        if (!this.hasFocus()) {
            // If there is no focus on the tile, then don't honor navigation
            return;
        }

        var hasFocusChanged = false;
        var $originalItem = this.getElement();
        var children = $originalItem.parent().children(Tile.VISIBLE_TILE_ITEM_SELECTOR);
        var originalItemIndex = children.index($originalItem);
        if (originalItemIndex < 0) {
            return;
        }

        var moveToIndex = -1;

        if (e.keyCode === Utils_UI.KeyCode.UP && originalItemIndex > 0) {
            moveToIndex = originalItemIndex - 1;
        } else if (e.keyCode === Utils_UI.KeyCode.DOWN && originalItemIndex < children.length - 1) {
            moveToIndex = originalItemIndex + 1;
        } else {
            // Move outside the scope of the current member (if any)
            this._moveFocusOnTileAcrossMembers(e);
        }

        if (moveToIndex > -1) {
            var $moveToItem = children.eq(moveToIndex);
            $moveToItem.focus();
            hasFocusChanged = true;
        }

        // Disable propagation of event to prevent unnecessary scrolling of browser
        if (hasFocusChanged) {
            // The change is focus will take care of the scrolling according to the view port
            e.preventDefault();
        }
    }

    private _isDragEvent(xChange: number, yChange: number): boolean {
        /// <summary> Given change in x-position and y-position, tells if this should be considered as a drag or not </summary>

        if ((xChange < Tile.DRAG_START_DISTANCE) && (yChange < Tile.DRAG_START_DISTANCE)) {
            return false;
        }

        return true;
    }

    private _unbindTileEditClick(): void {
        /// <summary>Unbind the click event from opening the tile</summary>

        var $tile = this.getElement();
        $tile.off("click");
    }

    private _saveChanges(actions: AgileControls.IOnTileEditSaveActions) {
        var startTime = Date.now();
        var $tile = this.getElement();
        var item = this.item();
        var isNewItem: boolean = item.isNew();
        var isFirstItem = $tile.parent().children(Tile.TILE_ITEM_SELECTOR).length <= 1;
        var perfScenario: Performance.IScenarioDescriptor;

        // recorded for telemetry
        if (isNewItem) {
            item.startTime = startTime;
            perfScenario = Performance.getScenarioManager().startScenario(Boards.KanbanTelemetry.CI_AREA_AGILE, Boards.KanbanTelemetry.Perf_Scenario_SaveCard);
        }
        var errorCallback = (error) => {
            // open item for client validation error in saving a new item like missing mandatory fields
            if (isNewItem) {
                this._openItem();
            }
        };

        var callback = () => {
            // If we are supposed to set the focus on the tile after saving, and we haven't selected a different element,
            // then we set focus on the tile. This is for situations like tab and enter, which are supposed to save the tile, then set
            // focus on it after the save is complete. Note that if there is no focus, the active element on the page is the body, which is where
            // the focus will be if we are saving and haven't clicked on anything else.
            if (actions.focusOnTile && (!document.activeElement || $(document.activeElement).is("body"))) {
                if (!this.isDisposed()) {
                    this.setFocus();
                }
            }
            if (!isNewItem) {
                Boards.KanbanTelemetry.OnTileEdit(startTime);
            }
            else {
                perfScenario.end();

                if (isFirstItem) {
                    // record telemetry for new item added when it is the only item on the column.
                    Boards.KanbanTelemetry.OnAddNewItem(item.type(), startTime);
                }
            }
            this._eventsHelper.fire(Tile.TILE_SAVED, this, item);
        };

        // for a new item queue a re-order request if it is not the only item on the column/member
        // i.e. if the column/member where we are adding new item is empty no re-order request is queued which ends up placing the item at end of backlog
        if (item.isNew() && !isFirstItem) {
            this._reorderItem(null, $tile, TFS_Agile.ReorderManager.ReorderIdUnspecified, 0);
        }

        item.beginSave(callback, errorCallback);
    }

    private _editStartCallback() {
        /// <summary> A callback called by the control which binds and unbinds various events on the tile </summary>

        if (this.board && this.board.isAutoBoardRefreshOn()) {
            // Lock the card while it is being edited, so that auto-refresh doesn't touch it and cause jaary user experience
            // where suddenly user loses control in the middle of editing and any unsaved changes get lost.
            this.lockMoveItem();
        }
        var $tile = this.getElement();
        this._disableTileEvents($tile);

        // Add class for use in conditionally styling elements while editing
        $tile.addClass(Tile.TILE_EDITING_CLASS);
    }

    private _disableTileEvents($tile: JQuery) {
        //Fix issue where we cannot select text in input boxes
        $tile.off("selectstart");

        // Remove focus handling on edit to avoid flickering of the focus behavior
        $tile.off("focus");

        // We shouldn't be able to click to open the form if the dropdown is showing.
        // For more information, see note in _enableTileEvents
        $tile.data(Tile.DATA_REBIND_CLICK, false);
        this._unbindTileEditClick();

        // As of JQuery UI 1.9, calling a method on a non-initialized widget will throw an error instead of a no-op.
        if ($tile.data("ui-draggable")) {
            // We shouldn't be able to drag if we're inputting info
            // the "ui-state-disabled" class makes the tile appear disabled, like when saving, which is not what we want
            $tile.draggable("disable");
            $tile.removeClass("ui-state-disabled");
        }
    }

    private _enableTileEvents($tile: JQuery) {
        // Re-disable text selection (see _createTile method)
        $tile.on("selectstart", function () {
            return false;
        });

        // Enable focus & blur event handler once edit is complete
        $tile.unbind("focus blur").on("focus blur", (event: JQueryEventObject) => {
            switch (event.type) {
                case "focus":
                    this._onFocus(event);
                    break;
                case "blur":
                    this._onBlur(event);
                    break;
            }
        });

        // As of JQuery UI 1.9, calling a method on a non-initialized widget will throw an error instead of a no-op.
        if ($tile.data("ui-draggable")) {
            // Re-enable drag. If the tile is in saving state, it will still not be draggable because _startDrag would return false.
            $tile.draggable("enable");
        }

        // NOTE: There are two important parts here, both of which are necessary.
        // 1. We use a timeout because if there is no timeout, we can click on the assigned to field,
        //      which opens the dropdown (unbinding the click handler), then if we click on the tile the click handler gets bound right away,
        //      causing the tile to open. We don't want the tile to open when we click on it while the drop down is open. You can still cause
        //      the tile if you do a long click on the tile (i.e. >400ms) while the drop down is open.
        // 2. If we only used a timeout, but didn't have the REBIND_CLICK flag, we would run into the following problem:
        //      If a dropdown is open (and thus the click handler has been unbound), then we click on the other field (without editing the field)
        //      on the same tile (thus removing a combo from the one field, and adding it to the other), we would attempt to unbind the click handler
        //      (which hasn't yet been rebound because of the timeout), then after the timeout, the handler would be bound (with the other combo still open),
        //      and then a second handler would be bound when the dropdown closes on that combo, which would result in two click handlers bound to the same tile.
        //      The flag is used to prevent this by setting REBIND_CLICK to false when we open a new dropdown.
        $tile.data(Tile.DATA_REBIND_CLICK, true);
        Utils_Core.delay(this, 400, function () {
            if ($tile.data(Tile.DATA_REBIND_CLICK)) {
                $tile.off("click"); //to avoid binding multiple identical handlers
                $tile.on("click", delegate(this, this._clickHandler));
                $tile.data(Tile.DATA_REBIND_CLICK, false);
            }
        });
    }

    private _editCompleteCallback(fieldView: CardControls.CardFieldView, e: JQueryEventObject, discard: boolean): void {
        /// <summary> Callback to be called when the edit is completed, thus reverting the bindings on the tile </summary>
        /// <param name="fieldView" type="CardControls.CardFieldView"> the field view that was updated </param>
        /// <param name="e" type="JQueryEventObject"> the event triggering the edit complete </param>
        /// <param name="discard" type="boolean"> was edit discarded </param>
        var fieldRefName = fieldView.field().referenceName(),
            id = this.item().id(), setFocusOnTile = Util_Cards.shouldFocusOnCardAfterEdit(id, fieldRefName, e, discard);

        // Unlock the card which was locked while card was in edit mode. Read comments in "_disableTileEvents" method above
        // to know why was it locked.
        this.unlockMoveItem();

        this._resetAfterEdit(fieldRefName, discard, setFocusOnTile);

        if (!discard) {
            var saveActions = {
                focusOnTile: setFocusOnTile,
                createNewTile: false
            };
            // We are doing save after this, which does a refresh also, so we can clear any pending auto-refresh
            // event.
            this.item().setPendingAutoRefreshEvent(null);
            this._saveChanges(saveActions);
        } else if (this.item() && this.item().getPendingAutoRefreshEvent()) {
            this._eventsHelper.fire(BoardAutoRefreshCommon.Events.ItemsNeedAutoRefresh, this, [this.item().getPendingAutoRefreshEvent()]);
            this.item().setPendingAutoRefreshEvent(null);
        }
    }

    private _resetAfterEdit(fieldRefName: string, discard: boolean, setFocusOnTile: boolean) {

        var $tile = this.getElement(),
            isNew = this.item().isNew(),
            itemDiscarded = false;

        $tile.removeClass(Tile.TILE_EDITING_CLASS);
        this._enableTileEvents($tile);

        if (discard && isNew) {
            // discard the temp item
            this._item.discard();
            itemDiscarded = true;
        }

        if (isNew) {
            this._eventsHelper.fire(Boards.Notifications.BoardNewItemEdited, this, itemDiscarded);
        }
        else if (setFocusOnTile) {
            $tile.focus();
        }

        this._eventsHelper.fire(Tile.TILE_RESET_AFTER_EDIT, this, itemDiscarded);
    }

    /**
     *  Callback to be called when the edit is completed but the change is discarded (i.e) no change was made
     *  @param {CardControls.CardFieldView} fieldView - the field view on which the edit was initiated
     */
    private _editDiscardCallback(fieldView: CardControls.CardFieldView): void {
        var fieldRefName = fieldView.field().referenceName();

        // enable the title events if the edited field was title only if,
        // the tile is not new
        if (fieldRefName === DatabaseCoreFieldRefName.Title && this.item() && !this.item().isNew()) {
            this._enableTileTitleEvents();
        }
    }

    private _getCardFieldName($element: JQuery): string {
        return Tile._cardRenderer.getFieldName($element, this.getElement());
    }

    private _attachCardEditEvents($element: JQuery) {
        /// <summary>Attaches various events to be used for on tile edit</summary>
        /// <param name="$element" type="jQuery">The jQuery element that represents the tile's outermost DOM element</param>
        $element.on("mouseover mouseout mousedown mouseup", (event: JQueryEventObject) => {
            switch (event.type) {
                case "mouseover":
                    this._onCardMouseOver(event);
                    break;
                case "mouseout":
                    this._onCardMouseOut(event);
                    break;
                case "mousedown":
                    this._onCardMouseDown(event);
                    break;
                case "mouseup":
                    this._onCardMouseUp(event);
                    break;
            }
        });

        $element.on("touchmove", (event: JQueryEventObject) => {
            this._touchMoved = true;
            TFS_Agile.TouchEventsHelper.simulateMouseEvent(event, this._element[0]);

            // To block the touch events from reaching the browser causing unwanted scroll or swipe
            event.preventDefault();
        });

        $element.on("touchend", (event: JQueryEventObject) => {
            if (this._touchMoved) {
                // This is needed only to simulate drag stop and hence called only if touch move happened
                TFS_Agile.TouchEventsHelper.simulateMouseEvent(event, this._element[0]);
                this._touchMoved = false;
            }
        });
    }

    private _onCardMouseOver(event: JQueryEventObject) {
        var $target: JQuery = $(event.target);

        if (Tile._cardRenderer.isTargetEditable($target)) {
            var fieldName: string = this._getCardFieldName($target);
            if (this._isCardFieldEditable(fieldName)) {
                // if target is a rendered editable field, and if current tile is in an editable state
                // and if the specific field instance is editable (default true if specific field is not yet avaialable)
                $target.closest(".field-inner-element.ellipsis.onTileEditTextDiv").addClass("hover");

                // Spl case for legacy identity control
                if (!AgileUtils.isUseNewIdentityControlsEnabled()) {
                    $target.addClass("hover");
                }
            }
        }
        return false;
    }

    private _onCardMouseOut(event: JQueryEventObject) {

        var $target = $(event.target);
        if (Tile._cardRenderer.isTargetEditable($target)) {

            $target.closest(".field-inner-element.ellipsis.onTileEditTextDiv").removeClass("hover");

            // Spl case for legacy identity control
            if (!AgileUtils.isUseNewIdentityControlsEnabled()) {
                $target.removeClass("hover");
            }
        }
        return false;
    }

    private _onCardMouseDown(event: JQueryEventObject) {

        var $target = $(event.target);

        if (Tile._cardRenderer.isTargetEditable($target)) {
            if (AgileUtils.isUseNewIdentityControlsEnabled()) {
                $target.closest(".field-inner-element.ellipsis.onTileEditTextDiv").removeClass("hover");
            }
            else {
                $target.removeClass("hover");
            }

            if (event.which === 1) { // Left mouse button
                var fieldName = this._getCardFieldName($target);
                if (this._isCardFieldEditable(fieldName)) {
                    this._mousedownX = event.pageX;
                    this._mousedownY = event.pageY;
                } else {
                    this._mousedownX = -100;
                    this._mousedownY = -100;
                }
            }
        }
    }

    private _onCardMouseUp(event: JQueryEventObject) {

        var $target = $(event.target),
            fieldName = this._getCardFieldName($target),
            xChange: number, yChange: number;

        if (event.which === 1) { // Left mouse button
            xChange = Math.abs(this._mousedownX - event.pageX);
            yChange = Math.abs(this._mousedownY - event.pageY);

            // If the mouse has moved a sufficiently small distance to count as a click and not as a drag
            // and if the field on the card can be edited
            if (Tile._cardRenderer.isTargetEditable($target) && !this._isDragEvent(xChange, yChange) && this._isCardFieldEditable(fieldName)) {
                this._cardMouseupHandler(fieldName, Tile._cardRenderer.getFieldContainer(this.getElement(), fieldName, $target));
            }
        }

    }

    private _cardMouseupHandler(fieldRefName: string, $fieldContainer: JQuery): void {
        /// <summary>
        ///     Handler for the mouseup event. Used primarily to initiate tile edit
        /// </summary>
        /// <param name="fieldRefName" type="string"> the field to be edited</param>
        /// <param name="$fieldContainer" type="JQuery"> the field container</param>

        var field: Cards.CardField = this.item().field(fieldRefName),
            fieldView: CardControls.CardFieldView = field ? Tile._cardRenderer.getFieldView($fieldContainer, field) : null,
            $tile: JQuery = this.getElement();

        //edit of core fields that are not identity fields do not require the item fetch to complete
        //if it's identity we need fetch workitem to set field's scope
        if (Util_Cards.isCoreField(fieldRefName, this._effortField) && (!field.definition().isIdentity())) {
            this.beginFieldEdit(field.referenceName(), fieldView);
        } else {
            // disable Tile Events and show status indicator while the item is being loaded
            this._disableTileEvents($tile);

            var container: JQuery = fieldView.getElement().find("." + FieldRendererHelper.FIELD_INNER_ELEMENT);
            container.empty();
            container.text("");

            var statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(
                StatusIndicator.StatusIndicator,
                container,
                {
                    message: VSS_Resources_Platform.Loading,
                    throttleMinTime: 0
                });
            statusIndicator.delayStart(Tile.RefreshContentsDelay);

            this._item.beginRefresh().then(
                () => {
                    statusIndicator.complete();
                    this._enableTileEvents($tile);
                    if (field.isEditable()) {
                        //if the field is editable, initiate edit
                        this.beginFieldEdit(field.referenceName(), fieldView);
                    } else {
                        //redraw the readonly view as the field is not editable
                        Tile._cardRenderer.renderField(fieldView.getElement(), field, false);
                    }
                },
                () => {
                    statusIndicator.complete();
                    this._enableTileEvents($tile);
                    //redraw the readonly view in case of error
                    Tile._cardRenderer.renderField(fieldView.getElement(), field, false);
                });
        }
    }

    public beginFieldEdit(fieldRefName: string, fieldView?: CardControls.CardFieldView): void {
        /// <summary>
        ///     Initiate field edit for the specified field reference name
        /// </summary>
        /// <param name="fieldRefName" type="string"> the field reference Name</param>
        /// <param name="fieldView" type="CardControls.CardFieldView" optional="true"> the field view object</param>

        // dettach the event handlers on the tile title before the edit is called
        if (fieldRefName === DatabaseCoreFieldRefName.Title && this.item() && !this.item().isNew()) {
            this._disableTileTitleEvents();
        }

        var field: Cards.CardField = this.item().field(fieldRefName);
        if (!fieldView) {
            var $fieldContainer: JQuery = Tile._cardRenderer.getFieldContainer(this.getElement(), fieldRefName);
            if (field && $fieldContainer && $fieldContainer.length === 1) {
                fieldView = Tile._cardRenderer.getFieldView($fieldContainer, field);
            }
        }

        if (field && field.isEditable() && fieldView) {

            if (field.definition().isIdentity) {
                var store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
                var fieldDefinition = store.getFieldDefinition(field.definition().referenceName());
                store.beginGetAllowedValues(fieldDefinition.id, TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.id, this._itemType, (allowedValues: string[]) => {
                    field.setAdditionalValues(allowedValues);
                });
            }
            //For newly cards, we want to not allow users to edit fields other than title
            if (!this.item() || !this.item().isNew() || (fieldRefName === DatabaseCoreFieldRefName.Title)) {
                this.getCardEditController().beginFieldEdit(
                    fieldView,
                    delegate(this, this._editStartCallback),
                    delegate(this, this._editCompleteCallback),
                    delegate(this, this._editDiscardCallback),
                    this._getCardContext()
                );
            }
        }
    }

    private _isCardEditable(): boolean {
        /// <summary> Specifies whether we can click on a particular field on this tile </summary>
        /// <returns type="Boolean"> Should return true if the tile is not being processed </returns>

        return (!this.isProcessing());
    }

    private _isCardFieldEditable(fieldRefName: string): boolean {
        return fieldRefName && this._isCardEditable() && this._item.field(fieldRefName).isEditable();
    }

    private _attachItemEvents() {
        /// <summary>Attach to events from the underlying item.</summary>

        this._itemChangedHandler = delegate(this, this._handleItemChange);
        this._resetDelayedRefreshContentsHandler = delegate(this, this._resetDelayedRefreshContents);
        // Using _invokeDelayedRefreshContentsIfNecessary instead of _invokeDelayedRefreshContents
        // since multiple operations may be queued for the same item (consider new item creation where reorder and
        // saving are queued). We don not want to show the saving overlay if one operation is completed within the
        // timeout for delayed refresh but other operations are pending.
        this._invokeDelayedRefreshContentsHandler = delegate(this, this._invokeDelayedRefreshContentsIfNecessary);

        this._item.attachEvent(Boards.Item.EVENT_ITEM_CHANGED, this._itemChangedHandler);
        this._item.attachEvent(Boards.Item.EVENT_OPERATION_STARTING, this._resetDelayedRefreshContentsHandler);
        this._item.attachEvent(Boards.Item.EVENT_OPERATION_COMPLETE, this._invokeDelayedRefreshContentsHandler);
    }

    private _updateCursorAndDisabledState(): void {
        var isProcessing = this.isProcessing();
        this.getElement().css("cursor", isProcessing ? "progress" : "");
        this.getElement().toggleClass("disabled", isProcessing);
    }

    private _updateProcessingSelector(): void {
        this.getElement().toggleClass(Tile.TILE_IS_PROCESSING_CLASS, this.isProcessing());
    }

    private _resetDelayedRefreshContents(sender: any, args?: any): void {
        this._delayedRefreshContents.reset();
        this._updateProcessingSelector();
    }

    private _invokeDelayedRefreshContentsIfNecessary(sender: any, args?: any) {
        /// <summary> Invokes delayed refreshContents if there are no pending operations </summary>
        if (!(this._item.operation())) {
            this._invokeDelayedRefreshContents(sender, args);
        }
    }

    private _invokeDelayedRefreshContents(sender: any, args?: any): void {
        this._delayedRefreshContents.invokeNow();
        this._updateProcessingSelector();
    }

    private _detachItemEvents() {
        if (this._itemChangedHandler) {
            this._item.detachEvent(Boards.Item.EVENT_ITEM_CHANGED, this._itemChangedHandler);
            delete this._itemChangedHandler;
        }

        if (this._resetDelayedRefreshContentsHandler) {
            this._item.detachEvent(Boards.Item.EVENT_OPERATION_STARTING, this._resetDelayedRefreshContentsHandler);
            delete this._resetDelayedRefreshContentsHandler;
        }

        if (this._invokeDelayedRefreshContentsHandler) {
            this._item.detachEvent(Boards.Item.EVENT_OPERATION_COMPLETE, this._invokeDelayedRefreshContentsHandler);
            delete this._invokeDelayedRefreshContentsHandler;
        }

        if (this._needsUpdateHandler) {
            this._eventsHelper.detachEvent(Boards.Notifications.BoardItemNeedsUpdate, this._needsUpdateHandler);
        }
    }

    private _detachChecklistHandlers() {
        if (this._beginEditWorkItemListHandler) {
            this._eventsHelper.detachEvent(Cards.Notifications.CardWorkItemListBeginEdit, this._beginEditWorkItemListHandler);
            this._beginEditWorkItemListHandler = null;
        }
        if (this._endEditWorkItemListHandler) {
            this._eventsHelper.detachEvent(Cards.Notifications.CardWorkItemListEndEdit, this._endEditWorkItemListHandler);
            this._endEditWorkItemListHandler = null;
        }
    }

    private _toggleDroppableState($element: JQuery): void {
        if ($element.find(".message").length > 0) {
            // In case there is message overlay (the tile is in Saving or Error state), disable the droppable for annotation and
            // do not set droppable for the tile. Droppable will be enabled/set after the save is completed.

            // Disable droppable for tile action pane (annotation).
            $element.find(".ui-droppable").droppable("disable");
        }
        else {
            // If there is no message overlay (the tile is not in saving or Error state), enable the droppable for annotation and
            // set droppable for the tile.

            // Enable droppable for tile action pane (annotation).
            $element.find(".ui-droppable").droppable("enable");

            // Set the droppable for the tile.
            this._annotationManager.setDroppable(this._$tileContent);
        }
    }

    private _refreshContents() {
        /// <summary>Refresh the contents of the tile.</summary>
        var item = this._item,
            $element = this.getElement(),
            $tileContentContainer: JQuery,
            $tileContent: JQuery,
            message,
            operation,
            $message: JQuery, tooltip;

        this._disposeContextMenu();

        // Ensure if the workitem type was changed, the card settings and color related settings are refreshed too
        this._refreshItemType();

        if (this._$tileContent && this._$tileContent.hasClass("ui-droppable")) {
            this._annotationManager.removeDroppable(this._$tileContent);
        }

        if (this._$tileContent) {
            Tile._cardRenderer.disposeCard(this.getElement());
        }

        $tileContentContainer = $(domElem("div", Tile.TILE_CONTENT_CONTAINER_CLASS));

        $tileContent = $(domElem("div", Tile.TILE_CONTENT_CLASS));
        Util_Cards.populateFieldSettings(this._cardSettings.fields, this._effortField, this.board.getField(Tile.ORDER_TYPE_NAME), this._isEditable, (fieldIdentifier: string) => { return this.board.itemSource().getFieldDefinition(fieldIdentifier); });

        var tagsField = this._cardSettings.getField(DatabaseCoreFieldRefName.Tags);
        if (tagsField) {
            tagsField[FieldRendererHelper.MAX_TAGS_SETTING] = Tile.MAX_TAGS;
            tagsField[FieldRendererHelper.TAG_CHARACTER_LIMIT_SETTING] = Tile.TAG_CHARACTER_LIMIT;
        }

        var renderCardResult = Tile._cardRenderer.renderCard(
            $tileContent,
            this._cardSettings,
            this.board.itemSource().getFieldDefinitions(),
            (fieldRefName: string) => {
                return this._getFieldValue(fieldRefName);
            },
            this._effortField,
            Tile.BoardType,
            this._cardStyleRules,
            this._userOverrideShowEmptyFields,
            this._getCardContext(),
            item.isNew()
        );

        var $tileAnnotationDetailPaneArea = $(domElem("div", "tile-action-pane-area"));

        this._renderContextMenuButton($tileContent);

        if (Boards.Board.BoardAnnotationSettings.isAnyAnnotationEnabled()) {
            if (!this._cardSettings.isShowEmptyFieldsEnabled() && renderCardResult.hasEmptyFields) {
                this._renderExpandButton($tileContent);
            }

            var $tileAnnotations = $(domElem("div", Tile.TILE_ANNOTATIONS_CLASS));
            $tileContent[0].appendChild($tileAnnotations[0]);

            this._annotationManager.refresh({
                team: this._options.team,
                source: this._item,
                $annotationDetailPaneArea: $tileAnnotationDetailPaneArea,
                $badgeArea: $tileAnnotations,
                onAnnotationDetailPaneStateChange: delegate(this, this._onAnnotationDetailPaneStateChange),
                eventsHelper: this._eventsHelper
            });
        }

        // Determine if we have a message overlay. This encompases any message explicitly set on the item
        // e.g. an error message, or the status of an in-progress operation.
        operation = item.operation();
        message = item.message();

        if (message) {
            $message = this._createMessageElement(BoardResources.Taskboard_ErrorTile, "error");
            tooltip = message;
        }
        else if (operation) {
            $message = this._createMessageElement(operation.type, "saving");
            tooltip = operation.message;
        }

        if ($message) {

            $tileContentContainer[0].appendChild($message[0]);
            if (tooltip) {
                RichContentTooltip.add(tooltip, $message);
            }
        }

        // update tile colors based on type
        $tileContentContainer.css("border-left-color", this._tileColor);

        $tileContentContainer[0].appendChild($tileContent[0]);
        this._$tileContent = $tileContent;
        $element.empty()[0].appendChild($tileContentContainer[0]);
        this.getElement().find("." + Tile.TILE_CONTENT_CONTAINER_CLASS).after($tileAnnotationDetailPaneArea);

        // If before refresh, action pane was opened for an annotation, activate it.
        if (!this._annotationManager.openActiveAnnotationDetailPane()) {
            this._$tileContent.addClass(Tile.TILE_CONTENT_BOTTOM_BORDER_CLASS);
        }

        this._updateCursorAndDisabledState();
        this._toggleDroppableState($element);

        // set the focus treatment on the TILE_CONTENT_CLASS and TILE_CONTENT_DETAILS if the tile was in focus before refresh
        if (this.hasFocus()) {
            this._setFocusBehaviorOnTile();
        }

        // enable the title events since the card is rendered again
        this._enableTileTitleEvents();

        var $tileContextMenu = this.getElement().find("." + Tile.TILE_CONTENT_CONTAINER_CLASS);
        if ($tileContextMenu && $tileContextMenu.length > 0) {
            $tileContextMenu.on("contextmenu", (event: JQueryEventObject) => {
                this._handleCreateContextMenuEvent(this._$tileContent, this._$cardContextMenuContainer, event);
            });
        }

        this._refreshCurrentTileLabel();
    }

    private _refreshItemType() {
        var itemType = this.item().fieldValue(WITConstants.CoreFieldRefNames.WorkItemType);
        if (!Utils_String.equals(this._itemType, itemType)) {
            this._itemType = itemType;
            var cardSettingsProvider: Cards.CardSettingsProvider = this.board.getCardSettingsProvider();
            if (cardSettingsProvider) {
                this._cardSettings = cardSettingsProvider.getCardSettingsForItemType(this._itemType);
            }
            this._setColor();
        }
    }

    private _attachChecklistHandlers() {
        var $tileElement = this.getElement();

        this._beginEditWorkItemListHandler = (sender, args) => {
            if (this.item() && (this.item().id() === args.id)) {
                this._disableTileEvents($tileElement);
            }
        };
        this._eventsHelper.attachEvent(Cards.Notifications.CardWorkItemListBeginEdit, this._beginEditWorkItemListHandler);
        this._endEditWorkItemListHandler = (sender, args) => {
            if (this.item() && (this.item().id() === args.id)) {
                this._enableTileEvents($tileElement);
            }
        };
        this._eventsHelper.attachEvent(Cards.Notifications.CardWorkItemListEndEdit, this._endEditWorkItemListHandler);
    }

    private _renderContextMenuButton($tileContent: JQuery) {

        // Remove the old single inline edit from editiable title control
        // TODO: remove when we remove WebAccess.Agile.Board.InlineTasks feature flag
        $tileContent.find("." + FieldRendererHelper.ICON_EDIT_CLASS).remove();

        var $container = $(domElem("div", "card-context-menu")).append($(domElem("div", "bowtie-icon bowtie-ellipsis")));
        this._$cardContextMenuContainer = $container;
        $container.attr("role", "button");
        $container.attr("aria-label", AgileControlsResources.BoardCard_ContextMenu_Label);
        $tileContent[0].appendChild($container[0]);
        $container.prop("tabindex", "-1")
            .on("keydown click focus blur", (event: JQueryEventObject) => {
                switch (event.type) {
                    case "keydown":
                        if (event.keyCode !== Utils_UI.KeyCode.ENTER) {
                            break;
                        }
                    case "click":
                        // In case context menu not openend create it, else toggle by closing it
                        if (!this._contextMenu || !this._contextMenu.isActive()) {
                            this._handleCreateContextMenuEvent($tileContent, $container, event);
                        }
                        else {
                            this._disposeContextMenu();
                        }
                        break;
                    case "focus":
                        $container.addClass("tabbed-focus");
                        break;
                    case "blur":
                        if (!this._contextMenu) {
                            $container.removeClass("tabbed-focus");
                        }
                        break;
                }
            });
    }

    private _renderExpandButton($tileContent: JQuery) {
        var $container = $(domElem("div", "card-expand-button-container"));
        $container.addClass(this._userOverrideShowEmptyFields ? "bowtie-icon bowtie-chevron-up" : "bowtie-icon bowtie-chevron-down");
        this._$cardRenderExpandButtonContainer = $container;
        $tileContent[0].appendChild($container[0]);
        $container.on("click", (event: JQueryEventObject) => {
            this._userOverrideShowEmptyFields = !this._userOverrideShowEmptyFields;
            this._refreshContents();
            event.stopPropagation();
        });
    }

    private _handleCreateContextMenuEvent($tile: JQuery, $container: JQuery, e: JQueryEventObject) {
        if (!this.item().operation() && (!this._contextMenu || !this._contextMenu.isActive())) {
            this._disposeContextMenu();
            this._contextMenu = this._createContextMenu($tile, this._getContextMenuItems());
            this._contextMenu.popup($tile, $container);
        }

        e.preventDefault();
    }

    private _getContextMenuItems(): Menus.IMenuItemSpec[] {
        var menuItems: Menus.IMenuItemSpec[] = [];

        menuItems.push({
            id: "open-item",
            text: AgileControlsResources.BoardCard_ContextMenu_OpenItem,
            icon: "bowtie-icon bowtie-arrow-open",
            groupId: "open",
            setTitleOnlyOnOverflow: true,
            action: () => {
                this.openItemOnEvent();
            }
        });

        menuItems.push({
            id: "edit-title",
            text: AgileControlsResources.BoardCard_ContextMenu_EditTitle,
            icon: "bowtie-icon bowtie-edit",
            groupId: "modify",
            setTitleOnlyOnOverflow: true,
            action: () => {
                this.beginFieldEdit(DatabaseCoreFieldRefName.Title);
            }
        });

        // Add move to iteration
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const movetoIterationMenuItem: Menus.IMenuItemSpec = CommonContextMenuItems.getMoveToIterationContextMenuItem(
            tfsContext,
            this._options.team.id,
            {},
            (error?: TfsError) => {
                this.item().message(error.message);
            },
            (_, iterationPath) => {
                var workItemId = this.item().id();
                var moveToIterationHelper: AgileUtils.MoveToIterationHelper = new AgileUtils.MoveToIterationHelper();
                moveToIterationHelper.moveToIteration([workItemId], iterationPath, CustomerIntelligenceConstants.CustomerIntelligencePropertyValue.VIEWTYPE_KANBAN)
                    .then(
                    null,
                    (errorMessage: string) => {
                        this.item().message(errorMessage);
                    }
                    );
            }
        );
        movetoIterationMenuItem.groupId = "modify";
        menuItems.push(movetoIterationMenuItem);

        menuItems = menuItems.concat(this._annotationManager.menuItems());

        return menuItems;
    }

    private _createContextMenu($container: JQuery, menuItems: Menus.IMenuItemSpec[]): Menus.PopupMenu {
        var menuOptions = {
            align: "left-bottom",
            items: [{ childItems: menuItems }],
            onPopupEscaped: delegate(this, this._disposeContextMenu), // close the context menu when escape is pressed
            onHide: delegate(this, this._disposeContextMenu),
            contributionIds: ["ms.vss-work-web.backlog-board-card-item-menu", "ms.vss-work-web.work-item-context-menu"],
            getContributionContext: (): TFS_Agile.ContibutionContexts.ICardContextMenu => {
                return {
                    id: this.item().id(),
                    workItemType: <string>this.item().fieldValue(DatabaseCoreFieldRefName.WorkItemType),
                    team: this._options.team
                };
            },
            arguments: {
                telemetry: {
                    area: CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                    feature: CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_CARD_CONTEXT_MENU_CLICK
                }
            },
        };

        if (!this._$cardContextMenuContainer.hasClass("tabbed-focus")) {
            this._$cardContextMenuContainer.addClass("tabbed-focus");
        }
        return <Menus.PopupMenu>Controls.Control.createIn(Menus.PopupMenu, $container, menuOptions);
    }

    private _disposeContextMenu() {
        if (this._contextMenu) {
            if (this._$cardContextMenuContainer.hasClass("tabbed-focus")) {
                this._$cardContextMenuContainer.removeClass("tabbed-focus");
            }
            this._contextMenu.dispose();
            this._contextMenu = null;
        }
    }

    private _getFieldValue(fieldRefName: string): string {
        Diag.Debug.assertIsNotNull(this._item, "The Tile does not have a valid item.");
        var value = this._item.fieldValue(fieldRefName);
        if (value === null || value === undefined) {
            value = "";
        }
        return value;
    }

    private _createMessageElement(message: string, cssClass?: string) {
        /// <summary>Create element that displays the message</summary>
        /// <param name="message" type="String">The message</param>
        /// <param name="cssClass" type="String" optional="true">Css class</param>
        Diag.Debug.assertParamIsStringNotEmpty(message, "message");

        return $(domElem("div", "message " + cssClass)).text(message);
    }

    public isDraggable(): boolean {
        var $tile = this.getElement();
        if (this.hasError() || this.isProcessing() || this.item().isNew() || Boolean($tile.draggable("option", "disabled"))) {
            // prevent the drag from happening
            // if there is any operation pending on the tile at the moment
            // or if the tile is for a new item that is not yet saved
            // or if the draggable option is disabled on the tile element as done in OnTileEditMode
            return false;
        }
        return true;
    }

    private _hasParent(): boolean {
        return this.board.itemSource().getParent(Tile.getId(this.getElement())) != undefined;
    }


    private _drag(event, ui: any) {
        ui.helper.css({
            "display": "block"
        });
    }

    private _startDrag(event, ui: any) {
        /// <summary>
        ///     Called when the tile starts getting dragged.
        /// </summary>
        /// <param name="event">The originating startdrag() event</param>
        /// <param name="ui" type="Object">The jQuery UI draggable helper</param>
        if (!this.isDraggable()) {
            // prevent the drag from happening if there is any operation pending on the tile at the moment
            return false;
        }

        var $element = this.getElement();
        // TODO: Make this logic independent of workitem list and test list.
        var workItemListContainer = $element.find(".work-item-list-container, .test-list-container");
        if (workItemListContainer.length > 0) {
            // FF/IE9/IE10: A fix to prevent dragging when mousedown on scrollbar of the checklist.
            var scrollWidth = workItemListContainer[0].scrollWidth;
            var width = workItemListContainer.width();
            if (scrollWidth !== width) {
                // if scrollbar exists.
                var pageX = event.pageX - workItemListContainer.offset().left;
                var clickOnScrollbar = scrollWidth <= pageX && pageX <= width;
                if (clickOnScrollbar) {
                    return false;
                }
            }
        }

        // hide the original tile and make helper look same as original tile
        $element.css("visibility", "hidden");
        ui.helper.css({
            "background-color": $element.css("background-color"),
            "border-left-color": $element.css("border-left-color")
        });
        // Set the focus on the helper, being dragged by the user
        ui.helper.focus();

        this._sourceMemberOnDragStart = this.currentMember();

        // Attach sortable or reorder item handler.
        if (this._isEditable) {

            var preserveBacklogOrder = !!this.board.getBoardSettings().preserveBacklogOrder;
            if (!preserveBacklogOrder) {
                var sortableItemCallback = (event, ui, originalItem, originalItemIndex, currentItemIndex, isDropOnHeader) => {
                    this._saveAndReorderItem(event, ui, originalItem, originalItemIndex, currentItemIndex, isDropOnHeader);
                };
                var revertCallback = (ui: any) => {
                    this._animateTileHelper(ui, () => {
                        this.setFocus();
                    });
                };
                var options = {
                    originalItem: $element,
                    draggableHelper: ui.helper,
                    completedCallback: sortableItemCallback,
                    getIdDelegate: Tile.getId,
                    itemClass: Tile.VISIBLE_TILE_ITEM_CLASS,
                    unSortableClass: "complete",
                    hoverClass: "agileDragTargetHoverColor",
                    dropOnEmptyClass: "add-card-container",
                    blockSortable: this._hasParent(),
                    droppableHeaderClass: "member-header",
                    revertCallback: revertCallback
                };
                TFS_Agile.ReorderItemHandler.attachSortableItemHandler(options);
            }
            else if (!this.currentMember().isOutgoing()) {
                var reorderItemCallback = (event, ui, originalItem, originalItemIndex, currentItemIndex) => {
                    this._reorderItem(event, originalItem, originalItemIndex, currentItemIndex);
                };
                TFS_Agile.ReorderItemHandler.attachReorderItemHandler($element, ui.helper, reorderItemCallback, Tile.getId, Tile.VISIBLE_TILE_ITEM_SELECTOR);
            }
        }

        this._eventsHelper.fire(Tile.TILE_START_DRAG, this, $element);

    }

    private _stopDrag(event, ui: any) {
        /// <summary>
        ///     Called when the tile is stopped being dragged.
        /// </summary>
        /// <param name="event">The originating stopdrag() event</param>
        /// <param name="ui" type="Object">The jQuery UI draggable helper</param>

        var $element = this.getElement();
        if ($element && !this._animating) {
            $element.css("visibility", "");
            this.setFocus();
        }
    }

    public getDragDropCI(): Boards.ITileDragDropChanges {
        // Read the lane and column details
        var currentMember = this.currentMember();
        var originalColumnMember = this._sourceMemberOnDragStart.getColumnMember();
        var currentColumnMember = currentMember.getColumnMember();
        var originalLaneMember = originalColumnMember.node().parentMember();
        var currentLaneMember = currentColumnMember.node().parentMember();

        var changes: Boards.ITileDragDropChanges = {
            isColumnChanged: false,
            isLaneChanged: false,
            columnStateChanged: "",
            doingDoneStateChanged: ""
        };

        var currentFieldName = currentMember.node().fieldName();
        var currentValue = currentMember.values()[0];
        if (AgileUtils.ControlUtils.checkIfFieldReferenceNameIsForDoingDone(currentFieldName)) {
            changes.doingDoneStateChanged = currentValue === "true" ? "ToDone" : "ToDoing";
        }
        changes.isColumnChanged = (Utils_String.ignoreCaseComparer(originalColumnMember.title(), currentColumnMember.title()) !== 0);

        var currentLaneName, originalLaneName;
        if (currentLaneMember && AgileUtils.ControlUtils.checkIfFieldReferenceNameIsForSwimlane(currentLaneMember.node().fieldName())) {
            currentLaneName = currentLaneMember.title();
        }
        if (originalLaneMember && AgileUtils.ControlUtils.checkIfFieldReferenceNameIsForSwimlane(originalLaneMember.node().fieldName())) {
            originalLaneName = originalLaneMember.title();
        }

        if (changes.isColumnChanged) {
            if (Utils_String.ignoreCaseComparer(originalColumnMember.metadata().boardColumnType, Boards.BoardColumnType.INCOMING) === 0
                && Utils_String.ignoreCaseComparer(currentColumnMember.metadata().boardColumnType, Boards.BoardColumnType.INPROGRESS) === 0) {
                changes.columnStateChanged = "ProposedToInProgress";
            }
            else if (Utils_String.ignoreCaseComparer(originalColumnMember.metadata().boardColumnType, Boards.BoardColumnType.OUTGOING) === 0
                && Utils_String.ignoreCaseComparer(currentColumnMember.metadata().boardColumnType, Boards.BoardColumnType.INPROGRESS) === 0) {
                changes.columnStateChanged = "DoneToInProgress";
            }
            else if (Utils_String.ignoreCaseComparer(originalColumnMember.metadata().boardColumnType, Boards.BoardColumnType.INPROGRESS) === 0
                && Utils_String.ignoreCaseComparer(currentColumnMember.metadata().boardColumnType, Boards.BoardColumnType.INCOMING) === 0) {
                changes.columnStateChanged = "InProgressToProposed";
            }
            else if (Utils_String.ignoreCaseComparer(originalColumnMember.metadata().boardColumnType, Boards.BoardColumnType.INPROGRESS) === 0
                && Utils_String.ignoreCaseComparer(currentColumnMember.metadata().boardColumnType, Boards.BoardColumnType.OUTGOING) === 0) {
                changes.columnStateChanged = "InProgressToDone";
            }
            else {
                changes.columnStateChanged = "InProgressToInProgress";
            }
        }

        if (currentLaneMember // Lanes enabled
            && originalLaneMember
            && Utils_String.ignoreCaseComparer(currentLaneName, originalLaneName) !== 0) {
            changes.isLaneChanged = true;
        }

        return changes;
    }

    private _reorderItem(event: Event, originalItem: JQuery, originalItemIndex: number, currentItemIndex: number, errorCallback?: IErrorCallback) {
        /// <summary>
        ///     Called when the tile is reordered.
        /// </summary>
        /// <param name="event">The originating reorder event</param>
        /// <param name="originalItemIndex" type="Object">The original index of the item.</param>
        /// <param name="currentItemIndex" type="Object">The index that the item is currently at.</param>

        // if there is only one item in the container, do nothing.
        var allTiles = originalItem.parent().children(Tile.TILE_ITEM_SELECTOR);
        if (allTiles.length <= 1) {
            return;
        }

        var tile = this;
        var previousId = null;
        var nextId = null;
        var item = this.item();
        var id = item.id();
        var containerTiles = originalItem.parent().children(Tile.VISIBLE_TILE_ITEM_SELECTOR);
        var originalMember: Boards.BoardMember = this.currentMember();
        var parentMember = originalMember.node().parentMember();
        while (parentMember) {
            originalMember = parentMember;
            parentMember = parentMember.node().parentMember();
        }

        // if tiles gets dropped at the top, we set the next id.
        if (currentItemIndex === 0) {
            if (containerTiles.length <= 1) {
                // reorder an item in a filtered view with no item shown, should anchor to the actual first item in the view.
                // i.e. adding a new item when filtered.
                containerTiles = allTiles;
            }
            nextId = Tile.getId($(containerTiles[1]));
        }
        else {
            // otherwise set previous id
            previousId = Tile.getId($(containerTiles[currentItemIndex - 1]));
        }

        // if the item to be anchored to has negative id (invalid),
        // place back the tile to its original position.
        if (nextId < 0 || previousId < 0) {
            originalMember.updateItem(item, false, originalMember);
            return;
        }

        const changes: TFS_Agile.IReorderOperation = {
            ParentId: null, // null tells the reorder API to lookup the parent from the work item identified by 'reorderId' and attempt reorder
            Ids: [id],
            PreviousId: previousId,
            NextId: nextId
        };

        var isNewItem = item.isNew();
        var completeCallback = (elapsedTime: number) => {
            if (isNewItem) {
                Boards.KanbanTelemetry.OnAddNewItem(item.type(), item.startTime);
            }
            else {
                var ciData: IDictionaryStringTo<any> = {
                    "ColumnType": originalMember.rootColumnType(),
                    "OldIndex": originalItemIndex,
                    "NewIndex": currentItemIndex,
                    "IsFilteredView": originalMember.isFiltered(),
                    "ElapsedTime": elapsedTime
                };
                Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_REORDER, ciData);

                // Set focus on the tile after reorder, if it is not a new item
                tile.setFocus();
            }
        };

        // If there is an error callback then ignore errors and let the error callback handle it
        this._item.beginReorder(changes, completeCallback, errorCallback, !!errorCallback);

        this._eventsHelper.fire(Tile.TILE_REORDERED_ITEM, this, originalItem);
    }

    private _saveAndReorderItem(event: Event, ui: any, $originalItem: JQuery, originalItemIndex: number, currentItemIndex: number, isDropOnHeader?: boolean, animateCallback?: IResultCallback) {
        var currentMemberView = <MemberView>Controls.Enhancement.getInstance(MemberView, $originalItem.parent());
        if (currentMemberView) {

            var currentMember = currentMemberView.member();
            var isCollapsed = currentMemberView.expandCollapsedColumn();
            var isReorderNeeded = !(currentMember.isOutgoing() || isCollapsed);

            if (this._sourceMemberOnDragStart !== currentMember) {
                // if we need to save
                var perfScenario = Performance.getScenarioManager().startScenario(Boards.KanbanTelemetry.CI_AREA_AGILE, Boards.KanbanTelemetry.Perf_Scenario_SaveCard);
                // if changing member, we need to save the item and then reorder if needed.
                var isBlockSortable = this._hasParent();
                var completedCallback = () => {
                    // If the tile was disposed, the item was removed from the board
                    const itemRemoved = this.isDisposed();
                    if (!itemRemoved) {
                        if (isReorderNeeded && !isBlockSortable) {
                            this._reorderItem(event, $originalItem, originalItemIndex, currentItemIndex, () => currentMemberView.placeTile(this, true));
                        } // if the reorder needs to be called, then reorder complete will end the perf scenario, otherwise the save is completed so lets end it here

                        if (perfScenario && perfScenario.isActive()) {
                            perfScenario.end();
                        }

                        var ciData = this.getDragDropCI();
                        Boards.KanbanTelemetry.OnDragDrop(ciData, startTime);
                    }
                };

                if (!isReorderNeeded || isBlockSortable) {
                    // place tile in the appropriate position in this member view
                    currentMemberView.placeTile(this);
                }

                // animate tile
                this._animateTileHelper(ui, animateCallback);

                var startTime = Date.now();
                this.saveItem(currentMember, startTime, completedCallback, true);
            }
            else if (isReorderNeeded) {
                // otherwise, just reorder the item.

                this._animateTileHelper(ui, animateCallback);
                this._reorderItem(event, $originalItem, originalItemIndex, currentItemIndex);
            }
        }
    }

    private _animateTileHelper(ui: any, callback?: IResultCallback) {
        var droppedOnRecycleBin = ui.helper.data(RecycleBinConstants.DROPPED_ON_RECYCLE_BIN_DATAKEY);
        // Animate the tile only if the tile was not dropped on the recycle bin
        if (droppedOnRecycleBin !== true) {
            var $helper = this.createHelper(ui.helper.offset(), true);
            this.animateTile($helper, callback);
        }
    }

    /*
     * Perform save operation on the tile.
     * @param member - the board member to be saved to.
     * @param startTime - the time before calling this function to record performance telemetry.
     * @param completedCallback - callback to be called after successful saved.
     * @param skipPlacement - The value indicated whether item placement will be skipped. True to skip placement. False otherwise.
     */
    public saveItem(member: Boards.BoardMember, startTime: number, completedCallback?: Function, skipPlacement?: boolean) {
        var item = this.item();
        var field = member.node().fieldName();
        var value = member.values()[0];
        var isChangingBetweenTwoDoneStatesInDifferentColumns = false;
        var onSaveCompleted = (error?: TfsError | string) => {
            // reset the skip placement to false after save is completed
            item.skipPlacement(false);

            if (error) {
                const message = typeof error === "string" ? error : error.message;
                // When work item is readonly and we try save
                // The work item object has prechange values
                // so we reset the item
                if (item.isReadOnly()) {
                    item.reset(message);
                } else {
                    item.message(message);
                }
            }
        };

        var successCallBack = () => {
            if ($.isFunction(completedCallback)) {
                completedCallback();
            }
            onSaveCompleted();
        };

        if (AgileUtils.ControlUtils.checkIfFieldReferenceNameIsForDoingDone(field) && value === "true" && item.fieldValue(field) === true) {
            isChangingBetweenTwoDoneStatesInDifferentColumns = true;
        }

        // update field values of item
        var fieldUpdateList = member.getFieldUpdateList();
        for (var i = 0; i < fieldUpdateList.length; i++) {
            var fieldUpdate = fieldUpdateList[i];
            item.fieldValue(fieldUpdate.fieldName, fieldUpdate.fieldValue);
        }

        Diag.logTracePoint("Tile.saveOperation.start");

        // set the item to skip placement before begin save so that after the saved is completed, updating item will skip placement accordingly.
        item.skipPlacement(skipPlacement);
        item.beginSave(
            () => {
                // callback on successful save.
                // If this drop is the result of changing between the 'done'
                // split of two different columns we will need two saves because
                // the first save will overwrite the done state to false.
                if (isChangingBetweenTwoDoneStatesInDifferentColumns) {
                    item.fieldValue(field, value);

                    // Trigger a second save to set the item state to 'done'
                    // now that it has been reset to the doing state of the
                    // correct column.
                    item.beginSave(
                        () => {
                            successCallBack();
                            Diag.logTracePoint("Tile.saveOperation.complete");
                        }, (error) => {
                            onSaveCompleted(error);
                            Diag.logTracePoint("Tile.saveOperation.error", error);
                        });
                }
                else {
                    successCallBack();
                    Diag.logTracePoint("Tile.saveOperation.complete");
                }

                this._eventsHelper.fire(Tile.TILE_ITEM_SAVED, this, item);
            },
            (error) => {
                Diag.logTracePoint("Tile.saveOperation.error", error);
                onSaveCompleted(error);
            });
    }

    public lockMoveItem() {
        eventActionService.performAction(Boards.Notifications.BoardTileMoveLock, {
            id: this.id()
        });
    }

    /*
    * @param itemId - Optional parameter to tell id of the item to be unlocked in cases where by the time
    * this method is called, this.id() will result in error e.g. item has been deleted.
    */
    public unlockMoveItem(itemId?: number) {
        eventActionService.performAction(Boards.Notifications.BoardTileMoveUnlock, {
            id: itemId ? itemId : this.id()
        });
    }

    public currentMember(): Boards.BoardMember {
        return this.board.rootNode().getItemContainer(this.item());
    }

    private _processItemUpdates() {
        /// <summary>Deal with any pending updates for items that were deferred due to another UI operation</summary>
        this._eventsHelper.detachEvent(Boards.Notifications.BoardItemNeedsUpdate, this._needsUpdateHandler);
        if ($.isFunction(this._updateItem)) {
            this._updateItem();
            this._updateItem = null;
        }
    }
}

export class DescriptionPopup extends PopupContentControl {
    private static LEFT_OFFSET_PIXELS = -20;
    private static TOP_OFFSET_PIXELS = 7;

    private _$popupTag: JQuery;

    public initialize() {
        this._$popupTag = $(domElem('div', 'dod-popup-tag')).appendTo(this._element);
        super.initialize();
    }

    public initializeOptions(options?: any) {
        // We have a custom class "board-popup" because the board get style from WorkItemArea.scss code 
        // which has reference to QueryResultsGrid.scss which has description-popup-content's style that override the board's ones.
        super.initializeOptions($.extend({
            cssClass: "board-popup description-popup-content-container",
            openCloseOnHover: false,
            html: delegate(this, this._getContent),
            leftOffsetPixels: DescriptionPopup.LEFT_OFFSET_PIXELS,
            topOffsetPixels: DescriptionPopup.TOP_OFFSET_PIXELS
        }, options));
    }

    private _getContent(): JQuery {
        var $container = $(domElem("div", "description-content"));
        const markdownContentRenderer = new ContentRendering.MarkdownContentRenderer();
        markdownContentRenderer.renderContent(this._options.markdown, $container, {});
        return $container;
    }

    public _show(options: IPositionOptions) {
        super._show(options);
        this._setPosition();

        this.getElement().find(".popup-content-container").removeAttr("aria-hidden");
        let content: JQuery = this._$contentContainer.find(".description-content");
        content.attr("tabIndex", "-1");
        content.focus();
        content.on("keydown", (event: JQueryEventObject) => {
            if (event.keyCode == Utils_UI.KeyCode.ESCAPE ||
                event.keyCode == Utils_UI.KeyCode.TAB) {
                this.hide();
                this._options.parent.focus();
            }
        });

        content.blur((e?: JQueryEventObject) => {
            // We need to support clicking on links that are inside the tooltip
            // We need to add a delay before dismissing the tooltip, otherwise the 
            // click will not work
            setTimeout(() => { this.hide(); }, 100);
        });
    }


    public _setPosition() {
        ///<summary>OVERRIDE: Sets the position of the tooltip.</summary>
        super._setPosition();
        this._setTagPosition();

        // Normalize the tooltip location to always be attached to the dropdown region
        var popupContent = this.getElement();
        var popupTooltip = this._$popupTag;
        var popupContentLeftOffset = parseInt(popupContent.css("left"), 10);
        var popupTooltipLeftOffset = parseInt(popupTooltip.css("left"), 10);
        var popupContentWidth = popupContent.width();
        var popupTooltipWidth = popupTooltip.width();
        if ((popupTooltipLeftOffset + popupTooltipWidth) >
            (popupContentLeftOffset + popupContentWidth)) {
            popupTooltip.css("left", popupContentLeftOffset + popupContentWidth - popupTooltipWidth);
        }

    }

    public _setTagPosition() {
        ///<summary>Sets the position of the tooltip.</summary>

        this._$popupTag.css({
            top: 0,
            left: 0
        });

        Utils_UI.Positioning.position(this._$popupTag, this._$contentContainer, {
            elementAlign: "left-bottom",
            baseAlign: "left-top",
            leftOffsetPixels: -this._options.leftOffsetPixels - 3
        });
    }
}

/**
 * Control to that toggles to edit mode on clicking
 */
export class EditableLabelControl extends Controls.Control<IEditableLabelControlOptions> {
    public static ErrorBubbleCssClass = "agile-board-error-message-bubble";
    public static CoreCssClass: string = "click-to-edit";
    public static LabelUpdated = "VSS.EditableLabelControl.Updated";
    private _$memberHeader: JQuery;
    private _$errorContainer: JQuery;
    private _$errrorMessageText: JQuery;
    private _$tooltip: RichContentTooltip;
    private _editModeOn: boolean;
    private _originalValue: string;
    private _updateBubbleLayoutDelegate: IArgsFunctionR<any>;
    private _eventsHelper: ScopedEventHelper;

    /**
     * Display a control that enables editing on clicking.
     *
     * @param options Control options
     */
    constructor(options?: IEditableLabelControlOptions) {
        super($.extend({
            coreCssClass: EditableLabelControl.CoreCssClass
        }, options));
    }

    /**
     * Initialize the control that enables editing on clicking.
     */
    public initialize() {
        super.initialize();
        this._originalValue = this._options.value;
        this._eventsHelper = this._options.eventsHelper;
        this._createLayout();
        this._updateBubbleLayoutDelegate = delegate(this, this._updateBubbleLayout);
        this._bind(window, "resize", this._updateBubbleLayoutDelegate);
    }

    public dispose() {
        if (this._updateBubbleLayoutDelegate) {
            this._unbind(window, "resize", this._updateBubbleLayoutDelegate);
            this._updateBubbleLayoutDelegate = null;
        }
        if (this._$errorContainer) {
            this._$errorContainer.remove();
            this._$errorContainer = null;
        }

        if (this._$tooltip) {
            this._$tooltip.dispose();
            this._$tooltip = null;
        }
        super.dispose();
    }

    public getMemberHeader() {
        return this._$memberHeader;
    }

    private _toggleEditMode(editModeOn: boolean) {
        if (this._editModeOn !== editModeOn) {
            this._editModeOn = editModeOn;
            if ($.isFunction(this._options.onEditModeStateChanged)) {
                this._options.onEditModeStateChanged(this.getElement(), editModeOn);
            }
        }
    }

    private _createLayout() {
        var $element = this.getElement();
        this._$memberHeader = $("<div>")
            .addClass(this._options.contentCssClass)
            .text(this._options.value)
            .attr(BoardView.uniqueattributeName, this._options.id);

        if (this._options.value) {
            this._$tooltip = RichContentTooltip.addIfOverflow(this._options.value, this._$memberHeader);
        }

        if (!this._options.value) {
            // This fixes alignment issues with lane summary information for swimlanes
            this._$memberHeader.html("&nbsp;");
        }
        $element[0].appendChild(this._$memberHeader[0]);

        if (!this._options.canEdit) {
            return;
        }

        var evaluateEditMode = (enableEditMode: boolean) => {
            $memberEditHeader.siblings().toggle(!enableEditMode);
            $memberEditHeader.toggle(enableEditMode);
            if (this._$errorContainer) {
                this._$errorContainer.toggle(enableEditMode && $memberEditHeader.hasClass("error"));
            }
            if (enableEditMode) {
                $memberEditHeaderInput.focus();
                $memberEditHeaderInput.select();
            }
            this._toggleEditMode(enableEditMode);
        };

        var hasValidationError = (showError?: boolean) => {
            if ($.isFunction(this._options.validate)) {
                var newValue = $memberEditHeaderInput.val().trim();
                if (!Utils_String.equals(newValue, this._originalValue)) {
                    var validationError = this._options.validate(newValue);
                    if (validationError !== Utils_String.empty) {
                        if (showError) {
                            $memberEditHeader.addClass("member-header-error");
                            if (!this._$errorContainer) {
                                // Lazy load the error bubble
                                this._$errorContainer = $("<div>")
                                    .appendTo(document.body)
                                    .addClass(EditableLabelControl.ErrorBubbleCssClass);
                                var $errrorMessageIcon = $("<div>").addClass("icon bowtie-icon bowtie-status-error").appendTo(this._$errorContainer);
                                $errrorMessageIcon.css("position", "absolute");
                                $errrorMessageIcon.css("top", 2);
                                this._$errrorMessageText = $("<div>").addClass("agile-board-error-message-text").appendTo(this._$errorContainer);
                            }
                            this._$errrorMessageText.text(validationError);
                            this._$errorContainer.css("margin-top", $memberEditHeaderInput.outerHeight() + 8);
                            this._$errorContainer.show();
                            this._updateBubbleLayout();
                        }
                        return true;
                    }
                }
                if (this._$errorContainer) {
                    this._$errorContainer.hide();
                }
                $memberEditHeader.removeClass("member-header-error");
            }
            return false;
        };

        var beginSave = (e?: JQueryEventObject, validate?: boolean) => {
            var newValue = $memberEditHeaderInput.val().trim();
            e.preventDefault();
            if (Utils_String.equals(newValue, this._originalValue)
                || (validate && hasValidationError(false))) {
                // Exit the edit mode if the value is unchanged or there are any validation errors
                evaluateEditMode(false);
            }
            else {
                // This property is set to true for the session in which inline rename is done.
                // It will be used to show manual refresh notification in Kanban board for all sessions,
                // except the session in which inline rename had been done.
                sessionStorage.setItem(BoardAutoRefreshCommon.Settings.BoardSettingsChangedInCurrentSession, "1");
                this._options.onBeginSave(newValue).then(
                    (succeeded: boolean) => {
                        this._originalValue = newValue;
                    },
                    (error: { message: string; serverError: any; }) => {
                        $memberEditHeaderInput.val(this._originalValue);
                        this._$memberHeader.text(this._originalValue);
                        this._$tooltip.setTextContent(this._originalValue);
                        this._eventsHelper.fire(EditableLabelControl.LabelUpdated);
                    });
                this._$memberHeader.text(newValue);
                this._$tooltip.setTextContent(newValue);
                if (!newValue) {
                    this._$memberHeader.html("&nbsp;");
                }
                this._eventsHelper.fire(EditableLabelControl.LabelUpdated);
                evaluateEditMode(false);
            }
            e.stopPropagation();
        };

        var $memberEditHeader = $("<div>")
            .addClass("member-header-edit member header")
            .hide();

        var suppressBlur = false;
        var $memberEditHeaderInput = $("<input>")
            .addClass("member-header-content-input")
            .val(this._options.value)
            .blur((e?: JQueryEventObject) => {
                if (suppressBlur) {
                    suppressBlur = false;
                    return;
                }
                if (hasValidationError(false)) {
                    $memberEditHeader.removeClass("member-header-error");
                    $memberEditHeaderInput.val(this._originalValue);
                    evaluateEditMode(false);
                }
                else {
                    beginSave(e, false);
                }
            })
            .click((e?: JQueryEventObject) => {
                e.preventDefault();
                e.stopPropagation();
            })
            .keyup((e?: JQueryEventObject) => {
                if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
                    suppressBlur = true;
                    $memberEditHeader.removeClass("member-header-error");
                    evaluateEditMode(false);
                    e.stopPropagation();
                }
                else if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                    suppressBlur = true;
                    $memberEditHeader.removeClass("member-header-error");
                    beginSave(e, true);
                }
                else {
                    hasValidationError(true);
                }
            })
            .keydown((e?: JQueryEventObject) => {
                if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                // Stop propagation of the escape event to address the issue of exiting full screen mode
                if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
                    e.stopPropagation();
                }

            }).keypress((e?: JQueryEventObject) => {
                // prevent expand/collapse swimlane
                if (e.keyCode === Utils_UI.KeyCode.SPACE) {
                    e.stopPropagation();
                }
            });
        if (this._options.editableInputAriaLabel) {
            $memberEditHeaderInput.attr("aria-label", this._options.editableInputAriaLabel);
        }

        var $memberEditHeaderCancel = $("<div>")
            .addClass("bowtie-icon bowtie-math-multiply")
            .attr("role", "button")
            .mousedown((e: JQueryEventObject) => {
                e.preventDefault();
                $memberEditHeader.removeClass("member-header-error");
                $memberEditHeaderInput.val(Utils_String.empty);
                if (this._$errorContainer) {
                    this._$errorContainer.toggle(false);
                }
                e.stopPropagation();
            })
            .click((e?: JQueryEventObject) => {
                e.preventDefault();
                e.stopPropagation();
            });
        $memberEditHeader.append($memberEditHeaderInput, $memberEditHeaderCancel);
        $element[0].appendChild($memberEditHeader[0]);

        this._$memberHeader
            .addClass("editable")
            .attr("role", "button")
            .click((e: JQueryEventObject) => {
                $memberEditHeaderInput.val(this._originalValue);
                evaluateEditMode(true);
                e.preventDefault();
                e.stopPropagation();
            });
    }

    private _updateBubbleLayout() {
        if (this._$errorContainer && this._$errorContainer.is(":visible")) {
            var position = this.getElement().offset();
            var leftOffset = this._options.editModeOffset ? position.left + this._options.editModeOffset : position.left;
            this._$errorContainer.css("left", leftOffset);
            this._$errorContainer.css("top", position.top);
        }
    }
}

//exporting for unit testing
export class MemberView extends Controls.BaseControl implements IMemberView {
    private static addNewCardCssClass: string = "board-add-card";
    private static addNewCardContainer: string = "add-card-container";
    private static filterPendingCssClass: string = "filter-pending";
    private static searchInputContainer: string = "search-input-container";
    private static pageRequestAbortedMessage: string = "pageRequestAborted";

    public static TILE_DROP_ANIMATION_DURATION_DISTANCE_THRESHOLD: number = 200;
    public static TILE_DROP_ANIMATION_DURATION_FAST_TIME: number = 300;
    public static TILE_DROP_ANIMATION_DURATION_SLOW_TIME: number = 500;

    public static ADD_NEW_BOARD_ITEM = "memberview-add-new-board-item";

    private _member: Boards.BoardMember;
    private _tileMap: TFS_Core_Utils.Dictionary<Tile>;
    private _expandHandler: Function;
    private _isFilterControlCssFixed: boolean;
    private _pageMoreStatusIndicator: StatusIndicator.StatusIndicator;
    private _$pageLinkContainer: JQuery;
    private _$pageMoreLink: JQuery;
    private _filterModeActive: boolean;
    private _pageClickCount = 0;
    private _$boardAddCard: JQuery;
    private _addNewItemControl: AgileControls.AddNewItemControl;
    private _isAddNewCardDisabled: boolean;
    private _$addNewCardContainer: JQuery;
    private _$emptyResultMessage: JQuery;
    private _childNodeView: NodeView; // Reference to child node view
    private _onBoardNewItemEdited: Function;
    private _$onlineFilterResults: JQuery;
    private _onBoardCriteriaFilterChanged: Function;
    private _onAddNewIncomingItemEvent: Function;
    private _eventsHelper: ScopedEventHelper;

    constructor(options?: any) {
        /// <summary>A component of a NodeView that represents one or more values from the field managed by the node view.</summary>
        /// <param name="options" type="Object">Control options.</param>

        super(options);

        Diag.Debug.assertParamIsType(options.member, Boards.BoardMember, "options.member");
        Diag.Debug.assertParamIsType(options.tileMap, Object, "options.tileMap");

        this._member = options.member;
        this._tileMap = options.tileMap;
        this._expandHandler = options.expandHandler;
        this._eventsHelper = options.eventsHelper;
        Diag.Debug.assertIsNotNull(this._eventsHelper, "Events helper should not be null.");
    }

    /**
     * Initialize the control.
     */
    public initialize() {
        var member = this._member;
        var element = this.getElement();

        if (member.canAddNewItemButton()) {
            this._addNewCardControl();
            //set focus back on addnewcardcontrol when a new item is edited
            this._onBoardNewItemEdited = () => {
                this._$boardAddCard.focus();
            };
            this._eventsHelper.attachEvent(Boards.Notifications.BoardNewItemEdited, this._onBoardNewItemEdited);
            this._$boardAddCard = element.find("." + MemberView.addNewCardCssClass);
        }

        if (member.isIncoming()) {
            this._createFilterControl();

            if (!this._onAddNewIncomingItemEvent) {
                this._onAddNewIncomingItemEvent = (sender, eventData) => {
                    // Make sure the incoming column is expanded before we try to add new item
                    this.expandCollapsedColumn();
                    this.addNewBoardItem(eventData.itemType).done(i => {
                        this.getElement()[0].scrollIntoView();
                    });
                }
                this._eventsHelper.attachEvent(Boards.Notifications.BoardAddNewIncomingItem, this._onAddNewIncomingItemEvent);
            }
        }

        this._bindBoardCriteriaFilterChanged();

        var childNode = member.childNode();
        if (childNode) {
            this._childNodeView = NodeView.createNodeView(childNode, element, this._eventsHelper, this._options.team, { tileMap: this._options.tileMap });
        }

        if (member.isPagingEnabled()) {
            this._$emptyResultMessage = $("<div>").text(AgileControlsResources.Board_PagedColumn_NoResultMessage)
                .addClass("no-result-message");
        }
        member.attachEvent(Boards.Notifications.BoardItemAdded, (sender, args) => {
            this.addItem(args.item, args.deferPlacement);
        });

        member.attachEvent(Boards.Notifications.BoardItemUpdated, (sender, args) => {
            this.updateItem(args.item, args.oldId);
        });

        member.attachEvent(Boards.Notifications.BoardItemRemoved, (sender, args) => {
            this.removeItem(args.item, args.isMove);
        });

        member.attachEvent(Boards.Notifications.BoardItemFilteringComplete, (sender, args) => {
            this._showFilteredItems(args);
        });

        member.onItemsLoaded();

        // Make it a drop target if there are no more subelements under it.
        if (!member.childNode()) {
            // Delay the initialize of droppable to improve load performance.
            Utils_Core.delay(this, 0, () => {
                element.droppable({
                    scope: TFS_Agile.DragDropScopes.WorkItem,
                    accept: delegate(this, this._acceptHandler),
                    hoverClass: "agileDragTargetHoverColor",
                    drop: delegate(this, this.droppableDrop),
                    over: delegate(this, this._droppableOver),
                    out: delegate(this, this._droppableOut),
                    tolerance: "pointer"
                });
            });
        }
    }


    public placeTilesFromModel() {
        var member = this._member;
        var $element = this.getElement();

        this._placeItems(member.items());

        if (member.isPagingEnabled() && this._canShowPagingLink(member.rootColumnType())) {
            // Enable the paging UI
            this._$pageLinkContainer = $("<div>")
                .addClass("page-items-container");

            this._pageMoreStatusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(
                StatusIndicator.StatusIndicator,
                this._$pageLinkContainer,
                {
                    message: VSS_Resources_Platform.Loading,
                    throttleMinTime: 0
                });

            this._$onlineFilterResults = $("<div>").hide();

            this._$pageMoreLink = $("<a>")
                .attr("tabindex", "0")
                .attr("role", "button")
                .css({ "cursor": "pointer" })
                .keydown((e?: JQueryEventObject) => {
                    if (e.keyCode === Utils_UI.KeyCode.ENTER
                        || e.keyCode === Utils_UI.KeyCode.SPACE) {
                        this._$pageMoreLink.click();
                        // set focus on the last visible card in the current column for keyboard accessibility
                        var $tiles = this.getElement().find(Tile.VISIBLE_TILE_ITEM_SELECTOR);
                        if ($tiles.length > 0) {
                            $tiles.last().focus();
                        }
                        return false;
                    }
                })
                .addClass("see-more-items")
                .text(AgileControlsResources.Board_PagedColumn_ShowMoreItems)
                .click(() => {
                    this._pageClickCount++;
                    var pagingCountData = this._getPagingTelemetryCount($element.find(Tile.VISIBLE_TILE_ITEM_SELECTOR).length);
                    this._setPagingViewState(true);

                    const initialItemCount = $element.find(Tile.VISIBLE_TILE_ITEM_SELECTOR).length; // Get the count of the visible cards in the column
                    member.getRootMember().node().board().beginPageMoreItems(
                        this._filterModeActive,
                        member.rootColumnType(),
                        (items: Boards.WorkItemItemAdapter[]) => {
                            this._processPageResults(items, initialItemCount);
                        },
                        (error) => {
                            this._handlePageMoreItemsError(error);
                        },
                        pagingCountData
                    );
                });

            this._$pageLinkContainer[0].appendChild(this._$onlineFilterResults[0]);
            this._$pageLinkContainer[0].appendChild(this._$pageMoreLink[0]);
            $element[0].appendChild(this._$pageLinkContainer[0]);
        }
    }

    public dispose() {
        if (this._tileMap) {
            for (const tileId of this._tileMap.keys()) {
                const tile = this._tileMap.get(tileId);
                if (tile) {
                    tile.dispose();
                }
                delete this._tileMap[tileId];
            }
            this._tileMap = null;
        }

        if (this._addNewItemControl) {
            this._addNewItemControl.dispose();
            this._addNewItemControl = null;
        }

        if (this._onBoardNewItemEdited) {
            this._eventsHelper.detachEvent(Boards.Notifications.BoardNewItemEdited, this._onBoardNewItemEdited);
            this._onBoardNewItemEdited = null;
        }

        if (this._onBoardCriteriaFilterChanged) {
            this._eventsHelper.detachEvent(Boards.Notifications.BoardCriteriaFilterChanged, this._onBoardCriteriaFilterChanged);
            this._onBoardCriteriaFilterChanged = null;
        }

        if (this._childNodeView) {
            this._childNodeView.dispose();
            this._childNodeView = null;
        }

        if (this._onAddNewIncomingItemEvent) {
            this._eventsHelper.detachEvent(Boards.Notifications.BoardAddNewIncomingItem, this._onAddNewIncomingItemEvent);
            this._onAddNewIncomingItemEvent = null;
        }

        if (this._member) {
            this._member.dispose();
            this._member = null;
        }

        if (this.getElement() && this.getElement().droppable()) {
            this.getElement().droppable('destroy');
        }

        super.dispose();
    }

    public member(member?: Boards.BoardMember): Boards.BoardMember {
        /// <summary>Get or set the BoardMember that this control renders</summary>
        /// <param name="member" type="Boards.BoardMember" optional="true">The board member.</param>
        /// <returns type="Boards.BoardMember">The value of the board member (possibly after setting the value).</returns>
        Diag.Debug.assertParamIsType(member, Boards.BoardMember, "member", true);
        if (member !== undefined) {
            this._member = member;
        }
        return this._member;
    }

    public childNodeView(): NodeView {
        /// <summary>Get child node view</summary>
        return this._childNodeView;
    }

    public itemSource(): Boards.ItemSource {
        /// <summary>Return the ItemSource corresponding to this view. </summary>
        return this.member().itemSource();
    }

    public addItem(item: Boards.WorkItemItemAdapter, deferPlacement: boolean) {
        /// <summary>Add an item to the view.</summary>
        /// <param name="item" type="Boards.Item">The item to add.</param>
        /// <param name="deferPlacement" type="boolean">whether item placement will be deferred or not</param>

        Diag.Debug.assertParamIsType(item, Boards.Item, "item");

        const tileOptions: ITileOptions =
            {
                item: item,
                board: this._member.node().board(),
                eventsHelper: this._eventsHelper,
                team: this._options.team
            };

        var tile = <Tile>Controls.Enhancement.enhance(Tile, $("<div>"), tileOptions);
        tile.getElement().css({ "width": this.getElement().width() });

        if (this._filterModeActive) {
            tile.getElement().addClass(MemberView.filterPendingCssClass);
        }

        this._tileMap.set(item.id(), tile);

        if (!deferPlacement) {
            this.placeTile(tile);
        }

        return tile;
    }

    public updateItem(item: Boards.Item, oldId?: number) {
        /// <summary>Update an item so that it is placed in this view.</summary>
        /// <param name="item" type="Boards.Item">The item to add or update.</param>
        /// <param name="oldId" type="number" optional="true">The old id of the item in case of an id change.</param>
        var preserveBacklogOrder = !!this.member().node().board().getBoardSettings().preserveBacklogOrder;
        if (preserveBacklogOrder || oldId || !item.skipPlacement()) {
            this._updateItemInternal(item, oldId);
        }
    }

    /**
     *  Returns if the member of the memberView control is of type Incoming
     */
    public isIncoming(): boolean {
        return this._member.isIncoming();
    }

    /**
     *  Returns if the member of the memberView control is of type Outgoing
     */
    public isOutgoing(): boolean {
        return this._member.isOutgoing();
    }

    /**
     *  Returns the first tile in the member view, if any, else returns null
     */
    public returnFirstTileInMemberView(): Tile {
        if (!this._childNodeView) {
            // No Child NodeView
            return this.getFirstTileInMember();
        }
        var memberViews = this._childNodeView.memberViews();
        for (var i = 0, l = memberViews.length; i < l; i++) {
            var memberView = memberViews[i];
            var leftMostMemberView = memberView.getLeftMostLeafMemberView();
            if (leftMostMemberView) {
                var tile: Tile = leftMostMemberView.getFirstTileInMember();
                if (tile) {
                    return tile;
                }
            }
        }
        return null;
    }

    /**
     *  Returns all the member views which can contain tiles, in the current member view
     */
    public getAllLeafMemberViewsInElement(): MemberView[] {
        return this._getChildMembersRecursively(this);
    }

    private _getChildMembersRecursively(currentMemberView: MemberView): MemberView[] {
        var memberViews: MemberView[] = [];

        if (!currentMemberView.childNodeView()) {
            memberViews.push(currentMemberView);
        } else {
            currentMemberView.childNodeView().memberViews().forEach((childMemberView: MemberView) => {
                var members = this._getChildMembersRecursively(childMemberView);

                members.forEach((itemToAdd: MemberView) => {
                    memberViews.push(itemToAdd);
                });
            });
        }
        return memberViews;
    }

    private _updateItemInternal(item: Boards.Item, oldId?: number) {
        Diag.Debug.assertParamIsType(item, Boards.Item, "item");

        var tile: Tile = this._tileMap.get(oldId || item.id()),
            $element: JQuery = tile.getElement(),
            previousOffset, currentOffset,
            $helper: JQuery;  // animate the clone instead of real tile

        var hadFocus = tile.hasFocus();

        if (oldId) {
            Tile.setId($element, item.id());

            this._tileMap.set(item.id(), tile);
            this._tileMap.remove(oldId);
        }

        previousOffset = $element.offset();

        // create a clone before updating the tile which would help in showing animation
        $helper = tile.createHelper(previousOffset, false);

        // place the tile in its correct location
        this.placeTile(tile);
        currentOffset = $element.offset();

        // if there is any change in the position of tile then animate
        if (currentOffset.top !== previousOffset.top || currentOffset.left !== previousOffset.left) {
            // hide the actual tile, which is located at the new position now.
            $element.css("visibility", "hidden");
            $helper.css("visibility", "");

            var callback = () => {
                if (hadFocus) {
                    tile.setFocus();
                }
            };
            tile.animateTile($helper, callback);
        }
        else {
            if (hadFocus) {
                // set focus even if there is no need to animate
                tile.setFocus();
            }

            // remove helper
            $helper.remove();
        }
    }

    public removeItem(item: Boards.Item, isMove?: boolean) {
        /// <summary>Remove an item from this view.</summary>
        /// <param name="item" type="Boards.Item">The item to remove</param>
        /// <param name="isMove" type="Boolean" optional="true">'true' if this removal is part of a move operation.</param>
        Diag.Debug.assertParamIsType(item, Boards.Item, "item");

        if (!isMove) {
            let id = item.id();
            let tileMap = this._tileMap;
            let tile = tileMap.get(id);

            tileMap.remove(id);
            tile.dispose();
        }
    }

    public addNewBoardItem(boardItemType: string): Q.Promise<Boards.Item> {
        /// <summary>Creates a new item on the board of the specified type .</summary>
        /// <param name="boardItemType" type="string">The type of the board item</param>
        var source: Boards.ItemSource = this.itemSource();

        // Make sure the member is ready to start receiving items
        this._member.startReceivingNewItems();
        const teamId = this.member().node().board().teamId;
        return source.beginCreateNewItem(teamId, boardItemType).then((boardItem: Boards.Item) => {
            this._activateEditOnTile(boardItem, DatabaseCoreFieldRefName.Title);
            // there is a bug in chrome which doesn't repaint the board causing a distortion of tiles once the new item is added,hovering over the board clears the distortion
            // firing an explicit redraw on the board now to get rid of this issue
            this._eventsHelper.fire(Boards.Notifications.BoardRedraw);
            this._eventsHelper.fire(MemberView.ADD_NEW_BOARD_ITEM, this, boardItem);
            // Stop the member from expecting items
            this._member.stopReceivingNewItems();
            return boardItem;
        });

    }

    public isMatch(value: any): boolean {
        /// <summary>Returns true if the value is a match for this member's values.</summary>
        /// <param name="value" type="Object">The value to test</param>
        /// <returns type="Boolean">true if the value matches this member, false otherwise.</returns>
        return this._member.isMatch(value);
    }

    public isCollapsed(): boolean {
        return this.getElement().hasClass("collapsed");
    }

    private _setPagingViewState(on: boolean, showPageMoreLink?: boolean) {
        this._$onlineFilterResults.hide();

        if (on) {
            this._disableAddNewCard(true);
            this._pageMoreStatusIndicator.start();
            this._$pageMoreLink.hide();
        }
        else {
            this._$pageLinkContainer.hide();

            this._pageMoreStatusIndicator.complete();
            this._disableAddNewCard(false);

            if (showPageMoreLink) {
                this._$pageLinkContainer.show();
                this._$pageMoreLink.show();
            }
        }
    }

    private _getPagingTelemetryCount(currentlyVisibleItems: number) {
        var ciData: IDictionaryStringTo<any> = {
            "ColumnType": this._member.rootColumnType(),
            "IsFilteredColumn": this._member.isFiltered(),
            "PagedItemsCount": this._member.items() ? this._member.items().length : 0,
            "VisibleItemsCount": currentlyVisibleItems,
            "ClickCount": this._pageClickCount
        };
        return ciData;
    }

    private _canShowPagingLink(scope: string): boolean {
        return this.itemSource().canPageItems(scope);
    }

    private _processPageResults(items: Boards.WorkItemItemAdapter[], initialItemCount?: number) {
        /// <summary>Processes the results of the beginPageItems call.
        ///     Filters it, if the filter mode is active.
        ///     Checks if we need more server calls and if required, initiates those</summary>
        /// <param name="items" type="Boards.Item[]">The output of the beginPageItems callback</param>
        /// <param name="initialItemCount" type="number">
        ///     The initial count of the filtered items.
        ///     This is used to verify if we need more paging to meet the filterResults batch size
        /// </param>

        // place paged items in bulk
        this._placeItems(items);

        var member = this._member;
        var element = this.getElement();
        var haveMoreItemsToLoad = this._canShowPagingLink(member.rootColumnType());

        this._setPagingViewState(false, haveMoreItemsToLoad);

        if (this._filterModeActive) {
            // Filter new members according to the current filter criteria
            this._member.calculateFilteredItems();

            // Update message informing user about number of matches and items
            var filteredItemCount = element.find(Tile.VISIBLE_TILE_ITEM_SELECTOR).length; // Get the count of the visible cards in the column
            if (haveMoreItemsToLoad) {
                var totalItemCount = element.find(Tile.TILE_ITEM_SELECTOR).length;
                var onlineFilterTextSummary: string;
                if (filteredItemCount === 1) {
                    onlineFilterTextSummary = Utils_String.format(AgileControlsResources.Board_OnlineFilter_Summary_Singular, totalItemCount);
                }
                else {
                    onlineFilterTextSummary = Utils_String.format(AgileControlsResources.Board_OnlineFilter_Summary, filteredItemCount, totalItemCount);
                }
                this._$onlineFilterResults.show().text(onlineFilterTextSummary);
                this._$pageMoreLink.text(AgileControlsResources.Board_OnlineFilter_Continue);
            }
            else {
                if (filteredItemCount === initialItemCount) {
                    //Add empty result message
                    this._$emptyResultMessage.show();
                    this._$emptyResultMessage.detach();
                    // use this wrapper div to control the visibility on callapse
                    var visibilityDiv = $("<div>");
                    visibilityDiv[0].appendChild(this._$emptyResultMessage[0]);
                    element[0].appendChild(visibilityDiv[0]);
                }
            }
        }
    }

    private _handlePageMoreItemsError(error: any) {
        if (this._pageMoreStatusIndicator) {
            this._pageMoreStatusIndicator.complete();
        }
        this._disableAddNewCard(false);
        // Throw error only if not aborted
        if (!error.xhr ||
            Utils_String.ignoreCaseComparer(error.xhr.statusText, MemberView.pageRequestAbortedMessage) !== 0) {
            VSS.errorHandler.show(error);
        }
    }

    private _activateEditOnTile(item: Boards.Item, fieldRefName: string) {
        /// <summary>Activates edit on the specified field on the Tile </summary>
        /// <param name="item" type="Item">The Item for corresponding . </param>
        /// <param name="fieldRefName" type="string">The field to edit </param>
        if (item) {
            var tile: Tile = this._tileMap.get(item.id());

            if (tile) {
                tile.beginFieldEdit(fieldRefName);
            }
        }
    }

    private _acceptHandler($tile: JQuery) {
        /// <summary>
        /// Determines if the provided item should be accepted by the droppable (this).
        /// Note that this handler is triggered for all droppable elements (board members)
        /// </summary>
        /// <param name="$tile">The jquery tile instance that's been dragged</param>
        var id = Tile.getId($tile);

        if (!id) {
            // The item has been dropped on the recycle bin and hence removed from the board
            return false;
        }

        var tile = this._tileMap.get(id),
            item = tile.item();

        if (!tile.isDraggable()) {
            return false;
        }

        // don't accept if tile is dropped in the same column in which it was before
        var tileContainer = tile.board.rootNode().getItemContainer(item);
        if (tileContainer === this._member) {
            return false;
        }

        if (this._member.disableAcquisitions) {
            return false;
        }

        var columnFieldReferenceName = this._member.getRootNodeFieldName();
        var newColumnTitle = this._member.getTopLevelMemberValue(columnFieldReferenceName);
        var currentColumnTitle = item.fieldValue(columnFieldReferenceName);

        // dragging between doing/done columns within same parent is allowed
        if (!this._member.isTopLevel() && (Utils_String.localeIgnoreCaseComparer(currentColumnTitle, newColumnTitle) === 0)) {
            return true;
        }

        // check if the state of currentColumnTitle can be transitioned to the state of newColumnName for the extension field
        if (item.isValidValue(columnFieldReferenceName, currentColumnTitle, newColumnTitle)) {
            return true;
        }
        else {
            return false;
        }
    }

    public expandCollapsedColumn(): boolean {
        if (this._element.hasClass("collapsed") && $.isFunction(this._expandHandler)) {
            this._expandHandler();
            return true;
        }
        return false;
    }

    public droppableDrop(event: JQueryEventObject, ui: any, isExplicitDrop?: boolean) {
        /// <summary>Called when an item is dropped on the droppable</summary>
        /// <param name="event">The originating drop() event</param>
        /// <param name="ui" type="Object">The UI helper object managed by jQuery UI. ui.draggable represents the item being dragged</param>

        Diag.logTracePoint("MemberView._droppableDrop.start");

        var preserveBacklogOrder = !!this.member().node().board().getBoardSettings().preserveBacklogOrder;
        if (preserveBacklogOrder || isExplicitDrop) {
            var perfScenario = Performance.getScenarioManager().startScenario(Boards.KanbanTelemetry.CI_AREA_AGILE, Boards.KanbanTelemetry.Perf_Scenario_SaveCard);

            var startTime = Date.now();
            var $tile = ui.draggable;
            var id = Tile.getId($tile);
            var tile = this._tileMap.get(id);

            var completedCallback = () => {
                perfScenario.end();
                var ciData = tile.getDragDropCI();
                Boards.KanbanTelemetry.OnDragDrop(ciData, startTime);
            };

            // Expand collapsed column before placing the tile into.
            this.expandCollapsedColumn();

            // place tile in the appropriate position in this member view
            this.placeTile(tile);

            // create another helper for animation
            var $helper = tile.createHelper(ui.helper.offset(), true);

            // animate tile
            tile.animateTile($helper, function () {
                Diag.logTracePoint("MemberView.animateTile.complete");
            });

            tile.saveItem(this._member, startTime, completedCallback);

            this._eventsHelper.fire(Boards.Notifications.BoardTileMoved);
        }
    }

    private _droppableOver(event, ui) {
        var id = Tile.getId(ui.draggable);
        this._member.acquire(id);
    }

    private _droppableOut(event, ui) {
        var id = Tile.getId(ui.draggable);
        this._member.scheduleRelease(id);
    }

    /**
     * Place the tile in the correct sorted location within the control's element.
     * @param tile - The tile to add
     * @param ignoreSavingItems - true to place item in correct location as if saving items are not there
     */
    public placeTile(tile: Tile, ignoreSavingItems?: boolean) {
        Diag.Debug.assertParamIsType(tile, Tile, "tile");

        var droppableElement = this.getElement();
        var $insertBefore: JQuery;

        // find the item that we should insert before
        //  - find the first item which is 'greater' than the item we're inserting
        $("." + Tile.CoreCssClass, droppableElement).each((i, tileElement) => {
            var tileControl = <Tile>Controls.Enhancement.getInstance(Tile, $(tileElement));
            if (tileControl) {
                var item = tile.item();
                var compareItems = this._member.itemComparer();
                if ((!ignoreSavingItems || !item.operation()) && // if item has ongoing operations, it is in a saving state
                    item !== tileControl.item() &&
                    compareItems(item, tileControl.item()) <= 0) {  // is (item < tileControl.item)
                    $insertBefore = $(tileElement);
                    return false;
                }
            }
        });

        var $tileElement = tile.getElement();
        var offset: { left: number; top: number; };
        if (this._preserveOffset($tileElement)) {
            offset = $tileElement.offset();
            $tileElement.css("visibility", "hidden"); // hide the item temporarily whilst we reparent it.
        }

        if ($insertBefore) {
            if ($insertBefore[0] !== $tileElement[0]) {
                $insertBefore.before($tileElement);
            }
        }
        else if (this._$pageLinkContainer) {
            this._$pageLinkContainer.before($tileElement);
        }
        else {
            droppableElement[0].appendChild($tileElement[0]);
        }

        if (offset) {
            $tileElement.offset(offset);
            $tileElement.css("visibility", "");
        }
    }

    private _placeItems(items: Boards.WorkItemItemAdapter[]) {
        var element = this.getElement();

        if (items) {
            var tiles = $.map(items, (item: Boards.WorkItemItemAdapter, i: number) => {
                var tile = this._tileMap.get(item.id()) || this.addItem(item, true);
                return {
                    tile: tile,
                    item: item
                };
            });

            if (tiles.length > 0) {
                if (this._$pageLinkContainer) {
                    this._$pageLinkContainer.detach();
                }
                var compare = this._member.itemComparer();
                tiles.sort((i1: any, i2: any) => {
                    return compare(i1.item, i2.item);
                });

                element.append($.map(tiles, (sortEntry: { tile: Tile; item: Boards.Item; }) => {
                    return sortEntry.tile.getElement()[0];
                }));
                if (this._$pageLinkContainer) {
                    element[0].appendChild(this._$pageLinkContainer[0]);
                }
            }
        }
    }

    private _preserveOffset($element) {
        /// <summary>Determine whether we want to preserver the current offset (with respect to the document)
        /// during a tile update.</summary>

        // When we drag/drop we need to preserve this otherwise the tile will jump locations as it's reparented.
        // At other times (like on a work item refresh, or save through the WIT form) we want the tile to
        // jump to it's new location.

        // Currently using the CSS left property (which drag/drop modifies) to determine whether we need to preserve the location.
        var cssLeft = $element.css("left");

        return cssLeft !== "auto" &&
            cssLeft !== "0px" &&
            $element.parent().length > 0; // don't preserve for new elements
    }

    private _togglePageMoreLinkText() {
        /// <summary> Toggle the text of "Find more matches" and "See more items" links</summary>
        if (this._$pageMoreLink) {
            this._$onlineFilterResults.hide();
            this._$pageMoreLink.text(AgileControlsResources.Board_PagedColumn_ShowMoreItems);
        }
    }

    private _createFilterControl() {
        var element: JQuery;
        const member = this._member;

        if (this._$addNewCardContainer) {
            element = this._$addNewCardContainer;
        }
        else {
            // Need a container for the filter control so that height is set correctly
            element = $("<div>").addClass(MemberView.addNewCardContainer);
            this.getElement().first().append(element);
        }

        const inputChangedEventHandler = (filterString: string) => {
            filterString = filterString.trim();

            if (!filterString) {
                member.clearLocalTextFilter();
            } else {
                member.setLocalTextFilter(filterString);
                this._handlePagingOnFilteredMemberView();
            }
            Diag.logTracePoint("MemberView.search.complete");
        };

        Controls.create(ControlsSearch.ToggleSearchBoxControl, element, <ControlsSearch.ISearchBoxControlOptions>{
            coreCssClass: MemberView.searchInputContainer,
            isDataSetComplete: () => {
                return member.isDataSetComplete();
            },
            activateSearchHandler: () => {
                this._adjustPaddingForFilterControl();
                member.ensureSearchIndex();
                Boards.KanbanTelemetry.OnFilter(this._member.rootColumnType());
            },
            inputChangedEventHandler,
            deactivateSearchHandler: () => inputChangedEventHandler(""),
            searchIconTooltip: AgileControlsResources.Board_SearchIconTooltip_FirstColumn,
            filterTitle: AgileControlsResources.Board_SearchIconTooltip_FirstColumn
        });
    }

    private _adjustPaddingForFilterControl() {
        if (!this._isFilterControlCssFixed) {
            this._isFilterControlCssFixed = true;

            // Add padding left for the search input box to make room for add button.
            var element = this.getElement();
            var filterControlPadding = 0;
            if (this._$boardAddCard) {
                var extraPadding = 10;
                filterControlPadding = parseInt(this._$boardAddCard.css("width"), 10) + extraPadding;
            }
            element.find("." + MemberView.searchInputContainer).css("padding-left", filterControlPadding + "px");
        }
    }

    /** Listen to board filter changes and react accordingly */
    private _bindBoardCriteriaFilterChanged() {
        if (this._member.isFilterable()) {
            this._onBoardCriteriaFilterChanged = (args: { filter: FilterState }) => {
                const { filter } = args;

                if (this._member.filterItems(filter)) {
                    if (this._member.isPagingEnabled()) {
                        this._handlePagingOnFilteredMemberView();
                    }
                }
            };
            this._eventsHelper.attachEvent(Boards.Notifications.BoardCriteriaFilterChanged, this._onBoardCriteriaFilterChanged);
        }
    }

    private _handlePagingOnFilteredMemberView(): void {
        this._filterModeActive = true;

        // Enable "Find more matches" link
        this._togglePageMoreLinkText();
        this._$emptyResultMessage.hide();
    }

    private _addNewCardControl() {
        /// <summary>// Adds the 'New Card' control to this member.</summary>
        this._$addNewCardContainer = $("<div>").addClass(MemberView.addNewCardContainer);
        var addNewItemControlOptions: AgileControls.IAddNewItemControlOptions = {
            itemTypes: this._options.itemTypes || this._getItemTypes(),

            // We are filtering out hidden work item types from AddNewItemControl. For instance, if Bug was enabled on the board but it's defined as hidden work item, then
            // Bug type name will be filtered out from the control. We wouldn't need this filter callback once we decide to respect the hidden category everywhere - hide bug types 
            // on the board (which requires server-side change), settings dialog and etc. 
            itemTypesFilterCallback: AgileUtils.WorkItemCategoriesUtils.removeHiddenWorkItemTypeNames,
            addIconCssClass: "bowtie-icon bowtie-math-plus-box-light",
            addNewItem: (itemType: string) => {
                this.addNewBoardItem(itemType);
            },
            debounceTime: 1000, //1 second
            iconRenderer: AgileUtils.ControlUtils.buildColorElement,
            displayText: BoardResources.AddNewCardDisplayText,
            coreCssClass: MemberView.addNewCardCssClass,
            disableAddNewHandler: delegate(this, () => { return this._isAddNewCardDisabled; }),
            enableKeyboardShortcut: true,
            groupName: AgileControlsResources.KeyboardShortcutGroup_KanbanBoard,
            callback: delegate(this, () => {
                Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_NEWITEM_KEYBOARD_SHORTCUT, { "Key": "n" });
            })

        };

        this._addNewItemControl = Controls.Control.create(AgileControls.AddNewItemControl, this._$addNewCardContainer, addNewItemControlOptions);
        this.getElement()[0].appendChild(this._$addNewCardContainer[0]);
    }

    private _disableAddNewCard(disable: boolean) {
        if (this._$boardAddCard) {
            this._isAddNewCardDisabled = disable;
            if (disable) {
                this._$boardAddCard.find(".bowtie-math-plus-box-light").removeClass("enabled");
            }
            else if (!this._$boardAddCard.hasClass(".bowtie-math-plus-box-light")) {
                this._$boardAddCard.find(".bowtie-math-plus-box-light").addClass("enabled");
            }
        }
    }

    private _getItemTypes(): string[] {
        /// <summary>Get the different types of Items that can be created in this member.</summary>
        return this.itemSource().getItemTypes();
    }

    private _showFilteredItems(filteredItemIds: number[]) {
        if (filteredItemIds.length === 0 && this.getElement().find(Tile.FILTERED_TILE_ITEM_SELECTOR).length === 0) {
            // Optimization for continuing searches when we have filtered out everything already
            return;
        }

        Diag.measurePerformance(() => {
            var itemMap = {};
            for (var i = 0, l = filteredItemIds.length; i < l; i++) {
                var filteredItemId = filteredItemIds[i];
                itemMap[filteredItemId] = filteredItemId;
            }

            this.getElement().find(Tile.TILE_ITEM_SELECTOR).each((index: number, element: Element) => {
                var id = $(element).data().itemId;
                // don't apply filtering on a new item (id < 0) which is yet to be created
                if (itemMap.hasOwnProperty(id) || id < 0) {
                    $(element).removeClass(Tile.FILTERHIDE_CLASS);
                }
                else {
                    $(element).addClass(Tile.FILTERHIDE_CLASS);
                }
                if (this._filterModeActive) {
                    $(element).removeClass(MemberView.filterPendingCssClass);
                }
            });
        }, "_showFilteredItems");

        // Fix swimlane height after filtering
        this._eventsHelper.fire(Boards.Notifications.BoardHeightChanged);

        // Fix ghosting issue in Chrome
        this._eventsHelper.fire(Boards.Notifications.BoardRedraw);
    }

    // Below should not in MemberView Base class, it is too overloaded.
    // We need to move it to customized node view when refactor.
    public getLeftMostLeafMemberView(): MemberView {
        /// <summary>Get the left most member view of the root.</summary>
        /// <returns type="MemberView">the memberView</returns>
        if (this._childNodeView && this._childNodeView.memberViews()) {
            return this._childNodeView.memberViews()[0].getLeftMostLeafMemberView();
        }
        return this;
    }

    public getRightMostLeafMemberView(): MemberView {
        /// <summary>Get the right most member view of the root.</summary>
        /// <returns type="MemberView">the memberView</returns>
        if (this._childNodeView && this._childNodeView.memberViews()) {
            var childMemberViews = this._childNodeView.memberViews();
            return childMemberViews[childMemberViews.length - 1].getRightMostLeafMemberView();
        }
        return this;
    }

    private _getMemberNavigationGraphOfBoard(): MemberNavigationGraph {
        var $currentItem = this.getElement();
        var $parentItem = $currentItem.parentsUntil(BoardView.BOARD_VIEW_SELECTOR).parent();
        var boardView: BoardView = <BoardView>Controls.Enhancement.getInstance(BoardView, $parentItem);

        return boardView.getMemberGraph();
    }

    /**
     *  Returns the member view which is above the current member view in the visual board, which has cards
     */
    public getAboveLaneSibling(): MemberView {
        var memberGraph = this._getMemberNavigationGraphOfBoard();

        return <MemberView>memberGraph.getAboveMember(this, true);
    }

    /**
     *  Returns the member view which is below the current member view in the visual board, which has cards
     */
    public getBelowLaneSibling(): MemberView {
        var memberGraph = this._getMemberNavigationGraphOfBoard();

        return <MemberView>memberGraph.getBelowMember(this, true);
    }

    /**
     *  Returns the member view which is to the right of the current member view in the visual board, which has cards
     */
    public getRightSibling(): MemberView {
        var memberGraph = this._getMemberNavigationGraphOfBoard();

        return <MemberView>memberGraph.getNextMember(this, true);
    }

    /**
     *  Returns the member view which is to the let of the current member view in the visual board, which has cards
     */
    public getLeftSibling(): MemberView {
        var memberGraph = this._getMemberNavigationGraphOfBoard();

        return <MemberView>memberGraph.getPreviousMember(this, true);
    }

    /**
     *  Returns if member view contains at least one item (card/tile). Does not traverse into child node view
     */
    public hasItem(): boolean {
        if (this.getFirstTileInMember()) {
            return true;
        }
        return false;
    }

    /**
     *  Returns the first tile in the current member. Does not traverse into child node view
     */
    public getFirstTileInMember(): Tile {
        var $parentItem = this.getElement();
        if ($parentItem) {
            var $tileItemSelector = $parentItem.children(Tile.VISIBLE_TILE_ITEM_SELECTOR);
            if ($tileItemSelector.length > 0) {
                var $firstItem = $tileItemSelector.first();
                if ($firstItem) {
                    return <Tile>Controls.Enhancement.getInstance(Tile, $firstItem);;
                }
            }
        }
        return null;
    }

    /**
     *  Returns the last tile in the current member. Does not traverse into child node view
     */
    public getLastTileInMember(): Tile {
        var $parentItem = this.getElement();
        if ($parentItem) {
            var $tileItemSelector = $parentItem.children(Tile.VISIBLE_TILE_ITEM_SELECTOR);
            if ($tileItemSelector.length > 0) {
                var $lastItem = $tileItemSelector.last();
                if ($lastItem) {
                    return <Tile>Controls.Enhancement.getInstance(Tile, $lastItem);
                }
            }
        }
        return null;
    }

    public getBoardAddCard(): JQuery {
        return this._$boardAddCard;
    }
}

export interface NodeViewOptions {
    team: ITeam;
    tileMap: TFS_Core_Utils.Dictionary<Tile>;
    itemTypes: string[];
}

//exporting for unit testing
export class NodeView extends Controls.Enhancement<NodeViewOptions> {
    public static SERVER_ERROR_ON_RENAME: string = "ServerErrorOnRename";
    public static enhancementTypeName: string = "tfs.agile.board.controls.nodeview";
    public static LAYOUT_UPDATED = "nodeview-layout-updated";
    protected _eventsHelper: ScopedEventHelper;

    public static createNodeView(node: Boards.BoardNode, container: JQuery, eventsHelper: ScopedEventHelper, team: ITeam, args?: any): NodeView {
        /// <summary>Creates the node view control.</summary>
        /// <param name="node" type="VSS.Agile.Boards.BoardNode">The node that this view displays.</param>
        /// <param name="container" type="jQuery">The container which will be enhanced by the node view control.</param>
        /// <param name="args" type="Object" optional="true">Arguments for the constructor.</param>
        /// <returns type="NodeView">The control created to manage the board node.</returns>
        Diag.Debug.assertParamIsType(node, Boards.BoardNode, "node");
        Diag.Debug.assertParamIsJQueryObject(container, "container");

        var layoutStyle = node.layoutStyle(),
            Constructor = nodeViewTypeFactory.getConstructor(layoutStyle);

        Diag.Debug.assertIsFunction(Constructor, "Couldn't find node node view constructor for style: " + layoutStyle);

        return <NodeView>Controls.Enhancement.enhance(Constructor, container, $.extend({ node: node, eventsHelper: eventsHelper, team }, args));
    }

    public static findMemberViewByFieldValues(fieldUpdates: Boards.FieldNameValuePair[]): MemberView {
        /// <summary>Find the member view by fieldUpdates</summary>
        /// <param name="fieldUpdates" type="Array" elementType="FieldNameValuePair">An array of sieldName and fieldValue pairs.</param>
        /// <returns type="MemberView">The member view if any, otherwise return null.</returns>
        var currentNodeView = <NodeView>NodeView.getInstance(NodeView, $(".agile-board > div"));
        Diag.Debug.assertIsNotNull(currentNodeView, "Unable to find root node view.");
        var targetMemberView: MemberView = null;

        for (var i = 0, len = fieldUpdates.length; i < len; i++) {
            var currentMemberView = currentNodeView.findMember(fieldUpdates[i].fieldValue);
            Diag.Debug.assertIsNotNull(currentMemberView, "Unable to find the member view.");
            Diag.Debug.assert(currentMemberView.member().node().fieldName() === fieldUpdates[i].fieldName, "Unexpected field name.");
            var childNodeView = currentMemberView.childNodeView();
            if (childNodeView != null) {
                currentNodeView = childNodeView;
            }
            else {
                targetMemberView = currentMemberView;
            }
        }

        return targetMemberView;
    }

    private _node: Boards.BoardNode;
    private _memberViews: MemberView[]; // Reference to child member views
    private _boardMemberAddedDelegate: Function;
    private _memberNodeViews: NodeView[];

    protected canEdit(): boolean {
        var isEditable: boolean = false;

        if (!EmbeddedHelper.isEmbedded()) {
            var board = this._node.board();
            if (board) {
                var settings = board.getBoardSettings();
                if (settings) {
                    isEditable = settings.canEdit;
                }
            }
        }
        return isEditable;
    }

    constructor(options?: any) {
        /// <summary>A view of a BoardNode and its descendants. A view manages the DOM structure and
        /// display of child elements (other node views or tiles).</summary>
        /// <param name="options" type="Object">Control options.</param>
        super(options);

        Diag.Debug.assertParamIsType(options.node, Boards.BoardNode, "options.node");
        Diag.Debug.assertParamIsType(options.eventsHelper, ScopedEventHelper, "options.eventsHelper");
        this._node = options.node;
        this._eventsHelper = options.eventsHelper;

        this._memberViews = [];
        this._memberNodeViews = [];
    }

    public initialize() {
        /// <summary>Initialize the control.</summary>
        super.initialize();
        this._$createLayout();

        this._boardMemberAddedDelegate = (sender, args) => {
            this.addMember(args.member);
        };

        this._node.attachEvent(Boards.Notifications.BoardMemberAdded, this._boardMemberAddedDelegate);
    }

    public dispose() {
        if (this._memberViews) {
            for (var i = 0, len = this._memberViews.length; i < len; i++) {
                this._memberViews[i].dispose();
            }
            this._memberViews = null;
        }
        if (this._memberNodeViews) {
            for (let memberNodeView of this._memberNodeViews) {
                memberNodeView.dispose();
            }
            this._memberNodeViews = [];
        }

        if (this._boardMemberAddedDelegate) {
            this._node.detachEvent(Boards.Notifications.BoardMemberAdded, this._boardMemberAddedDelegate);
            this._boardMemberAddedDelegate = null;
        }

        this._node = null;
        super.dispose();
    }

    public _$createLayout() {
        /// <summary>Create the node view from the BoardNode that this node view renders. Each member
        /// of the BoardNode is added to the current view (which may in turn create additional
        /// child nodes.</summary>

        $.each(this._node.members() || [], (i: number, member: Boards.BoardMember) => {
            this.addMember(member);
        });
    }

    public node(): Boards.BoardNode {
        /// <summary>Get the node that this node view renders.</summary>
        /// <returns type="VSS.Agile.Boards.BoardNode">The node</returns>
        return this._node;
    }

    public memberViews(): MemberView[] {
        /// <summary>Get all the components for the node view. </summary>
        /// <returns type="array" elementType=MemberView">all the children memberView</returns>
        return this._memberViews;
    }

    /**
     *  Returns all the member views which can contain tiles, in the current node view
     */
    public getAllLeafMemberViewsInElement(): MemberView[] {
        var childMemberViews: MemberView[] = [];

        this._memberViews.forEach((memberView: MemberView) => {
            var tempView = memberView.getAllLeafMemberViewsInElement();
            tempView.forEach((childView: MemberView) => {
                childMemberViews.push(childView);
            });
        });
        return childMemberViews;
    }

    public _$addToLayout(member: Boards.BoardMember): any {
        /// <summary>Add the member to the layout.</summary>
        /// <param name="member" type="Boards.BoardMember">The member to add to the DOM.</param>
        /// <returns type="any">The container for any child nodes.</returns>

        return null;
    }

    public addMember(member: Boards.BoardMember): MemberView {
        /// <summary>Add a member somewhere within the node view or its descendants.</summary>
        /// <param name="member" type="Boards.BoardMember">The member to add.</param>
        /// <returns type="MemberView">The control managing the member.</returns>
        Diag.Debug.assertParamIsType(member, Boards.BoardMember, "member");

        var members = this._memberViews,
            memberView,
            memberElements,
            childNode,
            limits: Boards.MemberLimit;

        // add to the DOM
        memberElements = this._$addToLayout(member);

        // generate any child layouts
        childNode = member.childNode();
        if (childNode) {
            this._memberNodeViews.push(NodeView.createNodeView(childNode, memberElements.content, this._eventsHelper, this._options.team, { tileMap: this._options.tileMap }));
        }

        // TODO: Add members in the correct order based on the node's member ordering function
        memberView = <MemberView>Controls.Enhancement.enhance(
            MemberView,
            memberElements.content,
            {
                member: member,
                tileMap: this._options.tileMap,
                expandHandler: memberElements.expandHandler,
                itemTypes: this._options.itemTypes,
                eventsHelper: this._eventsHelper,
                team: this._options.team
            });
        members.push(memberView);

        // Add any limit control
        limits = member.limits();
        if (limits && member.isTopLevel()) {
            // only create the limit display control when it is the top level member.
            <LimitDisplay>Controls.Control.createIn(LimitDisplay, memberElements.header, {
                limit: limits.limit,
                source: [member],
                exceedHighlight: memberElements.header
            });
        }

        return memberView;
    }

    public findMember(fieldValue: string): MemberView {
        /// <summary>Find the member view by fieldValue</summary>
        /// <param name="fieldValue" type="string">The field value.</param>
        /// <returns type="MemberView">The member view if any, otherwise return null.</returns>
        var memberViews = this.memberViews();
        for (var i = 0, len = memberViews.length; i < len; i++) {
            if (memberViews[i].isMatch(fieldValue)) {
                return memberViews[i];
            }
        }
        return null;
    }

    public scrollToTop() {
        /// <summary>Scroll the content to the top</summary>
        /// <remarks>Override in derivations</remarks>
    }
}

class NodeViewHorizontal extends NodeView {
    public static COLUMN_RENAMED: string = "Column_Renamed";
    public static layoutStyle: string = "horizontal";
    public static AGILE_CONTENT_CONTAINER_CLASS = "agile-content-container";
    public static SCROLLABLE_CLASS = "scrollable";
    public static NOT_SCROLLABLE_CLASS = "not-scrollable";
    public static SCROLLABLE_CONTENT_CONTAINER_SELECTOR = "." + NodeViewHorizontal.AGILE_CONTENT_CONTAINER_CLASS + "." + NodeViewHorizontal.SCROLLABLE_CLASS;

    private static COLUMN_BORDER_WIDTH = 4;
    private static SPLIT_COLUMN_BORDER_WIDTH = 1;
    private static MIN_COLUMN_WIDTH = 220 + NodeViewHorizontal.COLUMN_BORDER_WIDTH;
    private static MAX_COLUMN_WIDTH = 320 + NodeViewHorizontal.COLUMN_BORDER_WIDTH;
    private static COLUMN_PADDING = 20;
    private static COLLAPSED_COLUMN_WIDTH = 40;
    private static COLLAPSECOLUMN_ACTION_SETTING_KEY = "CollapseColumnAction";
    private static MEMBER_HEADER_CONTENT_CLASS: string = "member-header-content member board-column-header";

    private _$headerContainer: JQuery;
    private _$contentContainer: JQuery;
    private _$headerCanvas: JQuery;
    private _$contentCanvas: JQuery;
    private _$headers: JQuery;
    private _$contents: JQuery;
    private _fixColumnHeightThrottledDelegate: Function;
    private _headerContentControls: EditableLabelControl[] = [];
    private _swimlaneColumnHeaderControls: EditableLabelControl[];
    private _enableSynchronizedScrollingBetweenHeaderAndContentDelegate: IArgsFunctionR<any>;

    constructor(options?: any) {
        /// <summary>A horizontal layout of a node and its members.</summary>
        /// <param name="options" type="Object">Control options.</param>
        super(options);
        this._eventsHelper = options.eventsHelper;
        Diag.Debug.assertIsNotNull(this._eventsHelper, "Events helper should not be null.");
    }

    public _$createLayout() {
        var $element = this.getElement();
        var isSwimlane = $element.hasClass("swimlane");

        $element.addClass("horizontal");

        this._$headerContainer = $(domElem("div", "agile-header-container not-scrollable"));
        this._$contentContainer = $(domElem("div", NodeViewHorizontal.AGILE_CONTENT_CONTAINER_CLASS));

        // We want to set the node view as scrollable for the global scroll pane (class of horizontal)
        // but not for every sub scroll pane within it (class of cell which is used for split columns)
        if ($element.hasClass("cell") || isSwimlane) {
            this._$contentContainer.addClass(NodeViewHorizontal.NOT_SCROLLABLE_CLASS);
        }
        else {
            this._$contentContainer.addClass(NodeViewHorizontal.SCROLLABLE_CLASS);

            // set the tab index to -1 so on click the contentContainer is focused instead of 'vss-PivotBar--content' (which had tab index added in PR 329760)
            // this is to keep focus inside the scrollable container so keyboard navigation works.
            this._$contentContainer.attr("tabindex", "-1");
        }

        this._$headerCanvas = $(domElem("div", "horizontal-table")).appendTo(this._$headerContainer);
        this._$contentCanvas = $(domElem("div", "horizontal-table")).appendTo(this._$contentContainer);

        this._$headers = $(domElem("div", "header-container row header"));
        this._$contents = $(domElem("div", "content-container row content"));

        super._$createLayout(); // adds all the members to the layout

        if (this.isTopLevelNodeView()) {
            this._fixColumnHeightThrottledDelegate = Utils_Core.throttledDelegate(this, 10, this._fixColumnHeight);
            this._eventsHelper.attachEvent(Boards.Notifications.BoardTileMoved, this._fixColumnHeightThrottledDelegate);
            this._eventsHelper.attachEvent(Boards.Notifications.BoardHeightChanged, this._fixColumnHeightThrottledDelegate);

            // synchronizing header and content scrolling
            this._enableSynchronizedScrollingBetweenHeaderAndContentDelegate = delegate(this, this.enableSynchronizedScrollingBetweenHeaderAndContent);
            this._bind(this._$contentContainer, "scroll", this._enableSynchronizedScrollingBetweenHeaderAndContentDelegate);
            this._bind(this._$headerContainer, "scroll", this._enableSynchronizedScrollingBetweenHeaderAndContentDelegate);
        }

        this._$headerCanvas[0].appendChild(this._$headers[0]);
        this._$contentCanvas[0].appendChild(this._$contents[0]);

        if (!isSwimlane) {
            $element[0].appendChild(this._$headerContainer[0]);
        }
        $element[0].appendChild(this._$contentContainer[0]);
    }

    public dispose() {
        if (this._fixColumnHeightThrottledDelegate) {
            this._eventsHelper.detachEvent(Boards.Notifications.BoardTileMoved, this._fixColumnHeightThrottledDelegate);
            this._eventsHelper.detachEvent(Boards.Notifications.BoardHeightChanged, this._fixColumnHeightThrottledDelegate);
        }
        if (this._headerContentControls && this._headerContentControls.length > 0) {
            this._headerContentControls.forEach((headerControl: EditableLabelControl) => {
                headerControl.dispose();
            });
            this._headerContentControls = [];
        }
        if (this._swimlaneColumnHeaderControls && this._swimlaneColumnHeaderControls.length > 0) {
            this._swimlaneColumnHeaderControls.forEach((swimlaneHeaderControl: EditableLabelControl) => {
                swimlaneHeaderControl.dispose();
            });
            this._swimlaneColumnHeaderControls = [];
        }
        if (this._enableSynchronizedScrollingBetweenHeaderAndContentDelegate) {
            this._unbind(this._$contentContainer, "scroll", this._enableSynchronizedScrollingBetweenHeaderAndContentDelegate);
            this._unbind(this._$headerContainer, "scroll", this._enableSynchronizedScrollingBetweenHeaderAndContentDelegate);
            this._enableSynchronizedScrollingBetweenHeaderAndContentDelegate = null;
        }

        super.dispose();
    }

    public isTopLevelNodeView(): boolean {
        /// <summary>Returns whether this node view is the top level or not</summary>
        return this.node().parentMember() == null;
    }

    private _setHeight(allElements: JQuery, height: number, offset: number) {
        var newHeight = Math.max(NodeViewVertical.MIN_ROW_HEIGHT - offset, height);
        allElements.outerHeight(newHeight);
    }


    private _getTotalHeight(allElements: JQuery): number {
        var totalHeight = 0;
        allElements.each((index: number, elem: Element) => {
            totalHeight += $(elem).outerHeight();
        });
        return totalHeight;
    }

    private _getMaxHeight(allElements: JQuery): number {
        var maxHeight = 0;
        allElements.each((index: number, elem: Element) => {
            var currentHeight = $(elem).outerHeight(true);
            if (currentHeight > maxHeight) {
                maxHeight = currentHeight;
            }
        });
        return maxHeight;
    }

    private _fixColumnHeaderMemberWidth(columnHeaders: JQuery, columnWidth: number) {
        if (columnHeaders.length > 0) {
            var bufferWidth = 10; // For the scenario when the WIP limit changes on hovering the card over it, say from 9 -> 10
            $.each(columnHeaders, (index: number, element: HTMLElement) => {
                var $element = $(element);
                var $header = $element.find(".member.board-column-header");
                var wipLimitWidth = $element.find(".boards-controls-limit").outerWidth(true);
                var definitionOfDoneWidth = $element.find(".icon").outerWidth(true);
                $header.css("max-width", columnWidth - (wipLimitWidth + definitionOfDoneWidth + NodeViewHorizontal.COLUMN_PADDING + NodeViewHorizontal.COLUMN_BORDER_WIDTH + bufferWidth));
            });
        }
    }

    private _fixColumnHeight() {
        var $board = $(NodeViewHorizontal.SCROLLABLE_CONTENT_CONTAINER_SELECTOR);
        var top = $board.scrollTop();
        var left = $board.scrollLeft();

        var swimlanes = $(".agile-board .member-vertical:not(:last-child)");
        var hasSplitColumn = this._$headers.find(".split").length !== 0;

        if (swimlanes.length > 0) {
            this._fixAllSwimlanesHeight(swimlanes, hasSplitColumn);
        }
        else if (hasSplitColumn) {
            this._applyContentCanvasHeight();
        }

        // ensure overflow-y is set to auto
        // because expanding checklist may have dynamically set overflow- y to hidden.
        $board.css("overflow-y", "auto");
        $board.scrollTop(top);
        $board.scrollLeft(left);
    }

    private _fixAllSwimlanesHeight(swimlanes: JQuery, hasSplitColumn: boolean) {
        var lastSwimlane = $(".agile-board .member-vertical:last-child");
        // Get swimlane header height and split column header height for later calculation.
        var laneHeaderHeight = $(".agile-board .member-vertical > .member-header:not(.swimlane-collapsed)").outerHeight();
        var splitHeaderHeight = $(".swimlane:not(.swimlane-collapsed) .split > .agile-header-container", this._$contentCanvas).height() || 0;

        if (hasSplitColumn) {
            this._fixSwimlaneHeight(swimlanes, laneHeaderHeight, splitHeaderHeight);
        }
        else {
            this._ensureSwimlaneMinHeight();
        }

        // Calculate the proper height of the last swimlane based on the total height of all the above swimlanes.
        if (this._isExpandedSwimlane(lastSwimlane, laneHeaderHeight)) {
            var totalAboveSwimlanesHeight = this._getTotalHeight(swimlanes); // Total height of all swimlanes except the last one.
            var bottomBorder = parseInt(lastSwimlane.css("border-bottom-width"), 10); // The bottom border of the last swimlane.
            var offset = totalAboveSwimlanesHeight + laneHeaderHeight + splitHeaderHeight + bottomBorder;
            this._fixLastSwimlaneHeight(lastSwimlane, offset, splitHeaderHeight);
        }
    }

    private _applyContentCanvasHeight() {
        // Revert to the original state so that we measure all heights based
        // on document flow and not based on the calculated adjusted heights.
        var $horizontalTable = $(".split > .agile-content-container > .horizontal-table", this._$contentCanvas);
        var splitHeaderHeight = $(".split > .agile-header-container", this._$contentCanvas).height();
        $horizontalTable.height("");

        // Calculate the proper height of the content area based on the total
        // height of the containing member minus the height of its header.
        var splitMemberHeight = this._$contentCanvas.outerHeight(true) - splitHeaderHeight;
        this._setHeight($horizontalTable, splitMemberHeight, splitHeaderHeight);
    }

    private _isExpandedSwimlane(swimlane: JQuery, laneHeaderHeight: number) {
        // if all swimlanes are collapsed, laneHeaderHeight is undefined
        return laneHeaderHeight && (swimlane.outerHeight() - laneHeaderHeight > 0);
    }

    private _fixSwimlaneHeight(swimlanes: JQuery, laneHeaderHeight: number, splitHeaderHeight: number) {
        var rootMemberSelector = ".cell.member-content:not(.horizontal)";
        // Revert to the original state so that we measure all heights based
        // on document flow and not based on the calculated adjusted heights.
        swimlanes.each((index: number, swimlane: Element) => {
            // Only clear height on the expanded swimlanes.
            if (this._isExpandedSwimlane($(swimlane), laneHeaderHeight)) {
                $(rootMemberSelector, swimlane).height("");
            }
        });

        // Calculate the proper height of each swimlane based on the max height
        // of the contained member content minus the height of its header.
        swimlanes.each((index: number, swimlane: Element) => {
            if (this._isExpandedSwimlane($(swimlane), laneHeaderHeight)) {
                var rootElements = $(rootMemberSelector, swimlane);
                var maxHeightInCurrentLane = this._getMaxHeight(rootElements);
                this._setHeight(rootElements, maxHeightInCurrentLane, splitHeaderHeight);
            }
        });
    }

    private _fixLastSwimlaneHeight(lastSwimlane: JQuery, offset: number, splitHeaderHeight: number = 0) {
        // Revert to the original state so that we measure all heights based
        // on document flow and not based on the calculated adjusted heights.
        var rootElements = $(".cell.member-content:not(.horizontal)", lastSwimlane);
        rootElements.height("");

        // Calculate the proper height of the last swimlane based on the total
        // height of the containing member minus the offset
        var availableHeight = this._$contentCanvas.outerHeight(true) - offset;
        this._setHeight(rootElements, availableHeight, splitHeaderHeight);
    }


    public createMemberHeaderBorders() {
        /// <summary>Creates the cell member header line. This should be called once and only once.</summary>
        var cells = $(".agile-board .cell.content:not(.split-column):not(.swimlanes)");
        cells.each((i: number, cell: Element) => {
            $(domElem("div", "member-border-line")).appendTo(cell);
            $(cell).css("position", "relative");
        });
    }

    public updateLayout() {
        /// <summary>Ensure the width of the board is conducive to viewing and managing tiles</summary>

        // On Calculating width of canvas below it adds the width of padding in it if there is any padding.
        this._$headerCanvas.css({ "padding-right": 0 });

        var collapsedColumnSelector = ".cell.collapsed";
        var singleColumnSelector = ".cell:not(.split):not(.split-column):not(.collapsed):not(.swimlanes)";
        var doubleColumnSelector = ".cell.split:not(.split-column)";
        var firstSplitColumnSelector = ".cell.split-column:nth-child(1)";
        var secondSplitColumnSelector = ".cell.split-column:nth-child(2)";

        var splitColumnHeaders = $(doubleColumnSelector, this._$headerCanvas);
        var nonSplitColumnHeaders = $(singleColumnSelector, this._$headerCanvas);

        var collapsedColumnsCount = $(collapsedColumnSelector, this._$headerCanvas).length;
        var totalLeafMembersCount = splitColumnHeaders.length * 2 + nonSplitColumnHeaders.length;
        var collapsedColumnTotalWidth = collapsedColumnsCount * NodeViewHorizontal.COLLAPSED_COLUMN_WIDTH;

        var availableWidth = this._$contentContainer.width() - scrollBarWidth;  /* _scrollBarWidth is getting subtract to remove unnecessary horizontal scroll bar */
        var boardWidth = Math.min(availableWidth, totalLeafMembersCount * NodeViewHorizontal.MAX_COLUMN_WIDTH + collapsedColumnTotalWidth) - collapsedColumnTotalWidth;
        var singleColumnWidth = totalLeafMembersCount === 0 ? 0 : Math.max(NodeViewHorizontal.MIN_COLUMN_WIDTH, Math.floor(boardWidth / totalLeafMembersCount));
        var doubleColumnWidth = singleColumnWidth === 0 ? 0 : (Math.floor(singleColumnWidth * 2) - NodeViewHorizontal.COLUMN_BORDER_WIDTH + NodeViewHorizontal.SPLIT_COLUMN_BORDER_WIDTH);

        this._fixColumnHeaderMemberWidth(splitColumnHeaders, doubleColumnWidth);
        this._fixColumnHeaderMemberWidth(nonSplitColumnHeaders, singleColumnWidth);

        splitColumnHeaders.outerWidth(doubleColumnWidth);
        nonSplitColumnHeaders.outerWidth(singleColumnWidth);

        $(doubleColumnSelector, this._$contentCanvas).outerWidth(doubleColumnWidth);
        $(singleColumnSelector, this._$contentCanvas).outerWidth(singleColumnWidth);
        $(firstSplitColumnSelector, this._$contentCanvas).outerWidth(singleColumnWidth - NodeViewHorizontal.COLUMN_BORDER_WIDTH + NodeViewHorizontal.SPLIT_COLUMN_BORDER_WIDTH);
        $(secondSplitColumnSelector, this._$contentCanvas).outerWidth(singleColumnWidth - NodeViewHorizontal.COLUMN_BORDER_WIDTH);
        $(Tile.TILE_ITEM_SELECTOR, this._$contentCanvas).css({ "width": (singleColumnWidth - NodeViewHorizontal.COLUMN_PADDING - NodeViewHorizontal.COLUMN_BORDER_WIDTH) });

        // Filling buffer width with padding
        this._$headerCanvas.css({ "padding-right": scrollBarWidth });
        this._$headerCanvas.width(<any>(totalLeafMembersCount * singleColumnWidth + collapsedColumnTotalWidth));
        this._$contentCanvas.width(<any>(totalLeafMembersCount * singleColumnWidth + collapsedColumnTotalWidth));

        this._positionContentContainer();

        // Re-adjust the heights of the splitter areas if necessary
        this._fixColumnHeight();

        this._eventsHelper.fire(NodeView.LAYOUT_UPDATED, this);
    }

    private _positionContentContainer() {
        // Ensure that top of content div is correctly set
        var paddingTop = parseInt(this.getElement().parent().css("padding-top"), 10);  /* padding-top of agile-board */
        var topPosition = this._$headerContainer.height() + paddingTop;
        this._$contentContainer.css({ "top": topPosition });
    }

    private _scrollBoardToRightEdge() {
        this._$contentContainer.scrollLeft(99999);
    }

    public scrollToTop() {
        /// <summary>NodeView OVERRIDE: Scroll the content to the top</summary>
        this._$contentContainer.scrollTop(0);
    }


    public _$addToLayout(member: Boards.BoardMember): any {
        /// <summary>Add the member to the layout.</summary>
        /// <param name="member" type="Boards.BoardMember">The member to add to the DOM.</param>
        /// <returns type="any">The container for any child nodes.</returns>
        Diag.Debug.assertParamIsType(member, Boards.BoardMember, "member");
        var layoutOptions = member.layoutOptions() || <Boards.LayoutOptions>{},
            cssClass = this.getMemberCssClass(layoutOptions),
            isSwimlane = Utils_String.ignoreCaseComparer(cssClass, "swimlanes") === 0;

        if (isSwimlane) {
            return this._$addSwimLaneMember(member);
        }
        else {
            var $memberHeaderContainer: JQuery = $(domElem("div", "cell")).addClass(cssClass);
            var $memberContent = $(domElem("div", "cell member-content member content")).addClass(cssClass);

            this._headerContentControls.push(this._createMemberHeader(member, $memberHeaderContainer));
            this._$headers[0].appendChild($memberHeaderContainer[0]);

            // Add description popup.
            if (member.description() && member.isTopLevel()) {
                this._createDescriptionPopup(member, $memberHeaderContainer, member.description());
            }

            // Enable collapse
            var expandHandler: Function;
            if (member.isCollapsible()) {
                expandHandler = this._enableCollapseAndGetExpandHandler(member, $memberHeaderContainer, $memberContent);
            }

            // NOTE: if we want the content to have position:relative then we'll need to add an internal DIV - but in IE the height:100%
            // doesn't work for DIVs inside table-cells without an explicit height - so we'll need to work around this at that stage.
            this._$contents[0].appendChild($memberContent[0]);

            return {
                header: $memberHeaderContainer,
                content: $memberContent,
                expandHandler: expandHandler
            };
        }
    }

    private _createMemberHeader(member: Boards.BoardMember, $memberContainer: JQuery): EditableLabelControl {
        return <EditableLabelControl>Controls.Control.createIn<IEditableLabelControlOptions>(
            EditableLabelControl,
            $memberContainer,
            {
                value: member.title(),
                canEdit: this.canEdit() && !(Utils_String.isEmptyGuid(member.id()) && !member.childNode()), // Doing done column headers can't be edited,
                contentCssClass: NodeViewHorizontal.MEMBER_HEADER_CONTENT_CLASS,
                cssClass: member.node().layoutStyle(),
                readOnlyHeaderPadding: NodeViewHorizontal.COLUMN_PADDING,
                editModeOffset: -10,
                onBeginSave: delegate(this, this._beginSave, member),
                validate: (newValue: string) => {
                    return member.validateName(newValue);
                },
                onEditModeStateChanged: (sender: JQuery, editModeOn: boolean) => {
                    // Hide the siblings
                    sender.siblings().toggle(!editModeOn);
                    // Reposition the content container
                    this._positionContentContainer();
                    if (editModeOn) {
                        // Log telemetry to track edit mode entry
                        Boards.KanbanTelemetry.OnColumnInlineRenameStart();
                    }
                }
                , id: member.id(),
                editableInputAriaLabel: AgileControlsResources.EditColumnNameAriaLabel,
                eventsHelper: this._eventsHelper
            } as IEditableLabelControlOptions);
    }

    private _$addSwimLaneMember(member: Boards.BoardMember): any {
        /// <summary>Add swimlane member to the layout.</summary>
        /// <param name="member" type="Boards.BoardMember">The member to add to the DOM.</param>
        /// <returns type="any">The container for any child nodes.</returns>
        Diag.Debug.assertParamIsType(member, Boards.BoardMember, "member");

        var layoutOptions = member.layoutOptions() || <Boards.LayoutOptions>{};
        var cssClass = this.getMemberCssClass(layoutOptions);

        // We could pop the header info up to the swimlane node level instead of constructing here.
        this._constructSwimlaneHeader(member);

        var $memberContent = $(domElem("div", "cell member-content member content")).addClass(cssClass);

        // NOTE: if we want the content to have position:relative then we'll need to add an internal DIV - but in IE the height:100%
        // doesn't work for DIVs inside table-cells without an explicit height - so we'll need to work around this at that stage.
        this._$contents[0].appendChild($memberContent[0]);

        return {
            content: $memberContent,
        };
    }

    private _groupByColumn(swimlanes: Boards.BoardMember[]): Boards.BoardMember[][] {
        var groupColumnMember: Boards.BoardMember[][] = [];
        swimlanes.forEach((swimlane: Boards.BoardMember, index: number) => {
            var columnMembers = swimlane.childNode().members();
            columnMembers.forEach((columnMember: Boards.BoardMember, index: number) => {
                if (!groupColumnMember[index]) {
                    groupColumnMember[index] = [];
                }
                groupColumnMember[index].push(columnMember);
            });
        });
        return groupColumnMember;
    }

    private _constructSwimlaneHeader(member: Boards.BoardMember) {
        var swimlanes = member.childNode().members();
        var columnMembers = swimlanes[0].childNode().members();
        var groupColumnMember = this._groupByColumn(swimlanes);
        this._swimlaneColumnHeaderControls = [];
        for (var i = 0, len = columnMembers.length; i < len; i++) {
            var columnMember = columnMembers[i];
            var columnLayoutOptions = columnMember.layoutOptions() || <Boards.LayoutOptions>{};
            var columnCssClass = this.getMemberCssClass(columnLayoutOptions);
            var $columnMemberHeaderContainer: JQuery = $(domElem("div", "cell")).addClass(columnCssClass);
            var headerContentControl = this._createMemberHeader(columnMember, $columnMemberHeaderContainer);

            var limits: Boards.MemberLimit = columnMember.limits();
            if (limits) {
                <LimitDisplay>Controls.Control.createIn(LimitDisplay, $columnMemberHeaderContainer, {
                    limit: limits.limit,
                    source: groupColumnMember[i],
                    exceedHighlight: headerContentControl.getMemberHeader()
                });
            }
            this._swimlaneColumnHeaderControls.push(headerContentControl);
            // we need to add the additional DIV wrapper since elements with display:table-cell can't strictly have position:relative
            this._$headers[0].appendChild($columnMemberHeaderContainer[0]);
            // Add description popup.
            if (columnMember.description()) {
                this._createDescriptionPopup(columnMember, $columnMemberHeaderContainer, columnMember.description());
            }
        }
    }

    private _beginSave(newName: string, member: Boards.BoardMember): IPromise<boolean> {
        var deferred = Q.defer<boolean>();
        var originalName = member.title();
        member.beginUpdateTitle(newName).then(
            (result: boolean) => {
                this._eventsHelper.fire(NodeViewHorizontal.COLUMN_RENAMED, this, { originalName: originalName, newName: newName, id: member.id() } as IMemberHeaderChangingArguments);
                deferred.resolve(result);
            },
            (error: {
                message: string;
                serverError: any;
            }) => {
                this._eventsHelper.fire(NodeView.SERVER_ERROR_ON_RENAME, Utils_String.htmlEncode(error.message), Notifications.MessageAreaType.Error);
                deferred.reject(error);
            });
        return deferred.promise;
    }

    private _ensureSwimlaneMinHeight() {
        $(".agile-board .swimlane > .agile-content-container > .horizontal-table").each((index: number, elem: HTMLElement) => {
            var $elem = $(elem);
            if ($elem.outerHeight(true) < NodeViewVertical.MIN_ROW_HEIGHT) {
                $elem.outerHeight(NodeViewVertical.MIN_ROW_HEIGHT);
            }
        });
    }

    private _buildLocalSettingPathForCollapse(member: Boards.BoardMember): string {
        var rootMember = member.getRootMember();
        return NodeViewHorizontal.COLLAPSECOLUMN_ACTION_SETTING_KEY + "_" + member.node().board().id() + "_" + rootMember.id();
    }

    private _enableCollapseAndGetExpandHandler(member: Boards.BoardMember, $headerContainer: JQuery, $contentContainer: JQuery): Function {
        var columnTitle = member.values()[0];

        var $expandCollapseLink = $("<i>")
            .addClass("bowtie-icon bowtie-chevron-left")
            .attr("tabindex", "0")
            .attr("role", "button")
            .attr("aria-label", Utils_String.format(AgileControlsResources.Board_CollapseColumn_AriaLabel, columnTitle))
            .appendTo($headerContainer);
        var $collapsedLabel = $("<h2>").addClass("label").text(columnTitle).appendTo($contentContainer);

        // Ensure any keyboard tab navigation fixes up header/content alignment
        $("[tabindex]", $headerContainer).on("focus blur", () => {
            Utils_Core.delay(this, 0, () => {
                this._$contentContainer.scrollLeft(this._$headerContainer.scrollLeft());
            });
        });

        var fixRenderingAndSave = (persist: boolean, isCollapsed: boolean) => {
            this.updateLayout();
            this._eventsHelper.fire(Boards.Notifications.BoardHeightChanged);
            this._eventsHelper.fire(Boards.Notifications.BoardRedraw);

            if (persist) {
                Service.getLocalService(Settings.LocalSettingsService).write(this._buildLocalSettingPathForCollapse(member), isCollapsed);
            }

            // isPageLoad=true => Telemetry is written on page load, for the purpose knowing if people 'keep' the column collapsed rather than just playing with it
            // isPageLoad=false => Teletmetry is written on user interatcion toggle expand/collapse, for the purpose how often people are playing with the feature.
            Boards.KanbanTelemetry.OnExpandCollapseColumn(isCollapsed, member.rootColumnType(), !persist);
        };

        var collapseExpandHandler = (eventData: JQueryEventObject, persist: boolean = true) => {
            if ((eventData === undefined) ||
                (eventData.type === "click") ||
                (eventData.type === "keypress"
                    && (eventData.keyCode === Utils_UI.KeyCode.ENTER || eventData.keyCode === Utils_UI.KeyCode.SPACE))) {

                $([$headerContainer, $contentContainer]).toggleClass("collapsed");
                var isCollapsed = $headerContainer.hasClass("collapsed");
                if (isCollapsed) {
                    $collapsedLabel.text(columnTitle);
                    $contentContainer.click(collapseExpandHandler);
                    $expandCollapseLink.attr("aria-label", Utils_String.format(AgileControlsResources.Board_ExpandColumn_AriaLabel, columnTitle));
                    $expandCollapseLink.removeClass("bowtie-chevron-left");
                    $expandCollapseLink.addClass("bowtie-chevron-right");
                }
                else {
                    $contentContainer.off("click");
                    $expandCollapseLink.attr("aria-label", Utils_String.format(AgileControlsResources.Board_CollapseColumn_AriaLabel, columnTitle));
                    $expandCollapseLink.removeClass("bowtie-chevron-right");
                    $expandCollapseLink.addClass("bowtie-chevron-left");

                    if (member.isOutgoing()) {
                        this._scrollBoardToRightEdge();
                    }
                }
                fixRenderingAndSave(persist, isCollapsed);
            }
        };

        $expandCollapseLink.on("click keypress", collapseExpandHandler);

        var isCollapsed = Service.getLocalService(Settings.LocalSettingsService).read<boolean>(this._buildLocalSettingPathForCollapse(member), false);
        if (isCollapsed === true) {
            collapseExpandHandler(undefined, false);
        }
        else {
            // Still need write the telemetry
            Boards.KanbanTelemetry.OnExpandCollapseColumn(false, member.rootColumnType(), true);
        }

        // The handler returned will be used to perfom expand operation when card moves to collapsed column
        return collapseExpandHandler;
    }

    private _createDescriptionPopup(member: Boards.BoardMember, $container: JQuery, content: string) {
        /// <summary>Create description popup.</summary>
        /// <param name="$container">The member header element.</param>
        /// <param name="content">The description content.</param>
        var $description = $("<span>").addClass("bowtie-icon bowtie-status-info-outline  description")
            .attr("tabindex", "0")
            .attr("role", "button")
            .attr("aria-label", Utils_String.format(AgileControlsResources.Board_DefinitionOfDoneIcon_AriaLabel, member.title()))
            .appendTo($container)
            .css({ "cursor": "pointer" })
            .keydown((e?: JQueryEventObject) => {
                if (e.keyCode === Utils_UI.KeyCode.ENTER
                    || e.keyCode === Utils_UI.KeyCode.SPACE) {
                    $description.click();
                }
            });

        var telemetry = () => {
            Boards.KanbanTelemetry.publish(Boards.KanbanTelemetry.KANBAN_DEFINITION_OF_DONE, { "Action": "Click" });
        };
        $description.bind("click", telemetry);

        Controls.Enhancement.enhance(DescriptionPopup, $description, {
            markdown: content,
            parent: $description
        });
    }

    public enableSynchronizedScrollingBetweenHeaderAndContent() {
        ///<summary> synchronizing scrolling between header and content. </summary>
        this._$headerContainer.scrollLeft(this._$contentContainer.scrollLeft());
    }

    public getMemberCssClass(layoutOptions: Boards.LayoutOptions): string {
        /// <summary>Gets css classes for the member based on its layout options</summary>
        /// <param name="layoutOptions" type="Object">Layout options</param>
        /// <returns type="String">The css classes.</returns>
        return layoutOptions.cssClass || "";
    }
}

nodeViewTypeFactory.registerConstructor(NodeViewHorizontal.layoutStyle, NodeViewHorizontal);

class NodeViewVertical extends NodeView {

    public static layoutStyle: string = "vertical";
    private static COLLAPSE_ROW_ACTION_SETTING_KEY = "CollapseRowAction";
    public static MIN_ROW_HEIGHT = 155;
    public static CHEVRON_CSS_SELECTOR = ".swimlane-expand-collapse-chevron"

    private _headerContentControls: EditableLabelControl[] = [];

    public _$addToLayout(member: Boards.BoardMember): any {
        /// <summary>Add the member to the layout.</summary>
        /// <param name="member" type="Boards.BoardMember">The member to add to the DOM.</param>
        /// <returns type="any">The container for any child nodes.</returns>
        Diag.Debug.assertParamIsType(member, Boards.BoardMember, "member");
        var layoutOptions = member.layoutOptions() || <Boards.LayoutOptions>{};
        var cssClass = this.getMemberCssClass(layoutOptions);
        var $memberHeader = $(domElem("div", "member-header"));
        var $memberContent = $(domElem("div", "member-content " + cssClass));
        var $container = $(domElem("div", "member-vertical"));
        var $iconElement = $(domElem("div", "bowtie-icon bowtie-chevron-up swimlane-expand-collapse-chevron"));
        $iconElement.appendTo($memberHeader)
            .attr("tabIndex", 0)
            .attr("role", "button")
            .attr("aria-label", Utils_String.format(AgileControlsResources.CollapseSwimlane, member.title()));

        var $memberHeaderContent: JQuery = $("<div>").addClass("swimlane-member-header"); // Wrapper for the content that will be toggled during edit mode
        var headerContentControl = <EditableLabelControl>Controls.Control.createIn<IEditableLabelControlOptions>(
            EditableLabelControl,
            $memberHeaderContent,
            {
                value: member.title(),
                canEdit: this.canEdit(),
                contentCssClass: "swimlane-header-title",
                cssClass: member.node().layoutStyle(),
                onBeginSave: (newValue: string) => { return this._beginSave(member, newValue); },
                validate: (newValue: string) => {
                    return member.validateName(newValue, Utils_String.isEmptyGuid(member.id()));
                },
                onEditModeStateChanged: (sender: JQuery, editModeOn: boolean) => {
                    if (editModeOn) {
                        // Log telemetry to track edit mode entry
                        Boards.KanbanTelemetry.OnLaneInlineRenameStart();
                    }
                },
                editableInputAriaLabel: AgileControlsResources.EditSwimlaneNameAriaLabel,
                eventsHelper: this._eventsHelper
            } as IEditableLabelControlOptions);

        this._headerContentControls.push(headerContentControl);

        $memberHeader[0].appendChild($memberHeaderContent[0]);

        // Add Header Summary
        member.childNode().members().forEach((childMember: Boards.BoardMember, index: number) => {
            Controls.Control.create(MemberCounter, $memberHeader, {
                source: childMember,
                showTitle: true,
                cssClass: "swimlane-header-detail-count"
            });
        });

        // Apply default lane header style
        if (Utils_String.isEmptyGuid(member.id())) {
            $memberHeader.addClass("default");
        }

        var expand = () => {
            $memberHeader.removeClass("swimlane-collapsed");
            $memberContent.removeClass("swimlane-collapsed");
            $iconElement.removeClass("bowtie-chevron-down");
            $iconElement.addClass("bowtie-chevron-up");
            $iconElement.attr("aria-label", Utils_String.format(AgileControlsResources.CollapseSwimlane, member.title()));
            this._persistCollapsedStateInLocalStorage(true, member, false);
        };

        // Make MemberHeader droppable, delay the initialize of droppable to improve load performance.
        Utils_Core.delay(this, 0, () => {
            $memberHeader.droppable({
                scope: TFS_Agile.DragDropScopes.WorkItem,
                tolerance: "pointer",
                hoverClass: "agileDragTargetHoverColor",
                drop: (event: JQueryEventObject, ui: any) => {
                    this._dropOnLaneHeader(event, ui, { expand: expand, member: member });
                }
            });
        });

        // Enable collapse
        var collapseExpandHandler = this._createCollapseExpandHandler(member, $memberHeader, $memberContent, $iconElement);

        var isCollapsed = Service.getLocalService(Settings.LocalSettingsService).read<boolean>(this._buildLocalSettingPathForCollapse(member), false);
        if (isCollapsed === true) {
            collapseExpandHandler(undefined, false);
        }

        member.attachEvent(Boards.Notifications.BoardExpandMember, expand);

        $container[0].appendChild($memberHeader[0]);
        $container[0].appendChild($memberContent[0]);

        this.getElement()[0].appendChild($container[0]);

        return {
            header: $memberHeader,
            content: $memberContent
        };
    }

    public getMemberCssClass(layoutOptions: Boards.LayoutOptions): string {
        /// <summary>Gets css classes for the member based on its layout options</summary>
        /// <param name="layoutOptions" type="Object">Layout options</param>
        /// <returns type="String">The css classes.</returns>
        return layoutOptions.cssClass || "";
    }

    public dispose() {
        if (this._headerContentControls && this._headerContentControls.length > 0) {
            this._headerContentControls.forEach((headerControl: EditableLabelControl) => {
                headerControl.dispose();
            });
            this._headerContentControls = [];
        }
        super.dispose();
    }

    private _beginSave(member: Boards.BoardMember, newValue: string): IPromise<boolean> {
        var deferred = Q.defer<boolean>();
        member.beginUpdateTitle(newValue).then(
            (result: boolean) => { deferred.resolve(result); },
            (error: {
                message: string;
                serverError: any;
            }) => {
                this._eventsHelper.fire(NodeView.SERVER_ERROR_ON_RENAME, Utils_String.htmlEncode(error.message), Notifications.MessageAreaType.Error);
                deferred.reject(error);
            });
        return deferred.promise;
    }

    private _buildLocalSettingPathForCollapse(member: Boards.BoardMember): string {
        return NodeViewVertical.COLLAPSE_ROW_ACTION_SETTING_KEY + "_" + member.node().board().id() + "_" + member.id();
    }

    private _createCollapseExpandHandler(member: Boards.BoardMember, $headerContainer: JQuery, $contentContainer: JQuery, $icon: JQuery) {
        var collapseExpandHandler = (eventData: JQueryEventObject, persist: boolean = true) => {
            if (eventData === undefined ||
                (eventData.type === "click") ||
                (eventData.type === "keypress"
                    && (eventData.keyCode === Utils_UI.KeyCode.ENTER || eventData.keyCode === Utils_UI.KeyCode.SPACE))) {
                $([$headerContainer, $contentContainer]).toggleClass("swimlane-collapsed");
                var isCollapsed = $headerContainer.hasClass("swimlane-collapsed");
                if (isCollapsed) {
                    $icon.addClass("bowtie-chevron-down");
                    $icon.removeClass("bowtie-chevron-up");
                    $icon.attr("aria-label", Utils_String.format(AgileControlsResources.ExpandSwimlane, member.title()));
                }
                else {
                    $icon.addClass("bowtie-chevron-up");
                    $icon.removeClass("bowtie-chevron-down");
                    $icon.attr("aria-label", Utils_String.format(AgileControlsResources.CollapseSwimlane, member.title()));
                    // Set the focus on the first tile in the lane, if expanded via keyboard interaction.
                    // Otherwise, the exapand/collapse all keyboard shortcut causes the board to scroll.
                    if (eventData && eventData.type === "keypress") {
                        const currentMemberView = this._getMemberViewById(member.id());
                        if (currentMemberView) {
                            const $tiles = currentMemberView.getElement().find(Tile.VISIBLE_TILE_ITEM_SELECTOR);
                            if ($tiles.length > 0) {
                                $tiles.first().focus();
                            }
                        }
                    }
                }

                if (eventData) {
                    eventData.preventDefault();
                    eventData.stopPropagation();
                }

                this._eventsHelper.fire(Boards.Notifications.BoardHeightChanged);
                this._persistCollapsedStateInLocalStorage(persist, member, isCollapsed);
            }
        };

        $headerContainer.on("click keypress", collapseExpandHandler);
        return collapseExpandHandler;
    }

    private _persistCollapsedStateInLocalStorage(persist: boolean, member: Boards.BoardMember, isCollapsed: boolean) {
        if (persist) {
            Service.getLocalService(Settings.LocalSettingsService).write(this._buildLocalSettingPathForCollapse(member), isCollapsed);
        }
    }

    /* Below are swimlane specific method, they should not sit on NodeViewVertical,
       We need to move them to customized node view (SwimlaneNodeView) when refactor.*/
    private _dropOnLaneHeader(event: JQueryEventObject, ui: any, context: { expand: IArgsFunctionR<void>; member: Boards.BoardMember; }) {
        var $tile = ui.draggable;
        var id = Tile.getId($tile);
        if (id === undefined || id === null) {
            return;
        }
        var tile: Tile = this._options.tileMap.get(id);
        var sourceMember = tile.currentMember(); // The member where the draggable tile comes from
        var metadata = sourceMember.metadata() ? sourceMember.metadata() : sourceMember.node().parentMember().metadata();
        var currentMemberView = this._getMemberViewById(context.member.id());
        switch (metadata.boardColumnType.toLowerCase()) {
            case Boards.BoardColumnType.INCOMING:
                // It the tile is from incoming column, we place the tile to the first column, which is the left most column
                var first = currentMemberView.getLeftMostLeafMemberView();
                if (first) {
                    context.expand();
                    first.droppableDrop(event, ui, true);
                }
                break;
            case Boards.BoardColumnType.INPROGRESS:
                // If the tile is from another swimlane, we place the tile to the same column as in the original swimlane
                var fieldUpdates = sourceMember.getFieldUpdateList(true);
                this._updateMemberFieldValue(fieldUpdates, this.node().fieldName(), context.member.values()[0]);
                // Need to reverse the fieldUpdates param for findMemberViewByFieldValues because the fieldUpdates we get is in reverse order from sourceMember upto root node.
                var destMemberView = NodeView.findMemberViewByFieldValues(fieldUpdates.reverse());// this.getMatchedChildMemberByPairs(fieldUpdates); // Find the matched member view by pairs of fieldNames and fieldValues
                if (destMemberView) {
                    context.expand();
                    destMemberView.droppableDrop(event, ui, true);
                }
                break;
            case Boards.BoardColumnType.OUTGOING:
                // It the tile is from outgoing column, we place the tile to the last column, which is the right most column
                var last = currentMemberView.getRightMostLeafMemberView();
                if (last) {
                    context.expand();
                    last.droppableDrop(event, ui, true);
                }
                break;
        }
    }

    private _getMemberViewById(id: string): MemberView {
        if (this.memberViews()) {
            for (var i = 0, len = this.memberViews().length; i < len; i++) {
                var view = this.memberViews()[i];
                var memberId = view.member().id();
                if (Utils_String.ignoreCaseComparer(memberId, id) === 0) {
                    return view;
                }
            }
        }
        return null;
    }

    private _updateMemberFieldValue(pairs: Boards.FieldNameValuePair[], fieldName: string, fieldValue: string) {
        /// <summary>Update the pair with the same fieldName to the passed fieldValue.</summary>
        /// <param name="pairs" type="array" elementType=FieldNameValuePair">A set of fieldName and fieldValue</param>
        /// <param name="fieldName" type="string">The field name</param>
        /// <param name="fieldValue" type="string">This field value</param>
        for (var i = 0, len = pairs.length; i < len; i++) {
            if (Utils_String.ignoreCaseComparer(pairs[i].fieldName, fieldName) === 0) {
                pairs[i] = {
                    fieldName: fieldName,
                    fieldValue: fieldValue
                };
                break;
            }
        }
    }
}

nodeViewTypeFactory.registerConstructor(NodeViewVertical.layoutStyle, NodeViewVertical);

/// <summary>Describes the board load state.</summary>
export enum BoardLoadState {
    NOT_LOADED,

    LOADING,

    LOADED,
    NOT_READY,
    LOAD_FAILED,
    LOAD_TIMED_OUT,
    INVALID_SETTINGS
}

class ManageBoardsView extends Navigation.NavigationView {

    public static CoreCssClass: string = "boards-backlog-view";
    private _sprintView: AgileControls.SprintViewControl;

    constructor(options?: any) {
        /// <summary>Manages the coordination of objects in the board view.</summary>
        /// <param name="options" type="Object">Control options.</param>

        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: ManageBoardsView.CoreCssClass
        }, options));
    }

    /** Initialize the control */
    public initialize() {
        // get the drag-drop options for the tree controls
        var treeOptions = this._getTreeOptions();

        // Create the sprint view tree
        this._sprintView = <AgileControls.SprintViewControl>Controls.Enhancement.enhance(AgileControls.SprintViewControl, ".team-iteration-view", treeOptions);

        // Create the backlog view tree
        <AgileControls.BacklogViewControl>Controls.Enhancement.enhance(AgileControls.BacklogViewControl, ".team-backlog-view", treeOptions);
    }

    private _acceptDroppableHandler($element: JQuery, $droppedElement: JQuery): boolean {
        let workItemTypes = [Tile.getType($element)];

        // areAllItemsOwned can be set to true, since all tiles in the kanban board will be owned (part of current area path).
        // Since we currently do not support drag/drop of child items of the tiles from the board,
        // we don't have to check if these child items are owned by the current kanban board or not.
        return this._sprintView.isValidDropTargetForWorkItemTypes($droppedElement, workItemTypes, true);
    }

    private _getTreeOptions() {
        /// <summary>Creates the options to be used by the sprint view to enable dropping of work items.</summary>
        var that = this;
        return {
            droppable: {
                scope: TFS_Agile.DragDropScopes.WorkItem,  // Match the scope of the draggable items in the grid.
                hoverClass: "dragHover",
                accept: function ($element) {
                    var $this = $(this);
                    return that._acceptDroppableHandler($element, $this);
                },
                drop: function (event, ui) { // NOTE: This needs to stay a 'function' and not a lambda because we need the 'this' value at call time
                    var treeNode: TreeView.TreeNode = $(this).data("nodeData");
                    var iterationPath = treeNode.iterationPath;
                    var $tile = ui.draggable;
                    var workItemId = Tile.getId($tile);
                    var moveToIterationHelper: AgileUtils.MoveToIterationHelper = new AgileUtils.MoveToIterationHelper();

                    moveToIterationHelper.moveToIteration([workItemId], iterationPath, CustomerIntelligenceConstants.CustomerIntelligencePropertyValue.VIEWTYPE_KANBAN);
                },
                tolerance: "pointer"
            }
        };
    }

}

if (!BoardsHubHelper.isXHRHub()) {
    // By registering ManageBoardsView before BoardView results in the order of keyboard shortcut registered.
    // ManageBoardsView class will register Work keyboard shortcut group first, AgileShortcutGroup.
    // Then BoardView class will register Kanban keyboard shortcut group, BoardShortcutGroup.
    VSS.classExtend(ManageBoardsView, TFS_Host_TfsContext.TfsContext.ControlExtensions);

    Controls.Enhancement.registerEnhancement(ManageBoardsView, "." + ManageBoardsView.CoreCssClass);
}

export interface IBoardViewOptions {
    team: ITeam;
    getBoardModel(): Boards.BoardModel;
    eventScopeId: string;
    signalRHubUrl: string;
}

export class BoardView extends Controls.Control<IBoardViewOptions> {
    public static uniqueattributeName = "data-uid";
    public static enhancementTypeName: string = "tfs.agile.board.controls.board";
    public static BOARD_VIEW_SELECTOR: string = ".agile-board";
    public static KANBAN_BOARD_ARIA_DESCRIBEDBY_ID: string = "kanban-board-aria-describedby-id";
    public static KANBAN_BOARD_PAGE_TITLE_ID: string = "board-page-title-id";

    private static _redrawBoardInChromeInterval = 50;
    private static _invalidColumnsFWLink = "https://go.microsoft.com/fwlink/?LinkId=286303";
    private static _boardType = AgileUtils.BoardType.Kanban;

    public static coreCssClass: string = "agile-board";

    private _boardStatusIndicator: StatusIndicator.StatusIndicator;
    private _board: Boards.Board;
    protected _messageArea: Notifications.MessageAreaControl;
    private _$topNodeView: JQuery;
    private _filterBar: BoardFiltering_NO_REQUIRE.BoardFilterBar;
    protected _loadState: BoardLoadState = BoardLoadState.NOT_LOADED;    // For testability purposes only.
    private _commonSettingsRegistered: boolean;
    private _boardShortcutGroup: BoardShortcutGroup;
    private _showChecklistShortcut: boolean;
    private _checklistShortcutGroup: ChecklistShortcutGroup;
    private _boardHub: BoardAutoRefreshHub_NO_REQUIRE.KanbanBoardHub;
    private _boardSettings: Boards.IBoardSettings;
    private _boardCardSettings: Cards.IBoardCardSettings;
    private _currentFilter: FilterState;
    private _filterStateManager: FilterStateManager;
    private _teamPerimssions: TeamServices.ITeamPermissions;
    private _reorderManager: TFS_Agile.IReorderManager;
    private _legacyToolbarHelper: BoardToolbar.LegacyBoardToolbarHelper;
    private _rootNodeView: NodeView;
    private _annotationColorElements: JQuery[] = [];

    // Functions and delegates
    private _redrawBoardInChromeHandler: Function;
    private _refreshBoardDelegate: IArgsFunctionR<boolean>;
    private _setMessageDelegate: IArgsFunctionR<any>;
    private _setFatalErrorDelegte: IArgsFunctionR<any>;
    private _setTransitionStateErrorDelegate: IArgsFunctionR<any>;
    private _boardMessageDisplayDelegate: IArgsFunctionR<any>;
    private _measureAndUpdateSwimlaneHeadersDelegate: Function;
    private _deleteItemsEventDelegate: Function;
    private _boardMembersDataSetCompleteInquiryDelegate: Function;
    private _boardAutoRefreshEnabledDelegate: Function;
    private _boardAutoRefreshDisabledDelegate: Function;
    private _commonSettingsChangeEventHandlerDelegate: IArgsFunctionR<void>;
    private _signalRConnectionRevivedEventHandlerDelegate: IArgsFunctionR<void>;
    private _visibilityChangeEventHandlerDelegate: IArgsFunctionR<void>;
    private _updateLayoutDelegate: Function;
    private _afterNewItemEditedDelegate: Function;
    private _onContainerChange: () => void;

    // Set browser tab inactive time threshold to 15 minutes.
    private _browserTabInactiveTimeInMillseconds: number = 15 * 60 * 1000;
    private _signalRDisconnectTimer: number = -1;

    // for telemetry
    private _isInitialLoad: boolean;

    // MemberGraph for navigation of members in a board
    private _memberNavigationGraph: MemberNavigationGraph;
    private _reconstructMemberGraphDelegate: Function;

    public eventsHelper: ScopedEventHelper;

    constructor(options?: IBoardViewOptions) {
        /// <summary>UI Control to display a board.</summary>
        /// <param name="options" type="Object">Control options.</param>

        super(options);
        Diag.Debug.assert(!!options.eventScopeId, "event scope should be specified.");
        this.eventsHelper = new ScopedEventHelper(this._options.eventScopeId);
        registerCommonTemplates();

        this._reorderManager = new TFS_Agile.ReorderManager(this._options.team.id);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            coreCssClass: BoardView.coreCssClass,
            role: 'group',
            ariaAttributes: {
                describedby: BoardView.KANBAN_BOARD_ARIA_DESCRIBEDBY_ID,
                labelledby: BoardView.KANBAN_BOARD_PAGE_TITLE_ID
            }
        }, options));
    }

    public initialize() {
        /// <summary>Initialize the control.</summary>
        this._isInitialLoad = true;
        this._commonSettingsRegistered = false;
        this._loadBoard();

        if (this._loadState === BoardLoadState.LOADED) {
            this._updateLayoutDelegate = delegate(this, this._updateLayout);
            this._bind(window, "resize", this._updateLayoutDelegate);

            this._attachReorderRequestComplete();
            this._ensureChecklistShortcutGroup();
            this._boardShortcutGroup = new BoardShortcutGroup(this);

            // isChrome check is not working with IE 11 on Windows 10 (i.e. _redrawBoardInChrome will be executed for both Chrome and IE 11 on Windows 10)
            // Technically we only need to do this trick for Chrome but since it's running for IE 11 on Windows 10, we need to ensure this trick
            // doesn't break anything with IE 11 on Windows 10.
            if (Utils_UI.BrowserCheckUtils.isChrome()) {
                this._redrawBoardInChromeHandler = Utils_Core.throttledDelegate(this, BoardView._redrawBoardInChromeInterval, this._redrawBoard);
                this.eventsHelper.attachEvent(Boards.Notifications.BoardRedraw, () => { this._redrawBoardInChrome(); });
            }

            // Initialize filter control if the current view is not in the new xhr hub
            if (!BoardsHubHelper.isXHRHub()) {
                this._initializeFilterControl();
            }

            if (!isFilterStateEmpty(this._currentFilter)) {
                this._applyFilter();
            }

            this.focusFirstTileOnBoard();
            this._setOnBeforeUnload();
            this._ensureUrlContext();
            this._initializeToolbarHelper(
                this.getBoardId(),
                this.getAutoRefreshState(),
                this.getExtensionId(),
                this.eventsHelper);
        }
        else if (this._loadState === BoardLoadState.NOT_READY) {
            // We polling the board model until it is ready.
            this._tryLoadBoard();
        }
    }

    private _initializeToolbarHelper(
        boardId: string,
        initialAutoRefreshState: boolean,
        boardExtensionId: string,
        eventsHelper: ScopedEventHelper): void {

        if (!BoardsHubHelper.isXHRHub()) {
            //  Initialize and add the board's toolbar.
            let toolbarOptions: BoardToolbar.ILegacyBoardToolbarOptions = {
                boardId: boardId,
                initialAutoRefreshState: initialAutoRefreshState ?
                    BoardAutoRefreshCommon.AutoRefreshState.ENABLED :
                    BoardAutoRefreshCommon.AutoRefreshState.DISABLED,
                boardExtensionId: boardExtensionId,
                eventsHelper: eventsHelper,
                team: this._options.team
            };

            this._legacyToolbarHelper = new BoardToolbar.LegacyBoardToolbarHelper(toolbarOptions);
        }
    }

    private _ensureUrlContext() {
        if (BoardsHubHelper.isXHRHub()) {
            return;
        }

        const backlogContext = TFS_Agile.BacklogContext.getInstance();
        if (backlogContext.updateUrlActionAndParameter) {
            NavigationUtils.rewriteBacklogsUrl(NavigationUtils.boardPageAction, backlogContext.level.name);
        }
        else {
            NavigationUtils.rememberMruHub();
        }
    }

    private _tryLoadBoard() {
        let retryAction = (sucessCallback: IResultCallback, errorCallback: IErrorCallback) => {
            Boards.Board.beginGetModel(this._options.team.id, sucessCallback, errorCallback);
        };
        let shouldStopCallback = (model: Boards.BoardModel) => {
            if (model.notReady) {
                return false;
            }
            // In the new hubs receiving the board model affects the disabled state of buttons. Reload the whole page.             
            window.location.reload();
            return true;
        };
        let handleError = () => {
            this._setMessage(Utils_String.htmlEncode(AgileControlsResources.Board_LoadingTakingTooLong), Notifications.MessageAreaType.Error);
        };

        let delayInterval = 2000;
        let maxAtempt = 30;
        let initialDelay = 0;

        Utils_Core.poll(retryAction, delayInterval, maxAtempt, initialDelay, shouldStopCallback, handleError);
    }

    public dispose() {
        // These methods should be called before board is disposed
        this._cleanupBoard();
        this._teardownAutoRefresh();

        if (this._board) {
            this._board.dispose();
            this._board = null;
        }

        for (const previewIcon of this._annotationColorElements) {
            AgileUtils.ControlUtils.disposeColorElement(previewIcon[0]);
        }
        this._annotationColorElements = [];

        if (this._boardShortcutGroup) {
            this._boardShortcutGroup.dispose();
            this._boardShortcutGroup = null;
        }
        if (this._checklistShortcutGroup) {
            this._checklistShortcutGroup.dispose();
            this._checklistShortcutGroup = null;
        }
        if (this._memberNavigationGraph) {
            this._memberNavigationGraph.dispose();
            this._memberNavigationGraph = null;
        }

        if (this._reconstructMemberGraphDelegate) {
            this.eventsHelper.detachEvent(Boards.Notifications.BoardLayoutUpdated, this._reconstructMemberGraphDelegate);
            this._reconstructMemberGraphDelegate = null;
        }

        this._detachCommonConfigurationRegistration();
        this._detachVisibilityChangedHandler();
        this._clearRefreshNotification();
        clearTimeout(this._signalRDisconnectTimer);

        if (this._filterBar) {
            this._filterBar.dispose();
            this._filterBar = null;
        }

        if (this._updateLayoutDelegate) {
            this._unbind(window, "resize", this._updateLayoutDelegate);
            this._updateLayoutDelegate = null;
        }

        if (this._legacyToolbarHelper) {
            this._legacyToolbarHelper.dispose();
            this._legacyToolbarHelper = null;
        }

        if (this._afterNewItemEditedDelegate) {
            this.eventsHelper.detachEvent(MemberView.ADD_NEW_BOARD_ITEM, this._afterNewItemEditedDelegate);
            this._afterNewItemEditedDelegate = null;
        }

        this._$topNodeView = null;
        if (this._rootNodeView) {
            this._rootNodeView.dispose();
            this._rootNodeView = null;
        }

        if (this.eventsHelper) {
            this.eventsHelper.dispose();
            this.eventsHelper = null;
        }

        if (this._reorderManager) {
            this._reorderManager.dispose();
            this._reorderManager = null;
        }

        super.dispose();
        //Ideally the super class be setting _options to null but various other controls e.g. Menu start failing as soon as I do it.
        this._options = null;
    }

    /**
     *  Set focus on the first tile in the Board
     */
    public focusFirstTileOnBoard() {
        var firstTile: Tile = this._returnFirstTileInBoard();

        if (firstTile) {
            firstTile.focus();
        }
        else {
            // no tiles exist - set the focus to the add new item card
            let firstBoardAddCard = this._returnFirstBoardAddCard();
            if (firstBoardAddCard) {
                firstBoardAddCard.focus();
            }
        }
    }

    /**
     *  Returns all the member views which can contain tiles, in the current board view
     */
    public getAllLeafMemberViewsInElement(): MemberView[] {
        var nodeView = <NodeView>Controls.Enhancement.getInstance(NodeView, this._$topNodeView);
        if (nodeView) {
            return nodeView.getAllLeafMemberViewsInElement();
        }
        return null;
    }

    /**
     *  Returns the top node view in the board view
     */
    public getTopNodeView(): JQuery {
        return this._$topNodeView;
    }

    /**
     *  Returns the member graph of the board view
     */
    public getMemberGraph(): MemberNavigationGraph {
        if (!this._memberNavigationGraph) {
            this._memberNavigationGraph = new MemberNavigationGraph(this.getAllLeafMemberViewsInElement(),
                this._board.getBoardSettings().rows.length,
                this._board.getBoardSettings().columns.length);

            this._reconstructMemberGraphDelegate = (boardView: BoardView, boardSettings: Boards.IBoardSettings) => {
                boardView.getMemberGraph().reconstructMemberGraph(
                    boardView.getAllLeafMemberViewsInElement(),
                    boardSettings.rows.length,
                    boardSettings.columns.length);
            }

            // registering for recreating tree on any layout update
            this.eventsHelper.attachEvent(Boards.Notifications.BoardLayoutUpdated, this._reconstructMemberGraphDelegate);
        }
        return this._memberNavigationGraph;
    }

    /**
     *  Returns the board's id.
     */
    public getBoardId(): string {
        if (this._board) {
            return this._board.id();
        }

        return null;
    }

    /**
     *  Returns the board's extension id.
     */
    public getExtensionId(): string {
        if (this._board) {
            return this._board.getBoardSettings().extensionId;
        }

        return null;
    }

    /**
     *  Returns the auto-refresh state from the board's settings.
     */
    public getAutoRefreshState(): boolean {
        if (this._board) {
            return this._board.getBoardSettings().autoRefreshState;
        }

        return null;
    }

    /**
     * Shows and focuses the filter bar.
     */
    public activateFilter() {
        if (!this._filterBar) {
            this._buildFilterBar(/* ShouldShowFilterBar */ true, /* FocusOnLoad */ true);
        } else {
            this._showFilter(/* Focus */ true);
        }
    }

    /** 
     * Get current board's itemSource
     */
    public getCurrentBoardItemSource(): Boards.ItemSource {
        const board = this.board();
        return board ? board.getItemSource() : null;
    }

    /** 
     * Get current board's rootNode
     */
    public getCurrentBoardRootNode(): Boards.BoardNode {
        const board = this.board();
        return board ? board.rootNode() : null;
    }

    private _ensureChecklistShortcutGroup() {
        if (this._showChecklistShortcut) {
            if (!this._checklistShortcutGroup) {
                this._checklistShortcutGroup = new ChecklistShortcutGroup(this.eventsHelper);
            }
            else {
                this._checklistShortcutGroup.registerShortcuts();
            }
        }
        else {
            if (this._checklistShortcutGroup) {
                this._checklistShortcutGroup.unRegisterShortcuts();
            }
        }
    }

    private _isAnnotationEnabled(id: string, annotationRules: Cards.IStyleRule[]): boolean {
        const rule = annotationRules.filter((item) => Utils_String.equals(item.name, id, true)).shift();
        return !rule ? true : rule.isEnabled;
    }

    private _populateAnnotationSettings(annotationRules: Cards.IStyleRule[]): Boards.IAnnotationSettings[] {
        // Annotation Settings shall be fetched from boardConfiguration
        // when Board Settings for annotations is introduced.

        var annotationSettings: Boards.IAnnotationSettings[] = [];

        // TODO: Verify changes
        let descendantBacklogConfiguration = AgileUtils.BacklogLevelUtils.getDescendentBacklogLevelConfigurationForLevelName(TFS_Agile.BacklogContext.getInstance().level.name);

        var isAllChildAnnotationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations)
        var enabled: number = 0;
        if (isAllChildAnnotationEnabled) {
            enabled = this._populateAllChildAnnotations(descendantBacklogConfiguration, annotationRules, annotationSettings);
        } else {
            let isChecklistAnnotationActive = this._isAnnotationEnabled(Boards.BoardAnnotationsIdentifier.ChecklistAnnotation, annotationRules);
            this._showChecklistShortcut = isChecklistAnnotationActive;
            if (isChecklistAnnotationActive) {
                AnnotationManager.registerChecklistAnnotation(Boards.BoardAnnotationsIdentifier.ChecklistAnnotation);
            }

            const previewIcon = AgileUtils.ControlUtils.buildColorElement(descendantBacklogConfiguration.defaultWorkItemType);
            this._annotationColorElements.push(previewIcon);
            annotationSettings.push({
                displayNameInSettingsPage: descendantBacklogConfiguration.name,
                id: Boards.BoardAnnotationsIdentifier.ChecklistAnnotation,
                isApplicableForPortfolioBacklogs: true,
                isApplicableForRequirementBacklog: true,
                annotationItemSourceIds: [],
                isEnabled: isChecklistAnnotationActive,
                previewIcon: previewIcon
            });
        }

        // remove test annotation for stakeholders - only basic and higher users should be able to access test annotation
        var isTestAnnotationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAddInlineTest)
            && TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(ServerConstants.LicenseFeatureIds.TestManagementForBasicUsers);

        if (isTestAnnotationEnabled) {
            let isTestAnnotationActive = this._isAnnotationEnabled(Boards.BoardAnnotationsIdentifier.TestAnnotation, annotationRules);
            if (isTestAnnotationActive) {
                AnnotationManager.registerTestAnnotation();
                if (isAllChildAnnotationEnabled) {
                    isTestAnnotationActive = isTestAnnotationActive && (enabled < AnnotationCollectionViewModel.MAX_ANNOTATION_LIMIT);
                }
            }

            const testpreviewicon = $("<span>").addClass("bowtie-icon bowtie-test-fill");
            testpreviewicon.attr('aria-label', AgileControlsResources.CSC_TESTS_TAB_TITLE);
            annotationSettings.push({
                displayNameInSettingsPage: AgileControlsResources.CSC_TESTS_TAB_TITLE,
                id: Boards.BoardAnnotationsIdentifier.TestAnnotation,
                isApplicableForPortfolioBacklogs: false,
                isApplicableForRequirementBacklog: true,
                annotationItemSourceIds: ["testSuite"],
                isEnabled: isTestAnnotationActive,
                previewIcon: testpreviewicon
            });
        }

        Boards.Board.BoardAnnotationSettings = new Boards.BoardAnnotationSettingsProvider({
            annotationSettings: annotationSettings
        });

        return annotationSettings;
    }

    private _populateAllChildAnnotations(descendantBacklogConfiguration, annotationRules, annotationSettings): number {
        // Populates settings for all children work item types as annotations
        // Controlled by feature flag

        const workItemTypes = descendantBacklogConfiguration.workItemTypes;
        var enabled: number = 0;
        const orderedWorkItemTypes = this._reorderChildWorkItemTypes(workItemTypes, descendantBacklogConfiguration.defaultWorkItemType);
        orderedWorkItemTypes.forEach(itemType => {
            const annotationId = (itemType === descendantBacklogConfiguration.defaultWorkItemType) ?
                Boards.BoardAnnotationsIdentifier.ChecklistAnnotation : Utils_String.format(Boards.BoardAnnotationsIdentifier.CardAnnotation, itemType.replace(/\s/g, ''));

            const isItemAnnotationActive = this._isAnnotationEnabled(annotationId, annotationRules);
            if (isItemAnnotationActive) {
                enabled++;
            }

            const withinLimit = (enabled <= AnnotationCollectionViewModel.MAX_ANNOTATION_LIMIT);
            if (isItemAnnotationActive && withinLimit) {
                AnnotationManager.registerChecklistAnnotation(annotationId);
            }

            const previewIcon = AgileUtils.ControlUtils.buildColorElement(itemType);
            this._annotationColorElements.push(previewIcon);
            annotationSettings.push({
                workItemTypeName: itemType,
                displayNameInSettingsPage: itemType,
                id: annotationId,
                isApplicableForPortfolioBacklogs: true,
                isApplicableForRequirementBacklog: true,
                annotationItemSourceIds: [],
                isEnabled: (isItemAnnotationActive && withinLimit),
                previewIcon: previewIcon
            });
        });
        return enabled;
    }

    private _reorderChildWorkItemTypes(workItemTypes: string[], defaultWorkItemType: string): string[] {
        var reordered: string[] = []

        if (workItemTypes.indexOf(defaultWorkItemType) >= 0) {
            reordered.push(defaultWorkItemType)
        }
        workItemTypes.forEach(workItemType => {
            if (workItemType != defaultWorkItemType) {
                reordered.push(workItemType);
            }
        });

        return reordered;
    }

    private _publishAutoRefreshTelemetry(eventType: string, ciData: IDictionaryStringTo<any>, immediate: boolean = false): void {
        const extensionId = this._board ? this._board.getBoardSettings().extensionId : "unknown";
        BoardAutoRefreshCommon.PublishAutoRefreshTelemetry(eventType, extensionId, ciData, immediate);
    }

    private _initializeFilterControl(): void {
        if (this._filterBar) {
            this._filterBar.dispose();
            this._filterBar = null;
            Events_Action.getService().unregisterActionWorker(TFS_Agile.Actions.LAUNCH_FILTER_CONTROL, this._toggleFilterBar);
        }

        if (!isFilterStateEmpty(this._currentFilter)) {
            this._buildFilterBar(true, false);
        }
    }

    private _buildFilterBar(shouldShowFilterBar?: boolean, focusOnLoad?: boolean): void {
        VSS.using([
            "Agile/Scripts/Board/BoardFiltering",
            "Agile/Scripts/Board/BoardFilterDataSource",

            // Prefetching filterProviders to avoid another roundtrip for required modules
            "Agile/Scripts/Board/BoardFilterValueProviders",
            "WorkItemTracking/Scripts/Controls/Filters/FilterValueProviders",
            "WorkItemTracking/Scripts/Filtering/TextFilterProvider",
            "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter"],
            (BoardFiltering: typeof BoardFiltering_NO_REQUIRE, FilterDataSource: typeof BoardFilterDataSource_NO_REQUIRE) => {

                const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
                const projectName = tfsContext.navigation.project;
                const boardFilterDataSource = new FilterDataSource.BoardFilterDataSource(
                    () => this.getCurrentBoardItemSource(),
                    () => this.getCurrentBoardRootNode()
                );

                // Creating the filter control
                this.getBoardFilterFields(projectName, boardFilterDataSource).then((filterFields: WorkItemFilter_NO_REQUIRE.IWorkItemFilterField[]) => {
                    if (this._filterBar) {
                        // If a user toggles the filterBar while 'getBoardFilterFields' is in progress, we will end up building the filer bar multiple times
                        return;
                    }

                    const $filterElement = $(".agile-board-filter-area");
                    this._filterBar = Controls.create(BoardFiltering.BoardFilterBar, $filterElement, {
                        projectName,
                        initialFilterState: this._currentFilter,
                        eventScopeId: this.eventsHelper.getScope(),
                        boardFilterDataSource: boardFilterDataSource,
                        fields: filterFields
                    } as BoardFiltering_NO_REQUIRE.IBoardFilterBarOptions);

                    if (shouldShowFilterBar) {
                        this._showFilter(focusOnLoad);
                    }
                });
            }
        );
    }

    private _getFilterStateManager() {
        const boardId = this.board() ? this.board().id() : null;
        if (!this._filterStateManager && boardId) {
            const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            const filterRegistryKey = this._getFilterRegistryKey(boardId);
            this._filterStateManager = new FilterStateManager(
                tfsContext.navigation.projectId,
                filterRegistryKey,
                this._currentFilter
            );
        }
        return this._filterStateManager;
    }

    private _onBoardCriteriaFilterChanged = (args: { filter: FilterState }) => {
        const { filter } = args;

        // Store current filter
        this._currentFilter = filter;

        // Save the current filter to server
        const filterStateManager = this._getFilterStateManager();
        if (filterStateManager) {
            filterStateManager.saveFilter(filter);
        }

        // Update toolbar
        if (!BoardsHubHelper.isXHRHub()) {
            this.eventsHelper.fire(BoardViewToolbarContracts.Notifications.BoardFilterUpdated, this, {
                isFilterApplied: !isFilterStateEmpty(filter)
            } as BoardViewToolbarContracts.IBoardFilterUpdated);
        }
    }

    private _applyFilter(): void {
        this.eventsHelper.fire(Boards.Notifications.BoardCriteriaFilterChanged, { filter: this._currentFilter });
    }

    private _showFilter(focus: boolean) {
        this._filterBar.showElement(focus);
        this._fireFilterBarEventAndAdjust();
    }

    /**
     * Get board filter fields
     * @param projectName Project name
     * @param dataSource Board filter data source
     */
    public getBoardFilterFields(
        projectName: string,
        dataSource: BoardFilterDataSource_NO_REQUIRE.IBoardFilterDataSource):
        IPromise<WorkItemFilter_NO_REQUIRE.IWorkItemFilterField[]> {

        const deferred = Q.defer<WorkItemFilter_NO_REQUIRE.IWorkItemFilterField[]>();
        VSS.using([
            "Agile/Scripts/Board/BoardFilterValueProviders",
            "WorkItemTracking/Scripts/Controls/Filters/FilterValueProviders",
            "WorkItemTracking/Scripts/Filtering/TextFilterProvider",
            "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter"], (
                BoardFilterValueProviders: typeof BoardsFilterValueProviders_NO_REQUIRE,
                WorkItemFilterValueProviders: typeof WorkItemFilterValueProviders_NO_REQUIRE,
                TextFilterProvider: typeof TextFilterProvider_NO_REQUIRE,
                WorkItemFilter: typeof WorkItemFilter_NO_REQUIRE
            ) => {
                // Board could have been disposed by the time this using call resolves.
                // We need to check to see if the board still exists
                if (this.board()) {
                    const fields: WorkItemFilter_NO_REQUIRE.IWorkItemFilterField[] = [
                        {
                            displayType: WorkItemFilter.WorkItemFilterFieldType.Text,
                            fieldName: TextFilterProvider.TextFilterProvider.PROVIDER_TYPE,
                            placeholder: WITResources.FilterByKeyword
                        },
                        {
                            displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                            fieldName: WITConstants.CoreFieldRefNames.WorkItemType,
                            placeholder: WITResources.FilterByTypes,
                            noItemsText: WITResources.FilterNoTypes,
                            valueProvider: new WorkItemFilterValueProviders.WorkItemTypeFilterValueProvider(projectName, dataSource)
                        },
                        {
                            displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                            fieldName: WITConstants.CoreFieldRefNames.AssignedTo,
                            placeholder: WITResources.FilterByAssignedTo,
                            valueProvider: new WorkItemFilterValueProviders.AssignedToFilterValueProvider(dataSource)
                        },
                        {
                            displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                            fieldName: WITConstants.CoreFieldRefNames.Tags,
                            placeholder: WITResources.FilterByTags,
                            noItemsText: WITResources.FilterNoTags,
                            showOrAndOperators: true
                        },
                        {
                            displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                            fieldName: WITConstants.CoreFieldRefNames.IterationPath,
                            placeholder: AgileControlsResources.Filtering_Iteration_DisplayName,
                            valueProvider: new WorkItemFilterValueProviders.IterationPathFilterValueProvider(projectName, dataSource)
                        }
                    ];

                    if (!this.board().isRootBacklogLevel()) {
                        fields.push({
                            displayType: WorkItemFilter.WorkItemFilterFieldType.CheckboxList,
                            fieldName: Boards.parentItemFieldRefName,
                            placeholder: AgileControlsResources.Filtering_ParentItem_DisplayName,
                            noItemsText: AgileControlsResources.Filtering_ParentItem_NoItems,
                            valueProvider: new BoardFilterValueProviders.ParentItemFilterValueProvider(dataSource)
                        });
                    }
                    deferred.resolve(fields);
                } else {
                    deferred.resolve([]);
                }
            }, (error: Error) => deferred.reject(error)
        );
        return deferred.promise;
    }


    private _toggleFilterBar = () => {
        if (!this._filterBar) {
            this._buildFilterBar(true, true);
        } else {
            this._filterBar.toggleVisibility();
            this._fireFilterBarEventAndAdjust();
        }
    }

    private _fireFilterBarEventAndAdjust() {
        this.eventsHelper.fire(
            BoardViewToolbarContracts.Notifications.BoardToolbarMenuItemNeedsUpdate,
            <BoardViewToolbarContracts.IToolbarMenuItemUpdateEventArgs>{
                id: AgileControls.FilterControls.FILTER_COMMAND,
                toggled: this._filterBar.isVisible()
            });

        this._applyFilter();
        this._fixHeight();
    }

    private _createRecycleBin() {
        var recycleBinOptions: WITControlsRecycleBin.IRecycleBinOptions = {
            sourceAreaName: RecycleBinTelemetryConstants.KANBAN_SOURCE,
            dragDropScope: TFS_Agile.DragDropScopes.WorkItem,
            dataKey: Tile.DataKeyId
        };

        Controls.Enhancement.enhance(WITControlsRecycleBin.RecycleBin, ".recycle-bin", recycleBinOptions);

        this._deleteItemsEventDelegate = (sender?: any, succeededArguments?: WITControlsRecycleBin.IDeleteEventArguments) => {
            if (succeededArguments) {
                var workItemIds = succeededArguments.workItemIds;
                if (workItemIds && workItemIds.length > 0) {
                    // Allow JQuery to complete the drop operation and remove the cloned tile
                    Utils_Core.delay(this, 0, () => {
                        this._board.removeItemById(workItemIds[0]);
                    });
                }
            }
        };
        globalEvents.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemsEventDelegate);
    }

    // Update server-generated pivot views with state available on client
    private _updatePivotViews() {
        var $backlogPivotView = $(".productbacklog-view-tabs");
        if ($backlogPivotView && $backlogPivotView.length > 0) {
            var backlogContext = TFS_Agile.BacklogContext.getInstance();
            // Get show parents from MRU, backlogContext showparents is populated by URL params. Show parents is not included in board params
            var showParents = ProductBacklogMRU.ShowParents.getMRUState();
            TFS_Agile_ContributableTabsUtils.PivotViewHelper.enhanceBacklogPivotView("productbacklog-view-tabs", backlogContext.level.name, showParents.toString(), AgileControls.BacklogViewControlModel.boardPivot, {
                level: backlogContext.level.name,
                workItemTypes: backlogContext.level.workItemTypes
            });
        }
    }

    private _setMessage(message: string | JQuery, messageType: Notifications.MessageAreaType, clickCallback?: Function) {
        if (!this._messageArea) {
            this._messageArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $(".agile-board-message-area"));
            this._messageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, delegate(this, this._fixHeight));
        }

        this._messageArea.setMessage({
            type: messageType,
            header: message,
            click: clickCallback
        });
    }

    private _clearMessage() {
        if (this._messageArea) {
            this._messageArea.clear();
        }
    }

    private _redrawBoard() {
        $(".agile-board").css("border", "solid 0px transparent");
        Utils_Core.delay(this, 0, function () {
            $(".agile-board").css("border", "");
        });
    }

    private _redrawBoardInChrome() {
        /// <summary>
        ///     This is a workaround to redraw container to fix the bug in Chrome that leaves partial tiles on the board when multiple tiles are show/hide.
        /// </summary>
        if (this._redrawBoardInChromeHandler) {
            this._redrawBoardInChromeHandler();
        }
    }

    private _getAdditionalCoreFieldsForCardCustomization(): IDictionaryStringTo<string[]> {
        var additionalCoreFields: IDictionaryStringTo<string[]> = {};
        var boardCardSettings = this._board.getCardSettingsProvider().getCardSettings().cards;

        // set additionalCoreFields
        $.map(boardCardSettings, (cardSettings, itemType) => {
            additionalCoreFields[itemType] = [];
            additionalCoreFields[itemType].push(this._board.getField(FieldRendererHelper.EFFORT_FIELD));
        });

        return additionalCoreFields;
    }

    /** Refreshes the current team board */
    private _getBoardModel(): IPromise<Boards.BoardModel> {
        const deferred = Q.defer<Boards.BoardModel>();
        const successCallback = (data: any) => {
            if (data && data.board && !data.board.node) {
                data.board.node = BoardGenerator.createBoardRootNode(data.boardSettings);
            }
            deferred.resolve(data);
        };

        // Get board model
        Boards.Board.beginGetModel(this._options.team.id, successCallback, deferred.reject);

        return deferred.promise;
    }

    /**
     * Used to unit test handling of SignalRConnectionRevived events.
     */
    private _handleSignalRConnectionRevivedEvents(): void {
        Diag.logInfo("SignalR connection re-established. Hence, doing automatic inline board refresh.");
        if (this._board && this._board.hasLockedItems()) {
            this._board.setPendingBoardRefresh(true);
        }
        else {
            this._refreshBoard();
        }
    }

    private _handleCommonSettingsChangeEvents(): void {
        this._promptForManualRefresh(AgileControlsResources.Kanban_RefreshNotification_SettingsChanged, BoardAutoRefreshCommon.Events.CommonSettingsChanged);
    }

    private _subscribeToSignalRConnectionRevivedEvents(): void {
        if (!this._signalRConnectionRevivedEventHandlerDelegate) {
            this._signalRConnectionRevivedEventHandlerDelegate = delegate(this, this._handleSignalRConnectionRevivedEvents);
            this.eventsHelper.attachEvent(BoardAutoRefreshCommon.Events.SignalRConnectionRevived, this._signalRConnectionRevivedEventHandlerDelegate);
        }
    }

    private _subscribeToCommonSettingsChangeEvents(): void {
        if (!this._commonSettingsChangeEventHandlerDelegate) {
            this._commonSettingsChangeEventHandlerDelegate = delegate(this, this._handleCommonSettingsChangeEvents);
            this.eventsHelper.attachEvent(BoardAutoRefreshCommon.Events.CommonSettingsChanged, this._commonSettingsChangeEventHandlerDelegate);
        }
    }

    /**
     * Creates the SignalR hub and associated events and handlers
     * Returns Q.Promise of the HubConnection object (used only in tests)
     */
    private _setupAutoRefresh(): Q.Promise<BoardAutoRefreshHub_NO_REQUIRE.KanbanBoardHub> {
        var deferred = Q.defer<BoardAutoRefreshHub_NO_REQUIRE.KanbanBoardHub>();

        if (this._board && this._board.isAutoBoardRefreshOn()) {
            this._board.unsubscribeFromAutoRefreshEvents();
            this._board.subscribeForAutoRefreshEvents();
            // Connect to SignalR server to receive notifications for work item changes and common settings changes.
            if (!this._boardHub) {
                // Subscribe to common settings changes and signalR connection revived events.
                this._subscribeToCommonSettingsChangeEvents();
                this._subscribeToSignalRConnectionRevivedEvents();

                // Subscribe to document visibility changed events.
                this._attachVisibilityChangesHandler();

                let scriptsToLoad = ["Agile/Scripts/Board/BoardsAutoRefreshHub"];
                if (this._options.signalRHubUrl) {
                    scriptsToLoad.push(this._options.signalRHubUrl);
                }

                VSS.using(scriptsToLoad, (BoardAutoRefreshHub: typeof BoardAutoRefreshHub_NO_REQUIRE) => {
                    if (!this.isDisposed()) {
                        this._boardHub = new BoardAutoRefreshHub.KanbanBoardHub(this._board.getBoardSettings().extensionId, this.eventsHelper);
                        this._boardHub.start().then(
                            (hub: BoardAutoRefreshHub_NO_REQUIRE.KanbanBoardHub) => {
                                deferred.resolve(this._boardHub);
                                this.eventsHelper.fire(BoardAutoRefreshCommon.Events.SignalRConnectionStarted, /* sender*/ null, this._boardHub);
                            }, (error: Error) => {
                                if (this._board) {
                                    this._board.unsubscribeFromAutoRefreshEvents(); //No need to keep subscribed, we won't listen.
                                }
                                deferred.reject(error);
                            });
                    } else {
                        deferred.reject("The board was disposed");
                    }
                });
            } else {
                deferred.resolve(this._boardHub);
            }
        } else {
            deferred.resolve(this._boardHub);
        }

        return deferred.promise;
    }

    private _attachVisibilityChangesHandler(): void {
        if (!this._visibilityChangeEventHandlerDelegate) {
            this._visibilityChangeEventHandlerDelegate = delegate(this, this._handleVisibilityChanged);
            this._bind(document, "visibilitychange", this._visibilityChangeEventHandlerDelegate);
        }
    }

    private _detachVisibilityChangedHandler(): void {
        if (this._visibilityChangeEventHandlerDelegate) {
            this._unbind(document, "visibilitychange", this._visibilityChangeEventHandlerDelegate);
            this._visibilityChangeEventHandlerDelegate = null;
        }
    }

    private _setOnBeforeUnload(): void {
        window.onbeforeunload = () => {
            if (this._boardHub) {
                this._boardHub.publishSignalRSessionLength();
            }
        }
    }

    private _promptForManualRefresh(message: string, eventName: string): void {

        // for some reason if an async call arrives after board is disposed return.
        if (this._disposed) {
            return;
        }

        // Just show message warning if we are in new hub 
        if (BoardsHubHelper.isXHRHub()) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(BoardsHubConstants.HUB_NAME, BoardsHubUsageTelemetryConstants.MANUALREFRESHREQUIRED, { eventName: eventName }));
            const refreshLink = $("<a>")
                .text(AgileControlsResources.Kanban_RefreshNotification_Click)
                .attr("role", "button")
                .click(() => {
                    window.location.reload();
                });
            let messageContainer = $("<div>")
                .text(message)
                .append(refreshLink);
            this._setMessage(messageContainer, Notifications.MessageAreaType.Warning);
        }
        else {
            message = message + AgileControlsResources.Kanban_RefreshNotification_Click;
            // Show the refresh button
            this.eventsHelper.fire(
                BoardViewToolbarContracts.Notifications.BoardShowManualRefresh,
                <BoardViewToolbarContracts.IBoardShowManualRefreshEventArgs>{
                    message: message,
                    eventName: eventName,
                });
        }

        // This is needed to turn off the auto-refresh capabilities in this session.
        // If this is not done, the current session might show wrong information for the changes done to the board from other sessions.
        this._teardownAutoRefresh();
    }

    private _teardownAutoRefresh(): void {
        if (this._board) {
            this._board.unsubscribeFromAutoRefreshEvents();
        }

        if (this._boardHub) {
            this._boardHub.stop();
            this._boardHub.dispose();
            this._boardHub = null;
        }

        if (this._commonSettingsChangeEventHandlerDelegate) {
            if (this.eventsHelper) {
                this.eventsHelper.detachEvent(BoardAutoRefreshCommon.Events.CommonSettingsChanged, this._commonSettingsChangeEventHandlerDelegate);
            }
            this._commonSettingsChangeEventHandlerDelegate = null;
        }

        if (this._signalRConnectionRevivedEventHandlerDelegate) {
            if (this.eventsHelper) {
                this.eventsHelper.detachEvent(BoardAutoRefreshCommon.Events.SignalRConnectionRevived, this._signalRConnectionRevivedEventHandlerDelegate);
            }
            this._signalRConnectionRevivedEventHandlerDelegate = null;
        }
    }

    private _drawBoard(boardModel: Boards.BoardModel, board: Boards.Board) {
        /// <summary>Draws the board. This involves an asynchronous call to get the configuration.</summary>
        var perfScenario = Performance.getScenarioManager().startScenario(Boards.KanbanTelemetry.CI_AREA_AGILE, Boards.KanbanTelemetry.Perf_Scenario_DrawBoard);
        this._addCommonPerfScenarioData(perfScenario);

        this._attachEvents();

        perfScenario.addSplitTiming(Boards.KanbanTelemetry.Perf_Split_PreSetBoard);
        this.board(board);

        this._createRecycleBin();
        this._updatePivotViews();

        this._measureAndUpdateSwimlaneHeaders();

        perfScenario.addSplitTiming(Boards.KanbanTelemetry.Perf_Split_PreUpdateLayout);
        this._updateLayout(null, true);

        perfScenario.end();

        // Clear manual refresh notification, if it is existing.
        this._clearRefreshNotification();

        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const thirdPartyUrl = tfsContext.configuration.get3rdPartyStaticRootPath();
        const minified = !Diag.getDebugMode() ? "min." : "";
        const signalRScript = Utils_String.format("{0}_scripts/jquery.signalR-vss.2.2.0.{1}js", thirdPartyUrl, minified);

        VSS.requireModules([signalRScript]).then(
            () => {
                // Subscribe for refresh notifications.
                this._setupAutoRefresh().done(
                    (boardFromPromise: BoardAutoRefreshHub_NO_REQUIRE.KanbanBoardHub) => { },
                    (error: Error) => {
                        if (error.name === "Kanban.AutoRefresh.Hub.Connection.Start.Timeout") {
                            VSSError.publishErrorToTelemetry(error, false, Level.Error, { signalRError: true, vssRequireFailed: false, timeout: true });
                            this._promptForManualRefresh(AgileControlsResources.Kanban_RefreshNotification_ConnectionTimedout, BoardAutoRefreshCommon.Events.SignalRConnectionStartTimedOut);
                        } else {
                            VSSError.publishErrorToTelemetry(error, false, Level.Error, { signalRError: true, vssRequireFailed: false, timeout: false });
                        }
                    });
            },
            (error: Error) => {
                VSSError.publishErrorToTelemetry(error, false, Level.Error, { signalRError: true, vssRequireFailed: true, timeout: false });
                this._promptForManualRefresh(AgileControlsResources.Kanban_RefreshNotification_SignalRFailedToLoad, BoardAutoRefreshCommon.Events.SignalRConnectionStartTimedOut);
            }
        );

        if ($(`#${BoardView.KANBAN_BOARD_ARIA_DESCRIBEDBY_ID}`).length === 0) {
            this.getElement()
                .append($(`<div id='${BoardView.KANBAN_BOARD_ARIA_DESCRIBEDBY_ID}'/>`)
                    .text(AgileControlsResources.KanbanBoard_AriaDescribedByText)
                    .css("visibility", "hidden"));
        }
    }

    private _attachEvents() {
        this._setMessageDelegate = delegate(this, this._setMessage);
        this.eventsHelper.attachEvent(NodeView.SERVER_ERROR_ON_RENAME, this._setMessageDelegate);

        this._onContainerChange = () => { this._fixHeight() };
        this.eventsHelper.attachEvent(Boards.Notifications.BoardContainerResized, this._onContainerChange);

        this._setFatalErrorDelegte = (errorMessage: string) => {
            this._setMessage(errorMessage, Notifications.MessageAreaType.Error, () => {
                window.location.reload();
            });
        };
        this.eventsHelper.attachEvent(Tile.CHECKLIST_REPARENT_FAILED, this._setFatalErrorDelegte);
        globalEvents.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._setFatalErrorDelegte);

        this._setTransitionStateErrorDelegate = (errorMessage: JQuery) => {
            this._setMessage(errorMessage, Notifications.MessageAreaType.Error);
            this.eventsHelper.detachEvent(Tile.CHECKLIST_STATE_TRANSITION_FAILED, this._setTransitionStateErrorDelegate);
        }

        this.eventsHelper.attachEvent(Tile.CHECKLIST_STATE_TRANSITION_FAILED, this._setTransitionStateErrorDelegate);

        this._measureAndUpdateSwimlaneHeadersDelegate = delegate(this, this._measureAndUpdateSwimlaneHeaders);
        this.eventsHelper.attachEvent(EditableLabelControl.LabelUpdated, this._measureAndUpdateSwimlaneHeadersDelegate);

        this._boardMessageDisplayDelegate = (sender?: any, args?: { message: string | JQuery, messageType: Notifications.MessageAreaType, clickCallback?: Function }) => {
            this._setMessage(args.message, args.messageType, args.clickCallback);
        };
        this.eventsHelper.attachEvent(Boards.Notifications.BoardMessageDisplay, this._boardMessageDisplayDelegate);

        this.eventsHelper.attachEvent(BoardAutoRefreshCommon.Events.RefreshBoard, this._getRefreshBoardDelegate());

        //  Notification:   BoardMembersDataSetCompleteInquiry
        this._boardMembersDataSetCompleteInquiryDelegate = () => {
            var members = this._board.rootNode().allFilterableMembers();
            var isDataSetComplete = true;
            $.each(members, (index: number, member: Boards.BoardMember) => {
                isDataSetComplete = member.isDataSetComplete();
                if (!isDataSetComplete) {
                    return isDataSetComplete;
                }
            });

            if (isDataSetComplete) {
                this.eventsHelper.fire(BoardViewToolbarContracts.Notifications.BoardMembersDataSetComplete);
            }
        };

        this.eventsHelper.attachEvent(
            BoardViewToolbarContracts.Notifications.BoardMembersDataSetCompleteInquiry,
            this._boardMembersDataSetCompleteInquiryDelegate);

        //  Notification:   BoardAutoRefreshEnabled
        this._boardAutoRefreshEnabledDelegate = (callback: () => void) => {
            // Setup auto board refresh connection,attach associated handlers and re-enabling the command after action complete
            this._refreshBoard();

            // Telemetry
            this._publishAutoRefreshTelemetry("UserSettingChanged", { "autoRefreshState": "true" });
            if ($.isFunction(callback)) {
                callback();
            }
        };

        this.eventsHelper.attachEvent(
            BoardViewToolbarContracts.Notifications.BoardAutoRefreshEnabled,
            this._boardAutoRefreshEnabledDelegate);

        //  Notification:   BoardAutoRefreshDisabled
        this._boardAutoRefreshDisabledDelegate = (callback: () => void) => {
            // Tear down auto board refresh connection and detach associated handlers
            this._detachVisibilityChangedHandler();
            this._teardownAutoRefresh();
            // Telemetry
            this._publishAutoRefreshTelemetry("UserSettingChanged", { "autoRefreshState": "false" });
            if ($.isFunction(callback)) {
                callback();
            }
        };

        this.eventsHelper.attachEvent(
            BoardViewToolbarContracts.Notifications.BoardAutoRefreshDisabled,
            this._boardAutoRefreshDisabledDelegate);

        this.eventsHelper.attachEvent(Boards.Notifications.BoardCriteriaFilterChanged, this._onBoardCriteriaFilterChanged);

        if (!BoardsHubHelper.isXHRHub()) {
            Events_Action.getService().registerActionWorker(TFS_Agile.Actions.LAUNCH_FILTER_CONTROL, this._toggleFilterBar, Events_Action.ActionService.MaxOrder);
        }
    }

    /**
     * Uses _populateAnnotationSettings to register annotation types and create annotationSettings.
     * Also updates this._boardAnnotationSettings and the CardSettingsProvider with the new annotation types.
     * 
     * Used when feature flag for all child annotations types is turned on.
     */
    private _assignBoardCardSettings(annotationRules: Cards.IStyleRule[], cardSettingsProvider: Cards.CardSettingsProvider) {
        const annotationSettings = this._populateAnnotationSettings(annotationRules);
        let originalCardSettings = cardSettingsProvider.getCardSettings();
        let annotations: Cards.IStyleRule[] = [];
        for (let i = 0; i < annotationSettings.length; i++) {
            const annotation: Cards.IStyleRule = {
                name: annotationSettings[i].id,
                type: RuleType.ANNOTATION,
                isEnabled: annotationSettings[i].isEnabled
            }
            annotations.push(annotation);
        }
        // There is a special case, initially, we have no data stored in the DB, the client applied the default logic to merge them, 
        // This intern project just followed the same pattern in order not break the old experience. In new board, we should not follow that, just always trust the server data.
        // And do not deplicate code in several places/model.
        const otherRules = this._boardCardSettings.styles.filter((rule: Cards.IStyleRule) => !Utils_String.equals(rule.type, RuleType.ANNOTATION, true));
        const updatedCardSettings: Cards.IBoardCardSettings = {
            scope: originalCardSettings.scope,
            scopeId: originalCardSettings.scopeId,
            cards: originalCardSettings.cards,
            styles: annotations.concat(otherRules)
        }
        cardSettingsProvider.setCardSettings(updatedCardSettings);
        this._boardCardSettings = updatedCardSettings;
    }

    private _createBoardAndItemsSource(boardModel: Boards.BoardModel): { board: Boards.Board, itemSource: Boards.WorkItemSource } {
        // Populate the annotation information
        let annotationRules: Cards.IStyleRule[] = [];

        var cardSettingsProvider: Cards.CardSettingsProvider;
        if (boardModel.boardCardSettings) {
            cardSettingsProvider = new Cards.CardSettingsProvider(boardModel.boardCardSettings);

            let styles: Cards.IStyleRule[] = boardModel.boardCardSettings.styles;
            annotationRules = styles.filter((value: Cards.IStyleRule, index: number) => Utils_String.equals(value.type, RuleType.ANNOTATION, true));
        }

        var isAllChildAnnotationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations)
        if (isAllChildAnnotationEnabled) {
            this._assignBoardCardSettings(annotationRules, cardSettingsProvider);
        } else {
            this._populateAnnotationSettings(annotationRules);
        }

        var itemSource = this._createItemSource(boardModel.itemSource, boardModel.boardSettings.teamId);
        var board = Boards.Board.createBoard(boardModel, this.eventsHelper, itemSource);

        if (cardSettingsProvider) {
            board.setCardSettingsProvider(cardSettingsProvider);
        }

        itemSource.boardCardsSetting(board.getCardSettingsProvider());

        return { board, itemSource };
    }

    private _onCustomizeCardSave(refreshBoardOnSave: boolean, cardSettings: IDictionaryStringTo<Cards.ICardFieldSetting[]>, successCallBack: IResultCallback, errorCallback: IErrorCallback) {
        var cardSettingsProvider = this._board.getCardSettingsProvider();
        var boardCardSettings: Cards.IBoardCardSettings = cardSettingsProvider.getCardSettings();
        boardCardSettings.cards = cardSettings;

        // success
        var successHandler = (result) => {
            successCallBack();
            if (refreshBoardOnSave) {
                this._getRefreshBoardDelegate();
            }
        };

        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        var tfsConnection = new Service.VssConnection(tfsContext.contextData);
        var workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        var teamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: tfsContext.contextData.project.id,
            teamId: this._options.team.id
        };

        workHttpClient.updateBoardCardSettings(this._convertBoardCardSettingToRestDefinition(boardCardSettings), teamContext, boardCardSettings.scopeId)
            .then(successHandler, errorCallback);
    }

    private _convertBoardCardSettingToRestDefinition(boardCardSettings: Cards.IBoardCardSettings): Cards.BoardCardSettings {
        var newSettings: Cards.BoardCardSettings = new Cards.BoardCardSettings();
        for (var key in boardCardSettings.cards) {
            if (boardCardSettings.cards.hasOwnProperty(key)) {
                var fields: Work_Contracts.FieldSetting[] = [];
                for (var i = 0; i < boardCardSettings.cards[key].length; i++) {
                    fields.push(boardCardSettings.cards[key][i]);
                }
                newSettings.addVal(key, fields);
            }
        }
        return newSettings;
    }

    private _attachCommonConfigurationRegistration(
        boardSettings: Boards.IBoardSettings,
        boardCardSettings: Cards.IBoardCardSettings): IPromise<void> {

        this._boardSettings = boardSettings;
        this._boardCardSettings = boardCardSettings;

        this._detachCommonConfigurationRegistration();
        if (EmbeddedHelper.isEmbedded()) {
            this._registerLaunchConfigActionWorker();
            return Q.resolve(null);
        } else {
            const context = getDefaultWebContext();
            return Service.getService(TeamServices.TeamPermissionService).beginGetTeamPermissions(context.project.id, this._options.team.id).then((permissions: TeamServices.ITeamPermissions) => {
                this._teamPerimssions = permissions;
                this._registerLaunchConfigActionWorker();
            });
        }
    }

    private _detachCommonConfigurationRegistration() {
        Events_Action.getService().unregisterActionWorker(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, this._onLaunchCommonConfiguration);
    }

    private _registerLaunchConfigActionWorker() {
        Events_Action.getService().registerActionWorker(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, this._onLaunchCommonConfiguration);
    }

    private _onLaunchCommonConfiguration = (actionArgs, next: Function): void => {
        VSS.using([
            "Presentation/Scripts/TFS/TFS.Configurations",
            "Agile/Scripts/Settings/CommonSettingsConfiguration"], (
                Configuration: typeof Configurations_NO_REQUIRE,
                Agile_Utils_CSC: typeof Agile_Utils_CSC_NO_REQUIRE
            ) => {
                var perfScenario = AgileControls.CommonSettingsConfigurationControl.createPerfScenario(TFS_Agile.AgileCustomerIntelligenceConstants.KANBAN_VIEW, !this._commonSettingsRegistered);

                // CSC Registration.
                if (!this._commonSettingsRegistered) {
                    Configuration.TabControlsRegistration.clearRegistrations(TFS_Agile.TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID);

                    var cardFieldControlOptions: Board_Settings_Controls_NO_REQUIRE.IFieldSettingsControlOptions = null;
                    var cardStyleOptions: StyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions = null;
                    var cardTagColorOptions: StyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions = null;
                    let cardAnnotationOptions: StyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions = null;

                    if (this._board) {
                        var backlogContext = TFS_Agile.BacklogContext.getInstance();
                        var defaultWorkItemTypeName = backlogContext.level.defaultWorkItemType;

                        cardFieldControlOptions = {
                            teamId: this._board.teamId,
                            boardCardSettings: this._boardCardSettings.cards,
                            additionalCoreFields: this._getAdditionalCoreFieldsForCardCustomization(),
                            isEditable: this._boardSettings.canEdit,
                            boardType: BoardView._boardType,
                            saveDelegate: Utils_Core.curry(delegate(this, this._onCustomizeCardSave), false),
                            defaultWorkItemTypeName: defaultWorkItemTypeName,
                            refreshOnSave: false,
                            applyChanges: this._getRefreshBoardDelegate()
                        };

                        // We will populate the data for Styles only if the ruletype is fill.
                        // For the tag coloring the criteria can also be null so, we need a criteria null check here
                        var fillStyleRules: Cards.IStyleRule[] = [];
                        var tagColorStyleRules: Cards.IStyleRule[] = [];
                        let annotationRules: Cards.IStyleRule[] = [];

                        if (this._boardCardSettings.styles) {
                            for (var i = 0; i < this._boardCardSettings.styles.length; i++) {
                                // Fill Data population
                                if (Utils_String.equals(this._boardCardSettings.styles[i].type, RuleType.FILL, true) && this._boardCardSettings.styles[i].criteria) {
                                    fillStyleRules.push(this._boardCardSettings.styles[i]);
                                }

                                // Tag Color Data population
                                if (Utils_String.equals(this._boardCardSettings.styles[i].type, RuleType.TAGSTYLE, true)) {
                                    tagColorStyleRules.push(this._boardCardSettings.styles[i]);
                                }

                                if (Utils_String.equals(this._boardCardSettings.styles[i].type, RuleType.ANNOTATION, true)) {
                                    annotationRules.push(this._boardCardSettings.styles[i]);
                                }
                            }
                        }

                        cardStyleOptions = {
                            styleRules: fillStyleRules,
                            isEditable: this._boardSettings.canEdit,
                            disableSave: null,
                            itemTypes: this._board.itemTypes(),
                            requireRefreshOnSave: false,
                            applyChanges: this._getRefreshBoardDelegate(),
                            teamId: this._board.teamId,
                            boardIdentity: this._board.id(),
                            boardType: AgileUtils.BoardType.Kanban
                        };

                        const onCustomizeTagColorSaveDelegate = (styles: StyleCustomization_NO_REQUIRE.ITagColorRule[], types: string[], successCallback: IResultCallback, errorCallback: IErrorCallback) => {
                            const cardSettingsProvider = this._board.getCardSettingsProvider();
                            const boardCardSettings: Cards.IBoardCardSettings = cardSettingsProvider.getCardSettings();
                            StyleRuleHelper.onCustomizeTagColorSave(this._options.team.id, styles, boardCardSettings.scopeId, types, successCallback, errorCallback);
                        }
                        cardTagColorOptions = {
                            styleRules: tagColorStyleRules,
                            isEditable: this._boardSettings.canEdit,
                            saveDelegate: delegate(this, onCustomizeTagColorSaveDelegate),
                            disableSave: null,
                            itemTypes: this._board.itemTypes(),
                            requireRefreshOnSave: false,
                            applyChanges: this._getRefreshBoardDelegate(),
                            teamId: this._board.teamId,
                            boardIdentity: this._board.id(),
                            boardType: AgileUtils.BoardType.Kanban
                        };

                        if (annotationRules.length === 0) {
                            let applicableAnnotationIds = Boards.Board.BoardAnnotationSettings.getApplicableAnnotationIds();
                            for (let i = 0; i < applicableAnnotationIds.length; i++) {
                                annotationRules.push(
                                    {
                                        isEnabled: true,
                                        name: applicableAnnotationIds[i],
                                        type: RuleType.ANNOTATION
                                    })
                            }
                        } else {
                            annotationRules = annotationRules.filter((rule: Cards.IStyleRule) => Boards.Board.BoardAnnotationSettings.isAnnotationRegistered(rule.name));
                        }

                        cardAnnotationOptions = {
                            applyChanges: this._getRefreshBoardDelegate(),
                            teamId: this._board.teamId,
                            boardIdentity: this._board.id(),
                            boardType: AgileUtils.BoardType.Kanban,
                            isEditable: this._boardSettings.canEdit,
                            itemTypes: this._board.itemTypes(),
                            styleRules: annotationRules,
                        };

                    }

                    var boardOptions: Board_Settings_Controls_NO_REQUIRE.IBoardSettingTabOptions = {
                        team: this._options.team,
                        boardSettings: this._boardSettings,
                        applyChanges: this._getRefreshBoardDelegate(),
                        requireRefreshOnSave: false,
                        boardIdentity: this._boardSettings.id,
                        isEditable: this._boardSettings.canEdit,
                        categoryReferenceName: this._boardSettings.categoryReferenceName,
                    };

                    if (EmbeddedHelper.isEmbedded()) {
                        Agile_Utils_CSC.CommonSettingsConfigurationUtils.registerKanbanSettingsForEmbeddedBacklogLevel(boardOptions, cardFieldControlOptions, cardStyleOptions, cardTagColorOptions, cardAnnotationOptions);
                    } else {
                        Agile_Utils_CSC.CommonSettingsConfigurationUtils.registerKanbanSettingsForBacklogLevel(this._options.team.id, boardOptions, this._teamPerimssions, cardFieldControlOptions, cardStyleOptions, cardTagColorOptions, cardAnnotationOptions);
                    }

                    this._commonSettingsRegistered = true;
                }

                actionArgs = $.extend({
                    perfScenario: perfScenario,
                    ignoreChangesOnNavigation: true
                }, actionArgs);
                next(actionArgs);
            });
    }

    private _resetCommonConfigurationRegistration(boardSettings: Boards.IBoardSettings, boardCardSettings: Cards.IBoardCardSettings) {
        this._commonSettingsRegistered = false;
        this._boardSettings = boardSettings;
        this._boardCardSettings = boardCardSettings;
    }

    /**
     * This only has an impact on swimlane headers, it will calculate the longest header and apply it to the others.
     * If the max width css contraint is reached, all headers will be set to the max width.
     */
    private _measureAndUpdateSwimlaneHeaders() {
        var perfScenario = Performance.getScenarioManager().startScenario(Boards.KanbanTelemetry.CI_AREA_AGILE, Boards.KanbanTelemetry.Perf_Scenario_UpdateSwimlaneHeaders);

        var $swimlaneHeaders = $(".agile-board .swimlane-header-title");
        if ($swimlaneHeaders.length > 1) {
            var largestWidth = 0;
            $.each($swimlaneHeaders, (index: number, element: HTMLElement) => {
                element.style.width = null; // clear any existing width
                var width = $(element).outerWidth(true);
                largestWidth = Math.max(largestWidth, width);
            });
            $swimlaneHeaders.outerWidth(largestWidth + 4 /* To ensure no elipsis */);
        }

        perfScenario.end();
    }

    private _showInvalidBoardSettingsErrorMessage(boardSettings: Boards.IBoardSettings) {
        /// <summary>Shows the invalid board settings error message</summary>
        var $div = $("<div>");

        $div.append($("<span>").text(AgileControlsResources.CustomizeColumnsBoardSettingsInvalid + " "))
            .append($("<a href='#'>")
                .text(AgileControlsResources.CustomizeColumnsBoardSettingsInvalid_ClickHere + " ")
                .click(() => {
                    eventActionService.performAction(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, {
                        defaultTabId: TFS_Agile.TabControlsRegistrationConstants.COLUMNS_TAB_ID
                    });
                }))
            .append($("<span>").text(AgileControlsResources.CustomizeColumnsBoardSettingsInvalid_Help + " "))
            .append($("<a>").attr("href", BoardView._invalidColumnsFWLink).attr("target", "_blank").attr("rel", "noopener noreferrer")
                .text(AgileControlsResources.CustomizeColumnsBoardSettingsInvalid_Help_ClickHere));

        this._setMessage($div, Notifications.MessageAreaType.Error);
    }

    private _getRefreshBoardDelegate() {
        /// <summary>Provides a singleton delegate for _refreshBoard.</summary>
        if (!this._refreshBoardDelegate) {
            this._refreshBoardDelegate = delegate(this, this._refreshBoard);
        }
        return this._refreshBoardDelegate;
    }

    private _prepareBoard() {
        this._cleanupBoard();

        this._$topNodeView = $("<div>").prependTo(this.getElement());

        if (!this._boardStatusIndicator) {
            this._boardStatusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(
                StatusIndicator.StatusIndicator,
                this.getElement(),
                {
                    center: true,
                    imageClass: "big-status-progress",
                    message: VSS_Resources_Platform.Loading,
                    throttleMinTime: 0
                });
        }

        this._hideBoard();
    }

    private _cleanupBoard() {
        this._clearMessage();

        this._detachEvents();

        if (this._$topNodeView) {
            var topNodeView = <NodeViewHorizontal>Controls.Enhancement.getInstance(NodeView, this._$topNodeView);
            if (topNodeView) { // Note that topNodeView control will not exist if the board loads in an error state initially.
                topNodeView.dispose();
            }
            this._$topNodeView.remove();
        }
    }

    private _detachEvents() {
        if (this._setMessageDelegate) {
            this.eventsHelper.detachEvent(NodeView.SERVER_ERROR_ON_RENAME, this._setMessageDelegate);
            this._setMessageDelegate = null;
        }
        if (this._setFatalErrorDelegte) {
            this.eventsHelper.detachEvent(Tile.CHECKLIST_REPARENT_FAILED, this._setFatalErrorDelegte);
            globalEvents.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._setFatalErrorDelegte);
            this._setFatalErrorDelegte = null;
        }
        if (this._onContainerChange) {
            this.eventsHelper.detachEvent(Boards.Notifications.BoardContainerResized, this._onContainerChange);
            this._onContainerChange = null;
        }
        if (this._setTransitionStateErrorDelegate) {
            this.eventsHelper.detachEvent(Tile.CHECKLIST_STATE_TRANSITION_FAILED, this._setTransitionStateErrorDelegate);
            this._setTransitionStateErrorDelegate = null;
        }
        if (this._measureAndUpdateSwimlaneHeadersDelegate) {
            this.eventsHelper.detachEvent(EditableLabelControl.LabelUpdated, this._measureAndUpdateSwimlaneHeadersDelegate);
            this._measureAndUpdateSwimlaneHeadersDelegate = null;
        }
        if (this._deleteItemsEventDelegate) {
            globalEvents.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemsEventDelegate);
            this._deleteItemsEventDelegate = null;
        }
        if (this._boardMessageDisplayDelegate) {
            this.eventsHelper.detachEvent(Boards.Notifications.BoardMessageDisplay, this._boardMessageDisplayDelegate);
            this._boardMessageDisplayDelegate = null;
        }

        if (this._refreshBoardDelegate) {
            this.eventsHelper.detachEvent(BoardAutoRefreshCommon.Events.RefreshBoard, this._refreshBoardDelegate);
            this._refreshBoardDelegate = null;
        }

        if (this._boardMembersDataSetCompleteInquiryDelegate) {
            this.eventsHelper.detachEvent(
                BoardViewToolbarContracts.Notifications.BoardMembersDataSetCompleteInquiry,
                this._boardMembersDataSetCompleteInquiryDelegate);

            this._boardMembersDataSetCompleteInquiryDelegate = null;
        }

        if (this._boardAutoRefreshEnabledDelegate) {
            this.eventsHelper.detachEvent(
                BoardViewToolbarContracts.Notifications.BoardAutoRefreshEnabled,
                this._boardAutoRefreshEnabledDelegate);
            this._boardAutoRefreshEnabledDelegate = null;
        }

        if (this._boardAutoRefreshDisabledDelegate) {
            this.eventsHelper.detachEvent(
                BoardViewToolbarContracts.Notifications.BoardAutoRefreshDisabled,
                this._boardAutoRefreshDisabledDelegate);
            this._boardAutoRefreshDisabledDelegate = null;
        }

        this.eventsHelper.detachEvent(Boards.Notifications.BoardCriteriaFilterChanged, this._onBoardCriteriaFilterChanged);

        // Unregister 'LAUNCH_FILTER_CONTROL' action before disposing the board
        Events_Action.getService().unregisterActionWorker(TFS_Agile.Actions.LAUNCH_FILTER_CONTROL, this._toggleFilterBar);
    }

    private _hideBoard() {
        this._$topNodeView.css("visibility", "hidden");
        this.getElement().addClass("loading");
        this._boardStatusIndicator.start();
    }

    private _showBoard() {
        this._$topNodeView.css("visibility", "visible");
        this._clearStatusIndicator();
        this._enableBoardEvents();
    }

    private _disableBoardEvents(): void {
        this.getElement().fadeTo("slow", .6);
        this.getElement().append("<div class='transparent-board-overlay'></div>");
    }

    private _enableBoardEvents(): void {
        this.getElement().fadeTo("slow", 1.0);
        var $transparentOverlay = this.getElement().find(".transparent-board-overlay");
        if ($transparentOverlay.length > 0) {
            $transparentOverlay.remove();
        }
    }

    private _clearStatusIndicator() {
        this.getElement().removeClass("loading");
        if (this._boardStatusIndicator) {
            this._boardStatusIndicator.complete();
            this._boardStatusIndicator.dispose();
            this._boardStatusIndicator = null;
        }
    }

    private _handleServerError(error: TfsError) {
        this._loadState = BoardLoadState.LOAD_FAILED;
        this._showBoard();
        VSS.handleError(error);
    }

    private _validateBoardModel(boardModel: Boards.BoardModel) {

        if (boardModel.notReady) {
            // Reconciliation hasn't finished so we can't show the board
            this._clearStatusIndicator();
            this._setMessage(Utils_String.htmlEncode(AgileControlsResources.Board_LoadingInProgress), Notifications.MessageAreaType.Warning);
            this._loadState = BoardLoadState.NOT_READY;
            return false;
        }

        if (!boardModel.boardSettings.isValid) {
            this._clearStatusIndicator();
            this._showInvalidBoardSettingsErrorMessage(boardModel.boardSettings);
            this._loadState = BoardLoadState.INVALID_SETTINGS;
            return false;
        }

        if (!boardModel.board || !boardModel.board.node) {
            // Logging CI and aborting board load
            this._clearStatusIndicator();
            this._loadState = BoardLoadState.LOAD_FAILED;
            return false;
        }

        if (!this._validateItemSource(boardModel.itemSource)) {
            return false;
        }

        return true;
    }

    protected _refreshBoard() {
        sessionStorage.setItem(BoardAutoRefreshCommon.Settings.BoardSettingsChangedInCurrentSession, "1");

        // TODO: In the future we can simply retrieve the boardconfig on it's own and re-use the current itemSource (perf gains to be had). At the time of
        // writing this I attempted it but there was too much fallout and risk for Dev14Update1. The focus at this time is on improving page load...
        // Workitem tracking this: (https://mseng.visualstudio.com/DefaultCollection/VSOnline/_workitems#_a=edit&id=424550)
        this._isInitialLoad = false;

        this._disableBoardEvents();
        this._loadState = BoardLoadState.LOADING;
        if (this._boardShortcutGroup) {
            this._boardShortcutGroup.dispose();
            this._boardShortcutGroup = null;
        }

        this._getBoardModel().then(
            (model: Boards.BoardModel) => {
                this._refreshBoardOnGetBoardModel(model);
            },
            (error: TfsError) => this._handleServerError(error));
    }

    protected _refreshBoardOnGetBoardModel(model: Boards.BoardModel): void {
        let updateBoardWithModel = (updatedModel: Boards.BoardModel, staleCache: boolean) => {
            if (updatedModel && updatedModel.board && !updatedModel.board.node) {
                updatedModel.board.node = BoardGenerator.createBoardRootNode(updatedModel.boardSettings);
            }

            if (!validateModel(updatedModel)) {
                return;
            }

            // Update the settings dialog with the new settings
            this._resetCommonConfigurationRegistration(updatedModel.boardSettings, updatedModel.boardCardSettings);

            let { board, itemSource } = this._createBoardAndItemsSource(updatedModel);
            itemSource.boardCardsSetting(board.getCardSettingsProvider());

            this._drawBoard(updatedModel, board);

            this._placeItemsOnBoard(board, itemSource);

            this._setInitialParentChildMap(updatedModel, itemSource);

            this._loadState = BoardLoadState.LOADED;
            this._applyFilter();

            // Don't set focus on the first tile on refresh
            // For XHR hub this causes focus lost on the element that
            // triggered the refresh e.g. autoupdate
            if (!BoardsHubHelper.isXHRHub()) {
                this.focusFirstTileOnBoard();
            }

            this._ensureChecklistShortcutGroup();
            if (this._boardShortcutGroup) {
                this._boardShortcutGroup.dispose();
                this._boardShortcutGroup = null;
            }
            this._boardShortcutGroup = new BoardShortcutGroup(this);
            Boards.KanbanTelemetry.OnBoardDisplay(board, this._isInitialLoad, staleCache, this._currentFilter);

            this.eventsHelper.fire(Boards.Notifications.BoardModelUpdated, this, updatedModel);
        };

        let validateModel = (modelToValidate: Boards.BoardModel) => {
            if (!this._validateBoardModel(modelToValidate)) {
                return false;
            }
            Boards.Board.invalidateStore(modelToValidate.boardSettings.extensionId);
            return true;
        };

        if (this._board
            && this._board.getCardSettingsProvider()
            && Utils_Core.equals(this._board.getBoardSettings(), model.boardSettings)
            && this._board.getCardSettingsProvider().areCardSettingsEqual(model.boardCardSettings)) {
            // If we hit the stale cache issue, we delay for 500ms, and then retrieve the latest model again.
            Utils_Core.delay(this, 500, () => {
                this._getBoardModel().then(
                    (latestModel: Boards.BoardModel) => {

                        this._prepareBoard();
                        updateBoardWithModel(latestModel, true);
                    },
                    (error: TfsError) => this._handleServerError(error));
            });
        }
        else {
            this._prepareBoard();
            updateBoardWithModel(model, false);
        }
    }

    protected _loadBoard(): IPromise<void> {

        let result: IPromise<void> = null;
        let telemetryHelper = PerformanceTelemetryHelper.getInstance(BoardsHubConstants.HUB_NAME);

        // For new boards hub we will have an active perf scenario
        // For legacy Backlogs Hub we start a new one under the old area
        if (!telemetryHelper.isActive() && Performance.getScenarioManager().isPageLoadScenarioActive()) {
            telemetryHelper = PerformanceTelemetryHelper.getInstance(Boards.KanbanTelemetry.CI_AREA_AGILE);
            telemetryHelper.startLegacyPageLoad(Boards.KanbanTelemetry.Perf_Scenario_KanbanBoard_Load);
        }

        telemetryHelper.split(Boards.KanbanTelemetry.Perf_Split_BoardDrawBegin);
        telemetryHelper.addData({ isEmbedded: EmbeddedHelper.isEmbedded() });
        this._isInitialLoad = true;
        this._loadState = BoardLoadState.LOADING;

        this._prepareBoard();
        const boardModel: Boards.BoardModel = this._options.getBoardModel();

        if (boardModel && boardModel.boardFilterSettings && boardModel.boardFilterSettings.initialFilter) {
            this._currentFilter = boardModel.boardFilterSettings.initialFilter || {};
        }

        result = this._attachCommonConfigurationRegistration(boardModel.boardSettings, boardModel.boardCardSettings);
        if (!this._validateBoardModel(boardModel)) {
            telemetryHelper.abort();
            return result;
        }

        Boards.Board.invalidateStore(boardModel.boardSettings.extensionId);

        const { board, itemSource } = this._createBoardAndItemsSource(boardModel);

        telemetryHelper.addData({ id: board.id() });

        this._drawBoard(boardModel, board);
        telemetryHelper.split(Boards.KanbanTelemetry.Perf_Split_BoardDrawComplete);

        // TODO: Commented this due to the limitation of search in DDS being un-batched.
        //       Please uncomment it once the EA team completes the following user story:
        //       User Story 559711: Support batched calls when Searching using DDS
        //// This will prefetch all known identities from the board item source.
        //if (this._options.tfsContext && this._options.tfsContext.isHosted) {
        //    boardLoadScenario.addSplitTiming("PrefetchIdentitiesBegin");
        //    var identities = this._getIdentitiesFromItemSource(boardModel.itemSource);
        //    this._prefetchIdentities(identities);
        //    boardLoadScenario.addSplitTiming("PrefetchIdentitiesEnd");
        //}

        this._setInitialParentChildMap(boardModel, itemSource);

        this._placeItemsOnBoard(board, itemSource);
        this._loadState = BoardLoadState.LOADED;

        telemetryHelper.end();

        Boards.KanbanTelemetry.OnBoardDisplay(board, this._isInitialLoad, false, this._currentFilter);

        this._showDismissableInfoMessageArea();

        return result;
    }

    private _showDismissableInfoMessageArea() {
        if (!TFS_UI_Controls_Common.DismissableMessageAreaControl.isDismissedOnClient(TFS_Agile.NotificationGuids.NewBacklogLevelVisibilityNotSet, TFS_WebSettingsService.WebSettingsScope.User)) {
            var launchCommonSettingsDialog = (e: JQueryKeyEventObject) => {
                Events_Action.getService().performAction(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, {
                    defaultTabId: TFS_Agile.TabControlsRegistrationConstants.BACKLOGS_TAB_ID
                });

                e.preventDefault();
            };

            $(".tfs-new-backlog-level-visibility-not-set-notification").addClass("visible").show()
                .find("a").click((e) => {
                    launchCommonSettingsDialog(e);
                }).keypress((e) => {
                    if (e.which === Utils_UI.KeyCode.ENTER || e.which === Utils_UI.KeyCode.SPACE) {
                        launchCommonSettingsDialog(e);
                    }
                });
        }
        else {
            $(".tfs-new-backlog-level-visibility-not-set-notification").removeClass("visible").hide();
        }
    }

    /** If the initial board model contains information about parent/children, store it for filter use */
    private _setInitialParentChildMap(boardModel: Boards.BoardModel, itemSource: Boards.ItemSource): void {
        if (boardModel.itemSource.parentPayload) {
            let parentChildMap = <Work_Contracts.ParentChildWIMap[]>boardModel.itemSource.parentPayload;

            // Removing any parentItems without childIds
            parentChildMap = parentChildMap.filter((value: Work_Contracts.ParentChildWIMap) => value.childWorkItemIds.length !== 0);

            // Setting the parentChildMap in itemSource
            itemSource.setParentChildMap(parentChildMap);
        }
    }

    private _createItemSource(itemSourceModel: any, teamId: string): Boards.WorkItemSource {
        var itemSource = new Boards.WorkItemSource(itemSourceModel, this._reorderManager);

        var annotationItemSources = Boards.Board.BoardAnnotationSettings.getApplicableAnnotationItemSources();
        if (annotationItemSources) {
            let annotationItemSourceInstance: Boards.AnnotationItemSource;
            annotationItemSources.forEach((annotationItemSource: string) => {
                if (Boards.annotationItemSourceTypeFactory.getConstructor(annotationItemSource)) {
                    annotationItemSourceInstance = Boards.annotationItemSourceTypeFactory.createInstance(annotationItemSource, [itemSource, teamId]);
                    itemSource.registerAnnotationItemSource(annotationItemSource, annotationItemSourceInstance);
                } else {
                    Boards.ItemSource.getItemSourceInitializationFuntion(annotationItemSource)(() => {
                        let annotationItemSourceInstance = Boards.annotationItemSourceTypeFactory.createInstance(annotationItemSource, [itemSource, teamId]);
                        itemSource.registerAnnotationItemSource(annotationItemSource, annotationItemSourceInstance);
                    });
                }
                //This is required even when annotationItemSourceInstance is null to ItemSource
                itemSource.registerAnnotationItemSource(annotationItemSource, annotationItemSourceInstance);
            });
        }

        return itemSource;
    }

    private _validateItemSource(itemSourceModel: any) {
        if (itemSourceModel.warningMessage) {
            this._setMessage(
                Utils_String.htmlEncode(itemSourceModel.warningMessage),
                itemSourceModel.error ? Notifications.MessageAreaType.Error : Notifications.MessageAreaType.Warning
            );
        }

        if (itemSourceModel.error) {
            this._clearStatusIndicator();
            this._loadState = BoardLoadState.LOAD_FAILED;
            return false;
        }

        return true;
    }

    private _placeItemsOnBoard(board: Boards.Board, itemSource: Boards.WorkItemSource) {
        var perfScenario = Performance.getScenarioManager().startScenario(Boards.KanbanTelemetry.CI_AREA_AGILE, Boards.KanbanTelemetry.Perf_Scenario_PlaceTiles);
        this._addCommonPerfScenarioData(perfScenario);

        board.beginPopulate(
            () => {
                perfScenario.addSplitTiming(Boards.KanbanTelemetry.Perf_Split_BeginPopulateSuccess);

                var nodeView = <NodeView>Controls.Enhancement.getInstance(NodeView, this._$topNodeView);
                this._performActionForAllMembers(nodeView, (memberView: MemberView) => {
                    memberView.placeTilesFromModel();
                });

                this._showBoard();

                perfScenario.addData({
                    itemCount: board.getItemSource().getItemCount(),
                    rowCount: board.getBoardSettings().rows.length,
                    columnCount: board.getBoardSettings().columns.length
                });

                perfScenario.end();
            },
            (error: TfsError) => {
                this._handleServerError(error);
            });
    }

    private _addCommonPerfScenarioData(scenario: Performance.IScenarioDescriptor) {
        scenario.addData({
            isInitialPageLoad: this._isInitialLoad,
            isEmbedded: EmbeddedHelper.isEmbedded()
        });
    }

    private _returnFirstTileInBoard(): Tile {
        var nodeView: NodeView = <NodeView>Controls.Enhancement.getInstance(NodeView, this._$topNodeView);

        var memberViews = nodeView.getAllLeafMemberViewsInElement();
        for (var i = 0, l = memberViews.length; i < l; i++) {
            var memberView = memberViews[i];
            var leftMostMemberView = memberView.getLeftMostLeafMemberView();
            if (leftMostMemberView) {
                var tile: Tile = leftMostMemberView.getFirstTileInMember();
                if (tile) {
                    return tile;
                }
            }
        }

        return null;
    }

    private _returnFirstBoardAddCard(): JQuery {
        var nodeView: NodeView = <NodeView>Controls.Enhancement.getInstance(NodeView, this._$topNodeView);

        var memberViews = nodeView.getAllLeafMemberViewsInElement();
        for (var i = 0, l = memberViews.length; i < l; i++) {
            var memberView = memberViews[i];
            if (memberView) {
                return memberView.getBoardAddCard();
            }
        }

        return null;
    }

    private _performActionForAllMembers(nodeView: NodeView, action: IFunctionPR<MemberView, void>) {
        var memberViews = nodeView.memberViews();
        for (var i = 0, l = memberViews.length; i < l; i++) {
            var memberView = memberViews[i];
            if (memberView.childNodeView()) {
                this._performActionForAllMembers(memberView.childNodeView(), action);
            }
            action(memberView);
        }
    }

    private _updateLayout(resizeEvent: JQueryEventObject, onBoardRefresh?: boolean) {
        /// <summary>Ensure the board takes up the available vertical space on the screen.
        /// Also Ensure the width of the board is conducive to viewing and managing tiles
        /// and the height of split column takes the entire space.</summary>
        ///<param name="resizeEvent" type="JQueryEventObject" optional="false">JQueryEvent created during a resize action on the window.</param>
        ///<param name="onBoardRefresh" type="Boolean" optional="true">Flag to indicate that this method is being called on board refresh/load.</param>
        if (this._board) {
            this._fixHeight();
            var topNodeView = <NodeViewHorizontal>Controls.Enhancement.getInstance(NodeView, this._$topNodeView);
            if (topNodeView) {
                topNodeView.updateLayout();

                if (onBoardRefresh === true) {
                    topNodeView.createMemberHeaderBorders();
                }
            }

            // Fire update event to notify reconstruction of Member Graph
            this.eventsHelper.fire(Boards.Notifications.BoardLayoutUpdated, this, this._board.getBoardSettings());
        }
    }

    /**
     * Ensure the board takes up the available vertical space on the screen
     */
    private _fixHeight() {
        let newHeight = 0;
        let $boardElement = this.getElement();

        // If we have no element, nothing to resize
        if (!$boardElement) {
            return;
        }

        if (!BoardsHubHelper.isXHRHub()) {
            let siblingsHeight = 0,
                totalHeight = $boardElement.parent().height();

            $boardElement.siblings(":visible").each(function () {
                var $element = $(this);
                siblingsHeight += $element.outerHeight(true);
            });

            const paddingTop = parseInt($boardElement.css("padding-top"), 10);
            // we dont want padding to affect height.
            newHeight = totalHeight - (siblingsHeight + paddingTop);
            $boardElement.height();
        }
        else {
            // In XHR Hub, get size based on the internal content host page size
            // minus the header space
            const totalContentHeight = $(".vss-PivotBar--content").height();
            const paddingTop = parseInt($boardElement.css("padding-top"), 10);
            const marginTop = parseInt($boardElement.css("margin-top"), 10);
            const topSectionHeight = $(".boards-content-top-section").outerHeight(/*includeMargin*/ true);
            newHeight = totalContentHeight - (topSectionHeight + paddingTop + marginTop);
        }
        // Only change height if we need to
        if ($boardElement.height() !== newHeight) {
            $boardElement.height(newHeight);
        }
    }

    private _clearRefreshNotification(): void {
        this.eventsHelper.fire(BoardViewToolbarContracts.Notifications.BoardHideManualRefresh);
    }

    /**
     * Used to unit test _handleVisibilityChanged() function.
     * Returns the visibility state of the current document.
     */
    private _isDocumentHidden(): boolean {
        return document.hidden;
    }

    private _handleVisibilityChanged(): void {
        if (this._isDocumentHidden()) {
            this._signalRDisconnectTimer = setTimeout(() => {
                // Clear the timeout when the session stays inactive for time interval more than the threshold.
                clearTimeout(this._signalRDisconnectTimer);
                this._signalRDisconnectTimer = null;
                this._publishAutoRefreshTelemetry("SignalRDisconnectedDueToTabInactiveness", {});
                this._teardownAutoRefresh();
            }, this._browserTabInactiveTimeInMillseconds);
        }
        else {
            if (!this._signalRDisconnectTimer) {
                this._publishAutoRefreshTelemetry("SignalRRestoredOnTabActive", {});
                // Do automatic inline board refresh when the session becomes active after the threshold time.
                // Calling _refreshBoard() will internally setup the signalR pipeline by calling _setupAutoRefresh() from _drawBoard().
                if (this._board && this._board.hasLockedItems()) {
                    this._board.setPendingBoardRefresh(true);
                }
                else {
                    this._refreshBoard();
                }
            }
            else {
                // Clear the timer when the session becomes active before the threshold time.
                clearTimeout(this._signalRDisconnectTimer);
                this._signalRDisconnectTimer = null;
            }
        }
    }

    public _attachReorderRequestComplete() {
        this._reorderManager.attachRequestComplete((source: TFS_Agile.IReorderManager, args: TFS_Agile.IReorderResult) => {
            // if reordered fail, display error message.
            if (!args.success &&
                (!args.processedOperations ||
                    args.processedOperations.some(x => !x.continueOnFailure))) {
                if (args.clientError) {
                    this._setMessage(Utils_String.format(AgileControlsResources.Kanban_StatusMessage_RecoverableError, args.error.message), Notifications.MessageAreaType.Error, () => {
                        this._reorderManager.resume();
                    });
                }
                else {
                    this._setMessage(Utils_String.format(AgileControlsResources.Kanban_StatusMessage_FatalError, args.error.message), Notifications.MessageAreaType.Error, () => {
                        window.location.reload();
                    });
                }
            }
        });
    }

    public board(board?: Boards.Board): Boards.Board {
        /// <summary>Get or set the board displayed by this board view</summary>
        /// <param name="board" type="VSS.Agile.Boards.Board">The board to set.</param>
        /// <returns type="VSS.Agile.Boards.Board">The current value of the board.</returns>

        Diag.logTracePoint("BoardView.board.start");
        if (board !== undefined) {
            // set the new board

            if (this._board && this._board !== board) {
                // detach from the old board
                this._board.dispose();
            }

            this._board = board;
            this.refresh(board);
        }
        Diag.logTracePoint("BoardView.board.complete");
        return this._board;
    }

    public refresh(board: Boards.Board) {
        /// <summary>Refresh the display of the board</summary>
        /// <param name="board" type="VSS.Agile.Boards.Board">The board with the refreshed contents.</param>
        Diag.Debug.assertParamIsType(board, Boards.Board, "board");
        Diag.Debug.assert(board === this._board, "Shouldn't be refreshing a board that we aren't managing");

        const $container = this._$topNodeView;

        // cleanup any existing structure
        if (this._rootNodeView) {
            this._rootNodeView.dispose();
            this._rootNodeView = null;
            $container.empty();
        }

        // Clear the "Assigned To" cache.
        CardControls.AssignedToFieldRenderer.initializeCache();

        this._rootNodeView = NodeView.createNodeView(board.rootNode(), $container, this.eventsHelper, this._options.team, { tileMap: new TFS_Core_Utils.Dictionary<Tile>(), itemTypes: board.itemTypes() });

        // Let consumers know there is a new board
        this.eventsHelper.fire(Boards.Notifications.BoardUpdated, this, { board: board });
    }

    /**
     *  Should be in sync with the path returned by BoardFilterSettingsManager.GetFilterRegistryPath
     */
    private _getFilterRegistryKey(boardId: string): string {
        return `Filters/Kanban/${boardId}/Filter`;
    }
}

VSS.classExtend(BoardView, TFS_Host_TfsContext.TfsContext.ControlExtensions);

if (!BoardsHubHelper.isXHRHub()) {
    const boardViewSelector: string = "." + BoardView.coreCssClass;
    const $dataIsland = $(".signalr-hub-url");
    let signalRHubUrl = "";
    if ($dataIsland.length > 0) {
        signalRHubUrl = Utils_Core.parseMSJSON($dataIsland.eq(0).html(), false).SignalRHubUrl;
    }

    const backlogContext = TFS_Agile.BacklogContext.getInstance();

    const boardViewOptions: IBoardViewOptions = {
        team: backlogContext.team,
        getBoardModel: () => {
            return LegacyBoardHelper.getBoardModelFromJSONIsland();
        },
        eventScopeId: `BoardView_${(new Date()).getTime().toString()}`,
        signalRHubUrl: signalRHubUrl
    };
    Controls.Enhancement.registerEnhancement(
        BoardView,
        boardViewSelector,
        boardViewOptions);
}

// Exporting this for the purpose of testing
export interface IMemberView {
    /**
     *  Used for testing. Hence making it optional
     */
    id?: number;
    /**
     *  Returns true if the member view has any item(card/tile) in it. Else it returns false. It does not traverse recursively.
     */
    hasItem(): boolean;
    /**
     *  Returns trus if the type of the member is "Incoming". Else it returns false.
     */
    isIncoming(): boolean;
    /**
     *  Returns trus if the type of the member is "Outgoing". Else it returns false.
     */
    isOutgoing(): boolean;
}

interface IMemberGraphNode {
    memberType: Boards.ColumnType;
    aboveNodeIndex: number;
    belowNodeIndex: number;
    rightNodeIndex: number;
    leftNodeIndex: number;
}

// Exporting this for the purpose of testing
export class MemberNavigationGraph {
    private _graphNodes: IMemberGraphNode[];
    private _leafMemberNodes: IMemberView[];
    private _numberOfColumnsInEachLane: number;

    constructor(memberViews: IMemberView[], numberOfRowsInBoard: number, numberOfColumnsInBoard: number) {
        this._initializeGraph(memberViews, numberOfRowsInBoard, numberOfColumnsInBoard);
    }

    public reconstructMemberGraph(memberViews: IMemberView[], numberOfRowsInBoard: number, numberOfColumnsInBoard: number): void {
        this._initializeGraph(memberViews, numberOfRowsInBoard, numberOfColumnsInBoard);
    }

    private _initializeGraph(memberViews: IMemberView[], numberOfRowsInBoard: number, numberOfColumnsInBoard: number): void {
        this._leafMemberNodes = memberViews;
        this._numberOfColumnsInEachLane = (this._leafMemberNodes.length - 2) / numberOfRowsInBoard;  // -2 to exclude incoming and outgoing
        this._graphNodes = [];

        this._constructMemberGraph();
    }

    /**
     *  Visual representation of the member navigation graph constructed from the leaf member views of the board
     *
     *    Sample set: A board with 2 swimlanes and 3 columns in each swimlane
     *
     *    - Leaf member views from the board in the same order as in the board level tree structure, stored in array
     *
     *    |'''|   |'''|   |'''|   |'''|   |'''|   |'''|   |'''|   |'''|                      0   - Member view of type "Incoming"
     *    | 0 |   | 1 |   | 2 |   | 3 |   | 4 |   | 5 |   | 6 |   | 7 |                    (1-6) - Member views of type "Inprogress"
     *    |   |   |   |   |   |   |   |   |   |   |   |   |   |   |   |                      7   - Member view of type "Outgoing"
     *    '''''   '''''   '''''   '''''   '''''   '''''   '''''   '''''
     *
     *    - Structure of the graph that is constructed using 4 indices per node - [top, bottom, right and left]
     *
     *               -1        -1        -1        -1        -1
     *                ^         ^         ^         ^         ^
     *                |         |         |         |         |
     *                |         |         |         |         |
     *              |'''|     |'''|     |'''|     |'''|     |'''|
     *              |   | <-- | 1 | --> | 2 | --> | 3 | <-- |   |
     *              |   | --> |   | <-- |   | <-- |   | --> |   |
     *              |   |     '''''     '''''     '''''     |   |
     *              |   |      ^ |       ^ |       ^ |      |   |                          (1-3) - Makes the first lane
     *       -1 <-- | 0 |      | |       | |       | |      | 7 | --> -1                   (4-6) - Makes the second lane
     *              |   |      | v       | v       | v      |   |
     *              |   |                                   |   |
     *              |   |     |'''|     |'''|     |'''|     |   |
     *              |   | <-- | 4 | --> | 5 | --> | 6 | --> |   |
     *              |   |     |   | <-- |   | <-- |   |     |   |
     *              '''''     '''''     '''''     '''''     '''''
     *                |         |         |         |         |
     *                |         |         |         |         |
     *                v         v         v         v         v
     *                -1        -1        -1        -1        -1
     *
     *
     */
    private _constructMemberGraph(): void {

        this._leafMemberNodes.forEach((leafNode: IMemberView, index: number) => {
            // Incoming Member is at index 0
            if (leafNode.isIncoming()) {
                this._graphNodes.push(
                    {
                        memberType: Boards.ColumnType.INCOMING,
                        aboveNodeIndex: -1,
                        belowNodeIndex: -1,
                        rightNodeIndex: index + 1,
                        leftNodeIndex: -1
                    });
            }

            // Outgoing Member is at last index
            else if (leafNode.isOutgoing()) {
                this._graphNodes.push(
                    {
                        memberType: Boards.ColumnType.OUTGOING,
                        aboveNodeIndex: -1,
                        belowNodeIndex: -1,
                        rightNodeIndex: -1,
                        leftNodeIndex: this._numberOfColumnsInEachLane
                    });
            }

            // InProgress Members folded including members in swimlanes
            else {
                this._graphNodes.push(
                    {
                        memberType: Boards.ColumnType.INPROGRESS,
                        aboveNodeIndex: index > this._numberOfColumnsInEachLane ? index - this._numberOfColumnsInEachLane : -1,
                        belowNodeIndex: (index + this._numberOfColumnsInEachLane) < this._leafMemberNodes.length - 1 ? index + this._numberOfColumnsInEachLane : -1,
                        rightNodeIndex: index % this._numberOfColumnsInEachLane == 0 ? this._leafMemberNodes.length - 1 : index + 1,
                        leftNodeIndex: index % this._numberOfColumnsInEachLane == 1 ? 0 : index - 1
                    });
            }
        });
    }

    /**
     *  Returns the next(right) member view for the provided member view, in the visual board
     *  @param {MemberView} memberView - the current member view for which the next member view to to be found
     *  @param {boolean} isNonEmptyMember - (optional) if true returns the next member which is not empty
     */
    public getNextMember(memberView: IMemberView, isNonEmptyMember?: boolean): IMemberView {
        if (!memberView) {
            return null;
        }

        var currentIndex = this._leafMemberNodes.indexOf(memberView);

        if (isNonEmptyMember !== undefined && isNonEmptyMember === true) {
            if (memberView.isOutgoing()) {
                return null;
            } else if (memberView.isIncoming()) {
                return this._firstNonEmptyRightSiblingOfIncoming(memberView);
            } else {
                return this._firstNonEmptySiblingOfInProgress(memberView, true);
            }
        } else {
            var siblingIndex: number = this._graphNodes[currentIndex].rightNodeIndex;
            if (siblingIndex >= 0) {
                return this._leafMemberNodes[siblingIndex];
            }
        }
        return null;
    }

    /**
     *  Returns the previous(left) member view for the provided member view, in the visual board
     *  @param {MemberView} memberView - the current member view for which the previous member view to to be found
     *  @param {boolean} isNonEmptyMember - (optional) if true returns the previous member which is not empty
     */
    public getPreviousMember(memberView: IMemberView, isNonEmptyMember?: boolean): IMemberView {
        if (!memberView) {
            return null;
        }

        var currentIndex = this._leafMemberNodes.indexOf(memberView);

        if (isNonEmptyMember !== undefined && isNonEmptyMember === true) {
            if (memberView.isIncoming()) {
                return null;
            } else if (memberView.isOutgoing()) {
                return this._firstNonEmptyLeftSiblingOfOutgoing(memberView);
            } else {
                return this._firstNonEmptySiblingOfInProgress(memberView, false);
            }
        } else {
            var siblingIndex: number = this._graphNodes[currentIndex].leftNodeIndex;
            if (siblingIndex >= 0) {
                return this._leafMemberNodes[siblingIndex];
            }
        }
        return null;
    }

    /**
     *  Returns the above member view for the provided member view, in the visual board
     *  @param {MemberView} memberView - the current member view for which the above member view to to be found
     *  @param {boolean} isNonEmptyMember - (optional) if true returns the above member which is not empty
     */
    public getAboveMember(memberView: IMemberView, isNonEmptyMember?: boolean): IMemberView {
        if (!memberView) {
            return null;
        }

        var currentIndex = this._leafMemberNodes.indexOf(memberView);
        var siblingIndex: number = this._graphNodes[currentIndex].aboveNodeIndex;

        if (siblingIndex >= 0) {
            var aboveMember = this._leafMemberNodes[siblingIndex];
            if (isNonEmptyMember) {
                while (aboveMember) {
                    if (aboveMember.hasItem()) {
                        return aboveMember;
                    } else {
                        var nonEmptySibling = this._getFirstNonEmptySiblingMemberInLane(aboveMember);
                        if (nonEmptySibling) {
                            return nonEmptySibling;
                        }
                    }
                    aboveMember = this.getAboveMember(aboveMember);
                }
            }
            return aboveMember;
        }
        return null;
    }

    /**
     *  Returns the below member view for the provided member view, in the visual board
     *  @param {MemberView} memberView - the current member view for which the below member view is to be found
     *  @param {boolean} isNonEmptyMember - (optional) if true returns the below member which is not empty
     */
    public getBelowMember(memberView: IMemberView, isNonEmptyMember?: boolean): IMemberView {
        if (!memberView) {
            return null;
        }

        var currentIndex = this._leafMemberNodes.indexOf(memberView);
        var siblingIndex: number = this._graphNodes[currentIndex].belowNodeIndex;

        if (siblingIndex >= 0) {
            var belowMember = this._leafMemberNodes[siblingIndex];
            if (isNonEmptyMember) {
                while (belowMember) {
                    if (belowMember.hasItem()) {
                        return belowMember;
                    } else {
                        var nonEmptySibling = this._getFirstNonEmptySiblingMemberInLane(belowMember);
                        if (nonEmptySibling) {
                            return nonEmptySibling;
                        }
                    }
                    belowMember = this.getBelowMember(belowMember);
                }
            }
            return belowMember;
        }
        return null;
    }

    /**
     *  Returns the first non-empty sibling member in the lane for the given member view. Does not traverse beyond the lane.
     *  Traverses to the right and left of the given member, one step at a time, using the graph
     *  If both right and left non-empty members are at the same displacement from the memberview, the right sibling is returned
     *  @param {MemberView} memberView - the current member view for which the closest non-empty sibling is to be found
     */
    private _getFirstNonEmptySiblingMemberInLane(memberView: IMemberView): IMemberView {
        if (!memberView) {
            return null;
        }

        // Assert if the current member is of InProgress
        if (memberView.isIncoming() || memberView.isOutgoing()) {
            return;
        }

        var currentType = this._graphNodes[this._leafMemberNodes.indexOf(memberView)].memberType;
        var leftMember: IMemberView = this.getPreviousMember(memberView);
        var rightMember: IMemberView = this.getNextMember(memberView);

        while (leftMember !== null || rightMember !== null) {
            if (rightMember) {
                if (this._graphNodes[this._leafMemberNodes.indexOf(rightMember)].memberType !== currentType) {
                    rightMember = null;
                } else {
                    if (rightMember.hasItem()) {
                        return rightMember;
                    }
                    rightMember = this.getNextMember(rightMember);
                }
            }
            if (leftMember) {
                if (this._graphNodes[this._leafMemberNodes.indexOf(leftMember)].memberType !== currentType) {
                    leftMember = null;
                } else {
                    if (leftMember.hasItem()) {
                        return leftMember;
                    }
                    leftMember = this.getPreviousMember(leftMember);
                }
            }
        }
        return null;
    }

    /**
     *  Returns the first non-empty sibling member for a member view of type "Inprogress"
     *  @param {MemberView} memberView - the current member view for which the non-empty sibling is to be found
     */
    private _firstNonEmptySiblingOfInProgress(memberView: IMemberView, rightSibling?: boolean): IMemberView {
        if (!memberView) {
            return null;
        }

        // Assert if the current member is of InProgress
        if (memberView.isIncoming() || memberView.isOutgoing()) {
            return;
        }

        if (rightSibling) {
            var rightMember: IMemberView = this.getNextMember(memberView);
            while (rightMember !== null) {
                if (rightMember.hasItem()) {
                    return rightMember;
                }
                rightMember = this.getNextMember(rightMember);
            }
        } else {
            var leftMember: IMemberView = this.getPreviousMember(memberView);
            while (leftMember !== null) {
                if (leftMember.hasItem()) {
                    return leftMember;
                }
                leftMember = this.getPreviousMember(leftMember);
            }
        }
        return null;
    }

    /**
     *  Returns the first non-empty right sibling member for a member view of type "Incoming"
     *  @param {MemberView} memberView - the current member view for which the non-empty right sibling is to be found
     */
    private _firstNonEmptyRightSiblingOfIncoming(memberView: IMemberView): IMemberView {
        if (!memberView) {
            return null;
        }

        var currentIndex = this._leafMemberNodes.indexOf(memberView);

        // Assert if the current member is of Incoming
        if (!memberView.isIncoming()) {
            return;
        }

        // Traversing both Inprogress and Outgoing in sequence
        var siblingIndex = currentIndex;
        while (++siblingIndex <= this._leafMemberNodes.length - 1) {
            var sibling: IMemberView = this._leafMemberNodes[siblingIndex];

            if (sibling === null || !sibling.hasItem()) {
                continue;
            }

            var leftMember: IMemberView = this.getPreviousMember(sibling);
            while (leftMember !== null) {
                if (leftMember.hasItem()) {
                    break;
                }
                leftMember = this.getPreviousMember(leftMember);
            }
            if (leftMember === memberView) {
                return sibling;
            }
        }
        return null;
    }

    /**
     *  Returns the first non-empty left sibling member for a member view of type "Outgoing"
     *  @param {MemberView} memberView - the current member view for which the non-empty left sibling is to be found
     */
    private _firstNonEmptyLeftSiblingOfOutgoing(memberView: IMemberView): IMemberView {
        if (!memberView) {
            return null;
        }

        // Assert if the current member is of Outcoming
        if (!memberView.isOutgoing()) {
            return null;
        }

        var siblingIndex = 0;
        // Traversing Inprogress first
        while (++siblingIndex < this._leafMemberNodes.length - 1) {
            var sibling: IMemberView = this._leafMemberNodes[siblingIndex];

            if (sibling === null || !sibling.hasItem()) {
                continue;
            }

            var rightMember: IMemberView = this.getNextMember(sibling);
            while (rightMember !== null) {
                if (rightMember.hasItem()) {
                    break;
                }
                rightMember = this.getNextMember(rightMember);
            }
            if (rightMember === memberView) {
                return sibling;
            }
        }

        // Traverse Incoming when there are no non-empty members in Inprogress
        var sibling: IMemberView = this._leafMemberNodes[0];
        if (sibling !== null && sibling.hasItem()) {
            return sibling;
        }

        // If no suitable sibling in both InProgress and InComing, return null
        return null;
    }

    public dispose() {
        this._leafMemberNodes = null;
        this._graphNodes = null;
    }
}

/**
 * Options for the EditableLabelControl control
 * @param value Text of the label
 * @param canEdit If the user has permissions to edit the label
 * @param contentCssClass Css class for the content of the label
 * @param onBeginSave Method that gets invoked on pressing "Enter"
 * @param validate Optional, method that gets invoked to validate the new text of the label
 * @param onEditModeStateChanged Optional, method that gets invoked when the edit mode is toggled
 * @param editModeOffset Optional, offset if nay for the error popup
 * @param readOnlyHeaderPadding Optional, header padding in the readonly mode, if applicable
 * @param adjustWidth Optional, suggests if the width needs to adjusted to fit the container
 */
export interface IEditableLabelControlOptions {
    value: string;
    canEdit: boolean;
    contentCssClass: string;
    onBeginSave: (newValue: string) => IPromise<boolean>;
    eventsHelper: ScopedEventHelper;
    validate?: (newValue: string) => string;
    onEditModeStateChanged?: (sender: JQuery, editModeOn: boolean) => void;
    editModeOffset?: number;
    readOnlyHeaderPadding?: number;
    id?: string;
    editableInputAriaLabel?: string;
}

/**
 * Interface passed as parameter when the header's name is changing
 */
export interface IMemberHeaderChangingArguments {
    /**
     * Unique identifier for the change. This is a GUID.
     */
    id: string;

    /**
     * Initial name
     */
    originalName: string;

    /**
     * Modified name
     */
    newName: string;
}