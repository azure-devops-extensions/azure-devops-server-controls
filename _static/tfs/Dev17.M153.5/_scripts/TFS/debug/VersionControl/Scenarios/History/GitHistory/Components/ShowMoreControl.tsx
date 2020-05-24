/// <reference types="react" />

import React = require("react");
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/ShowMoreControl";

export interface IShowMoreControlProps extends React.Props<void> {
    onClick(): void;
}

/**
 * Renders show more control.
 */
export class ShowMoreControl extends React.Component<IShowMoreControlProps, {}> {
    public render(): JSX.Element {
        return <div className={"vc-show-more"}>
                    <a className={"show-more-text"}
                        tabIndex={0}
                        onClick={this.props.onClick}
                        onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => this._onKeyDown(e)}>
                        {VCResources.ShowMore}
                    </a>
                </div>
    }

    private _onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
        if (event.key === "Enter") {
            this.props.onClick();
        }
    }
}
