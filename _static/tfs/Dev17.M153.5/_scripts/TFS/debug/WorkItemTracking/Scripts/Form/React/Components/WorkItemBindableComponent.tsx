import React = require("react");

import Diag = require("VSS/Diag");

import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

import {
    IWorkItemFormComponentContext, IWorkItemFormContextProvider, WorkItemContextProviderPropTypes, IWorkItemFormContext
} from "WorkItemTracking/Scripts/Form/React/FormContext";

export interface IWorkItemBindableComponentOptions {
}

/**
 * Base class for components that need access to the work item
 */
export abstract class WorkItemBindableComponent<TProps, TState> extends React.Component<TProps, TState> {
    public context: IWorkItemFormComponentContext;
    static contextTypes = WorkItemContextProviderPropTypes;

    private _workItemChangeHandler: (workItem: WITOM.WorkItem, args?: WITOM.IWorkItemChangedArgs) => void;
    private _workItemFieldChangedHandler: (workItem: WITOM.WorkItem, field: WITOM.Field) => void;

    private _listenToWorkItemChanges: boolean = false;
    private _subscribedFields: (string | number)[] = [];

    private _options: IWorkItemBindableComponentOptions;

    protected _formContext: IWorkItemFormContext;
    protected _isMounted: boolean;

    constructor(props: TProps, context: IWorkItemFormComponentContext, options?: IWorkItemBindableComponentOptions) {
        super(props, context);
        Diag.Debug.assertIsNotUndefined(context, "context");

        this._options = options || {};

        this._workItemChangeHandler = (workItem: WITOM.WorkItem, args?: any) => this._workItemChanged(args && args.change);
        this._workItemFieldChangedHandler = (workItem: WITOM.WorkItem, field: WITOM.Field) => this._workItemFieldChanged(field);

        this._updateContext(context.provider);
    }

    public abstract render(): JSX.Element;

    private _updateContext(newProvider: IWorkItemFormContextProvider) {
        // Check if
        //  - provider changed
        //  - or, it's initial update
        if ((this.context && this.context.provider || null) !== newProvider || !this._formContext) {
            if (this.context && this.context.provider) {
                this.context.provider.unsubscribe(this._providerChanged);
            }

            if (newProvider) {
                newProvider.subscribe(this._providerChanged);
            }

            this._providerChanged();
        }
    }

    private _providerChanged = () => {
        let newFormContext = this.context.provider.getFormContext();
        if (newFormContext) {
            this._updateFormContext(newFormContext);
        }
    }

    public componentWillReceiveProps(nextProps: TProps, nextContext: IWorkItemFormComponentContext) {
        this._updateContext(nextContext.provider);
    }

    public componentDidMount() {
        this._isMounted = true;

        // We only bind when the component is mounted, so now that it is, ensure we are bound to the current work item        
        this._tryBind();
    }

    public componentWillUnmount() {
        // Detach any event listeners
        if (this._listenToWorkItemChanges) {
            // Detach listener from old work item
            if (this._formContext.workItem) {
                this._formContext.workItem.detachWorkItemChanged(this._workItemChangeHandler);
            }
        }

        if (this._subscribedFields.length > 0) {
            for (let subscribedField of this._subscribedFields) {
                // Detach old listener
                if (this._formContext.workItem) {
                    this._formContext.workItem.detachFieldChange(subscribedField as string, this._workItemFieldChangedHandler);
                }
            }
        }

        if (this.context && this.context.provider) {
            this.context.provider.unsubscribe(this._providerChanged);
        }

        this._isMounted = false;
    }

    protected _tryBind(workItem?: WITOM.WorkItem, isDisabledView?: boolean) {
        if (!this._isMounted) {
            // Only bind when component is mounted
            return;
        }

        if (workItem) {
            this._bind(workItem, isDisabledView);
        }

        if (!workItem && this._formContext && this._formContext.workItem) {
            this._bind(this._formContext.workItem, this._formContext.isDisabledView);
        }
    }

    protected _subscribeToWorkItemFieldChanges(fieldId: number);
    protected _subscribeToWorkItemFieldChanges(fieldReferenceName: string);
    protected _subscribeToWorkItemFieldChanges(fieldIdOrReferenceName: number | string) {
        // Check if the field is already subscribed to
        if (!Utils_Array.contains(this._subscribedFields, fieldIdOrReferenceName, Utils_String.ignoreCaseComparer)) {
            this._subscribedFields.push(fieldIdOrReferenceName);

            // Ensure subscriptions are set up, by calling again with existing context
            this._updateFormContext(this._formContext);
        }
    }

    protected _subscribeToWorkItemChanges() {
        if (!this._listenToWorkItemChanges) {
            this._listenToWorkItemChanges = true;

            // Ensure subscriptions are set up, by calling again with existing context
            this._updateFormContext(this._formContext);
        }
    }

    private _updateFormContext(newFormContext: IWorkItemFormContext) {
        // If control is already bound to a work item, unbind
        if (this._formContext && this._formContext.workItem && this._formContext.workItem !== newFormContext.workItem) {
            this._unbind();
        }

        // Detach global listeners
        if (this._listenToWorkItemChanges) {
            // Detach listener from old work item
            if (this._formContext.workItem) {
                this._formContext.workItem.detachWorkItemChanged(this._workItemChangeHandler);
            }
        }

        // Detach field subscriptions
        if (this._subscribedFields.length > 0) {
            if (this._formContext.workItem) {
                for (let subscribedField of this._subscribedFields) {
                    // Detach old listener
                    this._formContext.workItem.detachFieldChange(subscribedField as string, this._workItemFieldChangedHandler);
                }
            }
        }

        // Bind to new context.
        const originalContext = this._formContext;
        this._formContext = newFormContext;

        if (newFormContext.workItem) {
            if (!originalContext || originalContext.workItem !== newFormContext.workItem) {
                this._tryBind(newFormContext.workItem, newFormContext.isDisabledView)
            }
        }

        // Attach global listeners
        if (this._listenToWorkItemChanges) {
            if (newFormContext.workItem) {
                newFormContext.workItem.attachWorkItemChanged(this._workItemChangeHandler);
            }
        }

        // Update field subscriptions
        if (this._subscribedFields.length > 0) {
            if (newFormContext.workItem) {
                for (let subscribedField of this._subscribedFields) {
                    // Attach new listener
                    newFormContext.workItem.attachFieldChange(subscribedField as string, this._workItemFieldChangedHandler);
                }
            }
        }
    }

    /**
     * Override to react to work item changes
     * @param change Change that was triggered, see WorkItemChangeType module
     */
    protected _workItemChanged(change?: WITOM.IWorkItemChangedArgs) {
    }

    /**
     * Override to react to work item field changes
     * @param field Field that changed
     */
    protected _workItemFieldChanged(field: WITOM.Field) {
    }

    /**
     * Override to react to a work item being bound to the form
     * @param workItem Work item being bound
     * @param isDisabledView Value indicating whether it's the disabled view
     */
    protected _bind(workItem: WITOM.WorkItem, isDisabledView?: boolean) {
    }

    /**
     * Override to react to a work item being unbound from the form
     */
    protected _unbind() {
    }
}