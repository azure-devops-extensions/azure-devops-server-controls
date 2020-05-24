/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import { autobind } from "OfficeFabric/Utilities";
import { Link } from "OfficeFabric/Link";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";

export interface ICollapsibleMessageProps {
    alwaysVisibleContent: JSX.Element;
    collapsibleContent: JSX.Element;
}

export interface ICollapsibleMessageState {
    expanded: boolean;
}

export class CollapsibleMessage extends React.Component<ICollapsibleMessageProps, ICollapsibleMessageState> {
    constructor(props: ICollapsibleMessageProps) {
        super(props);
        this.state = {
            expanded: false
        };
    }

    @autobind
    private _clickHandler(event: React.MouseEvent<HTMLElement>) {
        this.setState({ expanded: !this.state.expanded });
        event.preventDefault();
    }

    public render(): JSX.Element {
        if (this.state.expanded) {
            return (
                <span className="collapsible-message" aria-expanded="true">
                    {this.props.alwaysVisibleContent}
                    <Link className="show-hide-details" onClick={this._clickHandler}>
                        {MyExperiencesResources.CollapsibleMessageHideDetails}
                    </Link>
                    <br />
                    <br />
                    <span>{this.props.collapsibleContent}</span>;
                </span>
            );
        }
        else {
            return (
                <span className="collapsible-message" aria-expanded="false">
                    {this.props.alwaysVisibleContent}
                    <Link className="show-hide-details" onClick={this._clickHandler}>
                        {MyExperiencesResources.CollapsibleMessageShowDetails}
                    </Link>
                </span>
            );
        }
    }
}