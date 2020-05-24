/// <reference types="react" />

import * as React from "react";

import { showDefinitionSecurityDialog, showFolderSecurityDialog } from "Build/Scripts/Security";

import { DefinitionReference } from "TFS/Build/Contracts";

import { registerLWPComponent } from "VSS/LWP";

export interface IDefinitionPermissionsDialogProps {
    path?: string;
    definition?: DefinitionReference;
}

export class DefinitionPermissionsDialog extends React.Component<IDefinitionPermissionsDialogProps, {}>  {
    public static componentType = "ci-permissions-dialog";

    constructor(props: IDefinitionPermissionsDialogProps) {
        super(props);
    }

    public render(): JSX.Element {
        return <div />;
    }

    public componentDidMount() {
        if (this.props.definition) {
            showDefinitionSecurityDialog(this.props.definition);
        }
        else if (this.props.path) {
            showFolderSecurityDialog(this.props.path);
        }
        else {
            showFolderSecurityDialog("\\");
        }
    }
}

registerLWPComponent(DefinitionPermissionsDialog.componentType, DefinitionPermissionsDialog);
