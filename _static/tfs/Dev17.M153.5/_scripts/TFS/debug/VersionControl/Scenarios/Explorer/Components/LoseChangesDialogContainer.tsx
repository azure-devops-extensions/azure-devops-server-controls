/// <reference types="react" />
import * as React from "react";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { LoseChangesDialog } from "VersionControl/Scenarios/Shared/Committing/LoseChangesDialog";

/**
 * A component that displays a dialog to accept losing changes.
 */
export const LoseChangesDialogContainer = VCContainer.create(
    ["loseChangesPrompt"],
    ({ loseChangesPromptState }, { actionCreator }) =>
        <LoseChangesDialog
            dirtyFileName={loseChangesPromptState.dirtyFileName}
            isDialogOpen={Boolean(loseChangesPromptState.tentativeAction)}
            onDiscardChanges={loseChangesPromptState.tentativeAction}
            onDismiss={actionCreator.dismissLoseChangesDialog}
        />
        );
