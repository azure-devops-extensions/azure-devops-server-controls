// Office Fabric
import * as React from "react";
import { IconButton, PrimaryButton } from "OfficeFabric/Button";
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { css } from "OfficeFabric/Utilities";

import * as VSS_Events from "VSS/Events/Services";
import { IStateless } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";
import { RefFavoriteType, GitRefFavorite, GitRef } from "TFS/VersionControl/Contracts";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import * as Branch from "VersionControl/Scenarios/Branches/Actions/Branch";
import { getMyBranchNames, BranchRowActions } from "VersionControl/Scenarios/Branches/Components/BranchesUtils";

import { FavoriteStar } from "Favorites/Controls/FavoriteStar";

export interface FavoriteStatusProperties {
    name: string;
    isUserCreated: boolean;
    isDefault: boolean;
    isCompare: boolean;
    type: RefFavoriteType;
    favorite: GitRefFavorite;
    canFavorite: boolean;
    canDelete: boolean;
    onDeleteBranch?(branch: string): void;
}

export class FavoriteStatus extends React.Component<FavoriteStatusProperties, IStateless> {
    constructor(props: FavoriteStatusProperties) {
        super(props);
        this.state = {
            showDialog: false
        };
    }

    public render() {
        let title: string = null;
        let icon: string = css("row-icon", "icon bowtie-icon");
        if (this.props.isDefault && this.props.canFavorite) {
            title = BranchResources.DefaultBranchText;
            icon = css(icon, "bowtie-favorite");

            return (<span className={icon} title={title} ></span>);
        }
        else if (this.props.isUserCreated && this.props.canDelete) {
            title = BranchResources.DeleteBranchMenuItemText;
            icon = css(icon, "bowtie-trash");

            return (
                <TooltipHost
                    content={title}
                    directionalHint={DirectionalHint.bottomCenter}>
                    <IconButton
                        ariaLabel={title}
                        className={icon}
                        onClick={(event: any) => this._onDeleteIconClicked(event)} />
                </TooltipHost>
            );
        }

        if (!this.props.canFavorite) {
            return null;
        }

        const isFavorite: boolean = this.props.favorite != null;
        const className = css("row-icon", { "only-visible-on-row-focus": !isFavorite });
        return (
            <FavoriteStar
                className={className}
                onToggle={() => this._onToggleIconClicked(true)}
                isFavorite={isFavorite}
                arialabel={BranchResources.FavoriteMenuItemLabel}
            />
        );
    }

    private _onDeleteIconClicked(event: any) {
        if (this.props.onDeleteBranch && !this.props.isDefault && this.props.isUserCreated) {
            this.props.onDeleteBranch(this.props.name);
        }
    }

    private _onToggleIconClicked(event: any) {
        const myBranchesNames: string[] = getMyBranchNames();
        if (this.props.favorite) {
            //Remove a favorite
            const removeFavorite = (this.props.type === RefFavoriteType.Folder) ? BranchRowActions.FolderRemoveFavorite : BranchRowActions.BranchRemoveFavorite;
            VSS_Events.getService().fire(removeFavorite, this);
            Branch.Creators.removeFromMyFavorites(this.props.favorite, myBranchesNames);
        }
        else {
            //Add a favorite
            const addFavorite = (this.props.type === RefFavoriteType.Folder) ? BranchRowActions.FolderAddFavorite : BranchRowActions.BranchAddFavorite;
            VSS_Events.getService().fire(addFavorite, this);
            Branch.Creators.addToMyFavorites(this.props.name, this.props.isCompare, this.props.type, myBranchesNames);
        }
    }
}
