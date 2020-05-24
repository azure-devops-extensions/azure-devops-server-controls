import * as React from "react";

import {
    IImageListItemCommonProps,
    ImageSize
} from "DistributedTaskControls/SharedControls/ImageListItem/ImageListItemCommon";

import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/ImageListItem/BowtieImageListItem";

export interface IBowtieImageListItemProps extends IImageListItemCommonProps {
    bowtieImageClassName: string;
}

export class BowtieImageListItem extends React.Component<IBowtieImageListItemProps, {}> {
    public render(): JSX.Element {
        const secondaryText = this.props.secondaryText;
        const imageSizeCss = getCssPerImageSize(this.props.imageSize);
        const showSecondaryText = secondaryText && this.props.imageSize !== ImageSize.Small;

        return <div className={css("dtc-bowtie-image-list-item", this.props.className)}>
            <div className={css("image-area", imageSizeCss, { "has-secondary": showSecondaryText })}>
                <BowtieIcon
                    iconClassName={this.props.bowtieImageClassName}
                />
            </div>
            <div className={css("details-area", imageSizeCss)}>
                <div
                    className="primary-text text"
                    {...this.props.ariaLabelledById ? { id: this.props.ariaLabelledById } : {}}>
                    {this.props.primaryText}
                </div>
                {
                    showSecondaryText &&
                    <div className="secondary-text text">{secondaryText}</div>
                }
            </div>
            {this.props.children}
        </div>;
    }
}

interface IBowtieIconProps {
    iconClassName: string;
}

const BowtieIcon = (props: IBowtieIconProps) => {
    return <i className={css("bowtie-icon", props.iconClassName)} />;
};

function getCssPerImageSize(imageSize: ImageSize): IDictionaryStringTo<boolean> {
    return {
        "small": imageSize === ImageSize.Small,
        "medium": imageSize === ImageSize.Medium
    };
}