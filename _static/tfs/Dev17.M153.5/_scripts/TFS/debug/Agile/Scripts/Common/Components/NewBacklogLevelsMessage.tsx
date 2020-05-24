import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/NewBacklogLevelsMessage";
import * as TFS_Agile from "Agile/Scripts/Common/Agile";
import * as AgileHubsSharedResources from "Agile/Scripts/Resources/TFS.Resources.AgileHubsShared";
import { Link } from "OfficeFabric/Link";
import * as ConfigurationsConstants from "Presentation/Scripts/TFS/TFS.Configurations.Constants";
import * as Events_Action from "VSS/Events/Action";

export class NewBacklogLevelsMessage extends React.Component<any, {}> {
    constructor(options?: any) {
        super(options);
    }

    public render(): JSX.Element {
        return (
            <div>
                {AgileHubsSharedResources.NewBacklogLevelVisibilityNotSetNotificationMessage_Left}
                <Link
                    className="open-settings-dialog-link"
                    onClick={this._onClickOpenBacklogSettings}
                >
                    {AgileHubsSharedResources.NewBacklogLevelVisibilityNotSetNotificationLinkText_NewHub}
                </Link>
            </div>
        );
    }

    private _onClickOpenBacklogSettings = (event: React.MouseEvent<HTMLAnchorElement>): void => {
        Events_Action.getService().performAction(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, {
            defaultTabId: TFS_Agile.TabControlsRegistrationConstants.BACKLOGS_TAB_ID
        });
    }
}