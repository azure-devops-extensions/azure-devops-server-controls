import { autobind } from "OfficeFabric/Utilities";

import { HistoryActionsHub } from "Wiki/Scenarios/History/HistoryActionsHub";
import { SharedActionCreator } from "Wiki/Scenarios/Shared/SharedActionCreator";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { WikiActionIds } from "Wiki/Scripts/CommonConstants";

export interface Sources {
}

export class HistoryActionCreator {
    constructor(
        private _sharedActionCreator: SharedActionCreator,
        private _actionsHub: HistoryActionsHub,
        private _sources: Sources,
    ) { }

    public viewPage(pagePath: string): void {
        this._sharedActionCreator.updateUrl(
            {
                action: WikiActionIds.View,
                pagePath: pagePath,
                anchor: null,
                template: null,
            }
        );
    }
}
