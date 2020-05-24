import * as React from "react";
import * as VSS from "VSS/VSS";
import { registerLWPComponent } from "VSS/LWP";
import * as Dialogs_NoRequire from "VSS/Controls/Dialogs";

class CopyContentDialog extends React.Component<Dialogs_NoRequire.CopyContentDialogOptions, {}> {
    public static componentType = "copyContentDialog";

    public render(): null {

        const options: Dialogs_NoRequire.CopyContentDialogOptions = {
            data: this.props.data,
            copyAsHtml: this.props.copyAsHtml
        };

        VSS.requireModules(["VSS/Controls/Dialogs"]).spread(
            (_dialogs: typeof Dialogs_NoRequire) => {
                _dialogs.show(_dialogs.CopyContentDialog, options);
            }
        )
        return null;
    }
}

registerLWPComponent(CopyContentDialog.componentType, CopyContentDialog);
