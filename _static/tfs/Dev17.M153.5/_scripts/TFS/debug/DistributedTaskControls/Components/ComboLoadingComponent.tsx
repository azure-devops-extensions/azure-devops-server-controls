/// <reference types="react" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { LoadingComponent } from "DistributedTaskControls/Components/LoadingComponent";

import { SpinnerSize } from "OfficeFabric/Spinner";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ComboLoadingComponent";

export class ComboLoadingComponent extends Base.Component<Base.IProps, Base.IStateless>{

    public render(): JSX.Element {
        return (
            <div className="combo-loading-component">
                <LoadingComponent
                    className="combo-loading-content"
                    size={SpinnerSize.xSmall}
                    wait={ComboLoadingComponent._waitTime}
                    label={Resources.Loading} />
            </div>);
    }

    private static _waitTime: number = 500;
}

export class ComboNoResultsComponent extends Base.Component<Base.IProps, Base.IStateless>{
    public render(): JSX.Element {
        return (
            <div className="combo-no-results-component">
                <div
                    className="combo-no-results-content">
                    {Resources.NoResultsFoundText}
                </div>
            </div>);
    }
}

export class ComboLoadingHelper {
    public removeLoadingComponent(isComboDisposed: boolean, parentContainer: HTMLElement, loadingComponentDismissed?: boolean): void {
        if (this._loadingContainer) {
            this._detachGlobalEvent();
            this._loadingComponentDismissed = !!loadingComponentDismissed;
  
            ReactDOM.unmountComponentAtNode(this._loadingContainer);
            if (!isComboDisposed && parentContainer) {
                parentContainer.removeChild(this._loadingContainer);
                this._loadingContainer = null;
            }
            else {
                this._loadingContainer.remove();
                this._loadingContainer = null;
            }
        }
    }

    public createLoadingComponent(parentContainer: HTMLElement): void {
        // Render the loading component
        if (!this._loadingContainer && parentContainer) {
            this._loadingContainer = document.createElement("div");
            this._loadingContainer.className = "combo-loading-container";
            parentContainer.appendChild(this._loadingContainer);
            this._loadingElement = ReactDOM.render(React.createElement(ComboLoadingComponent), this._loadingContainer);
            this._attachGlobalEvent();
        }
    }

    public showNoResultsSection(parentContainer: HTMLElement): void {
        if (!this._noResultsContainer && parentContainer) {
            this._noResultsContainer = document.createElement("div");
            this._noResultsContainer.className = "combo-no-results-container";
            parentContainer.appendChild(this._noResultsContainer);
            this._noResultsElement = ReactDOM.render(React.createElement(ComboNoResultsComponent), this._noResultsContainer);
        }
    }

    public removeNoResultsComponent(isComboDisposed: boolean, parentContainer: HTMLElement): void {
        if (this._noResultsContainer) {
            ReactDOM.unmountComponentAtNode(this._noResultsContainer);
            if (!isComboDisposed && parentContainer) {
                parentContainer.removeChild(this._noResultsContainer);
                this._noResultsContainer = null;
            }
            else {
                this._noResultsContainer.remove();
                this._noResultsContainer = null;
            }
        }
    }

    //return true when user click somewhere outside loading component and the loading component is dismissed.
    public isLoadingComponentDismissed(): boolean {
        return this._loadingComponentDismissed;
    }

    public setLoadingComponentDismissed(value: boolean): void {
        this._loadingComponentDismissed = value;
    }

    private _attachGlobalEvent(): void {
        $(this._loadingContainer).parents().bind("click", this._hideLoadingComponent);
    }

    private _detachGlobalEvent(): void {
        let parentElements = $(this._loadingContainer).parents();
        if (parentElements) {
            parentElements.unbind("click", this._hideLoadingComponent);
        }
    }

    private _hideLoadingComponent = () => {
        this.removeLoadingComponent(true, this._loadingContainer.parentElement, true);
    }

    private _loadingElement: ComboLoadingComponent;
    private _loadingContainer: HTMLElement;
    private _noResultsElement: ComboNoResultsComponent;
    private _noResultsContainer: HTMLElement;
    private _loadingComponentDismissed: boolean = false;
}