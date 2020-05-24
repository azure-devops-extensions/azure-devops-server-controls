/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import Component_Base = require("VSS/Flux/Component");
import { Control } from "VSS/Controls";

import { BuildAdminSettingsTab } from "Build/Scripts/AdminView";
import { HtmlTemplates } from "Build/Scripts/AdminBuildAndRelease/Html/Templates";
import TfsTaskUtils = require("DistributedTasksCommon/TFS.Tasks.Utils");

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!BuildStyles";

export interface AdminSettingsViewState extends Component_Base.State {
}

export class AdminSettingsView extends Component_Base.Component<Component_Base.Props, AdminSettingsViewState> {
    constructor(props: Component_Base.Props) {
        super(props);
    }

    componentWillMount() {
        TfsTaskUtils.HtmlHelper.renderTemplateIfNeeded("buildvnext_admin_settings_tab", HtmlTemplates.AdminSettingsTab);
    }

    componentDidMount() {
        this._control = Control.create(BuildAdminSettingsTab, $(this._buildAdminTabsRef), {}) as BuildAdminSettingsTab;
        Control.enhance(BuildAdminSettingsTab, $(this._buildAdminTabsRef));
    }

    componentWillUnMount() {
        this._control.dispose();
    }

    public render(): JSX.Element {
        return (<div ref={(element) => { this._buildAdminTabsRef = element; }} />);
    }

    private _control: BuildAdminSettingsTab;
    private _buildAdminTabsRef: HTMLDivElement;
}