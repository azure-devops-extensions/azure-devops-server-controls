import * as React from "react";

import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { IPivotBarAction, IPivotBarViewAction } from "VSSUI/PivotBar";
import { IFilter } from "VSSUI/Utilities/Filter";
import { IObservableArray } from "VSS/Core/Observable";

export interface IPivotItemContentProps {
    /**
     * An observable array of commands for this pivot to display
     */
    commands?: IObservableArray<IPivotBarAction>;

    /**
     * The hub filter
     */
    filter?: IFilter;

    /**
     * An observable array of commands for this pivot to display
     */
    viewActions?: IObservableArray<IPivotBarViewAction>;
}

/**
 * Base component for pivot items.
 * Provides mechanisms for defining commands at the Pivot level
 */
export abstract class PivotItemContent<P extends IPivotItemContentProps, S = {}> extends React.Component<P, S> {
    private _hubName: string;
    private _pivotName: string;
    private _ttiPublished: boolean;

    constructor(props: P, context: any, hubName: string, pivotName: string) {
        super(props, context);
        this._hubName = hubName;
        this._pivotName = pivotName;
    }

    public get telemetryHelper(): PerformanceTelemetryHelper {
        return PerformanceTelemetryHelper.getInstance(this._hubName);
    }

    public componentWillMount() {
        const telemetryHelper = this.telemetryHelper;
        if (telemetryHelper.isActive()) {
            telemetryHelper.split(`${this._hubName}_PivotWillMount: ${this._pivotName}`);
        }
    }

    public componentDidMount() {
        this.updateCommands();
        this.updateViewActions();
        this._publishTTI();
    }

    public componentWillUpdate(nextProps: P, nextState: S) {
        if (this.shouldUpdateCommandsOnUpdate(nextProps, nextState)) {
            this.updateCommands(nextProps, nextState);
        }
        if (this.shouldUpdateViewActionsOnUpdate(nextProps, nextState)) {
            this.updateViewActions(nextProps, nextState);
        }
    }

    public componentDidUpdate(props: P, state: S): void {
        this._publishTTI();
    }

    public componentWillUnmount(): void {
        if (this.props.commands) {
            this.props.commands.value = [];
        }
        if (this.props.viewActions) {
            this.props.viewActions.value = [];
        }
    }

    public abstract isDataReady(): boolean;

    public executeAfterTTI(): void { }

    protected shouldUpdateCommandsOnUpdate(nextProps: P, nextState: S): boolean {
        return false;
    }

    protected shouldUpdateViewActionsOnUpdate(nextProps: P, nextState: S): boolean {
        return false;
    }

    protected updateCommands(props: P = this.props, state: S = this.state): void {
        if (props.commands) {
            const commands: IPivotBarAction[] = this.getCommands(props, state);
            props.commands.value = commands;
        }
    }

    protected updateViewActions(props: P = this.props, state: S = this.state): void {
        if (props.viewActions) {
            const viewActions: IPivotBarViewAction[] = this.getViewActions(props, state);
            props.viewActions.value = viewActions;
        }
    }

    protected getCommands(props: P, state: S): IPivotBarAction[] {
        return [];
    }

    protected getViewActions(props: P, state: S): IPivotBarAction[] {
        return [];
    }

    private _publishTTI(): void {
        if (!this._ttiPublished && this.isDataReady()) {
            this._ttiPublished = true;
            if (this.telemetryHelper.isActive()) {
                this.telemetryHelper.end();
            }
            this.executeAfterTTI();
        }
    }
}