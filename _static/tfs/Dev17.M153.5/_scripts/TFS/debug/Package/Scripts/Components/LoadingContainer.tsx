import * as React from "react";

import { SpinnerType } from "OfficeFabric/components/Spinner/Spinner.types";
import { Spinner } from "OfficeFabric/Spinner";
import { css } from "OfficeFabric/Utilities";

import { Component, Props, State } from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/LoadingContainer";

export interface ILoadingContainerProps extends Props {
    isLoading: boolean;
}

export class LoadingContainer extends Component<ILoadingContainerProps, State> {
    public render(): JSX.Element {
        const isLoading = this.props.isLoading;
        const className = css("feed-loading-container", isLoading ? "loading" : "", this.props.cssClass);

        return (
            <div className={className}>
                {isLoading ? (
                    <Spinner type={SpinnerType.large} className="feed-loading-spinner" />
                ) : (
                    this.props.children
                )}
            </div>
        );
    }
}
