/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import { Control } from "VSS/Controls";

import { AdminResourceLimitsTab } from "Build/Scripts/AdminView";
import { HtmlTemplates } from "Build/Scripts/AdminBuildAndRelease/Html/Templates";
import TfsTaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!BuildStyles";

export interface AdminResourceLimitsViewState extends Component_Base.State {
}

export class AdminResourceLimitsView extends Component_Base.Component<Component_Base.Props, AdminResourceLimitsViewState> {
    constructor(props: Component_Base.Props) {
        super(props);
    }

    componentWillMount() {
        TfsTaskUtils.HtmlHelper.renderTemplateIfNeeded("br_admin_resourcelimits_tab", HtmlTemplates.AdminResourceLimitsTab);
    }

    componentDidMount() {
        this._control = Control.create(AdminResourceLimitsTab, $(this._buildAdminTabsRef), {}) as AdminResourceLimitsTab;
        Control.enhance(AdminResourceLimitsTab, $(this._buildAdminTabsRef));
    }

    componentWillUnMount() {
        this._control.dispose();
    }

    public render(): JSX.Element {
        return (<div ref={(element) => { this._buildAdminTabsRef = element; }} />);
    }

    private _control: AdminResourceLimitsTab;
    private _buildAdminTabsRef: HTMLDivElement;
}