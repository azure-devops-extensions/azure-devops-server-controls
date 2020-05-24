import * as React from "react";

import {
    IImageListItemCommonProps,
    ImageSize
} from "DistributedTaskControls/SharedControls/ImageListItem/ImageListItemCommon";

import { IPersonaProps, Persona, PersonaSize } from "OfficeFabric/Persona";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/ImageListItem/PersonaImageListItem";

export interface IUrlImageListItemProps extends IImageListItemCommonProps {
    imageUrl: string;
}

export class UrlImageListItem extends React.Component<IUrlImageListItemProps, {}> {
    public render(): JSX.Element {
        const personaProps: IPersonaProps = {
            size: this._getPersonaSize(this.props.imageSize),
            imageUrl: this.props.imageUrl,
            primaryText: this.props.primaryText,
            secondaryText: this.props.secondaryText,
            className: css("dtc-persona-image-list-item", this.props.className),
            onRenderPrimaryText: this._renderPrimaryText,
            onRenderSecondaryText: this._renderSecondaryText,
            imageShouldFadeIn: true,
            imageInitials: "T"
        };

        return <Persona
            {...personaProps}
        />;
    }

    private _renderPrimaryText = (props: IPersonaProps) => {
        return <span
            className="primary-text"
            {...this.props.ariaLabelledById ? { id: this.props.ariaLabelledById } : {}}>
            {props.primaryText}
        </span>;
    }

    private _renderSecondaryText = (props: IPersonaProps) => {
        return <span
            className="secondary-text">
            {props.secondaryText}
        </span>;
    }

    private _getPersonaSize(imageSize: ImageSize): PersonaSize {
        switch (imageSize) {
            case ImageSize.Small:
                return PersonaSize.small;
            case ImageSize.Medium:
                return PersonaSize.regular;
            default:
                return PersonaSize.regular;
        }
    }
}