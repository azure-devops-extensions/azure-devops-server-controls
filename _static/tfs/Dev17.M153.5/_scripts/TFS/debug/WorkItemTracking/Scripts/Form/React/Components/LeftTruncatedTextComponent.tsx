/// <reference types="react" />

import * as React from "react";
import { delay } from "VSS/Utils/Core";
import { FullScreenEvents } from "WorkItemTracking/Scripts/Utils/Events";
import { getService } from "VSS/Events/Services";

const ResizeEventKey = "resize.leftTruncatedTextControl_";
const EllipsisCharacter = '\u2026';

export interface ILeftTruncatedTextProps {
    text: string;
}

export class LeftTruncatedTextComponent extends React.Component<ILeftTruncatedTextProps, {}> {
    private static _nextIdentifier: number = 1;

    private _resolveElement = (element: HTMLDivElement) => this._element = element;
    private _element: HTMLDivElement;

    private _identifier: number;
    private _fullScreenExitHandler: () => void;

    constructor(props, context) {
        super(props, context);

        this._identifier = LeftTruncatedTextComponent._nextIdentifier++;
    }

    public componentDidMount() {
        delay(null, 0, () => {
            this._updateTextToFit();
        });

        // Attach event handlers
        $(window).on(ResizeEventKey + this._identifier, () => { this._updateTextToFit(); });

        // Need to recalculate when full screen is exited since changes can occur while this control is not visible
        this._fullScreenExitHandler = () => { this._updateTextToFit(); };
        getService().attachEvent(FullScreenEvents.FULL_SCREEN_EXITED, this._fullScreenExitHandler);
    }

    public componentWillUnmount() {
        getService().detachEvent(FullScreenEvents.FULL_SCREEN_EXITED, this._fullScreenExitHandler);
    }

    public render(): JSX.Element {
        return <div className="left-ellipsis" ref={this._resolveElement}>
            {this.props.text}
        </div>;
    }

    private _updateTextToFit() {
        const domElement = this._element;
        var value: string = this.props.text;

        domElement.textContent = value;

        var textNode: Node = domElement.childNodes[0];
        if (domElement.scrollWidth > domElement.offsetWidth) {

            value = EllipsisCharacter + value;

            while (value.length > 2 && domElement.scrollWidth > domElement.offsetWidth) {
                value = EllipsisCharacter + value.substr(2);
                textNode.nodeValue = value;
            }
        }
    }
}