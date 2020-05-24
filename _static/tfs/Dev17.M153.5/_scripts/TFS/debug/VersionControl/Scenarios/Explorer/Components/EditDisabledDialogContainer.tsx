/// <reference types="react" />
import * as React from "react";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { EditDisabledDialog } from "VersionControl/Scenarios/Shared/Committing/EditDisabledDialog";

/**
 * A component that displays a dialog to alert the user that editing is disabled.
 */
export const EditDisabledDialogContainer = VCContainer.create(
    ["editDisabledAlert"],
    ({ editDisabledAlertState, isGit }, { actionCreator }) =>
        <EditDisabledDialog
            repositoryName={editDisabledAlertState.repositoryName}
            isDialogOpen={editDisabledAlertState.isAlertShowing}
            isGit={isGit}
            onDismiss={actionCreator.dismissEditDisabledDialog}
        />
);
