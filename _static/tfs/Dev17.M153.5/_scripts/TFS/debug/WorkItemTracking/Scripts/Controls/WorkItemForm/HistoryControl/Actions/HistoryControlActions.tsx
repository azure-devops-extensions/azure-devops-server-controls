import TFS_React = require("Presentation/Scripts/TFS/TFS.React");
import { IHistoryItem, IResolvedLink } from "WorkItemTracking/Scripts/Controls/WorkItemForm/HistoryControl/Interfaces";

export interface ToggleGroupArgs {
    groupIndex: number;
    isCollapsed: boolean;
}

export interface ResolveLinksArgs {
    item: IHistoryItem;
    resolvedLinks: IResolvedLink[];
}

export class HistoryControlActionSet {
    private _toggleGroup: TFS_React.Action<ToggleGroupArgs>;
    private _selectHistoryItem: TFS_React.Action<number>;
    private _selectPreviousItem: TFS_React.Action<any>;
    private _selectNextItem: TFS_React.Action<any>;
    private _selectFirstItem: TFS_React.Action<any>;
    private _selectLastItem: TFS_React.Action<any>;
    private _forceFocusSelectedItem: TFS_React.Action<any>;
    private _resolveLinks: TFS_React.Action<ResolveLinksArgs>;

    constructor() {
        this._toggleGroup = new TFS_React.Action<ToggleGroupArgs>();
        this._selectHistoryItem = new TFS_React.Action<number>();
        this._selectPreviousItem = new TFS_React.Action<any>();
        this._selectNextItem = new TFS_React.Action<any>();
        this._selectFirstItem = new TFS_React.Action<any>();
        this._selectLastItem = new TFS_React.Action<any>();
        this._forceFocusSelectedItem = new TFS_React.Action<any>();
        this._resolveLinks = new TFS_React.Action<ResolveLinksArgs>();
    }

    public toggleGroup(): TFS_React.Action<ToggleGroupArgs> {
        return this._toggleGroup;
    }

    public historyItemSelected(): TFS_React.Action<number> {
        return this._selectHistoryItem;
    }

    public selectPreviousItem(): TFS_React.Action<any> {
        return this._selectPreviousItem;
    }

    public selectNextItem(): TFS_React.Action<any> {
        return this._selectNextItem;
    }

    public selectFirstItem(): TFS_React.Action<any> {
        return this._selectFirstItem;
    }

    public selectLastItem(): TFS_React.Action<any> {
        return this._selectLastItem;
    }

    public forceFocusSelectedItem(): TFS_React.Action<any> {
        return this._forceFocusSelectedItem;
    }

    public resolveLinks(): TFS_React.Action<ResolveLinksArgs> {
        return this._resolveLinks;
    }

}

