/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { Singleton } from "DistributedTaskControls/Common/Factory";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { SpinnerSize } from "OfficeFabric/Spinner";

/**
 * Manages loading behavior
 */
export class LoadingUtils extends Singleton {

    public static instance(): LoadingUtils {
        return super.getInstance<LoadingUtils>(LoadingUtils);
    }

    public createLoadingControl(className: string, isBlocking: boolean = false, waitTime?: number): HTMLElement {

        this._loadingContainer = document.createElement("div");
        document.body.appendChild(this._loadingContainer);
        ReactDOM.render(React.createElement(LoadingComponent, {
            className: className,
            size: SpinnerSize.large,
            label: Resources.Loading,
            blocking: isBlocking,
            wait: waitTime
        }), this._loadingContainer);
        return this._loadingContainer;
    }

    public cleanupLoadingControl(): void {
        if (this._loadingContainer) {
            ReactDOM.unmountComponentAtNode(this._loadingContainer);
            document.body.removeChild(this._loadingContainer);
            this._loadingContainer = null;
        }
    }

    private _loadingContainer: HTMLElement;
}
