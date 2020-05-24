
import ScaledAgileResources = require("ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile");

import { ShortcutGroupDefinition } from "TfsCommon/Scripts/KeyboardShortcuts";

import { MovementType } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineModels";
import { HorizontalDirection } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";
import { IViewActionsCreator } from "ScaledAgile/Scripts/Main/Actions/ViewActionsCreator";
import { IDeliveryTimeLineActionsCreator } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Actions/DeliveryTimeLineActionsCreator";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { PageLoadingState } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import * as EventsServices from "VSS/Events/Services";
import { DeliveryTimeLineEvents } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Models/DeliveryTimeLineInterfaces";

export class DeliveryTimelineShortcutGroup extends ShortcutGroupDefinition {
    private _shortcutsRegistered: boolean;
    private _setPageLoadingStateListener: (state: PageLoadingState) => void;

    constructor(private _actionsCreator: IDeliveryTimeLineActionsCreator,
        private _viewsActionCreator: IViewActionsCreator,
        private _pageActions: PageActions) {

        super(ScaledAgileResources.DeliveryTimelineShortcutsTitle);

        this._setPageLoadingStateListener = (state: PageLoadingState) => this._onSetPageLoadingState(state);
        this._pageActions.setPageLoadingState.addListener(this._setPageLoadingStateListener);
    }

    public dispose() {
        if (this._setPageLoadingStateListener) {
            this._pageActions.setPageLoadingState.removeListener(this._setPageLoadingStateListener);
            this._setPageLoadingStateListener = null;
        }

        if (this._shortcutsRegistered) {
            this.removeShortcutGroup();
            this._shortcutsRegistered = false;
        }
    }

    public registerShortcuts() {
        if (!this._shortcutsRegistered) {
            this._registerFocusOnFirstAvailableItem();
            this._registerOpenWorkItem();
            this._registerNewItem();
            this._registerMoveCard();
            this._registerMovement();
            this._registerExpandCollapseAll();
            this._registerToggleTitleOnlyCards();
            this._registerSelectTeam();
            this._registerFilterBarShortcut();

            this._shortcutsRegistered = true;
        }
    }

    private _onSetPageLoadingState(state: PageLoadingState) {
        if (state === PageLoadingState.WithMinimumData) {
            this.registerShortcuts();
        }
    }

    private _registerOpenWorkItem() {
        this.registerShortcut("enter", {
            description: ScaledAgileResources.DeliveryTimelineShortcutOpenItem,
            action: () => { },
            allowPropagation: true // Since Enter key is used for other common shortcuts/buttons also
        });
    }

    private _registerMovement() {
        this.registerShortcut("shift+left", {
            description: ScaledAgileResources.DeliveryTimelineShortcutPanLeft,
            action: () => this._actionsCreator.panViewportHorizontal(HorizontalDirection.Left, MovementType.Shortcut)
        });
        this.registerShortcut("shift+right", {
            description: ScaledAgileResources.DeliveryTimelineShortcutPanRight,
            action: () => this._actionsCreator.panViewportHorizontal(HorizontalDirection.Right, MovementType.Shortcut)
        });
    }

    private _registerExpandCollapseAll() {
        this.registerShortcut("u", {
            description: ScaledAgileResources.DeliveryTimelineShortcutCollapseAll,
            action: () => this._actionsCreator.collapseAllTeams()
        });
        this.registerShortcut("o", {
            description: ScaledAgileResources.DeliveryTimelineShortcutExpandAll,
            action: () => this._actionsCreator.expandAllTeams()
        });
    }

    private _registerToggleTitleOnlyCards() {
        this.registerShortcut("t", {
            description: ScaledAgileResources.DeliveryTimelineShortcutToggleTitle,
            action: () => this._actionsCreator.toggleCardTitleOnly()
        });
    }

    private _registerFocusOnFirstAvailableItem() {
        this.registerShortcut("home", {
            description: ScaledAgileResources.DeliveryTimelineShortcutSetFocusOnFirstAvailableItem,
            action: () => this._actionsCreator.focusFirstObject()
        });
    }

    private _registerNewItem() {
        // This doesn't do anything because it will steal the key events from React but we want to add the text to the help menu.
        this.registerShortcut("n", {
            description: ScaledAgileResources.AddNewCardButtonLabel,
            action: () => { },
            allowPropagation: true
        });
    }

    private _registerSelectTeam() {
        // These don't do anything because they will steal the key events from React but we want to add the text to the help menu.
        this.registerShortcut("shift+pageup", {
            description: ScaledAgileResources.DeliveryTimelineShortcutSetFocusOnPreviousTeam,
            action: () => { }
        });
        this.registerShortcut("shift+pagedown", {
            description: ScaledAgileResources.DeliveryTimelineShortcutSetFocusOnNextTeam,
            action: () => { }
        });
    }

    private _registerMoveCard() {
        // These don't do anything because cards listen for this themselves - this just adds the text to the help menu.
        this.registerShortcut("mod+up", {
            description: ScaledAgileResources.DeliveryTimelineShortcutMoveCardUp,
            action: () => { }
        });
        this.registerShortcut("mod+down", {
            description: ScaledAgileResources.DeliveryTimelineShortcutMoveCardDown,
            action: () => { }
        });
        this.registerShortcut("mod+left", {
            description: ScaledAgileResources.DeliveryTimelineShortcutMoveCardLeft,
            action: () => { }
        });
        this.registerShortcut("mod+right", {
            description: ScaledAgileResources.DeliveryTimelineShortcutMoveCardRight,
            action: () => { }
        });
    }

    private _registerFilterBarShortcut() {
        this.registerShortcut("mod+shift+f", {
            description: ScaledAgileResources.DeliveryTimelineShortcutFilterResults,
            action: () => {
                EventsServices.getService().fire(DeliveryTimeLineEvents.SHOW_AND_FOUCS_PLANFILTER_KEY_PRESSED, this);                
            }
        });
    }
}
