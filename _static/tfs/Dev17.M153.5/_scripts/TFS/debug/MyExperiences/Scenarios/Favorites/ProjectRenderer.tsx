import * as React from "react";
import {IHubGroupColumn, IHubItem} from  "MyExperiences/Scenarios/Shared/Models";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as SDK from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import {FavoriteHubItem} from  "MyExperiences/Scenarios/Favorites/FavoriteItem";
import {Favorite}  from "Favorites/Contracts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";
import {FavoriteRendererHelper} from  "MyExperiences/Scenarios/Favorites/FavoriteRendererHelper";
import * as VSS_Service from "VSS/Service";
import {HubGroupLinksService} from "MyExperiences/Scenarios/Shared/HubGroupLinksService";
import * as Contracts_Platform from "VSS/Common/Contracts/Platform";
import { Link } from "OfficeFabric/Link";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants"
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { BaseFavoriteHubItemContribution } from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";
import { FavoriteHubItemData } from "MyExperiences/Scenarios/Favorites/FavoritesHubModels";
import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";

/**
 * Contribution providing rendering of projects and team in Fabric DataList
 */
export class ProjectRenderer extends BaseFavoriteHubItemContribution<FavoriteHubItem> {
    public getIconClass(data: FavoriteHubItemData): string {
        return ProjectRenderer.IsTeamFavorite(data.favorite) ? "bowtie-users" : "bowtie-briefcase";
    }

    public getDisplayName(data: FavoriteHubItemData): string {
        return ProjectRenderer.getPreferDisplayName(data.favorite);
    }

    public getArtifactDeletedMessage(data: FavoriteHubItemData): string {
        return ProjectRenderer.IsTeamFavorite(data.favorite)
            ? MyExperiencesResources.Favorite_Team_DeletedMessage
            : MyExperiencesResources.Favorite_Project_DeletedMessage;
    }

    public getArtifactMetadata(hubItemData: FavoriteHubItemData): JSX.Element {
        return (<span> { this.getLinks(hubItemData) }</span>);
    }

    /**
     * Get list of columns with component generation factory
     */
    public getColumns(): IHubGroupColumn<FavoriteHubItem>[] {
        return [
            FavoriteRendererHelper.getIconAndNameColumnDefinition(),
            FavoriteRendererHelper.getArtifactMetadataColumnDefinition(555)
        ];
    }

    private getLinks(item: FavoriteHubItemData): JSX.Element {
        const projectContext: Contracts_Platform.ContextIdentifier = {
            id: item.favorite.artifactScope.id,
            name: item.favorite.artifactScope.name
        };

        let teamContext: Contracts_Platform.ContextIdentifier = null;
        const isTeam = ProjectRenderer.IsTeamFavorite(item.favorite)
        if (isTeam) {
            teamContext = {
                id: item.favorite.artifactId,
                name: item.favorite.artifactName
            };
        }

        const hubGroupLinksService = VSS_Service.getService(HubGroupLinksService);
        const quickLinksData = hubGroupLinksService.getHubGroups(projectContext, teamContext);


        var renderLink = (link: Contracts_Platform.HubGroup) => {
            return (<li key={link.id}><Link
                        className="team-project-hublink"
                        key={link.id}
                        href={link.uri}
                        onClick={() => MyExperiencesTelemetry.LogProjectHubLinkClicked(link.name, CustomerIntelligenceConstants.PROPERTIES.FAVORITE_HUB_GROUP_PROJECT, isTeam)}>
                        {link.name}
            </Link>
            </li>);
        };
        var quickLinks = quickLinksData.map(renderLink);
        var quickLinksCss = "team-project-quicklinks ms-fontSize-m";
        return <nav className={quickLinksCss} aria-label={MyExperiencesResources.QuickLinksToHubs}><ul>{quickLinks}</ul></nav>;
    }

    public isMatch(data: Favorite, query: string): boolean {
        return FavoriteRendererHelper.simpleMatch(data, query);
    }

    /**
     * The logic to determine the sorting logic of the item
     */
    public compareItems(data1: Favorite, data2: Favorite): number {
        return ProjectRenderer.getPreferDisplayName(data1).localeCompare(ProjectRenderer.getPreferDisplayName(data2));
    }

    /**
     * Is the given favorite item a Team Favorite.
     */
    public static IsTeamFavorite(favoriteItem: Favorite): boolean {
        // If the project id and dataId, this is a project else team.
        return favoriteItem.artifactType === TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_TEAM;
    }

    /**
     * The prefer display name for the Favorite Item.
     */
    public static getPreferDisplayName(favoriteItem: Favorite): string {
        return ProjectRenderer.IsTeamFavorite(favoriteItem)
            ? ProjectRenderer.getTeamDisplayName(favoriteItem)
            : favoriteItem.artifactName;
    }

    private static getTeamDisplayName(favoriteItem: Favorite): string {
        // If the project has been deleted, then we no longer have access to the project name, so
        // we just display the team name in this case
        return favoriteItem.artifactIsDeleted
            ? favoriteItem.artifactName
            : `${favoriteItem.artifactScope.name}${MyExperiencesResources.TeamProjectDisplayTextConnector}${favoriteItem.artifactName}`;
    }
}

SDK.registerContent("accounthome.projectfavoriteitem-init", (context) => {
    return new ProjectRenderer();
});