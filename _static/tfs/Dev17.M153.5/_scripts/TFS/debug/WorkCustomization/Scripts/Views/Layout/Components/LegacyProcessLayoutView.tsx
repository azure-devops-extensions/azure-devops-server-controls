/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!Process";

import * as React from "react";
import { LegacyComponent, ILegacyComponentProps, ILegacyComponentState } from "Presentation/Scripts/TFS/Components/LegacyComponent";

import AdminProcessCommon = require("Admin/Scripts/TFS.Admin.Process.Common");
import { ProcessLayoutView } from "Admin/Scripts/TFS.Admin.Process.Layout";
import Controls = require("VSS/Controls");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export interface ILegacyProcessLayoutViewProps extends ILegacyComponentProps {
    options: AdminProcessCommon.ProcessControlOptions.ProcessAndWorkItemType;
}

export interface ILegacyProcessLayoutViewState extends ILegacyComponentState {
}

export class LegacyProcessLayoutView
    extends LegacyComponent<ProcessLayoutView, ILegacyProcessLayoutViewProps, ILegacyProcessLayoutViewState> {

    public shouldComponentUpdate(nextProps: ILegacyProcessLayoutViewProps, nextState: ILegacyProcessLayoutViewState): boolean {
        return false;
    }

    public createControl(element: HTMLElement, props: ILegacyProcessLayoutViewProps, state: ILegacyProcessLayoutViewState): ProcessLayoutView {
        var control = Controls.Control.create(ProcessLayoutView, $(element), $.extend({ tfsContext: tfsContext }, this.props.options));
        return control;
    }

    public updateControl(element: HTMLElement, props: ILegacyProcessLayoutViewProps, state: ILegacyProcessLayoutViewState) {
        if (this._control) {
            super.updateControl(element, props, state);
        }
    }

    public componentDidMount() {
        var templateId = "tabstrip-collection-template";
        // this is the KO template that the layout view control uses, inject it into the DOM if it doesn't already exist
        if (document.getElementById(templateId) == null) {
            const script = document.createElement("script");
            script.innerHTML = `<div class="tabstrip-collection" data-bind="foreach: tabs, sortable: tabs">
                <div class="tabstrip" tabindex="0" role="none" data-bind="attr: {'aria-label': tabArialabel}, selectTabHandler: $data, tabMenuRightClickHandler: $data ,css: { 'page-hidden': $data.isHiddenFromLayout(), 'active': $parent.activeTabIndex() == $index(), 'unsortable': !$data.isSortable() }">
                    <div class="header-gripper" data-bind="visible: $parent.tabs().length != 1 && isSortable()" />
                    <!-- ko if: $data.iconClass -->
                    <span class="header-icon" data-bind="css: $data.iconClass"></span>
                    <!-- /ko -->
                    <div class="header" role="heading" aria-level={2} data-bind="text: tabName" />
                    <div class="icon bowtie-icon bowtie-ellipsis tabstrip-menu" role="button" tabindex="0" data-bind="tabMenuClickHandler: $data, attr: {'aria-label': buttonAriaLabel}" />
                    <div class="icon bowtie-icon bowtie-status-error" data-bind="visible: !isValid()" />
                </div>
            </div>`;
            script.id = templateId;
            script.type = "text/html";

            document.body.appendChild(script);
        }

        super.componentDidMount();
    }
}