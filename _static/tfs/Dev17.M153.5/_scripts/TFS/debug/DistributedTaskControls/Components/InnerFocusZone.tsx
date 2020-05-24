/// <reference types="react" />
import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { Boolean } from "DistributedTaskControls/Common/Primitives";
import { DomAttributeConstants, FunctionKeyCodes } from "DistributedTaskControls/Common/Common";
import { isFocusable } from "DistributedTaskControls/Common/FocusHelper";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { TelemetryUtils } from "DistributedTaskControls/Common/TelemetryUtils";

import { css, EventGroup, KeyCodes, getParent } from "OfficeFabric/Utilities";
import { FocusZone } from "OfficeFabric/FocusZone";

import { Debug, logError } from "VSS/Diag";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/InnerFocusZone";

export interface IInnerFocusZoneProps extends Base.IProps {
    tabIndex?: number;
    ariaLabel?: string;
}

export class InnerFocusZone extends Base.Component<IInnerFocusZoneProps, Base.IStateless> {

    public componentDidMount(): void {
        // Set tabindex to -1 for all the focusable children to ensure that they do not participate in tab navigation
        // by default. We also set the data is focusable to false to ensure that focus zone does not set the 
        // tab index to 0 for these elements. 
        this._disableFocusZoneNavigationForChildrenElements();
        const ownerWindow = this._element.ownerDocument.defaultView;
        ownerWindow.addEventListener("keydown", this._handleGlobalKeydown);
    }

    public componentWillUnmount(): void {
        const ownerWindow = this._element.ownerDocument.defaultView;
        ownerWindow.removeEventListener("keydown", this._handleGlobalKeydown);
    }

    public render(): JSX.Element {
        
        return (
            <div className={css(this.props.cssClass, "dtc-inner-focus-zone")}
                ref={this._resolveRef("_element")}
                role="group"
                onFocus={this._onFocus}
                onKeyDown={this._onKeyDown}
                onMouseDown={this._onMouseDown}
                data-is-grid-focusable={true}
                data-dtc-inner-focus-zone={true}
                tabIndex={this.props.tabIndex != null ? this.props.tabIndex : -1}
                aria-label={this.props.ariaLabel}>

                <FocusZone
                    ref={this._resolveRef("_focusZone")}
                    isCircularNavigation={true}>

                    {this.props.children}

                </FocusZone>
            </div>
        );
    }

    public focus(): void {
        this._element.focus();
    }

    private _handleGlobalKeydown = (ev: KeyboardEvent) => {
        if (ev.which === FunctionKeyCodes.F6 || ev.which === KeyCodes.tab) {
            this._disableFocusZoneNavigationForChildrenElements();
        }
    }

    private _onFocus = (ev: React.FocusEvent<HTMLElement>) => {
        const htmlElement = ev.target as HTMLElement;
        if (htmlElement && htmlElement.hasAttribute(DomAttributeConstants.DataIsFocusableAttrib)) {
            this._enableFocusZoneNavigationForChildrenElements();
        }
    }

    private _onMouseDown = (ev: React.MouseEvent<HTMLElement>) => {
        // If the user clicks on an element using mouse and then uses keyboard to navigate within, it should navigate properly.
        this._enableFocusZoneNavigationForChildrenElements();
    }
    
    private _onKeyDown = (ev: React.KeyboardEvent<HTMLElement>) => {

        if ((ev.keyCode === KeyCodes.enter || ev.keyCode === KeyCodes.space) && ev.target === this._element) {

            TelemetryUtils.publishInnerFocusZoneAccess(ev.keyCode === KeyCodes.enter ? "Enter" : "Space");

            // On space or enter, set data-is-focusable to true on all elements that are focusable 
            // and which have data-is-focusable attribute to ensure that focus zone can
            // handle bi-directional navigation inside. 
            //
            // Since we set data-is-focusable to true on all focusable elements, there is a 
            // limitation here that within OverlayPanelSelectable, data-is-selectable
            // cannot be set to false.
            //
            // This limitation can be overcome by remembering elements that already had 
            // data-is-focusable as false and not setting them. However, we will live with this
            // till we get a real need.
            this._enableFocusZoneNavigationForChildrenElements();

            // Select the first focusable element in children.
            this._focusZone.focus();
            ev.preventDefault();
        }
        else if (ev.keyCode === KeyCodes.escape) {

            TelemetryUtils.publishInnerFocusZoneAccess("Escape");
            
            // Disable navigation inside children
            this._disableFocusZoneNavigationForChildrenElements();

            // Move focus to the parent.
            this._element.focus();
            ev.preventDefault();
        }
    }

    private _disableFocusZoneNavigationForChildrenElements(): void {
        this._setPropertiesOnFocusableChildrenElements((element) => {
            element.setAttribute(DomAttributeConstants.DataIsFocusableAttrib, Boolean.falseString);
            element.setAttribute(DomAttributeConstants.TabIndex, DomAttributeConstants.TabIndexMinusOne);
        });
    }

    private _enableFocusZoneNavigationForChildrenElements(): void {
        this._setPropertiesOnFocusableChildrenElements((element) => {
            element.setAttribute(DomAttributeConstants.DataIsFocusableAttrib, Boolean.trueString);
            element.setAttribute(DomAttributeConstants.TabIndex, DomAttributeConstants.TabIndexMinusOne);
        });
    }

    private _setPropertiesOnFocusableChildrenElements(propertySetter: (HTMLElement) => void) {
        
        if (this._element) {
            const children = this._element.querySelectorAll("*");
            for (let i = 0, len = children.length; i < len; i++) {
                const element = children.item(i) as HTMLElement;
                
                if (element !== this._element &&
                    element &&
                    isFocusable(element) &&
                    propertySetter) {

                    propertySetter(element);
                }
            }
        }
    }
   
    private _focusZone: FocusZone;
    private _element: HTMLElement;
}
