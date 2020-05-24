import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";

import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Controls from "VSS/Controls";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import "Admin/Scripts/TFS.Admin.Security";
import "VersionControl/Scripts/Controls/AdminGitRepositoriesTree";
import "VersionControl/Scripts/Controls/AdminOptionsInfoBar";
import "VersionControl/Scripts/Controls/AdminRepositoryOptionsControl";
import "VersionControl/Scripts/TFS.VersionControl.AdminView";

SDK_Shim.registerContent("versionControlsecurityView.initialize", (context: SDK_Shim.InternalContentContextData): void => {

    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<SecurityViewComponentProps>("ms.vss-code-web.version-control-admin-data-provider");

    ReactDOM.render(
        <SecurityViewComponent {...pageData} />,
        context.container);
});

interface SecurityViewComponentProps {
    maxNumberOfConfigurableBranchesForSearch: string;    
    viewOptionsJson: string;
}

class SecurityViewComponent extends React.Component<SecurityViewComponentProps, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find(".options").html(this.props.viewOptionsJson);
        $container.find(".max-configurable-branches-search").html(this.props.maxNumberOfConfigurableBranchesForSearch);
        VSS.globalProgressIndicator.registerProgressElement($container.find(".pageProgressIndicator"));

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        return (
            <div className={"hub-view explorer vc-admin-view main-container"} ref={this._ensureEnhancements}>           
                <script className="options"  type="application/json"></script>
                <script className="max-configurable-branches-search"  type="application/json"></script>
                <div className="hub-content">        
                    <div className="splitter horizontal hub-splitter toggle-button-enabled toggle-button-hotkey-enabled">
                        <div className="leftPane hotkey-section hotkey-section-0" role="navigation">
                            <div className="left-hub-content">
                                <div className="vc-admin-left-pane">
                                    <div className="vc-admin-left-pane-title">{VCResources.Repositories}</div>
                                    <div className="vc-admin-left-pane-toolbar toolbar"></div>
                                    <div className="vc-admin-left-pane-repositories"></div>
                                </div>
                            </div>
                        </div>
                        <div className="handleBar"></div>
                        <div className="rightPane hotkey-section hotkey-section-1" role="main">
                            <div className="hub-title">{VCResources.VersionControlAdministrationTtile}</div>
                            <div className="hub-progress pageProgressIndicator"></div>
                            <div className="right-hub-content">
                                <div className="hub-pivot">
                                    <div className="views">
                                        <ul className="pivot-view enhance vc-admin-tabs" role="tablist">
                                            <li aria-disabled="true" className="disabled" data-id="security" role="presentation">
                                                <a aria-posinset={1} aria-setsize={3} href="#_a=security" role="tab">{VCResources.SecurityTab}</a>
                                            </li>
                                            <li aria-disabled="true" className="disabled" data-id="options" role="presentation">
                                                <a aria-posinset={2} aria-setsize={3} href="#_a=options" role="tab">{VCResources.OptionsTab}</a>
                                            </li>
                                            <li aria-disabled="true" className="disabled" data-id="policy" role="presentation">
                                                <a aria-posinset={3} aria-setsize={3} href="#_a=policy" role="tab">{VCResources.BranchPoliciesTab}</a>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="filters"></div>
                                </div>
                                <div className="hub-pivot-content">   
                                    <div className="vc-admin-right-pane"></div>                                                            
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}