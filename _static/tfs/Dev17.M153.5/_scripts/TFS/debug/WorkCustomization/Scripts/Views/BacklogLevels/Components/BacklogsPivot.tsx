/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/BacklogLevels/Components/BacklogsPivot";
import * as React from "react";
import { Component, Props, State } from "VSS/Flux/Component";
import { getProcessesDataStore } from "WorkCustomization/Scripts/Stores/ProcessesDataStore";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import * as Interfaces from "Admin/Scripts/BacklogLevels/Interfaces";
import * as BacklogLevelsComponent from "Admin/Scripts/BacklogLevels/Components/BacklogLevelsComponent";
import { Store } from "Admin/Scripts/BacklogLevels/Stores/Store";
import { ActionsHub } from "Admin/Scripts/BacklogLevels/Actions/ActionsHub";
import { ActionsCreator } from "Admin/Scripts/BacklogLevels/Actions/ActionsCreator";
import { BacklogsPivotStore } from "WorkCustomization/Scripts/Views/BacklogLevels/Stores/BacklogsPivotStore";

export class BacklogsPivot extends Component<Props, State> {
    private _store: BacklogsPivotStore;
    private _actionsHub: ActionsHub;
    private _processDescriptor: Interfaces.IProcessDescriptor;

    constructor(props: Props) {
        super(props);

        this._actionsHub = new ActionsHub();

        let processName: string = UrlUtils.getCurrentProcessNameFromUrl();
        let process = getProcessesDataStore().getProcessByName(processName);
        this._processDescriptor = {
            processTypeId: process.templateTypeId,
            inherits: process.parentTemplateTypeId,
            isInherited: process.isInheritedTemplate,
            canEdit: process.isInheritedTemplate && process.editPermission
        } as Interfaces.IProcessDescriptor;
        this._store = new BacklogsPivotStore(this._actionsHub);
    }

    public render(): JSX.Element {
        var props: BacklogLevelsComponent.IBacklogLevelsComponentProps = {
            store: new Store(this._actionsHub, this._processDescriptor),
            actionsCreator: new ActionsCreator(this._actionsHub, this._processDescriptor),
        };

        return (
            <div className="backlogs-pivot">
                <BacklogLevelsComponent.BacklogLevelsComponent {...props} />
            </div>
        );
    }

    public getStore(): BacklogsPivotStore {
        return this._store;
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();
        this._store.dispose();
    }
}