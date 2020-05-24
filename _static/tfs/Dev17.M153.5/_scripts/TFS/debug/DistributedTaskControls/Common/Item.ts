import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";

/**
 * @breif Item of a two panel selector. An item can be present at any level of hierarchy in a two-panel selector
 */
export interface Item {

    /**
     *  Get the overview component.
     */
    getOverview: (instanceId?: any) => JSX.Element;

    /**
     *  Get the details component.
     */
    getDetails: (instanceId?: string) => JSX.Element;

    /**
     * Callback method on overlay panel hide action.
     */
    onHideDetails?: () => void;

    /**
     *  Unique key for the item under the scope of the top level container. 
     */
    getKey(): string;

    /**
     * Get the view context for the item. Return type is any so that it can work for different type of items
     */
    getViewContext?: () => any;

    /**
     * Get the instance Id
     */
    getInstanceId?: () => string;
}

/**
 * @brief Base props interface for components or controllerviews that implement the item overview UI
 */
export interface ItemOverviewProps extends ComponentBase.IProps {

    item: Item;
    ariaProps?: ItemOverviewAriaProps;
}

export interface ItemOverviewState extends ComponentBase.IState {
    isValid?: boolean;
    isSelected?: boolean;
    hasWarnings?: boolean;
}

export interface ItemOverviewAriaProps {
    level?: number;
    expanded?: boolean;
    setSize?: number;
    positionInSet?: number;
    labelledBy?: string;
    role?: string;
    describedBy?: string;
}