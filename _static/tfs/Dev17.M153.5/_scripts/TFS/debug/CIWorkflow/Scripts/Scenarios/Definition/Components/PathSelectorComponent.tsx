/// <reference types="react" />

import * as React from "react";

import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import { ISelectedPathNode } from "DistributedTasksCommon/TFS.Tasks.Types";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";

import { css } from "OfficeFabric/Utilities";
import { IconButton } from "OfficeFabric/Button";

import { BaseControl } from "VSS/Controls";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/PathSelectorComponent";

export interface IPathSelectorProps extends Base.IProps {
    containerCssClass: string;
    initialSelectedPath: string;
    onSelectedPathChange?: (path: string) => void;
    showPathDialog?: (initialValue: string, callback: (selectedValue: ISelectedPathNode) => void) => void;
    rootFolder?: string;
    disabled?: boolean;
}

export class PathSelectorComponent extends Base.Component<IPathSelectorProps, Base.IStateless> {
    
    public render(): JSX.Element {
        let serverPathDropdownName = css(this.props.containerCssClass, "ci-sources-path-selector");
        return (
            <div className={serverPathDropdownName}>
                <div className="path-selector-cell">
                    <StringInputComponent
                        getErrorMessage={this._getPathErrorMessage}
                        cssClass="server-path"
                        value={this.props.initialSelectedPath}
                        onValueChanged={this.props.onSelectedPathChange}
                        ariaLabel={Resources.PathFilter}
                        disabled={this.props.disabled}
                    />
                </div>
                <div className="browse-server-path">
                    <IconButton
                        iconProps={{ iconName: "More" }}
                        onClick={this._onSelectServerPathClick}
                        ariaLabel={DTCResources.Browse}
                        disabled={this.props.disabled}>
                    </IconButton>
                </div>
            </div>
        );
    }

    private _onSelectServerPathClick = (): void => {
        this.props.showPathDialog(this.props.rootFolder, this._onSelectedPathChange);
    }

    private _getPathErrorMessage = (value: string): string => {
        if (!value) {
            return DTCResources.SettingsRequiredMessage;
        }
        return Utils_String.empty;
    }

    private _onSelectedPathChange = (selectedNode: ISelectedPathNode): void => {
        let serverPath = selectedNode ? selectedNode.path : null;
        if (serverPath) {
            this.props.onSelectedPathChange(serverPath);
        }
    }
}
