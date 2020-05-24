import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/LoadingContainer";

export interface IInvisibleLoadingContainer extends Props {
    isLoading: boolean;
}

export class InvisibleLoadingContainer extends Component<IInvisibleLoadingContainer, State> {
    public render(): JSX.Element {
        const displayType: string = this.props.isLoading ? "none" : "inline";
        const isLoadingStyle = {
            display: displayType
        };

        return (
            <div className="feed-loading-container">
                <div style={isLoadingStyle} className="feed-loaded-content">
                    {this.props.children}
                </div>
            </div>
        );
    }
}
