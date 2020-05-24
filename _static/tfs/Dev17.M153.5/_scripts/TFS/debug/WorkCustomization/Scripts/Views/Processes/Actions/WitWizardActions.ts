
import { Action } from "VSS/Flux/Action";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { NavigationParameters } from "WorkCustomization/Scripts/Constants";
import * as DialogActions from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import { ICustomizeWitWizardProps } from "WorkCustomization/Scripts/Dialogs/Components/CustomizeWitWizardDialog";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { CreateInheritedProcessActionCreator } from "WorkCustomization/Scripts/Views/Processes/Actions/CreateInheritedProcess"
import { getProcessesDataStore } from "WorkCustomization/Scripts/Stores/ProcessesDataStore";

export class WitWizardActionCreator {
    public static tryLaunchWizard() {
        // check if we want to launch our customization wizard dialog based on parameters in url
        if (UrlUtils.getParameterValue(NavigationParameters.LaunchWizard)) {

            let dialogProps: ICustomizeWitWizardProps = {
                witRefName: UrlUtils.getParameterValue(NavigationParameters.WizardWitRefName),
                projectId: UrlUtils.getParameterValue(NavigationParameters.WizardProjectId),
                projectName: UrlUtils.getParameterValue(NavigationParameters.WizardProjectName),
                projectProcessName: getProcessesDataStore().getProcessById(UrlUtils.getParameterValue(NavigationParameters.WizardProcessId)).name
            }

            if (dialogProps.witRefName) {
                DialogActions.setDialogAction.invoke({
                    dialogType: DialogActions.DialogType.CustomizeWitWizard,
                    data: dialogProps
                });

                WitWizardActionCreator._removeWizardUrlParams();
            }
            else {
                showErrorAction.invoke({ errorMessage: Resources.FailedToLaunchCustomizationWizard });
            }
        }
    }

    private static _removeWizardUrlParams(): void {
        // remove wizard related params from url on dismiss to prevent refresh from displaying wizard again
        UrlUtils.removeParams([NavigationParameters.LaunchWizard, NavigationParameters.WizardProjectName, NavigationParameters.WizardProcessName, NavigationParameters.WizardProjectId, NavigationParameters.WizardWitRefName]);
    }
}
