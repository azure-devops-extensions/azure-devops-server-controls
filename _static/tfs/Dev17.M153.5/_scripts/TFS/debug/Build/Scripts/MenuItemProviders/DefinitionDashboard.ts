import * as React from "react";
import * as Q from "q";

import { DefinitionDashboardSource } from "Build/Scripts/Sources/DefinitionDashboard";
import { IBaseMenuItemProvider } from "Build/Scripts/MenuItemProviders/IBaseMenuItemProvider";

import { BuildDefinitionReference } from "TFS/Build/Contracts";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";

import { PushToDashboardTitle } from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { Dashboard } from "TFS/Dashboards/Contracts";

const Action = "MENU_ITEM_DEFINITION_DASHBOARD";

export class DefinitionDashboardMenuItemProvider implements IBaseMenuItemProvider<BuildDefinitionReference> {
    private _source: DefinitionDashboardSource = null;
    private _promise: IPromise<Dashboard[]> = null;

    constructor() {
        this._source = new DefinitionDashboardSource();
    }

    public getAsyncMenuItem(data: BuildDefinitionReference, itemIsAvailable: (item: IContextualMenuItem) => void) {
        itemIsAvailable({
            key: Action,
            name: PushToDashboardTitle,
            iconProps: { className: "bowtie-icon bowtie-math-plus-light" },
            data: data,
            onClick: () => { this._source.pushToDashboard(data) }
        });
    }
}

var _singleton: DefinitionDashboardMenuItemProvider = null;
export function getSingleton(): DefinitionDashboardMenuItemProvider {
    if (!_singleton) {
        _singleton = new DefinitionDashboardMenuItemProvider();
    }

    return _singleton;
}