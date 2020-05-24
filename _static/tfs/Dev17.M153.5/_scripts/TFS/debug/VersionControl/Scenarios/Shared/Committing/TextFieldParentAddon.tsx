import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import * as React from "react";

import { addTrailingSlash } from "VersionControl/Scripts/VersionControlPath";

import "VSS/LoaderPlugins/Css!VersionControl/Shared/Committing/TextFieldParentAddon";

export const TextFieldParentAddon = (props: { prefix: string }) =>
    <TooltipHost
        hostClassName="vc-text-field-parent-addon"
        content={props.prefix}
        overflowMode={TooltipOverflowMode.Self}
    >
        {addTrailingSlash(props.prefix)}
    </TooltipHost>;
