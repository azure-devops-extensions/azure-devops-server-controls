/// <reference types="react-dom" />

import * as ReactDOM from "react-dom";
import * as Q from "q";

import { ITabContent } from "Presentation/Scripts/TFS/TFS.Configurations";

/**
 * 
 */
export interface IReactComponent {
    component: JSX.Element;
}


/**
 * What: Class that must be inherited to have the class injected in the existing Web Access Configuration Dialog
 * Why: We need to fulfill a contract (ITabContent) to be injected into the dialog. We are using React, this is a base class
 *      that abstract few details to simplify the React integration in the existing code.
 */
export abstract class ReactTabContent implements ITabContent {
    /**
     * @see isValid()
     * Why true: We do not want to have error in the UI with initial value
     */
    protected _isValid: boolean = true;

    /**
     * @see isDirty()
     * Why false: By default, no one modified the value
     */
    protected _isDirty: boolean = false;

    /**
     * What: Callback used when the dirty state changed
     * Why: Allow to call the dirty change state that will change the button in the configuration dialog. 
     */
    private _onDirtyStateChanged: Function;

    /**
     * What: Callback used when the valid state changed
     * Why: Allow to call the valie change state that will put the tab in error or not
     */
    private _onValidStateChanged: Function;

    /**
     * What: Pointer to a function from the configuration panel
     * Why: Need to be able from the tab to call the configuration to display an error message
     */
    private _showErrorDelegate: Function;

    /**
     * What: Pointer to a function responsible for unmounting the react component
     * Why: Since we use ReactDOM.render we must manage the lifecyle
     */
    private _unmountComponent: Function;

    /**
     * What : A configuration tab is loading, we initialize the React component
     * Why : We want to have a React Tab and we need to bridge the WebAccess content to React content
     * @param {JQuery} $container - The container where to place the React component
     */
    public beginLoad($container: JQuery): IPromise<any> {
        const deferred = Q.defer<any>();
        const container = $container.get(0);
        const reactComponentInfo = this.renderContent();

        ReactDOM.render(reactComponentInfo.component,
            container,
            () => { deferred.resolve(null); }
        );

        this._unmountComponent = () => {
            ReactDOM.unmountComponentAtNode(container);
        };

        return deferred.promise;
    }

    /**
     * What : Determine if a tab has been modified by the user since the opening of the tab
     * Why : - Need to know if the user changed something from the React component to the webaccess configuration
     *       - From the interface.
     */
    public isDirty(): boolean {
        return this._isDirty;
    }

    /**
     * What : Determine if a tab is valid
     * Why : - Need to know if the data in the store, under the tab is valid (from the React component to the webaccess configuration)
     *       - From the interface.   
     * 
     * @return {boolean} : True if valid; False if not valid
     */
    public isValid(): boolean {
        return this._isValid;
    }

    /**
     * What: Show error at the configuration level
     * Why: If error during loading data within a tab, we need to show to the user that something went wrong
     */
    public showError(errorMessage: string): void {
        if (this._showErrorDelegate) {
            this._showErrorDelegate(errorMessage);
        }
    }

    /**
     * What: Called by the configuration to have a pointer in the ReactTab to have access to the configuration show error
     * Why: Allows to have a callback that can be used to invoke the show error in the configuration
     */
    public registerShowErrorCallback(delegate: Function): void {
        this._showErrorDelegate = delegate;
    }

    /**
     * What: Override of dispose from the interface
     * Why: Need to kill the callback to avoid zombie methods
     */
    public dispose(): void {
        this._onDirtyStateChanged = null;
        this._onValidStateChanged = null;
        if (this._unmountComponent) {
            this._unmountComponent();
            this._unmountComponent = null;
        }
    }

    /**
     * What: Allow to push the dirty and valid state to the webaccess control.
     * Why: We need to tell the existing webaccess control when the state change from the store
     * @param onDirtyStateChanged
     * @param onValidStateChanged
     */
    public registerStateChangedEvents(onDirtyStateChanged: Function, onValidStateChanged: Function): void {
        this._onDirtyStateChanged = onDirtyStateChanged;
        this._onValidStateChanged = onValidStateChanged;
    }

    /**
     * What: Set the dirty state for the content control, make sure call this for any dirty state change
     * Why: Need to update the legacy control from the changes of the user
     */
    public fireStatesChange(): void {
        this._onDirtyStateChanged();
        this._onValidStateChanged();
    }

    /**
     * What: Produce the React component
     * Why: We need to hook React lifecycle to the configuration webaccess life cycle
     */
    protected abstract renderContent(): IReactComponent;
}
