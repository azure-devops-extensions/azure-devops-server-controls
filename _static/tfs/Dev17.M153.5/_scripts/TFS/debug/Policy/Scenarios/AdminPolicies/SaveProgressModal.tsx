// libs
import * as React from "react";
// controls
import { Dialog } from "OfficeFabric/Dialog";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
// scenario
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface SaveProgressModalProps {
    // Dialog is open
    isOpen: boolean;
}

export const SaveProgressModal: React.StatelessComponent<SaveProgressModalProps> =
    (props: SaveProgressModalProps): JSX.Element => {

        // destructure props object
        const { isOpen } = props;

        return (
            <Dialog
                hidden={!isOpen}
                forceFocusInsideTrap={true}
                dialogContentProps={{className: "policy-save-progress-content"}}
                modalProps={{
                    isBlocking: true,
                    isDarkOverlay: false,
                    containerClassName: "policy-save-progress-container"
                }}
            >
                <Spinner
                    size={SpinnerSize.large}
                    label={Resources.SaveInProgress}
                />
            </Dialog>
        );
    }

