/// <reference types="react" />
/// <reference types="react-dom" />

import * as React from "react";

import { BuildSearchBox } from "Build/Scripts/Components/BuildSearchBox";
import { ButtonWithBowtieIcon } from "Build/Scripts/Components/ButtonWithBowtieIcon";
import { TitleBar as TitleBarSection } from "Build/Scripts/Components/TitleBar";
import { LinkWithBowtieIcon } from "Build/Scripts/Components/LinkWithBowtieIcon";
import { UserActions, DataProvider } from "Build/Scripts/Constants";
import * as ImportDefinitionDialog from "Build/Scripts/Controls.ImportDefinitionDialog";
import { DataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { BuildHelpLink } from "Build/Scripts/Linking";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { Features, Sources, publishEvent } from "Build/Scripts/Telemetry";
import * as Utils from "Build/Scripts/Utilities/Utils";

import { Link } from "OfficeFabric/Link";

import * as TFS_Resources_Presentation from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

import Dialogs = require("VSS/Controls/Dialogs");
import { getService as getEventService } from "VSS/Events/Services";
import { getService } from "VSS/Service";


export interface Props {
    canCreateNewDefinition: boolean;
    canImportDefinition: boolean;
    isMember: boolean;
}

export interface State {
}

export class TitleBar extends React.Component<Props, State> {
    public render(): JSX.Element {
        return <TitleBarSection>
            <div className="title-heading expand">
                <h1 className="ms-font-l">{BuildResources.BuildDefinitionsTitle}</h1>
            </div>
            <div className="actions">
                <div className="search-container"><BuildSearchBox /></div>
                {
                    this.props.canCreateNewDefinition &&
                    <ButtonWithBowtieIcon isCta={true} onClick={this._onNewDefinitionClicked} iconClassName="bowtie-math-plus-light" label={BuildResources.NewText} />
                }
                {
                    this.props.canImportDefinition &&
                    <ButtonWithBowtieIcon onClick={this._onImportDefinitionClicked} label={BuildResources.ImportText} iconClassName="bowtie-math-plus-light" />
                }
                {
                    this.props.isMember &&
                    <ButtonWithBowtieIcon onClick={this._onSecurityClicked} label={BuildResources.SecurityText} iconClassName="bowtie-shield" />
                }
                <LinkWithBowtieIcon href={BuildHelpLink} onClick={this._onHelpClicked} iconClassName="bowtie-status-help-outline" label={TFS_Resources_Presentation.HelpMenuText} />
            </div>
        </TitleBarSection>;
    }

    private _onNewDefinitionClicked = () => {
        let path = Utils.getFolderPathFromUrl();
        getEventService().fire(UserActions.NewDefinition, this, { source: Sources.Mine, folderPath: path });
    };

    private _onImportDefinitionClicked = () => {
        Dialogs.show(ImportDefinitionDialog.ImportDefinitionDialog);
    };

    private _onSecurityClicked = () => {
        getEventService().fire(UserActions.ViewFolderSecurity, this, "\\");
    };

    private _onHelpClicked = () => {
        publishEvent(Features.DefinitionsHelpClicked, Sources.Mine);
    };
}
