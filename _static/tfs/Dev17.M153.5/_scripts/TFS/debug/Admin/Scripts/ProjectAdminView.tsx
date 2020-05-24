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
import { ProjectVisibilityConstants } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import { Fabric } from "OfficeFabric/Fabric";
import { Link } from "OfficeFabric/Link";
import { Persona, PersonaSize } from "OfficeFabric/Persona";
import { css } from "OfficeFabric/Utilities";
import { TeamAdminViewComponent, TeamAdminViewComponentProps } from "Admin/Scripts/TeamAdminView";
import { PopupContextualMenu, IPopupContextualMenuProps } from "Presentation/Scripts/TFS/Components/PopupContextualMenu";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import "Admin/Scripts/TFS.Admin.Controls";
import "VSS/LoaderPlugins/Css!Admin/Scripts/ProjectAdminView";
import { IAdminProjectHomeData, AdminProjectHomeDataProviderContributionId } from "Admin/Scripts/IAdminProjectHomeData";

function renderProjectAdminView (
    context: SDK_Shim.InternalContentContextData,
    additionalProps: Partial<ProjectAdminViewComponentProps>,
    options: { setTitle: boolean }
) : IDisposable {

    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<ProjectAdminViewComponentProps>(AdminProjectHomeDataProviderContributionId);
        
    if (pageData && pageData.displayName && options.setTitle) {
        document.title = Navigation_Services.getDefaultPageTitle(pageData.displayName);
    }

    ReactDOM.render(
        <ProjectAdminViewComponent {...pageData} {...additionalProps} />,
        context.container);

    const disposable = {
        dispose: () => {
            ReactDOM.unmountComponentAtNode(context.container);
        }
    };

    return disposable;
}

// modify the url params, everytime this method is called so as to invalidate browser cache.
function getIdentityImageUrlNoCache(url?: string): string | undefined {
    if (!url) {
        return undefined;
    }

    if (url.indexOf("?") !== -1) {
        url += "&t=" + Date.now();
    } else {
        url += "?t=" + Date.now();
    }

    return url;
}

SDK_Shim.registerContent("projectAdminView.initialize", (context: SDK_Shim.InternalContentContextData) : IDisposable=> {
    return renderProjectAdminView(context, {
        showTeams: true,
        showProjectOverview: true
    }, {
            setTitle: true,
        });
});

SDK_Shim.registerContent("projectAdminView.overview", (context: SDK_Shim.InternalContentContextData) => {
    return renderProjectAdminView(context, {
        showProjectOverview: true,
        usePersonaImage: true,
        className: "admin-project-overview-pivot"
    }, {
            setTitle: false,
        });
});

SDK_Shim.registerContent("projectAdminView.teams", (context: SDK_Shim.InternalContentContextData) => {

    const pageDataService = Service.getService(Contribution_Services.WebPageDataService);
    const pageData = pageDataService.getPageData<TeamAdminViewComponentProps>("ms.vss-admin-web.admin-team-home-data-provider");

    if (pageData) {
        const webContext = Context.getDefaultWebContext();
        if (!webContext.team) {
            webContext.team = { id: pageData.teamId, name: pageData.teamName };
        }
        else {
            webContext.team.id = pageData.teamId;
            webContext.team.name = pageData.teamName;
        }

        const imageUrlNoCache = getIdentityImageUrlNoCache(pageData.imageUrl);
        ReactDOM.render(
            <TeamAdminViewComponent {...pageData} imageUrl={imageUrlNoCache} showSettingsLinks={true} />,
            context.container);
    }
    else {
        return renderProjectAdminView(context, {
            showTeams: true,
            className: "admin-teams-pivot"
        }, {
                setTitle: false,
            });
    }
});

interface ProjectAdminViewComponentProps extends IAdminProjectHomeData {}

class ProjectAdminViewComponent extends React.Component<ProjectAdminViewComponentProps, {}> {

    private _ensureEnhancements = (ref: HTMLElement): void => {

        const $container = $(ref);
        $container.find("#json-edit-project").html(this.props.editProjectOptionsJson);
        $container.find("#json-project-features-list").html(this.props.projectFeatureListJson);
        $container.find("#json-project-overview").html(this.props.projectOverviewOptionsJson);

        VSS_Controls.Enhancement.ensureEnhancements();
    }

    public render(): JSX.Element {

        const isHosted = Context.getPageContext().webAccessConfiguration.isHosted;
        const updatedIdentityImageUrl = getIdentityImageUrlNoCache(this.props.identityImageUrl);
        const imgUrl = updatedIdentityImageUrl || Locations.urlHelper.getVersionedContentUrl("Team.svg");

        return (
            <div className={css("admin-overview", this.props.className)} role="main">
                <div className="project-overview-control project-overview overview" ref={this._ensureEnhancements}>
                    {
                        this.props.showProjectOverview &&
                        <div className="overview-profile">
                            <div className="header" role="heading" aria-level={1}>{ AdminResources.ProjectProfile }</div>
                            <div className="profile-picture">
                                {
                                    this.props.usePersonaImage ? (
                                        <Persona hidePersonaDetails={true} primaryText={this.props.displayName} size={PersonaSize.size100} />
                                    ) : (
                                            <a href="#" aria-label={AdminResources.AriaLabel_ChangeImage} role="button">
                                                <img className="large-identity-picture identity-picture" title={AdminResources.ClickToChangeImage} alt={AdminResources.ClickToChangeImage} src={imgUrl} />
                                            </a>
                                        )
                                }
                            </div>
                            <div className="browse-info project-info-control">
                                <div className="form-pair">
                                    <div className="form-key"><label htmlFor="projName">{  AdminResources.Name }</label></div>
                                    {
                                        this.props.hasRenamePermission ?
                                            (
                                                <div className="inline-input-wrapper">
                                                    <input readOnly={true} className="group-info-input group-name-input" id="projName"></input>
                                                </div>
                                            ) : (
                                                <div className="form-value"><strong>{  this.props.displayName }</strong></div>
                                            )
                                    }
                                </div>
                                {
                                    isHosted &&
                                    <div className="form-pair process-template">
                                       <div className="form-key">{AdminResources.Process}</div>
                                        <table className="form-value process-template-table">
                                            <tbody>
                                                <tr>
                                                    <td className="form-value">
                                                        <a className="process-template-name-link">
                                                            <u><span className="process-template-name" hidden={true}>{this.props.processTemplateName}</span></u>
                                                        </a>
                                                        <span className="process-template-name-non-link" hidden={true}>{this.props.processTemplateName}</span>
                                                    </td>
                                                    <td className="change-process-link" hidden={true}>{"  |  "}<a role="button" href="#"><u>{AdminResources.ChangeProcess}</u></a></td>
                                                    {!FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WorkItemTrackingCloneHostedXmlToInheritedDisabled) ?
                                                        <td className="change-process-context-menu" hidden={!this.props.isHostedXmlTemplate}>
                                                            <PopupContextualMenu className="popup-menu" iconClassName="bowtie-ellipsis" items={this._getChangeProcessContextMenuItems()} menuClassName="process-popup-menu" />
                                                        </td> : null
                                                    }
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                }
                                <div className="form-pair">
                                    <div className="form-key"><label htmlFor="projDesc">{  AdminResources.Description }</label></div>
                                    <div className="form-value">
                                        <div className="inline-input-wrapper">
                                            <textarea readOnly={true} className="group-info-input group-description-input" id="projDesc"></textarea>
                                        </div>
                                    </div>
                                </div>
                                {
                                    (this.props.showOrgVisibilityOption || this.props.showPublicVisibilityOption) &&
                                    <div className="form-pair">
                                        <div className="form-key"><label htmlFor="projVisibility">Shared with</label></div>
                                        <div className="form-value">
                                            <Fabric>
                                                <Link className="group-visibility-option" id="projVisibility">
                                                    <u>{this._getVisibilityText(this.props.projectVisibility)}</u>
                                                </Link>
                                            </Fabric>
                                        </div>
                                    </div>
                                }
                                <div className="group-info-buttons" style={ { display: "none" } }>
                                    <button className="save-group-changes overview-button">{  AdminResources.Save }</button>
                                    <button className="undo-group-changes overview-button">{  AdminResources.Undo}</button>
                                </div>
                                <div className="group-info-errors" style={ { display: "none" } }>
                                    <span className="group-info-error-message"></span>
                                </div>
                                <script className="options" type="application/json" id="json-edit-project"></script>

                                <script className="show-feature-enablement-link" type="application/json">{this.props.showFeatureEnablementLink ? "true" : "false"}</script>
                                {
                                    this.props.showFeatureEnablementLink &&
                                    <script className="project-feature-list" type="application/json" id="json-project-features-list"></script>
                                }
                                {
                                    this.props.showFeatureEnablementLink &&
                                    <div className="feature-enablement-info">
                                        <p>{  AdminResources.FeatureEnablement_FeaturesNotConfigured }</p>
                                        <a className="configure-features" href="#">{  AdminResources.FeatureEnablement_ConfigureFeatures }</a>
                                    </div>
                                }
                            </div>
                        </div>
                    }
                    {
                        this.props.showTeams &&
                        <div className={css("overview-detail content", { "overview-detail-no-left-pane": !this.props.showProjectOverview })}>
                            <div className="fixed-header">
                                <div className="header" role="heading" aria-level={1}>{  AdminResources.Teams }</div>
                                <div className="detail-errors"></div>
                                <div className="actions-control toolbar"></div>
                            </div>
                            <div className="fill-content">
                                <div className="overview-grid-wrapper">
                                    <div className="teams-grid"></div>
                                </div>
                            </div>
                        </div>
                    }
                    <script className="options" type="application/json" id="json-project-overview"></script>
                </div>
            </div>
        );
    }
	
    private _getChangeProcessContextMenuItems(): IContextualMenuItem[] {
        let items: IContextualMenuItem[] = [];
        items.push({
            key: "MIGRATE_XML_BACKED_PROJECT",
            name: AdminResources.ChangeProcess,
            iconProps: contextualMenuIcon("bowtie-arrow-right"),
            onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                VSS.using(["WorkCustomization/Scripts/Panels/Components/MigrateProjectPanel"], (MigrateProjectsPanelBundle) => {
                    MigrateProjectsPanelBundle.showMigrateProjectsPanel({ currentProcessName: this.props.processTemplateName, currentProject: this.props.displayName, panelLoadedOutsideOfProcessHub: true } as IMigrateProjectsPanelProps);
                });


            }
        });
        return items;
    }

    private _getVisibilityText(visibility: string): string {
        switch (visibility) {
            case ProjectVisibilityConstants.TeamMembers:
                return PresentationResources.ProjectVisibilityNameTeamMembers;
            case ProjectVisibilityConstants.EveryoneInTenant:
                return PresentationResources.ProjectVisibilityNameEveryoneInOrganization;
            case ProjectVisibilityConstants.Everyone:
                return PresentationResources.ProjectVisibilityNameEveryone;
            default:
                throw new Error(Utils_String.format(AdminResources.ChangeProjectVisibilityDialog_VisibilityValueInvalid, visibility));
        };
    }
}

/**
 * Warning, these props are duplicated in WorkCustomization/Scripts/Panels/Components/MigrateProjectsPanel, and if they ever change, they need to change there too.
*/
export interface IMigrateProjectsPanelProps {

    /**
     * Current project name
     */
    currentProject: string;

    /**
    * Our current process name
    */
    currentProcessName: string;

    /**
    * Our current process id
    */
    panelLoadedOutsideOfProcessHub?: boolean;

    /**
     * Callback called when panel is dismissed by either clicking Cancel or hitting Esc
     */
    onDismiss?: () => void;
    /**
     * Callback called when user clicks OK button in the panel
     */
    onOkClick?: (result: number, dataChanged?: boolean) => void;
}