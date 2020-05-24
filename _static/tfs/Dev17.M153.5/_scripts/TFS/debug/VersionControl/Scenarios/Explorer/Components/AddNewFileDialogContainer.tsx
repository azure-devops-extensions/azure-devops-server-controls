/// <reference types="react" />
import * as React from "react";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { ActionCreator } from "VersionControl/Scenarios/Explorer/ActionCreator";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";

import * as _VCAddNewFileDialog from "VersionControl/Scenarios/Explorer/Components/AddNewFileDialog";

/**
 * A component that displays a dialog to prompt for adding a new file.
 */
export const AddNewFileDialogContainer = VCContainer.create(["addNewFilePrompt"],
    ({addNewFilePromptState}, {actionCreator}) =>
        addNewFilePromptState.isVisible &&
        <AddNewFileDialogAsync
            {...addNewFilePromptState}
            onTargetFolderChanged={actionCreator.changeAddNewTargetFolder}
            onDismiss={actionCreator.dismissAddNewFileDialog}
            folderPath={addNewFilePromptState.folderPath}
            onAddNewFile={actionCreator.addNewFile}
        />);

const AddNewFileDialogAsync = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/Explorer/Components/AddNewFileDialog"],
    (vcAddNewFileDialog: typeof _VCAddNewFileDialog) => vcAddNewFileDialog.AddNewFileDialog);
