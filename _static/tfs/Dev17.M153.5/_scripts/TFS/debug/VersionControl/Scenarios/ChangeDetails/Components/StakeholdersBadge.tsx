import * as React from "react";
import { TooltipHost } from "VSSUI/Tooltip";
import { getId } from 'OfficeFabric/Utilities';
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import * as Utils_String from "VSS/Utils/String";
import { StakeholdersFlyout, IStakeholdersProps } from "VersionControl/Scenarios/Shared/StakeholdersFlyout";
import { ChangeDetailsAuthoredOn } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";

import "VSS/LoaderPlugins/Css!VersionControl/StakeholdersBadge";

export class StakeholdersBadge extends React.Component<IStakeholdersProps, {}> {
    private _authorDateStringTooltipId: string;

    constructor(props: IStakeholdersProps, context?: any) {
        super(props, context);

        this._authorDateStringTooltipId = getId('author-datestring-tooltip');
    }

    public render(): JSX.Element {
        const author = this.props.author;

        if (!author) {
            return null;
        }

        const authorDateString = VCDateUtils.getDateStringWithUTCOffset(this.props.authoredDate, null, true);
        const authorDateTooltipString = VCDateUtils.getDateStringWithUTCOffset(this.props.authoredDate);

        return (
            <div className={"stakeholders-header"}>
                <div className={"stakeholders-flyout-header"}>
                <StakeholdersFlyout {...this.props} />
                    </div>
                <TooltipHost
                    id={this._authorDateStringTooltipId}
                    content={Utils_String.format(ChangeDetailsAuthoredOn, authorDateTooltipString) }
                    directionalHint={DirectionalHint.bottomCenter}>
                    <div className={"authored-date"} aria-describedby={this._authorDateStringTooltipId}>
                    {authorDateString}
                        </div>
                    </TooltipHost>
                </div>
        );
    }
}
