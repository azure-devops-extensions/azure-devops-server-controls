import { autobind } from "OfficeFabric/Utilities";

import * as Dialogs from "VSS/Controls/Dialogs";

import { CiConstants } from "Feed/Common/Constants/Constants";
import { GlobalSettingsDialog } from "Package/Scripts/Dialogs/GlobalSettingsDialog";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";

export class PackageManagementSettingsDialogHandler {
    @autobind
    public static Open(): void {
        CustomerIntelligenceHelper.publishEvent(CiConstants.GlobalSettingsDialogOpened);
        Dialogs.ModalDialogO.show(GlobalSettingsDialog, {});
    }
}
