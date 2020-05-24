import { IFilterBarItem } from "Build/Scenarios/CI/Types";

import { Action } from "VSS/Flux/Action";

import { IPivotBarAction } from 'VSSUI/PivotBar';
import { IFilterState } from "VSSUI/Utilities/Filter";

export interface IHubActionCreatorProps {
    actionHub?: HubActionHub;
}

export class HubActionCreator {
    private _actionHub: HubActionHub;
    constructor(options: IHubActionCreatorProps) {
        this._actionHub = options.actionHub || new HubActionHub();
    }

    public addCommands(commands: IPivotBarAction[]) {
        this._actionHub.newCommandsAvailable.invoke(commands);
    }

    public addFilters(filterItems: IFilterBarItem[]) {
        this._actionHub.newFilterItems.invoke(filterItems);
    }
}

export class HubActionHub {
    private _newCommandsAvailable: Action<IPivotBarAction[]>;
    private _newFilterItems: Action<IFilterBarItem[]>;
    private _filterState: Action<IFilterState>;

    constructor() {
        this._newCommandsAvailable = new Action<IPivotBarAction[]>();
        this._newFilterItems = new Action<IFilterBarItem[]>();
    }

    public get newCommandsAvailable(): Action<IPivotBarAction[]> {
        return this._newCommandsAvailable;
    }

    public get newFilterItems(): Action<IFilterBarItem[]> {
        return this._newFilterItems;
    }
}
