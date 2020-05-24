import * as React from "react";
import * as ReactDOM from "react-dom";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as Locations from "VSS/Locations";
import * as Service from "VSS/Service";
import * as Context from "VSS/Context";
import * as VSS from "VSS/VSS";

import * as SDK_Shim from "VSS/SDK/Shim";
import * as VSS_Controls from "VSS/Controls";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import "Admin/Scripts/TFS.Admin.Controls";
import "Admin/Scripts/Controls/TeamOverview";

SDK_Shim.registerContent("teamAdminView.initialize", (context: SDK_Shim.InternalContentContextData): void => {

    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<TeamAdminViewComponentProps>("ms.vss-admin-web.admin-team-home-data-provider");

    if (pageData) {
        document.title = Navigation_Services.getDefaultPageTitle(pageData.teamName);
    }

    ReactDOM.render(
        <TeamAdminViewComponent {...pageData} />,
        context.container);
});

export interface TeamAdminViewComponentProps {
    teamName: string;
    teamId: string;
    imageUrl: string;
    showFeatureEnablementLink: boolean;
    editGroupOptionsJson: string;
    teamViewModelJson: string;
    teamSettingsDataJson: string;
    showSettingsLinks?: boolean;
    isWorkAgileFeatureEnabled: boolean;
}

export class TeamAdminViewComponent extends React.Component<TeamAdminViewComponentProps, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find("#json-edit-group-options").html(this.props.editGroupOptionsJson);
        $container.find("#json-team-view-model").html(this.props.teamViewModelJson);
        $container.find(".team-settings-data").html(this.props.teamSettingsDataJson);
        VSS.globalProgressIndicator.registerProgressElement($container.find(".pageProgressIndicator"));

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        return (
            <div className="hub-view explorer team-overview-control" ref={this._ensureEnhancements}>
                <div className="hub-content">        
                    <div className="splitter horizontal hub-splitter">
                        <div className="leftPane" role="navigation">
                            <div className="left-hub-content">
                                <div className="admin-overview">
                                    <div className="team-overview overview">
                                        <div className="overview-profile">
                                            <div className="header" role="heading" aria-level={1} >{ AdminResources.TeamProfile }</div>
                                            <div className="profile-picture">
                                                <a href="#" aria-label={ AdminResources.AriaLabel_ChangeImage } role="button">
                                                    <img className="large-identity-picture identity-picture" title={ AdminResources.ClickToChangeImage } alt ={ AdminResources.ClickToChangeImage } src={this.props.imageUrl} />
                                                </a>
                                            </div>
                                            <div className="browse-info team-info-control">
                                                <div className="form-pair">
                                                    <div className="form-key">
                                                        <label htmlFor="teamName">{ AdminResources.Name }</label>
                                                    </div>
                                                    <div className="form-value">
                                                        <div className="inline-input-wrapper">
                                                            <textarea readOnly={true} className="group-info-input group-name-input" id="teamName" maxLength={64}></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="form-pair">
                                                    <div className="form-key">
                                                        <label htmlFor="teamDesc">{ AdminResources.Description }</label>
                                                    </div>
                                                    <div className="form-value">
                                                        <div className="inline-input-wrapper">
                                                            <textarea readOnly={true} className="group-info-input group-description-input" id="teamDesc" maxLength={256}></textarea>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="group-info-buttons" style={ { display: "none" } }>
                                                    <button className="save-group-changes overview-button">{ AdminResources.Save }</button>
                                                    <button className="undo-group-changes overview-button">{ AdminResources.Undo }</button>
                                                </div>
                                                <div className="group-info-errors" style={ { display: "none" } }>
                                                    <span className="group-info-error-message"></span>
                                                </div>
                                                <div className="form-pair">
                                                    <div className="form-key">{ AdminResources.Administrators }</div>
                                                    <div className="form-value team-admins">
                                                    </div>
                                                </div>
                                                <script className="options" type="application/json" id="json-edit-group-options"></script>
                                            </div>
                                            <div className="account-section-actions">
                                                <ul>
                                                    <li><a href="#" role="button" className="linkAction add-team-admin">{ AdminResources.PlusAdd }</a></li>
                                                </ul>
                                            </div>
                                            {
                                                this.props.showSettingsLinks &&
                                                <div className="team-links-section">
                                                    <label>{ AdminResources.ManageOtherTeamSettings }</label>
                                                    <ul>
                                                        <li><a href="#" role="button" className="notifications-settings-link">{ AdminResources.Notifications }</a></li>
                                                        <li><a href="#" role="button" className="dashboards-settings-link">{ AdminResources.Dashboards }</a></li>
                                                        { 
                                                            this.props.isWorkAgileFeatureEnabled &&
                                                            <li><a href="#" role="button" className="work-settings-link">{ AdminResources.WorkSettings }</a></li> 
                                                        }
                                                    </ul>
                                                </div>
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="handleBar"></div>
                        <div className="rightPane" role="main">
                            <div className="hub-title">{this.props.teamName}</div>
                            <div className="hub-progress pageProgressIndicator"></div>
                            <div className="right-hub-content">
                                <div className="hub-pivot">
                                    <div className="views">
                                        <ul className="empty pivot-view enhance team-overview-tabs" role="tablist">
                                            <li className="selected" data-id="members" role="presentation">
                                                <a aria-posinset={1} aria-setsize={1} href="#_a=members" role="tab" tabIndex={0}>{ AdminResources.Members }</a>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="hub-pivot-content">
                                    <div className="admin-overview team-overview-detail content">
                                        <div className="fill-content">
                                            <div className="overview-grid-wrapper">
                                                <div className="membership-control members-grid"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <script className="show-feature-enablement-link" type="application/json">{ this.props.showFeatureEnablementLink ? "true" : "false"}</script>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <script className="options" type="application/json" id="json-team-view-model"></script>
                <script className="team-settings-data" type="application/json"></script>
            </div>
        );
    }
}