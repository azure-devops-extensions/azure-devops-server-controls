/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!Process";

import * as React from "react";
import { LegacyComponent, ILegacyComponentProps, ILegacyComponentState } from "Presentation/Scripts/TFS/Components/LegacyComponent";

import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import { ProcessStatesView } from "Admin/Scripts/TFS.Admin.Process.States";
import Controls = require("VSS/Controls");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export interface ILegacyWorkItemTypeStatesViewProps extends ILegacyComponentProps {
    options: AdminProcessCommon.ProcessControlOptions.ProcessAndWorkItemType;
}

export interface ILegacyWorkItemTypesStatesViewState extends ILegacyComponentState {
}

export class LegacyWorkItemTypeStatesView
    extends LegacyComponent<ProcessStatesView, ILegacyWorkItemTypeStatesViewProps, ILegacyWorkItemTypesStatesViewState> {

    public createControl(element: HTMLElement, props: ILegacyWorkItemTypeStatesViewProps, state: ILegacyWorkItemTypesStatesViewState): ProcessStatesView {
        var control = Controls.Control.create(ProcessStatesView, $(element).addClass("work-item-states-legacy-wrap"), $.extend({ tfsContext: tfsContext }, this.props.options));
        return control;
    }

    public updateControl(element: HTMLElement, props: ILegacyWorkItemTypeStatesViewProps, state: ILegacyWorkItemTypesStatesViewState) {
        if (this._control) {
            super.updateControl(element, props, state);
        }
    }
}