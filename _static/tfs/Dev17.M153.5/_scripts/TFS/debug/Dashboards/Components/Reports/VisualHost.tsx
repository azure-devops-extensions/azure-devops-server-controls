/// <reference types="react" />
import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { VisualHostMenu, VisualHostMenuProps } from "Dashboards/Components/Reports/VisualHostMenu";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import LWP = require("VSS/LWP");

import "VSS/LoaderPlugins/Css!Dashboards/Components/Reports/VisualHost";

export interface VisualHostProps extends Props {
    menuProps?: VisualHostMenuProps;

    /**
     * Opt-out to suppress menu from VisualHost. 
     * This is relevant for consumers which sometimes render in reports, and are at other times used in other formats.
     */
    disableMenu?: boolean;
}

/**
 * Decorates a Visual with context menu for pinning and information about the visual.
 */
export class VisualHost extends Component<VisualHostProps, State> {    
    public render(): JSX.Element {
        // Only enable the menu when feature is enabled (by flag & no local opt-out), and caller is passing context.
        const enableMenu = !this.props.disableMenu && FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.ReportingAnalyticsVisualMenu, false) && VisualHostMenu.menuHasContent(this.props.menuProps);
        return (
            <div className="visual-host">
                {this.props.children}
                <div className="visual-host-overlay">
                    {enableMenu && <VisualHostMenu {...this.props.menuProps} />}
                </div>
            </div>
        );
    }
}

LWP.registerLWPComponent("visualHost", VisualHost);