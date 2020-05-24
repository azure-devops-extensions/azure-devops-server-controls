import "VSS/LoaderPlugins/Css!WorkCustomization/Common/Components/ChevronButton";

import * as React from "react";
import { Icon } from "OfficeFabric/Icon";
import { css } from "OfficeFabric/Utilities";
import { CommonUtils } from "WorkCustomization/Scripts/Utils/CommonUtils";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");

export interface IChevronButtonProps {
    onClick: () => void;
    isExpanded: boolean;
    className?: string;
}

export var ChevronButton: React.StatelessComponent<IChevronButtonProps> = (props: IChevronButtonProps): JSX.Element => {
    return <div
        // chevron is not selectable but clickable (per PM)
        role="button"
        tabIndex={-1}
        data-is-focusable={false}
        aria-label={props.isExpanded ? Resources.CollapseRowLabel : Resources.ExpandRowLabel}
        onClick={props.onClick}
        onDoubleClick={CommonUtils.NullStopPropagationFunction} // prevents default grid row action
        className={css(props.className, "work-ChevronButton", { "is-collapsed": !props.isExpanded })}>
        <Icon iconName="ChevronDown" />
    </div>;
}