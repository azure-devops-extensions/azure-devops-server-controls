import * as React from "react";

import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { WorkItemTypeColorAndIcons } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

export namespace IconUtils {
    /**
     * Given the provided icon, returns the bowtie icon class for display.  If
     * no matching icon, returns the default icon class.
     *
     * @param icon Name of work item type icon
     */
    export function getIconClass(icon: string) {
        const iconClass = icon && WorkItemTypeColorAndIcons.ICON_NAME_MAPPINGS[icon];
        return iconClass ? iconClass : WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_BOWTIE_ICON;
    }

    /**
     * Gets the style for the color of icon.
     *
     * If color is empty, uses the default color.
     * @param color Color of the work item type
     */
    export function getIconColorStyle(color: string): React.CSSProperties {
        let colorHex: string = color;
        if (!colorHex) {
            colorHex = WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR_HEX;
        }

        return {
            color: "#" + colorHex
        };
    }
}
