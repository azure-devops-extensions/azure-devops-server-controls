/// <reference types="react" />

import * as React from "react";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { KeyCode } from "VSS/Utils/UI";
import { TooltipHost } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";

export interface IFavoriteToggleProps {
    isMyFavorite?: boolean;
    onToggle?: (isMyFavorite: boolean) => void;
    isDeleted?: boolean;
}

export class FavoriteToggle extends React.Component<IFavoriteToggleProps, {}> {
    public render(): JSX.Element {
        let title: string = null;
        let iconClassName = "fav-icon bowtie-icon ";
        if (this.props.isDeleted) {
            title = ScaledAgileResources.RemoveFromMyFavorites;
            iconClassName += "bowtie-edit-remove";
        }
        else if (this.props.isMyFavorite) {
            title = ScaledAgileResources.RemoveFromMyFavorites;
            iconClassName += "bowtie-favorite";
        }
        else {
            title = ScaledAgileResources.AddToMyFavorites;
            iconClassName += "bowtie-favorite-outline";
        }

        return <div className="plan-favorite"
                {...{ "aria-label": ScaledAgileResources.AddToMyFavorites }}
                tabIndex={0}
                role="button"
                onKeyDown={this._onKeyDown}
                onClick={this._onClick}>
                <TooltipHost content={title} directionalHint={DirectionalHint.bottomCenter}>
                    <i className={iconClassName} />
                </TooltipHost>
            </div>
       
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            this.props.onToggle(!this.props.isMyFavorite);
            event.stopPropagation();
        }
    }

    private _onClick = (event: React.MouseEvent<HTMLElement>) => {
        if ($.isFunction(this.props.onToggle)) {
            this.props.onToggle(!this.props.isMyFavorite);
        }
    }
}
