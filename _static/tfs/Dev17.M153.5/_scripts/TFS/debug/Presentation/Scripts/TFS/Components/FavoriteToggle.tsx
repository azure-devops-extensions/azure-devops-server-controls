import * as React from "react";
import * as PresentationResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { KeyCode } from "VSS/Utils/UI";

/**
 * FavoriteToggle component properties
 */
export interface IFavoriteToggleProps {
    /**
     * Sets state of component whether it renders as favorited or not
     */
    isFavorited?: boolean;

    /**
     * Sets the value of the class attribute for the component's HTML element
     */
    className: string;

    /**
     * Toggle event callback function.
     */
    onToggle?: (isMyFavorite: boolean) => void;
}

export class FavoriteToggle extends React.Component<IFavoriteToggleProps, void> {

    public render(): JSX.Element {
        let title: string = null;
        let iconClassName = "bowtie-icon";
        if (this.props.isFavorited) {
            title = PresentationResources.RemoveFromMyFavorites;
            iconClassName += " bowtie-favorite";
        }
        else {
            title = PresentationResources.AddToMyFavorites;
            iconClassName += " bowtie-favorite-outline";
        }

        return <div
            className={this.props.className}
            tabIndex={0}
            title={title}
            onKeyDown={this._onKeyDown}
            onClick={this._onClick}>
            <i className={iconClassName} />
        </div>;
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.keyCode === KeyCode.ENTER || event.keyCode === KeyCode.SPACE) {
            if ($.isFunction(this.props.onToggle)) {
                this.props.onToggle(!this.props.isFavorited);
            }
            event.stopPropagation();
        }
    }

    private _onClick = (event: React.MouseEvent<HTMLElement>) => {
        if (this.props.onToggle) {
            this.props.onToggle(!this.props.isFavorited);
        }
    }
}