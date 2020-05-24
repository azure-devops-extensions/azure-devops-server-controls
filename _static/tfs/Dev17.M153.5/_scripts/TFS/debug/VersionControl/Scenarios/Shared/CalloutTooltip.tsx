import * as React from "react";
import { Callout, ICalloutProps } from "OfficeFabric/Callout";
import { FocusTrapZone } from "OfficeFabric/FocusTrapZone";

export interface CalloutTooltipProps {
    hasFocusableElements?: boolean;
    ariaLabel?: string;
    id?: string;
    className?: string;
    calloutProps: ICalloutProps;
}

/**
 * This component implements accessibilty for Callout Fabric component according to the following specs:
 * 1. Tooltip - popup without focus elements. https://www.w3.org/TR/wai-aria-practices-1.1/#tooltip – in case of simple not focusable tooltip 
 * 2. Dialog (tooltip) - tooltip with focusable elements. https://rawgit.com/w3c/aria-practices/master/aria-practices-DeletedSectionsArchive.html#dialog_tooltip
 */
export class CalloutTooltip extends React.Component<CalloutTooltipProps, {}> {

    public render(): JSX.Element {
        return <Callout {...this.props.calloutProps}>
            <div {...this._getAriaProps() }>
                { this.props.hasFocusableElements && this.props.calloutProps.setInitialFocus ?
                    <FocusTrapZone isClickableOutsideFocusTrap={true}>
                        {this.props.children}
                    </FocusTrapZone>
                    : this.props.children
                }
            </div>
        </Callout>;
    }

    private _getAriaProps(): any {
        const ariaProps = {
            role: this.props.hasFocusableElements ? "dialog" : "tooltip",
            className: this.props.className
        };

        if (this.props.id) {
            ariaProps["id"] = this.props.id;
        }

        if (this.props.ariaLabel) {
            ariaProps["aria-label"] = this.props.ariaLabel;
        }

        return ariaProps;
    }
}