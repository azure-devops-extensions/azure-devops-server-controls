import * as React from "react";

import { DirectionalHint, TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { Status } from "Policy/Scripts/PolicyTypes";

export interface StatusPolicyConfigContextProps {
    config: PolicyConfiguration;
}

export class StatusPolicyConfigContext extends React.PureComponent<StatusPolicyConfigContextProps, {}> {
    public render() {
        const { statusGenre, statusName } = this.props.config.settings as Status.Settings;
        const displayName = statusGenre ? `${statusGenre}/${statusName}` : statusName;

        return (
            <TooltipHost content={displayName}
                overflowMode={TooltipOverflowMode.Parent}
                calloutProps={{ gapSpace: 4 }}
                directionalHint={DirectionalHint.topCenter}>
                <span data-is-focusable="true" tabIndex={0}>{displayName}</span>
            </TooltipHost>
        );
    }
}
