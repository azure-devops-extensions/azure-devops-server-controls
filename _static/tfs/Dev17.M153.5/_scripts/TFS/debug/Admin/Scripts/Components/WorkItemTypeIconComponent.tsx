import * as React from "react";

import { css } from "OfficeFabric/Utilities";
import { IconUtils } from "Admin/Scripts/Common/IconUtils";

export interface IWorkItemTypeIconComponentProps {
    icon: string;
    color?: string;
    /**
     * Optional css class to use when icon feature is disabled
     */
    colorClass?: string;
}

export const WorkItemTypeIconComponent: React.StatelessComponent<IWorkItemTypeIconComponentProps> = (props: IWorkItemTypeIconComponentProps): JSX.Element => {
    const { colorClass } = props;
    const iconClass = IconUtils.getIconClass(props.icon);
    let iconColorStyle: React.CSSProperties;
    if (props.color) {
        iconColorStyle = IconUtils.getIconColorStyle(props.color);
    }

    return <i
        aria-label={props.icon}
        className={css("icon-component", "bowtie-icon", iconClass)}
        style={iconColorStyle} />;
};