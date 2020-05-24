/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");

import Navigation_Services = require("VSS/Navigation/Services");
import VSSDialogs = require("VSS/Controls/Dialogs");
import * as Utils_String from "VSS/Utils/String";
import VSS = require("VSS/VSS");

import Resources = require("DistributedTask/Scripts/Resources/TFS.Resources.DistributedTask");
import Types = require("DistributedTask/Scripts/DT.Types");

import { LibraryActionCreator } from "DistributedTask/Scripts/Actions/LibraryActionCreator";
import { SecurityDialog, ISecurityDialogOptions } from "DistributedTask/Scripts/Components/SecurityDialog";
import { SecureFile } from "DistributedTask/Scripts/DT.SecureFile.Model";

import { FileUploadDialog } from "DistributedTaskControls/SharedControls/InputControls/Components/FileUploadDialog";

import { FileInputResult} from "VSSUI/FileInput";

export class Dialogs {
    public static showDeleteVariableGroupDialog(variableGroupId: number): void {
        VSSDialogs.show(DeleteLibraryItemDialog,
            {
                title: Resources.DeleteVariableGroup,
                okText: Resources.DeleteText,
                helpText: Resources.DeleteVariableGroupHelpText,
                okCallback: (data: any) => {
                    LibraryActionCreator.getInstance().deleteVariableGroup(variableGroupId);
                },
            } as IDeleteLibraryItemDialogOptions);
    }

    public static showDeleteSecureFileDialog(secureFileId: string): void {
        VSSDialogs.show(DeleteLibraryItemDialog,
            {
                title: Resources.DeleteSecureFile,
                okText: Resources.DeleteText,
                helpText: Resources.DeleteSecureFileHelpText,
                okCallback: (data: any) => {
                    LibraryActionCreator.getInstance().deleteSecureFile(secureFileId);
                },
            } as IDeleteLibraryItemDialogOptions);
    }

	public static showUploadSecureFileDialog(): void {
		let container = document.createElement("div");
		ReactDOM.render(React.createElement(FileUploadDialog,
            {
                onDialogClose: () => {
					ReactDOM.unmountComponentAtNode(container);
				}, 
				onOkClick: (file: FileInputResult) => {
					if (file) {
						let secureFile: SecureFile = new SecureFile();
						secureFile.name = file.name;
						LibraryActionCreator.getInstance().uploadSecureFile(secureFile, file.file);
					}	
                },
            }), container);
	}

    public static showSecurityDialog(type: Types.LibraryItemType, id: string = '0', name?: string): void {
        VSSDialogs.show(SecurityDialog,
            {
                type: type,
                id: id,
                name: name
            } as ISecurityDialogOptions);
    }

    public static showDeleteOAuthConfigurationDialog(configurationName, callback: () => void): void {
        VSSDialogs.show(DeleteLibraryItemDialog,
            {
                title: Resources.DeleteOAuthConfiguration,
                okText: Resources.DeleteText,
                helpText: Utils_String.localeFormat(Resources.DeleteOAuthConfigurationHelpText, configurationName),
                okCallback: (data: any) => {
                    callback();
                },
            } as IDeleteLibraryItemDialogOptions);
    }
}

export interface IDeleteLibraryItemDialogOptions extends VSSDialogs.IModalDialogOptions {
    helpText?: string;
}

export interface IDeleteLibraryItemDialogState {
}

export class DeleteLibraryItemDialog extends VSSDialogs.ModalDialogO<IDeleteLibraryItemDialogOptions> {

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            width: 450
        }, options));
    }

    public initialize() {
        super.initialize();
        var component = ReactDOM.render(<DeleteLibraryItemDialogBody {...this._options} />, this._element[0]) as DeleteLibraryItemDialogBody;

        component.updateOkButton = this.updateOkButton;
        this.updateOkButton(true);
    }

    public close(): void {
        ReactDOM.unmountComponentAtNode(this._element[0]);
        super.close();
    }

    public onOkClick(e?: JQueryEventObject): any {
        this.setDialogResult({});
        super.onOkClick(e);
    }
}

class DeleteLibraryItemDialogBody extends React.Component<IDeleteLibraryItemDialogOptions, IDeleteLibraryItemDialogState> {
    constructor(props: IDeleteLibraryItemDialogOptions) {
        super(props);
    }

    public updateOkButton(enabled: boolean): void {
    }

    public render(): JSX.Element {
        return (
            <div className="bowtie" dangerouslySetInnerHTML={{ __html: this.props.helpText }}>
            </div>
        );
    }

    public componentDidMount(): void {
        this.updateOkButton(true);
    }

    public componentDidUpdate(): void {
        this.updateOkButton(true);
    }
}