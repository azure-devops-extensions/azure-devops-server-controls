import * as React from "react";
import { css } from 'OfficeFabric/Utilities';
import { IHubGroupColumn, ColumnType, IHubItem} from "MyExperiences/Scenarios/Shared/Models";
import * as SDK from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";
import {FavoriteHubItem} from  "MyExperiences/Scenarios/Favorites/FavoriteItem";
import {Favorite}  from "Favorites/Contracts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import {FavoriteItem} from "Presentation/Scripts/TFS/TFS.OM.Common";
import { MyExperiencesTelemetry } from "MyExperiences/Scripts/Telemetry";
import * as VSS_Locations from "VSS/Locations";
import { Link } from "OfficeFabric/Link";
import * as CustomerIntelligenceConstants from "MyExperiences/Scripts/CustomerIntelligenceConstants";
import { FavoritesSettingsService } from "MyExperiences/Scenarios/Favorites/FavoritesSettingsService";
import * as Service from "VSS/Service";
import Utils_Date = require("VSS/Utils/Date");
import { VssIcon, VssIconType } from "VSSUI/VssIcon";

export class FavoriteRendererHelper {
    /** Favorites rest contract _links dictionary key to retrieve favorite URL */
    public static Links_Page = "page";

    public static NameColumnClassNames = "favorite-row-favoritename-column";

    /*
    * Get the query URL, temporary until we get it from server
    */
    public static getLinkUrl(data: Favorite): string {
        return data._links[FavoriteRendererHelper.Links_Page].href;
    }

    /*
    * Get the project URL
    */
    public static getProjectUrl(data: Favorite): string {
        return VSS_Locations.urlHelper.getMvcUrl({
            project: data.artifactScope.name
        });
    }

    public static prepareSearchableText(data: Favorite) : string {
        return data.artifactName + " " + data.artifactScope.name;
    }

    public static simpleMatch(data: Favorite, query: string): boolean {
        var searchableText = this.prepareSearchableText(data);
        return this.isMatch(searchableText, query);
    }

    /* Determine if the content text matches against the supplied query. 
    Note: ContentText should contain all text, representative of the favorite item */
    public static isMatch(contentText: string, query: string): boolean {
        var isMatch = false;
        if (contentText && query) {
            contentText = contentText.toLocaleLowerCase().trim();
            query = query.toLocaleLowerCase().trim();

            if (query.length > 0 && contentText.length > 0) {

                var tokens = query.split(" ");
                var tokenMismatch = false;

                $.each(tokens, (index: number, token: string) => {
                    if (contentText.indexOf(token) < 0) {
                        tokenMismatch = true;
                    }
                });

                isMatch = !tokenMismatch;
            } 
        }

        return isMatch;
    }

    public static getFavoriteIconComponent(
        isDeleted: boolean,
        iconName: string,
        iconClass: string,
        iconColor: string): JSX.Element {
        if (iconName) {
            return <VssIcon
                className={css(iconClass, "favorite-row-fabric-icon")}
                iconName={iconName}
                iconType={VssIconType.fabric} />;
        }
        else {
            var className = "bowtie-icon favorite-row-type-icon " + iconClass;
            if (isDeleted) {
                className += " favorite-deleted";
            }
            return <span className={className} style={{ color: iconColor || "" }}></span>;
        }
    }

    public static getProjectLinkComponent(item: FavoriteHubItem): JSX.Element {
        var favorite = item.data.favorite;
        if (!favorite.artifactIsDeleted) {
            return (<Link
                        className="project-link-name ms-fontSize-m"
                        href={FavoriteRendererHelper.getProjectUrl(item.data.favorite) }
                        title={favorite.artifactScope.name}
                        onClick={() => MyExperiencesTelemetry.LogFavoriteProjectLinkClicked(favorite.artifactType)}>
                        {favorite.artifactScope.name}
                    </Link>);
        }
        else {
            return this.getDeletedPlaceholderComponent(favorite.artifactScope.name);
        }
    }

    public static getSimpleFavoriteNameComponent(item: FavoriteHubItem, displayName: string, ariaLabel?: string): JSX.Element {
        if (!item.data.favorite.artifactIsDeleted) {
            return (<Link
                        className="simple-favorite-name ms-fontSize-m"
                        href={FavoriteRendererHelper.getLinkUrl(item.data.favorite)}
                        aria-label={ariaLabel}
                        onClick={() => { MyExperiencesTelemetry.LogFavoriteLinkClicked(item.data.favorite.artifactType)}}>
                        {displayName}
                </Link>);
        }
        else {
            return this.getDeletedPlaceholderComponent(displayName);
        }
    }

    public static getIconAndNameComponent(item: FavoriteHubItem, ariaLabel?: string): JSX.Element {
        return (
            <div>
                {FavoriteRendererHelper.getFavoriteIconComponent(
                    item.data.favorite.artifactIsDeleted,
                    item.iconName,
                    item.iconClass,
                    item.iconColor)}
                {FavoriteRendererHelper.getSimpleFavoriteNameComponent(item, item.displayName, ariaLabel) }
            </div>
        );
    }

    public static getDeletedPlaceholderComponent(name: string) {
        return <span className="favorite-deleted" title={name}>{name}</span>;
    }

    public static getProjectNameColumnDefinition(): IHubGroupColumn<FavoriteHubItem> {
        return {
            minWidth: 115,
            className: "favorite-row-projectname-column",
            createCell: item => {
                if (item.data.favorite.artifactType === "Microsoft.TeamFoundation.Classification.TeamProject") {
                    return { content: null };
                }
                else {
                    return { content: FavoriteRendererHelper.getProjectLinkComponent(item) };
                }
            },
            type: ColumnType.Project
        };
    }

    public static getIconAndNameColumnDefinition(): IHubGroupColumn<FavoriteHubItem>{
        return {
            className: FavoriteRendererHelper.NameColumnClassNames,
            createCell: item => {
                return { content: FavoriteRendererHelper.getIconAndNameComponent(item) };
            },
            type: ColumnType.IconName
        }
    }

    public static getArtifactMetadataColumnDefinition(minWidth: number = 445, isVisible: boolean = true): IHubGroupColumn<FavoriteHubItem> {
        return {
            minWidth: minWidth,
            className: "artifact-metadata-column",
            createCell: item => {
                if (!isVisible) {
                    return { content: null };
                }

                if (item.data.favorite.artifactIsDeleted) {
                    return { content: FavoriteRendererHelper.showDeletedMessage(item.deletedArtifactMessage) };
                }
                else {
                    return { content: item.artifactMetaDataElement };
                }
            },
            type: ColumnType.Path
        }
    }

    public static showDeletedMessage(message: string) {
        return <span className="favorite-deleted-message" title={message}>
            <span className="bowtie-icon bowtie-status-info-outline"></span>
            {message}
        </span>;
    }
}
