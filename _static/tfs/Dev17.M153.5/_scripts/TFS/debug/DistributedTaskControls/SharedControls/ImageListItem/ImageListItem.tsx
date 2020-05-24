import * as React from "react";

import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import {
    IImageListItemCommonProps,
    ImageSize
} from "DistributedTaskControls/SharedControls/ImageListItem/ImageListItemCommon";

import * as BowtieImageListItemAsync from "DistributedTaskControls/SharedControls/ImageListItem/BowtieImageListItem";
import * as UrlImageListItemAsync from "DistributedTaskControls/SharedControls/ImageListItem/UrlImageListItem";

import { css } from "OfficeFabric/Utilities";

import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

export interface IImageListItemProps extends IImageListItemCommonProps {
    bowtieImageClassName?: string;
    imageUrl?: string;
}

export class ImageListItem extends React.Component<IImageListItemProps, {}> {

    public render(): JSX.Element {
        let imageWithTextElement: JSX.Element = null;

        if (this.props.imageUrl) {
            imageWithTextElement = <UrlImageListItem
                imageSize={this.props.imageSize}
                imageUrl={this.props.imageUrl}
                primaryText={this.props.primaryText}
                secondaryText={this.props.secondaryText}
                ariaLabelledById={this.props.ariaLabelledById}
            />;
        }
        else if (this.props.bowtieImageClassName) {
            imageWithTextElement = <BowtieImageListItem
                imageSize={this.props.imageSize}
                bowtieImageClassName={this.props.bowtieImageClassName}
                primaryText={this.props.primaryText}
                secondaryText={this.props.secondaryText}
                ariaLabelledById={this.props.ariaLabelledById}
            />;
        }

        return <div
            className={css("dtc-image-list-item", this.props.className)}>
            {imageWithTextElement}
            {this.props.children}
        </div>;
    }

}

const UrlImageListItem = getAsyncLoadedComponent(
    ["DistributedTaskControls/SharedControls/ImageListItem/UrlImageListItem"],
    (m: typeof UrlImageListItemAsync) => m.UrlImageListItem,
    () => <LoadingComponent />);

const BowtieImageListItem = getAsyncLoadedComponent(
    ["DistributedTaskControls/SharedControls/ImageListItem/BowtieImageListItem"],
    (m: typeof BowtieImageListItemAsync) => m.BowtieImageListItem,
    () => <LoadingComponent />);

