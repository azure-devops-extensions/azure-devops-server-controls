/// <reference types="react" />

import * as React from "react";

import * as ImportDialog from "Build/Scripts/Controls.ImportDefinitionDialog";
import Dialogs = require("VSS/Controls/Dialogs");

import { registerLWPComponent } from "VSS/LWP";

export interface IImportDefinitionDialogProps {
}

export class ImportDefinitionDialog extends React.Component<IImportDefinitionDialogProps, {}>  {
    public static componentType = "ci-import-dialog";

    constructor(props: IImportDefinitionDialogProps) {
        super(props);
    }

    public render(): JSX.Element {
        return <div />;
    }

    public componentDidMount() {
        Dialogs.show(ImportDialog.ImportDefinitionDialog);
    }
}

registerLWPComponent(ImportDefinitionDialog.componentType, ImportDefinitionDialog);
