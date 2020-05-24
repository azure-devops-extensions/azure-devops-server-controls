import React = require("react");

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";

import { css } from "OfficeFabric/Utilities";

import { RichContentTooltip } from "VSS/Controls/PopupContent";

import * as Utils_Core from "VSS/Utils/Core";

export interface ITooltipIfOverflowProps extends ComponentBase.IProps {
    targetElementClassName: string;
    tooltip: string;
    /**
     * Optional class name where you want to host your tooltip.
     * This class should be rendered inside toolTipIfOverflow component
     */
    containerClassName?: string;
    forceUpdate?: boolean;
}

export class TooltipIfOverflow extends ComponentBase.Component<ITooltipIfOverflowProps, ComponentBase.IStateless> {

    public render(): JSX.Element {
        return (
            <div ref={(element) => { this._element = element; }} className={css("dtc-text-tooltip-on-overflow-host", this.props.cssClass)} >
                {this.props.children}
            </div>
        );
    }

    public shouldComponentUpdate(nextProps, nextState) {
        if (this.props.targetElementClassName === nextProps.targetElementClassName
            && this.props.containerClassName === nextProps.containerClassName
            && this.props.tooltip === nextProps.tooltip
            && !nextProps.forceUpdate) {
            return false;
        }
        return true;
    }

    public componentDidMount() {
        if (this._element) {
            let elements = this._element.getElementsByClassName(this.props.targetElementClassName);
            if (elements.length > 0) {
                this._targetElement = elements[0] as HTMLElement;
            }

            if (this.props.containerClassName) {
                elements = this._element.getElementsByClassName(this.props.containerClassName);
                if (elements.length > 0) {
                    this._container = elements[0] as HTMLElement;
                }
            }
        }

        this._updateToolTipIfTitleOverflow();
    }

    public componentDidUpdate(): void {
        if (!this._isTitleTooptipUpdateInProcess) {
            this._isTitleTooptipUpdateInProcess = true;
            Utils_Core.delay(this, this.c_tooltipContentUpdateDelay, () => {
                this._updateToolTipIfTitleOverflow();
                this._isTitleTooptipUpdateInProcess = false;
            });
        }
    }

    public componentWillUnmount(): void {
        if (this._tooltip) {
            this._tooltip.dispose();
            this._tooltip = null;
        }
    }

    private _updateToolTipIfTitleOverflow(): void {
        if (this._targetElement) {
            if (this._tooltip) {
                this._tooltip.dispose();
            }

            if (this.props.tooltip) {
                this._tooltip = RichContentTooltip.addIfOverflow(this.props.tooltip, this._targetElement, {
                    openCloseOnHover: true,
                    showOnFocus: true,
                    openDelay: this.c_tooltipOpenDelay,
                    topOffsetPixels: 5,
                    setAriaDescribedBy: true,
                    menuContainer: this._container ? $(this._container) : $(this._targetElement),
                    coreCssClass: "rich-content-tooltip auto-width"
                });
            }
        }
    }

    private _element: HTMLElement;
    private _isTitleTooptipUpdateInProcess: boolean;
    private _targetElement: HTMLElement;
    private _tooltip: RichContentTooltip;
    private _container: HTMLElement;

    private c_tooltipContentUpdateDelay = 2000;
    private c_tooltipOpenDelay = 1000;
}