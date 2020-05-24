import Events_Services = require("VSS/Events/Services");
import { delay } from "VSS/Utils/Core";
import { BaseControl } from "VSS/Controls";
import { FullScreenEvents } from "WorkItemTracking/Scripts/Utils/Events";

const ResizeEventKey = "resize.leftTruncatedTextControl_";
const EllipsisCharacter = '\u2026';

export interface ILeftTruncatedTextControlOptions {
    text: string;
}

/**
 * Responsive control for displaying text which may be truncated on the left (with an ellipsis)
 * if it's too long for its container.
 */
export class LeftTruncatedTextControl extends BaseControl {

    public _options: ILeftTruncatedTextControlOptions;

    private static _nextIdentifier: number = 1;

    private _identifier: number;
    private _fullScreenExitHandler: () => void;

    constructor(options?: ILeftTruncatedTextControlOptions) {
        super(options);

        this._identifier = LeftTruncatedTextControl._nextIdentifier++;
    }

    public initialize() {
        var element: JQuery = this.getElement();

        element.addClass("left-ellipsis");

        delay(null, 0, () => {
            // Delay since this element is generally not added to the DOM during initialization so no width exists.
            this.updateTextToFit();
        });

        // Attach event handlers
        $(window).on(ResizeEventKey + this._identifier, () => { this.updateTextToFit(); });

        // Need to recalculate when full screen is exited since changes can occur while this control is not visible
        this._fullScreenExitHandler = () => { this.updateTextToFit(); };
        Events_Services.getService().attachEvent(FullScreenEvents.FULL_SCREEN_EXITED, this._fullScreenExitHandler);
    }

    protected _dispose() {
        super._dispose();

        $(window).off(ResizeEventKey + this._identifier);
        Events_Services.getService().detachEvent(FullScreenEvents.FULL_SCREEN_EXITED, this._fullScreenExitHandler);
    }

    private updateTextToFit() {
        const domElement: HTMLElement = this.getElement()[0];
        var value: string = this._options.text;

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
