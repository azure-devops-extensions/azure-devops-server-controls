/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { IFocusTrapZoneProps } from "OfficeFabric/FocusTrapZone";
import { IPanelProps, Panel, PanelType } from "OfficeFabric/Panel";
import { css, IRenderFunction } from "OfficeFabric/Utilities";

export interface IProps extends Base.IProps {
    showPanel: boolean;
    onClose?: () => void;
    onClosed?: () => void;
    hasCloseButton?: boolean;
    isLightDismiss?: boolean;
    elementToFocusOnDismiss?: HTMLElement;
    onRenderHeader?: IRenderFunction<IPanelProps>;
    onRenderBody?: IRenderFunction<IPanelProps>;
    onRenderNavigation?: IRenderFunction<IPanelProps>;
    panelWidth?: number;
    isBlocking?: boolean;
    focusTrapZoneProps?: IFocusTrapZoneProps;
    panelType?: PanelType;
}

export class PanelComponent extends Base.Component<IProps, Base.IStateless> {

    public render() {
        const hasCloseButton = typeof (this.props.hasCloseButton) !== "undefined" ? this.props.hasCloseButton : true;
        const panelWidth = this._getPanelWidth();
        return (
            <Panel
                type={this._getPanelType()}
                className={css("dtc-panel-component", this.props.cssClass)}
                customWidth={panelWidth + "px"}
                isOpen={this.props.showPanel}
                onDismiss={this.props.onClose}
                onDismissed={this.props.onClosed}
                isBlocking={this.props.isBlocking}
                hasCloseButton={hasCloseButton}
                isLightDismiss={this.props.isLightDismiss}
                closeButtonAriaLabel={Resources.CloseOverlayPanel}
                onRenderHeader={this.props.onRenderHeader}
                onRenderBody={this.props.onRenderBody}
                onRenderNavigation={this.props.onRenderNavigation}
                focusTrapZoneProps={this.props.focusTrapZoneProps}
                elementToFocusOnDismiss={this.props.elementToFocusOnDismiss}>
                {this.props.children}
            </Panel>);
    }

    private _getPanelWidth(): number {
        let panelWidth = Math.max(PanelComponent.c_panelMinWidth, this.props.panelWidth || 0);
        if (document && document.documentElement && panelWidth > document.documentElement.clientWidth) {
            panelWidth = document.documentElement.clientWidth;
        }
        return panelWidth;
    }

    private _getPanelType(): PanelType {

        if (this.props.panelType) {
            return this.props.panelType;
        }

        if (this.props.panelWidth) {
            return PanelType.custom;
        }

        return PanelType.medium;
    }

    private static readonly c_panelMinWidth = 650;
}
