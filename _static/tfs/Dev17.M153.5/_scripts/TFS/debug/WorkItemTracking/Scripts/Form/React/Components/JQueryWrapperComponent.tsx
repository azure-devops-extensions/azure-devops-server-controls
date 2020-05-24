/// <reference types="react" />

import * as React from "react";
import { delay } from "VSS/Utils/Core";
import { FullScreenEvents } from "WorkItemTracking/Scripts/Utils/Events";

export interface IJQueryWrapperComponentProps {
    element: JQuery;

    tag?: string;
}

export class JQueryWrapperComponent extends React.Component<IJQueryWrapperComponentProps, {}> {
    private _resolveElement = (element: HTMLElement) => this._element = element;
    private _element: HTMLElement;

    public componentDidMount() {
        this._update();
    }

    public componentWillUnmount() {
        if (this._element) {
            $(this._element).empty();
        }
    }

    public componentDidUpdate() {
        this._update();
    }

    public render() {
        const Tag = this.props.tag || "div";

        return <Tag ref={this._resolveElement} />;
    }

    private _update() {
        if (this._element) {
            $(this._element).empty().append(this.props.element);
        }
    }
}