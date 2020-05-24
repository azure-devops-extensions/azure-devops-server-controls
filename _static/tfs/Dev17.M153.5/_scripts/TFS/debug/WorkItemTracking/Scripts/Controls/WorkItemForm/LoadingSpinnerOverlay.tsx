import * as React from "react";
import * as ReactDOM from "react-dom";

import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { delay, DelayedFunction } from "VSS/Utils/Core";

import { Loading } from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

import "VSS/LoaderPlugins/Css!Controls/WorkItemForm/LoadingSpinnerOverlay";

export class LoadingSpinnerOverlay {
    private _delayedShowFunction: DelayedFunction;
    private _delayedHideFunction: DelayedFunction;

    private _referenceElement: HTMLElement;
    private _element: HTMLDivElement;

    /**
     * Creates instance of loading spinner overlay
     * @param referenceElement The spinner will be placed *before* this element.
     */
    public constructor(referenceElement: HTMLElement) {
        this._referenceElement = referenceElement;
    }

    public dispose() {
        if (this._delayedShowFunction) {
            this._delayedShowFunction.cancel();
        }

        if (this._delayedHideFunction) {
            this._delayedHideFunction.cancel();
        }
        this._hideLoadingOverlay();
    }

    public show(waitTime: number, loadingText?: string) {
        if (this._delayedShowFunction) {
            this._delayedShowFunction.cancel();
        }

        if (this._delayedHideFunction) {
            this._delayedHideFunction.cancel();
        }

        this._delayedShowFunction = delay(this, waitTime, this._showLoadingOverlay, [loadingText || Loading]);
    }

    public hide(waitTime?: number) {
        if (this._delayedShowFunction) {
            this._delayedShowFunction.cancel();
        }

        if (this._delayedHideFunction) {
            this._delayedHideFunction.cancel();
        }

        if (waitTime === undefined || waitTime === null || waitTime < 0) {
            this._hideLoadingOverlay();
        } else {
            this._delayedHideFunction = delay(this, waitTime, this._hideLoadingOverlay);
        }
    }

    private _showLoadingOverlay(loadingText: string) {
        if (!this._element) {
            this._element = document.createElement("div");
        }

        ReactDOM.render(
            <div className="loading-spinner-overlay">
                <Spinner size={SpinnerSize.large} label={loadingText} />
            </div>,
            this._element
        );

        const parent = this._referenceElement.parentElement;
        parent.insertBefore(this._element, this._referenceElement);
    }

    private _hideLoadingOverlay() {
        if (this._element) {
            ReactDOM.unmountComponentAtNode(this._element);
            this._element.parentNode.removeChild(this._element);
            this._element = null;
        }
    }
}
