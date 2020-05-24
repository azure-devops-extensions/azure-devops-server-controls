/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import { RequestedFor } from "Build/Scenarios/Definitions/Mine/Components/RequestedFor";
import { IRow } from "Build/Scenarios/Definitions/Mine/Stores/MyDefinitions";
import * as BuildContextualMenuItems from "Build/Scripts/Components/BuildContextualMenuItems";
import { BuildDetailLink } from "Build/Scripts/Components/BuildDetailLink";
import { BuildStatus } from "Build/Scripts/Components/BuildStatus";
import * as DefinitionContextualMenuItems from "Build/Scripts/Components/DefinitionContextualMenuItems";
import { DefinitionPopupContextualMenu, IDefinitionPopupContextualMenuProps } from "Build/Scripts/Components/DefinitionPopupContextualMenu";
import { DefinitionStatus } from "Build/Scripts/Components/DefinitionStatus";
import { DefinitionSummaryLink } from "Build/Scripts/Components/DefinitionSummaryLink";
import { FavoriteToggle } from "Build/Scripts/Components/FavoriteToggle";
import { getDivider, getQueueNewBuildMenuItem } from "Build/Scripts/ContextualMenuItems";
import { FavoriteDefinitionInfo } from "Build/Scripts/Favorites";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { Sources } from "Build/Scripts/Telemetry";

import { canUseFavorites } from "Favorites/FavoritesService";

import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";

import { Component as IdentityImage, Props as IIdentityImageProps } from "Presentation/Scripts/TFS/Components/IdentityImage";

import {
    BuildDefinitionReference,
    Build,
    DefinitionQueueStatus,
    DefinitionQuality
} from "TFS/Build/Contracts";

import { format } from "VSS/Utils/String";

export interface IDetailsColumnProps {
    item: IRow;
    isTeamFavoriteSection?: boolean;
    title: string;
}

export interface IMineDefinitionsContextualMenuData {
    isMyFavorite: boolean;
    isTeamFavorite: boolean;
    definition: BuildDefinitionReference;
    build: Build;
    favoriteInfo: FavoriteDefinitionInfo;
}

export class DetailsColumn extends React.Component<IDetailsColumnProps, {}> {

    public render(): JSX.Element {
        let itemRow = this.props.item;
        let definitionResult = itemRow.definition;

        if (definitionResult.pending) {
            return <span>{BuildResources.Loading}</span>;
        }

        let definition = definitionResult.result;

        let contextMenudata: IMineDefinitionsContextualMenuData = {
            isMyFavorite: itemRow.isMyFavorite,
            isTeamFavorite: itemRow.isTeamFavorite,
            definition: definition,
            build: itemRow.build,
            favoriteInfo: itemRow.favoriteInfo
        };

        const menuProps: ISmartPopupMenuProps = {
            data: contextMenudata
        };

        let identityImageProps: IIdentityImageProps = {};
        let buildDetailLinkElement: JSX.Element = null;
        let requestedForElement: JSX.Element = null;

        if (itemRow.build) {
            identityImageProps = {
                identity: itemRow.build.requestedFor
            };

            buildDetailLinkElement = <BuildDetailLink build={itemRow.build} className="build-definition-entry-details-subtitle" buildNumberFormat={BuildResources.BuildNumberLinkFormat} />;
            requestedForElement = <RequestedFor build={itemRow.build} />;
        }

        let definitionLink: JSX.Element = <DefinitionSummaryLink definition={definition} isFavDefinition={itemRow.isMyFavorite} cssClass="build-definition-entry-details-title"/>;

        if (this.props.isTeamFavoriteSection && itemRow.favoriteInfo.userTeams.length > 1) {
            let teamList: JSX.Element[] = [];
            itemRow.favoriteInfo.userTeams.forEach((team) => {
                for (let i = 0; i < itemRow.favoriteInfo.favoriteOwnerIds.length; i++) {
                    if (team.id === itemRow.favoriteInfo.favoriteOwnerIds[i]) {
                        teamList.push(
                            <div key={team.displayName}>{team.displayName}</div>
                        );
                    }
                }
            });

            definitionLink = (
                <TooltipHost
                    tooltipProps={ {
                        onRenderContent: () => {
                            return (
                                <div>
                                    {teamList}
                                </div>
                            );
                        },
                        calloutProps: {
                            isBeakVisible: false,
                            directionalHint: DirectionalHint.bottomCenter
                        }
                    } }>
                    {definitionLink}
                </TooltipHost>
            );
        }

        return <div>
            <span aria-label={format(BuildResources.MyDefinitionsRowPrependLabel, this.props.title)}></span>
            <IdentityImage cssClass="primary-user-image" { ...identityImageProps} />
            <div className="build-definition-entry-details">
                {definitionLink}
                {buildDetailLinkElement && (<span>&nbsp;: &nbsp;</span>)}
                {buildDetailLinkElement}
            </div>
            {requestedForElement && (<div className="build-definition-entry-subtle">{requestedForElement}</div>)}
            <FavoriteToggle definition={definition} isMyFavorite={itemRow.isMyFavorite} />
            <SmartPopupMenu {...menuProps} />
        </div>;
    }
}

interface ISmartPopupMenuProps {
    data: IMineDefinitionsContextualMenuData;
}

// This can stop being smart when Definition queue status is enabled all across
class SmartPopupMenu extends React.Component<ISmartPopupMenuProps, {}> {
    public render(): JSX.Element {
        const props: IDefinitionPopupContextualMenuProps = {
            className: "popup-menu",
            iconClassName: "bowtie-ellipsis",
            getMenuItems: this._getItems,
            menuClassName: "build-popup-menu",
            contributionData: {
                contributionIds: ["ms.vss-build-web.build-definition-menu"],
                extensionContext: this.props.data.definition
            },
            definition: this.props.data.definition
        };

        return <DefinitionPopupContextualMenu {...props} />;
    }

    private _getItems = () => {
        return getMyDefinitionsContextualMenuItems(this.props.data);
    }
}

export function getMyDefinitionsContextualMenuItems(data: IMineDefinitionsContextualMenuData): IContextualMenuItem[] {
    let items: IContextualMenuItem[] = [];

    if (!data.definition) {
        return items;
    }

    const viewBuildMenuItem = BuildContextualMenuItems.getViewBuildMenuItem(data.build);
    if (data.build && !!viewBuildMenuItem) {
        items.push(viewBuildMenuItem);
    }

    const queueNewBuildMenuItems = getQueueNewBuildMenuItem(data.definition, Sources.AllDefinitions);
    if (!!queueNewBuildMenuItems) {
        items.push(queueNewBuildMenuItems);
    }

    const editDefinitionMenuItem = DefinitionContextualMenuItems.getEditDefinitionMenuItem(data.definition);
    if (!!editDefinitionMenuItem) {
        items.push(editDefinitionMenuItem);
    }

    if (data.definition.queueStatus === DefinitionQueueStatus.Enabled) {
        const pauseDefinitionMenuItem = DefinitionContextualMenuItems.getPauseDefinitionMenuItem(data.definition);
        if (!!pauseDefinitionMenuItem) {
            items.push(pauseDefinitionMenuItem);
        }
    }
    else { // This could apply to definitions that are disabled as well.
        const enableDefinitionMenuItem = DefinitionContextualMenuItems.getEnableDefinitionMenuItem(data.definition);
        if (!!enableDefinitionMenuItem) {
            items.push(enableDefinitionMenuItem);
        }
    }

    if (items.length > 0) {
        items.push(getDivider(2));
    }

    const viewDefinitionMenuItem = DefinitionContextualMenuItems.getViewDefinitionMenuItem(data.definition);
    if (!!viewDefinitionMenuItem) {
        items.push(viewDefinitionMenuItem);
        items.push(getDivider(3));
    }

    if (canUseFavorites()) {
        items = items.concat(DefinitionContextualMenuItems.getFavoriteMenuItems(data.definition, data.favoriteInfo.userId, data.favoriteInfo.userTeams, data.favoriteInfo.favoriteOwnerIds));
        items.push(getDivider(4));
    }

    const cloneDefinitionMenuItem = DefinitionContextualMenuItems.getCloneDefinitionMenuItem(data.definition);
    if (!!cloneDefinitionMenuItem) {
        items.push(cloneDefinitionMenuItem);
    }

    const exportDefinitionMenuItem = DefinitionContextualMenuItems.getExportDefinitionMenuItem(data.definition);
    if (!!exportDefinitionMenuItem) {
        items.push(exportDefinitionMenuItem);
    }

    const renameDefinitionMenuItem = DefinitionContextualMenuItems.getRenameDefinitionMenuItem(data.definition);
    if (data.definition.quality !== DefinitionQuality.Draft && renameDefinitionMenuItem) {
        items.push(renameDefinitionMenuItem);
    }

    const saveDefinitionAsTemplateMenuItem = DefinitionContextualMenuItems.getSaveDefinitionAsTemplateMenuItem(data.definition);
    if (!!saveDefinitionAsTemplateMenuItem) {
        items.push(saveDefinitionAsTemplateMenuItem);
    }

    if (!!cloneDefinitionMenuItem || !!exportDefinitionMenuItem || !!renameDefinitionMenuItem || !!saveDefinitionAsTemplateMenuItem) {
        items.push(getDivider(5));
    }

    let showDeleteDivider = false;
    if (data.build) {
        const retianBuildsMenuItem = BuildContextualMenuItems.getRetainBuildsMenuItem([data.build])
        if (!!retianBuildsMenuItem) {
            items.push(retianBuildsMenuItem);
            data.build && items.push(getDivider(6));
        }

        const deleteBuildsMenuItem = BuildContextualMenuItems.getDeleteBuildsMenuItem([data.build]);
        if (!!deleteBuildsMenuItem) {
            items.push(deleteBuildsMenuItem);
            showDeleteDivider = true;
        }
    }

    const deleteDefinitionMenuItem = DefinitionContextualMenuItems.getDeleteDefinitionMenuItem(data.definition);
    if (!!deleteDefinitionMenuItem) {
        items.push(deleteDefinitionMenuItem);
        showDeleteDivider = true;
    }

    if (showDeleteDivider) {
        items.push(getDivider(7));
    }

    const viewDefinitionSecurityMenuItem = DefinitionContextualMenuItems.getViewDefinitionSecurityMenuItem(data.definition);
    if (!!viewDefinitionSecurityMenuItem) {
        items.push(viewDefinitionSecurityMenuItem);
        items.push(getDivider(8));
    }

    return items;
}
