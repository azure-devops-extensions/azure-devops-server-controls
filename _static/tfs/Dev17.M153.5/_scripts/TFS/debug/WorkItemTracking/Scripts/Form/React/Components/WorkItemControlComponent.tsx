import React = require("react");

import { IWorkItemControlOptions, WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { WorkItemBindableComponent, IWorkItemBindableComponentOptions } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { IWorkItemFormComponentContext } from "WorkItemTracking/Scripts/Form/React/FormContext";

export interface IWorkItemControlProps {
    controlOptions: IWorkItemControlOptions;
}

/**
 * Base class for React work item controls
 */
export abstract class WorkItemControlComponent<TProps extends IWorkItemControlProps, TState> extends WorkItemBindableComponent<TProps, TState> {
    constructor(props: TProps, context: IWorkItemFormComponentContext, options?: IWorkItemBindableComponentOptions) {
        super(props, context, options);
    }
}