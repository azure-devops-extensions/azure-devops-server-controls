/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { Image, IImageProps, ImageLoadState } from "OfficeFabric/Image";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";

import { delay } from "VSS/Utils/Core";
import { BrowserCheckUtils } from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ImageLoader";

export interface IImageLoaderState extends Base.IState {
    imageStatus: ImageLoadState;
}

export interface IImageLoaderProps extends IImageProps {
    isGifImage?: boolean;
    refresh?: boolean;
}

export class ImageLoader extends Base.Component<IImageLoaderProps, IImageLoaderState> {

    constructor(props) {
        super(props);
        this.state = { imageStatus: ImageLoadState.notLoaded };
    }

    public componentDidMount(): void {
        if (this.props.isGifImage && this.props.refresh) {
            if (this._imageContainerRef) {
                const allImages = this._imageContainerRef.getElementsByTagName("img");
                // find the img tag inside the Image component and remove src to and reset in componentDidUpdate the gif to play from starting
                if (allImages && allImages.length > 0) {
                    this._imageRef = allImages[0];
                    this._imageRef.src = "";
                    this.forceUpdate();
                }
            }
        }
    }

    public componentDidUpdate(): void {
        if (this.props.isGifImage && this.props.refresh) {
            if (this._imageRef) {
                // set the original src for the gif to play from starting
                if (BrowserCheckUtils.isChrome()) {
                    this._imageRef.src = this.props.src;
                } else {
                    // adding delay in other browsers for more frequent change of tabs the replay was not working
                    delay(this, 100, () => {
                        this._imageRef.src = this.props.src;
                    });
                }
            }
        }
    }

    public render(): JSX.Element {
        return (
            <div ref={this._resolveRef("_imageContainerRef")} className="dtc-image-loader-container">
                <Image {...this.props} onLoadingStateChange={this._onImageLoadingStateChange} />
                {
                    this.state.imageStatus === ImageLoadState.notLoaded &&
                    (
                        <Spinner size={SpinnerSize.large} label={Resources.Loading} className="dtc-image-loader-spinner" />
                    )
                }
            </div>
        );
    }

    private _onImageLoadingStateChange = (imageStatus: ImageLoadState): void => {

        this.setState({
            imageStatus: imageStatus
        });

        if (this.props.onLoadingStateChange) {
            this.props.onLoadingStateChange(imageStatus);
        }
    }

    private _imageContainerRef: HTMLDivElement;
    private _imageRef: HTMLImageElement;
}
