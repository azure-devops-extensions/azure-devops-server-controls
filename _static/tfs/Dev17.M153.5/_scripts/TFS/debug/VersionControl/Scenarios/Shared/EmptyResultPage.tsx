/// <reference types="react" />

import * as React from "react";

import "VSS/LoaderPlugins/Css!VersionControl/EmptyResultPage";

export interface IEmptyResultPageProps extends React.Props<void> {
    title: string,
    message: string;
}

/**
 * Renders empty search result page.
 */
export class EmptyResultPage extends React.Component<IEmptyResultPageProps, {}> {
    public render(): JSX.Element {
        return (
            <div className="empty-result bowtie-style" role="alert">
                <div className="empty-result-icon icon bowtie-icon bowtie-search">
                </div>
                <div className="empty-top-message">
                    {this.props.title}
                </div>
                <div className="empty-detailed-message">
                    <span> {this.props.message} </span>
                </div>
            </div>
        );
    }
}
