import * as React from "react";

import LWP = require("VSS/LWP");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Admin_Dialogs = require("Admin/Scripts/TFS.Admin.Dialogs");
import Dialogs = require("VSS/Controls/Dialogs");
import UserCardCommands = require("Admin/Scripts/TFS.Admin.UserCard.Commands");

class LegacyProfileDialog extends React.Component<{}, {}> {
    public render(): JSX.Element {
        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.UseUserDetailsArea)) {
            UserCardCommands.openProfilePage();
        }
        else {
            Dialogs.show(TFS_Admin_Dialogs.UserProfileDialog, {});
        }
        return null;
    }
}

LWP.registerLWPComponent("legacyProfileDialog", LegacyProfileDialog);
