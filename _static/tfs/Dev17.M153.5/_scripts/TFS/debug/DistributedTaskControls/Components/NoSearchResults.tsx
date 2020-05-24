/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/NoSearchResults";

export interface IProps extends Base.IProps {
    searchText: string;
}

export class NoSearchResults extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {
        return (
            <div className="no-search-results-section">
                <div className="info-name">
                    <i className="bowtie-icon bowtie-status-info-outline no-search-results-warning-icon" />
                    {Resources.NoSearchResultsFoundText}
                    <span className="search-text">{this.props.searchText}</span>
                </div>
                <div className="info-description">
                    {Resources.NoSearchResultsFoundDescription}
                </div>
            </div>
        );
    }
}
