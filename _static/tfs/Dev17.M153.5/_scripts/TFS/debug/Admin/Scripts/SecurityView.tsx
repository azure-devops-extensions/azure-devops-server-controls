import * as React from "react";
import * as ReactDOM from "react-dom";

import * as PlatformContracts from "VSS/Common/Contracts/Platform";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Locations from "VSS/Locations";
import * as Service from "VSS/Service";
import * as Context from "VSS/Context";
import * as VSS from "VSS/VSS";
import * as Notifications from "VSS/Controls/Notifications";

import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Controls from "VSS/Controls";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import "Admin/Scripts/TFS.Admin.Controls";

function renderSecurityView(context: SDK_Shim.InternalContentContextData, options: { setTitle: boolean}): IDisposable {
    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<SecurityViewComponentProps>("ms.vss-admin-web.admin-security-data-provider");

    if (pageData && options.setTitle) {
        document.title = Navigation_Services.getDefaultPageTitle(pageData.title);
    }
    
    if(pageData.userHasReadAccess) {
        ReactDOM.render(
            <SecurityViewComponent {...pageData} />,
            context.container);
    } else {
        ReactDOM.render(
            <SecurityViewErrorComponent />,
            context.container);
    }

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
}

SDK_Shim.registerContent("securityView.initialize", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    return renderSecurityView(context, { setTitle: true });
});

SDK_Shim.registerContent("securityView.vertical", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    return renderSecurityView(context, { setTitle: false });
});

class SecurityViewErrorComponent extends React.Component<{}, {}> {
    private _ensureEnhancements = (ref: HTMLElement): void => {
        
        const $container = $(ref);
        (VSS_Controls.Enhancement.enhance(Notifications.MessageAreaControl, $container, {message: AdminResources.InvalidPermissionToViewObject, type: Notifications.MessageAreaType.Error, closeable: false, showIcon: true}));        

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {
        return (<div className="manage-security-message-area" ref={this._ensureEnhancements}></div>);
    }
}

interface SecurityViewComponentProps {
    title: string;
    hasSingleCollectionAdmin: boolean;
    isAadGroupsAdminUi: boolean;
    permissionsContextJson: string;
    securityViewOptionsJson: string;
    userHasReadAccess: boolean;
}

class SecurityViewComponent extends React.Component<SecurityViewComponentProps, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find(".permissions-context").html(this.props.permissionsContextJson);
        $container.find("#json-security-view-options").html(this.props.securityViewOptionsJson);
        VSS.globalProgressIndicator.registerProgressElement($container.find(".pageProgressIndicator"));

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        const teamLevel = Context.getPageContext().navigation.topMostLevel === PlatformContracts.NavigationContextLevels.Team;

        return (
            <div className={"hub-view explorer manage-identities-view" + (teamLevel ? " team-view" : "")} ref={this._ensureEnhancements}>            
                <script className="permissions-context" type="application/json"></script>
                <div className="hub-content">        
                    <div className="splitter horizontal hub-splitter toggle-button-enabled toggle-button-hotkey-enabled">
                        <div className="leftPane" role="navigation">
                            <div className="left-hub-content">
                                {
                                    !this.props.isAadGroupsAdminUi &&
                                    <div className="hub-pivot">
                                        <div className="views">
                                            <ul className="empty pivot-view enhance change-groups-filter" role="tablist">
                                                <li className="selected" data-id="groups" role="presentation" title={AdminResources.ShowAllGroupsTooltip}>
                                                    <a aria-posinset={1} aria-setsize={3} href="#_a=groups" role="tab" tabIndex={0}>{ AdminResources.ShowAllGroups }</a>
                                                </li>
                                                <li data-id="users" role="presentation" title={AdminResources.ShowAllUsersTooltip}>
                                                    <a aria-posinset={2} aria-setsize={3} href="#_a=users" role="tab" tabIndex={-1}>{ AdminResources.ShowAllUsers }</a>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                }
                                <div className="hub-pivot-content">
                                    <div className="identity-list-section vertical-fill-layout">
                                        <div className="identity-search-box fixed-header">
                                            <div id="manage-identities-create-group-container" className="bowtie">
                                                <button id="manage-identities-create-group"/>
                                            </div>
                                            {
                                                this.props.isAadGroupsAdminUi ? (
                                                    <div className="ip-groups-search-container"></div>
                                                ) : (
                                                    <div className="identity-search-control"></div>
                                                )
                                            }
                                        </div>
                                        <div className="main-identity-grid fill-content"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="handleBar"></div>
                        <div className="rightPane" role="main">
                            <div className="hub-title">
                                <div className="label"></div>
                                <div className="image"></div>
                            </div>
                            <div className="hub-progress pageProgressIndicator"></div>
                            <div className="right-hub-content">
                                <div className="hub-pivot">
                                    <div className="views">
                                        <ul className="empty pivot-view enhance manage-view-tabs" role="tablist">
                                            <li className="selected" data-id="summary" role="presentation">
                                                <a aria-posinset={1} aria-setsize={3} href="#_a=summary" role="tab" tabIndex={0}>{ AdminResources.Permissions }</a>
                                            </li>
                                            <li data-id="members" role="presentation">
                                                <a aria-posinset={2} aria-setsize={3} href="#_a=members" role="tab" tabIndex={-1}>{ AdminResources.Members }</a>
                                            </li>
                                            <li data-id="memberOf" role="presentation">
                                                <a aria-posinset={3} aria-setsize={3} href="#_a=memberOf" role="tab" tabIndex={-1}>{ AdminResources.MemberOf }</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="hub-pivot-content">
                                    <div className="identity-details-section">
                                        <div id="identityInfo" className="manage-info"></div>
                                        <script className="show-single-pca-warning" type="application/json">{ this.props.hasSingleCollectionAdmin ? "true" : "false"}</script>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <script className="options" type="application/json" id="json-security-view-options"></script>
            </div>
        );
    }
}