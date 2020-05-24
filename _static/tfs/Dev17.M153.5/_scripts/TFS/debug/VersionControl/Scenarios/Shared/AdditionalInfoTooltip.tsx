import * as React from "react";

import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { TooltipHost } from "VSSUI/Tooltip";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface AdditionalInfoTooltipProps {
    id: string;
    content: string;
}

/**
 * This component renders an information (i) icon that can be focused to display a tooltip
 * It has aria properties set to ensure accessibility (e.g. When focused a screen reader like Narrator
 * will announce "Additional Information Note" and after a pause it will then read the content of the tooltip)
 */
export class AdditionalInfoTooltip extends React.PureComponent<AdditionalInfoTooltipProps, {}> {

    public render(): JSX.Element {
        return <TooltipHost
            id={this.props.id}
            hostClassName="vc-dialog-info-icon"
            content={this.props.content}
            directionalHint={DirectionalHint.bottomCenter}>
            <div
                role={"note"}
                tabIndex={0}
                aria-describedby={this.props.id}
                aria-label={VCResources.AdditionalInformation}
                className="bowtie-icon bowtie-status-info-outline" />
        </TooltipHost>;
    }
}
