import * as React from "react";

import * as Utils_String from "VSS/Utils/String";
import * as VSS_Locations from "VSS/Locations";
import * as Contracts_Platform from "VSS/Common/Contracts/Platform";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";

import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";

import { IHubItem, IHubCell, IHubGroupColumn } from "MyExperiences/Scenarios/Shared/Models";
import { TeamProjectLineReference, ProjectHubItemTypes } from "MyExperiences/Scenarios/Projects/Contracts";
import { ProjectActions } from "MyExperiences/Scenarios/Projects/Actions";
import { FavoritesHelper } from "MyExperiences/Scenarios/Favorites/FavoritesHelper";
import { StarView } from "Favorites/Controls/StarView";
import { FavoritesStore } from "Favorites/Controls/FavoritesStore";
import { IFavoritesActionsCreator } from "Favorites/Controls/FavoritesActionsCreator";
import { IFavoritesDataProvider } from "Favorites/Controls/FavoritesDataProvider";
import * as Alerts from "MyExperiences/Scenarios/Shared/Alerts";
import { HubSpinner, Alignment } from "MyExperiences/Scenarios/Shared/Components/HubSpinner";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";
import { FavoriteCreateParameters } from "Favorites/Contracts";
import * as MyExperiencesExperiments from "MyExperiences/Scripts/Experiments";

import {
    IconButton
} from "OfficeFabric/Button";

import { Link } from "OfficeFabric/Link";

export abstract class IProjectHubItem implements IHubItem {
    public abstract getType(): ProjectHubItemTypes;
    public abstract getId(): string;
    public abstract isMatch(query: string): boolean;
    public favoritesStore: FavoritesStore;
    public favoritesActionsCreator: IFavoritesActionsCreator;
    public favoritesDataProvider: IFavoritesDataProvider;
    constructor(favoritesStore: FavoritesStore, favoritesActionsCreator: IFavoritesActionsCreator, favoritesDataProvider: IFavoritesDataProvider) {
        this.favoritesStore = favoritesStore;
        this.favoritesActionsCreator = favoritesActionsCreator;
        this.favoritesDataProvider = favoritesDataProvider;
    }
}

function isTeamProjectLineItem(item: IProjectHubItem): item is TeamProjectLineItem {
    return item.getType() === ProjectHubItemTypes.TeamProject;
}

export class TeamProjectLineItem extends IProjectHubItem {
    public data: TeamProjectLineReference;

    public getType(): ProjectHubItemTypes {
        return ProjectHubItemTypes.TeamProject;
    }

    public getId(): string {
        return this.data.key;
    }

    constructor(favoritesStore: FavoritesStore, favoritesActionsCreator: IFavoritesActionsCreator, favoritesDataProvider: IFavoritesDataProvider, data: TeamProjectLineReference) {
        super(favoritesStore, favoritesActionsCreator, favoritesDataProvider);
        this.data = data;
    }

    public isMatch(query: string): boolean {
        return this._searchName(this.data).toLocaleLowerCase().indexOf(query.toLocaleLowerCase()) >= 0;
    }

    public onSelection(): void {
        if (this.data.isExpandable && this.data.level === 0) {
            if (this.data.isExpanded) {
                ProjectActions.GridRowCollapsed.invoke(this.data);
            }
            else {
                ProjectActions.GridRowExpanded.invoke(this.data);
            }
        }
    }

    private _searchName(reference: TeamProjectLineReference): string {
        return reference.isTeam ? `${reference.projectName} / ${reference.teamName}` : reference.projectName;
    }
}

export class LoadingLineItem extends IProjectHubItem {
    public static createElement(): JSX.Element {
        return (<div className="team-level-1"><HubSpinner alignment={Alignment.left} delay={250} /></div>);
    }

    public getId(): string {
        return null;
    }

    public getType(): ProjectHubItemTypes {
        return ProjectHubItemTypes.Loading;
    }

    public isMatch(query: string): boolean {
        return false;
    }
}

export class NoAdditionalTeamsLineItem extends IProjectHubItem {
    public static createElement(): JSX.Element {
        return (<span className="team-level-1 no-additional-teams">{MyExperiencesResources.Projects_NoAdditionalTeams}</span>);
    }

    public getId(): string {
        return null;
    }

    public getType(): ProjectHubItemTypes {
        return ProjectHubItemTypes.NoAdditionalTeams;
    }

    public isMatch(query: string): boolean {
        return false;
    }
}

export class ErrorFetchingTeamsLineItem extends IProjectHubItem {
    public static createElement(): JSX.Element {
        return (<span role="alert">
            {Alerts.createReloadPromptAlertMessage(
                MyExperiencesResources.Projects_LoadTeamsForProjectError)}
        </span>);
    }

    public getId(): string {
        return null;
    }

    public getType(): ProjectHubItemTypes {
        return ProjectHubItemTypes.ErrorFetchingTeams;
    }

    public isMatch(query: string): boolean {
        return false;
    }
}

interface TeamProjectLinkProps {
    item: TeamProjectLineItem;
    hubGroupName: string;
}

var TeamProjectLinkComponent: React.StatelessComponent<TeamProjectLinkProps> = (props: TeamProjectLinkProps): JSX.Element => {
    let projectTeamName = props.item.data.projectName;
    let teamProjectLinkTooltip = Utils_String.format(Resources.NavigationContextMenuProjectLabelTitleFormat, props.item.data.projectName);
    let mvcOptions: VSS_Locations.MvcRouteOptions = { project: props.item.data.projectName };

    if (props.item.data.isTeam) {
        projectTeamName = props.item.data.level === 0 ?
            projectTeamName.concat(MyExperiencesResources.TeamProjectDisplayTextConnector, props.item.data.teamName) :
            props.item.data.teamName;
        teamProjectLinkTooltip = Utils_String.format(Resources.NavigationContextMenuTeamLabelTitleFormat, props.item.data.teamName, props.item.data.projectName);
        mvcOptions.team = props.item.data.teamName;
        mvcOptions.controller = "dashboards";
    }

    return (<Link
        className="project-team-name ms-fontSize-m"
        href={VSS_Locations.urlHelper.getMvcUrl(mvcOptions)}
        aria-label={teamProjectLinkTooltip}
        onClick={() => MyExperiencesTelemetry.LogProjectLinkClicked(props.hubGroupName, props.item.data.isTeam)}>
        {projectTeamName}
    </Link>);
}

interface ToggleComponentProps {
    item: TeamProjectLineItem;
}

let ToggleComponent: React.StatelessComponent<ToggleComponentProps> = (props: ToggleComponentProps): JSX.Element => {
    let toggle: JSX.Element = null;
    if (props.item.data.level === 0 && props.item.data.isExpandable) {
        let toggleClass = "chevron-Icon";
        let ariaLabel = MyExperiencesResources.Projects_ToCollapseButtonAriaLabel;
        if (props.item.data.isExpandable && !props.item.data.isExpanded) {
            toggleClass += " is-collapsed";
            ariaLabel = MyExperiencesResources.Projects_ToExpandButtonAriaLabel;
        }

        let toggleProps = (item: TeamProjectLineItem) => {
            return {
                onClick: () => item.onSelection()
            };
        };
        let iconProps = { iconName: "ChevronDown", className: toggleClass };

        toggle = (<IconButton {...toggleProps(props.item) }
            className="project-team-toggle-button"
            iconProps={iconProps}
            ariaLabel={ariaLabel} />);
    }
    return toggle;
};

interface IconComponentProps {
    item: TeamProjectLineItem;
}

var IconComponent: React.StatelessComponent<IconComponentProps> = (props: IconComponentProps): JSX.Element => {
    var iconClass = "project-team-icon-image bowtie-icon ";
    iconClass += props.item.data.isTeam ? "bowtie-users" : "bowtie-briefcase";

    return (<i className={iconClass} />);
}

function createProjectColumnTitle(hubGroupName: string): IHubGroupColumn<IProjectHubItem> {
    return {
        className: "project-column-title",
        createCell: item => {
            let cell = {} as IHubCell;

            if (isTeamProjectLineItem(item)) {
                var name = <TeamProjectLinkComponent item={item} hubGroupName={hubGroupName} />
                var titleClass = "project-team-title";
                if (item.data.level === 1) {
                    titleClass += " team-level-1";
                } else if (item.data.isExpandable) {
                    // If it expandable, we would add a toggle icon, adding a new class for styling purpose
                    titleClass += " team-level-0";
                }

                cell.content = (<div className={titleClass} key={item.data.key}>
                    <ToggleComponent item={item} />
                    <IconComponent item={item} />
                    {name}
                </div>);
            } else {
                cell.className = "row-width";
                switch (item.getType()) {
                    case ProjectHubItemTypes.Loading:
                        cell.content = LoadingLineItem.createElement();
                        break;
                    case ProjectHubItemTypes.NoAdditionalTeams:
                        cell.content = NoAdditionalTeamsLineItem.createElement();
                        break;
                    case ProjectHubItemTypes.ErrorFetchingTeams:
                        cell.content = (
                            <span className="team-level-1">
                                <span className="type-icon bowtie-icon bowtie-status-failure" />
                                {ErrorFetchingTeamsLineItem.createElement()}
                            </span>);
                        break;
                }
            }

            return cell;
        }
    };
}

function createProjectColumnLinks(hubGroupName: string, isAlwaysVisible: boolean = false): IHubGroupColumn<IProjectHubItem> {
    let alwaysVisibleClassName = isAlwaysVisible ? 'always-visible' : '';
    return {
        className: `project-column-links ${alwaysVisibleClassName}`,
        createCell: item => {
            let cell = {} as IHubCell;

            if (isTeamProjectLineItem(item)) {
                var renderLink = (link: Contracts_Platform.HubGroup) => {
                    return (<li key={link.id}>
                        <Link
                            className="team-project-hublink"
                            key={link.id}
                            href={link.uri}
                            onClick={() => MyExperiencesTelemetry.LogProjectHubLinkClicked(link.name, hubGroupName, item.data.isTeam)}>
                            {link.name}
                        </Link>
                    </li>);
                };

                var quickLinks = item.data.quickLinks.map(renderLink);
                var quickLinksCss = "team-project-quicklinks ms-fontSize-m";
                cell.content = <nav className={quickLinksCss} aria-label={MyExperiencesResources.QuickLinksToHubs}><ul>{quickLinks}</ul></nav>
            } else {
                cell.className = "no-width";
            }

            return cell;
        }
    };
}

const ProjectColumnRemoveMRU: IHubGroupColumn<IProjectHubItem> = {
    minWidth: 25,
    maxWidth: 25,
    className: "removeButtonContainer",
    createCell: item => {
        let cell = {} as IHubCell;

        if (isTeamProjectLineItem(item)) {
            let onClick = () => {
                ProjectActions.MruItemRemoved.invoke(item.data);
                let projectItem = item as TeamProjectLineItem;
                let message = Utils_String.format(MyExperiencesResources.Projects_AnnounceMruItemDeletedFormat, projectItem.data.projectName);

                Utils_Accessibility.announce(message, false /*assertive*/);

                let isTeam = item.data.isTeam;
                MyExperiencesTelemetry.LogMruItemRemoved(isTeam);
            };

            cell.content = <IconButton
                className="remove-from-mru"
                iconProps={{ iconName:"Cancel" }} // 'X' symbol
                ariaLabel={MyExperiencesResources.Projects_RemoveFromMRULabel}
                onClick={onClick}></IconButton>;
        } else {
            cell.className = "no-width";
        }

        return cell;
    }
};

const ProjectColumnStar: IHubGroupColumn<IProjectHubItem> = {
    minWidth: 25, // redline
    maxWidth: 25,
    createCell: item => {
        let cell = {} as IHubCell;

        if (isTeamProjectLineItem(item)) {
            let fav: FavoriteCreateParameters;
            let starViewKey: string;
            if (item.data.isTeam) {
                fav = FavoritesHelper.createTeamFavorite(item.data.projectId, item.data.projectName, item.data.teamId, item.data.teamName);
                starViewKey = item.data.teamId;
            } else {
                fav = FavoritesHelper.createProjectFavorite(item.data.projectId, item.data.projectName);
                starViewKey = item.data.projectId;
            }

            // If we don't turn on the Team Favorite feature flag, we would get null for the team.
            // If it is null, we will return null and don't render star
            if (fav == null) {
                return null;
            }


            cell.content = <StarView
                key={starViewKey}
                artifact={fav}
                actionsCreator={item.favoritesActionsCreator}
                dataProvider={item.favoritesDataProvider}
                store={item.favoritesStore} />;
        } else {
            cell.className = "no-width";
        }

        return cell;
    }
};

const ProjectColumnNonMRUSpacer: IHubGroupColumn<IProjectHubItem> = {
    minWidth: 25,
    maxWidth: 25,
    createCell: item => {
        if (isTeamProjectLineItem(item)) {
            return null;
        } else {
            return { className: "no-width", content: undefined } as IHubCell;
        }
    }
};

let isLinkAlwaysVisible = MyExperiencesExperiments.IsEnabled(MyExperiencesExperiments.ExperimentIds.MruProjectLinkAlwaysVisible);

export const MRUColumns: IHubGroupColumn<IProjectHubItem>[] = [
    createProjectColumnTitle(CustomerIntelligenceConstants.PROPERTIES.PROJECT_HUB_GROUP_RECENT),
    createProjectColumnLinks(CustomerIntelligenceConstants.PROPERTIES.PROJECT_HUB_GROUP_RECENT, isLinkAlwaysVisible),
    ProjectColumnRemoveMRU,
    ProjectColumnStar
];

export const TeamProjectColumns: IHubGroupColumn<IProjectHubItem>[] = [
    createProjectColumnTitle(CustomerIntelligenceConstants.PROPERTIES.PROJECT_HUB_GROUP_ALL),
    createProjectColumnLinks(CustomerIntelligenceConstants.PROPERTIES.PROJECT_HUB_GROUP_ALL),
    ProjectColumnNonMRUSpacer,
    ProjectColumnStar
];