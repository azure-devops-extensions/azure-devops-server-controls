// CSS
import "VSS/LoaderPlugins/Css!Presentation/Components/WorkItemTypeIcon";

// Modules
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as DataProvider from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import * as TelemetryServices from "VSS/Telemetry/Services";
import { css, getId } from "OfficeFabric/Utilities";
import { TooltipHost } from "VSSUI/Tooltip";
import { AriaAttributes } from "VSS/Controls";
import { Debug } from "VSS/Diag";
import * as VSSError from "VSS/Error";

/**
 * Custom accessibility options to the icon control
 */
export interface IIconAccessibilityOptions {
    /**
     * Suppress tooltip to show up
     * Defaults to false
     */
    suppressTooltip?: boolean;

    /**
     * Custom tooltip of the icon control. Work item type name will be used if absent
     */
    tooltip?: string;

    /**
     * Aria attributes for the component
     */
    ariaAttributes?: AriaAttributes;
}

/**
 * Interfance for work item type icon props
 */
export interface IWorkItemTypeIconProps {
    /**
     * Optional class name to add to root element
     */
    className?: string;

    /**
     * Work item type name
     */
    workItemTypeName: string;

    /**
     * Project name
     */
    projectName: string;

    /**
     * Optional custom icon input
     * Setting this will make control bypass data provider for both color and icon
     * It should only be used when consumer already have color and icon data from server facade service
     */
    customInput?: DataProvider.IColorAndIcon;

    /**
     * Custom accessibility options to the icon control
     */
    iconAccessibilityOptions?: IIconAccessibilityOptions;
}

/**
 * Interfance for work item type icon state
 */
export interface IWorkItemTypeIconState extends DataProvider.IColorAndIcon {
}

export class WorkItemTypeIcon extends React.Component<IWorkItemTypeIconProps, IWorkItemTypeIconState> {
    private _isMounted: boolean = false;

    constructor(props: IWorkItemTypeIconProps) {
        super(props);

        // Initial state
        this.state = this._getState(this.props);
    }

    public render(): JSX.Element {
        // Only log CI if the caller did not pass sufficient inputs for control to render color and icon.
        const insufficientInput = !this.props.customInput && this._isProjectAndWorkItemTypeNullOrEmpty();
        if (insufficientInput) {
            WorkItemTypeIconCIEvents.publishEvent({
                ...this.props,
                insufficientInput: insufficientInput
            });
        }

        // Set icon and color data
        const icon = this.state ? this.state.icon : null;
        const color = this.state ? this.state.color : DataProvider.WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR;

        // Rendering control content
        const allyOptions = this.props.iconAccessibilityOptions;
        let tooltipContent = null;
        let tooltipHostId = null;

        const shouldShowTooltip = !allyOptions || !allyOptions.suppressTooltip;
        if (shouldShowTooltip) {
            tooltipContent = (allyOptions && allyOptions.tooltip) || this.props.workItemTypeName;
            tooltipHostId = getId("work-item-type-icon-tooltip");
        }

        const ariaLabel = allyOptions && allyOptions.ariaAttributes ? allyOptions.ariaAttributes.label : (tooltipContent || this.props.workItemTypeName);
        const ariaDescribedBy = allyOptions && allyOptions.ariaAttributes ? allyOptions.ariaAttributes.describedby : tooltipHostId;
        const ariaLabelledBy = allyOptions && allyOptions.ariaAttributes ? allyOptions.ariaAttributes.labelledby : null;

        // Icon element UI
        const iconElementClassName = "work-item-type-icon bowtie-icon";
        const className = css(
            iconElementClassName, icon, { "work-item-type-icon-no-tooltip": !shouldShowTooltip }, !shouldShowTooltip && this.props.className);
        const controlElement = <i
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={className}
            style={{ color: color }}
        />;

        if (controlElement && shouldShowTooltip) {
            return <TooltipHost hostClassName={css("work-item-type-icon-wrapper", this.props.className)} content={tooltipContent} id={tooltipHostId}>
                {controlElement}
            </TooltipHost>;
        }

        return controlElement;
    }

    public componentDidMount(): void {
        this._isMounted = true;
    }

    public componentWillUnmount(): void {
        this._isMounted = false;
    }

    public componentWillReceiveProps(nextProps: IWorkItemTypeIconProps): void {
        const nextState: IWorkItemTypeIconState = this._getState(nextProps);
        if (nextState && (!this.state || (nextState.color !== this.state.color || nextState.icon !== this.state.icon))) {
            this.setState(nextState);
        }
    }

    private _getState(props: IWorkItemTypeIconProps): IWorkItemTypeIconState {
        if (props.customInput) {
            // render with custom input if exist.
            return {
                color: props.customInput.color ? props.customInput.color : DataProvider.WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR,
                icon: props.customInput.icon ? props.customInput.icon : DataProvider.WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_BOWTIE_ICON
            };
        }
        else if (!this._isProjectAndWorkItemTypeNullOrEmpty()) {
            const dataProvider = DataProvider.WorkItemTypeColorAndIconsProvider.getInstance();
            // If project and work item type are not empty and icon already exist in cache, then get the icon.
            // Otherwise get icon async.
            if (dataProvider.isPopulated(props.projectName)) {
                return dataProvider.getColorAndIcon(props.projectName, props.workItemTypeName);
            } else {
                dataProvider.getColorAndIconAsync(props.projectName, props.workItemTypeName).then((colorAndIcon: DataProvider.IColorAndIcon) => {
                    if (this._isMounted) {
                        this.setState(colorAndIcon);
                    }
                });
                // return null here to render an empty space until the result come back from server.
                return null;
            }
        }

        // the caller did not pass sufficient inputs for control to render color and icon, so return default.
        return DataProvider.WorkItemTypeColorAndIcons.getDefault();
    }

    /**
     * Check whether project name or work item type name is null or empty.
     * @return True if either project name or work item type name is null or empty. False otherwise.
     */
    private _isProjectAndWorkItemTypeNullOrEmpty(): boolean {
        return !(this.props.projectName && this.props.workItemTypeName);
    }
}

/**
 * Render work item type icon control
 *
 * @container Container element
 * @workItemTypeName Work item type name
 * @projectName Project name
 * @iconAccessibilityOptions Custom accessibility options to the icon control
 */
export function renderWorkItemTypeIcon(
    container: Element,
    workItemTypeName: string,
    projectName: string,
    iconAccessibilityOptions?: IIconAccessibilityOptions): void;
/**
 * Render work item type icon control
 *
 * @container Container element
 * @workItemTypeName Work item type name
 * @customInput User defined color and icon to display
 * @iconAccessibilityOptions Custom accessibility options to the icon control
 */
export function renderWorkItemTypeIcon(
    container: Element,
    workItemTypeName: string,
    customInput: DataProvider.IColorAndIcon,
    iconAccessibilityOptions?: IIconAccessibilityOptions): void;
/**
 * Render work item type icon control
 *
 * @container Container element
 * @workItemTypeName Work item type name
 * @input Project name or custom input
 * @iconAccessibilityOptions Custom accessibility options to the icon control
 */
export function renderWorkItemTypeIcon(
    container: Element,
    workItemTypeName: string,
    input: string | DataProvider.IColorAndIcon,
    iconAccessibilityOptions?: IIconAccessibilityOptions): void {
    const hasCustomInput = typeof input !== "string";

    const props: IWorkItemTypeIconProps = {
        workItemTypeName: workItemTypeName,
        projectName: hasCustomInput ? null : input as string,
        customInput: hasCustomInput ? input as DataProvider.IColorAndIcon : null,
        iconAccessibilityOptions: iconAccessibilityOptions
    };

    const reactHost = getReactHost(container, true);
    ReactDOM.render(<WorkItemTypeIcon {...props} />, reactHost);
}

export function unmountWorkItemTypeIcon(container: Element): void {
    const reactHost = getReactHost(container, false);

    if (reactHost) {
        ReactDOM.unmountComponentAtNode(reactHost);
        // Remove the react host as well to keep the container clean from internal implementation.
        container.removeChild(reactHost);
    } else {
        // No op since unbind can be called multiple times.
    }
}

function getReactHost(container: Element, createIfNotFound: boolean): Element {
    const hostClassName = "work-item-type-icon-host";
    const lookup = container.getElementsByClassName(hostClassName);

    if (lookup.length > 0) {
        return lookup[0];
    } else if (createIfNotFound) {
        const reactHost = document.createElement("span");
        reactHost.classList.add(hostClassName);
        container.appendChild(reactHost);
        return reactHost;
    } else {
        return undefined;
    }
}

class WorkItemTypeIconCIEvents {
    private static _featureAction = "Render";
    private static _featureName = "WorkItemTypeIcon";

    public static publishEvent(properties: { [key: string]: any; }, immediate?: boolean): void {
        TelemetryServices.publishEvent(
            new TelemetryServices.TelemetryEventData(
                "WIT",
                WorkItemTypeIconCIEvents._featureName,
                { ...properties, action: WorkItemTypeIconCIEvents._featureAction }),
            immediate);
    }
}
