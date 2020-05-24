/**
 *  Define contracts (interfaces, events) between BoardView and a toolbar that offers services like filtering, search,
 *  live updates, etc.
 */

/**
 *  Notifications published and consumed by BoardView and its associated toolbar.
 */
export module Notifications {
    export var BoardToolbarMenuItemNeedsUpdate = "VSS.Agile.Boards.Toolbar.MenuItemNeedsUpdate";
    export var BoardMembersDataSetCompleteInquiry = "VSS.Agile.Boards.Toolbar.BoardMembersDataSetCompleteInquiry";
    export var BoardMembersDataSetComplete = "VSS.Agile.Boards.Toolbar.BoardMembersDataSetCompleteQuery";
    export var BoardActivateSearch = "VSS.Agile.Boards.Toolbar.BoardActivateSearch";
    export var BoardSearchInputChanged = "VSS.Agile.Boards.Toolbar.BoardSearchInputChanged";
    export var BoardDeactivateSearch = "VSS.Agile.Boards.Toolbar.BoardDeactivateSearch";
    export var BoardAutoRefreshEnabled = "VSS.Agile.Boards.Toolbar.BoardAutoRefreshEnabled";
    export var BoardAutoRefreshDisabled = "VSS.Agile.Boards.Toolbar.BoardAutoRefreshDisabled";
    export var BoardShowManualRefresh = "VSS.Agile.Boards.Toolbar.BoardShowManualRefresh";
    export var BoardHideManualRefresh = "VSS.Agile.Boards.Toolbar.BoardHideManualRefresh";
    export var BoardFilterUpdated = "VSS.Agile.Boards.Toolbar.BoardFilterUpdated";
}

/**
 *  Shared command identifiers between BoardView and its associated toolbar.
 */
export module CommandIds {
    export var ToggleAutoRefreshStateCommand: "toggle-auto-refresh-state";
}

export interface IToolbarMenuItemUpdateEventArgs {
    toggled?: boolean;
    disabled?: boolean;
    hidden?: boolean;
}

export interface IKnownToolbarMenuItemUpdateEventArgs extends IToolbarMenuItemUpdateEventArgs {
    id: string;
}

export interface IBoardAutoRefreshSettingsChangedEventArgs {
    autoRefreshState: boolean;
}

export interface IBoardFilterUpdated {
    isFilterApplied: boolean;
}

export interface IBoardShowManualRefreshEventArgs {
    message: string;
    eventName: string;
}