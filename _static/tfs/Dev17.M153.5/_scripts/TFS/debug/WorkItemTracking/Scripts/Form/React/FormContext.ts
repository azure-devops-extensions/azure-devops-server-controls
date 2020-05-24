import Q = require("q");
import React = require("react");
import PropTypes = require("prop-types");

import Diag = require("VSS/Diag");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemViewContributionManager = require("WorkItemTracking/Scripts/Form/WorkItemViewContributionManager");
import { FormLayoutType } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

/** Context that's made available to child components within the form */
export interface IWorkItemFormContext {
    /** Work item type for the current form */
    readonly workItemType: WITOM.WorkItemType;
    readonly workItemTypeColor: string;

    /** The work item the form is bound to (if it's bound) */
    readonly workItem?: WITOM.WorkItem;

    /** Value indicating whether the view should be disabled */
    readonly isDisabledView?: boolean;

    /** Contribution manager for the form */
    readonly contributionManager: WorkItemViewContributionManager;

    /** Additional items to share with all child components. Usually this should not be used. */
    readonly items: IDictionaryStringTo<any>;

    /** The layout type being used (Desktop or Mobile) */
    readonly layoutType: FormLayoutType;

    /** Identifier of form view, used to distinguish between global events of different form views */
    readonly formViewId: string;
}

/** Shared proptypes for the work item context */
export const WorkItemContextProviderPropTypes: React.ValidationMap<any> = {
    provider: PropTypes.object.isRequired
};

export interface IWorkItemFormComponentContext {
    provider: IWorkItemFormContextProvider;
}

export interface IWorkItemFormContextProvider {
    setFormContext(context: IWorkItemFormContext): void;
    getFormContext(): IWorkItemFormContext;

    subscribe(handler: IEventHandler): void;
    unsubscribe(handler: IEventHandler): void;
}

export class WorkItemFormContextProvider implements IWorkItemFormContextProvider {
    private _listeners: IEventHandler[] = [];
    private _context: IWorkItemFormContext;

    constructor(context: IWorkItemFormContext) {
        this._context = context;
    }

    public setFormContext(context: IWorkItemFormContext) {
        this._context = context;

        this._fire();
    }

    public getFormContext(): IWorkItemFormContext {
        return this._context;
    }

    private _fire() {
        for (let listener of this._listeners) {
            listener();
        }
    }

    public subscribe(handler: IEventHandler): void {
        this._listeners.push(handler);
    }

    public unsubscribe(handler: IEventHandler): void {
        let index = this._listeners.indexOf(handler);
        if (index !== -1) {
            this._listeners.splice(index, 1);
        }
    }
}