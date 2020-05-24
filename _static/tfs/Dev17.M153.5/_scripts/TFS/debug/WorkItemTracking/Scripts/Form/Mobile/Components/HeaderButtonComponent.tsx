import React = require("react");

import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";

export abstract class HeaderButtonComponent<TProps, TState> extends WorkItemBindableComponent<TProps, TState> {
    private _onClickHandler: () => void = () => this._onClick();

    constructor(props: TProps, context?: any) {
        super(props, context, {
            eventThrottlingInMs: 200
        });

        this._subscribeToWorkItemChanges();
    }

    protected _workItemChanged() {
        this.forceUpdate();
    }

    public render(): JSX.Element {
        return <button disabled={this._isDisabled()} className={this._getClasses()} aria-label={this._getAriaLabel()} onClick={this._onClickHandler} />;
    }

    protected _getClasses(): string {
        return "";
    }

    protected abstract _getAriaLabel(): string;

    protected _onClick() {
    }

    protected _isDisabled(): boolean {
        return false;
    }
}