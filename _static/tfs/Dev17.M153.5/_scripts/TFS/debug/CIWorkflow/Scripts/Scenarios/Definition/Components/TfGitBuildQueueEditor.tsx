/// <reference types="react" />

import * as React from "react";

import { ErrorMessageParentKeyConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";

import { MessageHandlerActionsCreator } from "DistributedTaskControls/Actions/MessageHandlerActionsCreator";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import { BranchFilterComponent } from "DistributedTaskControls/Components/BranchFilterComponent";
import { StringInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/StringInputComponent";

import { Label } from "OfficeFabric/Label";

import { GitRepository } from "TFS/VersionControl/Contracts";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!CIWorkflow/Scripts/Scenarios/Definition/Components/TfGitBuildQueueEditor";

export interface IProps extends Base.IProps {
    repository: GitRepository;
    defaultBranch: string;
    onBranchChanged: (branch: string) => void;
    onSourceVersionChanged: (sourceVersion: string) => void;
}

/**
 * Encapsulates the editor to be shown for TfGit when the build is queued. 
 */
export class TfGitBuildQueueEditor extends Base.Component<IProps, Base.IStateless>  {
    private _messageBarActionCreator: MessageHandlerActionsCreator;

    constructor(props: IProps) {
        super(props);
        this._messageBarActionCreator = ActionCreatorManager.GetActionCreator<MessageHandlerActionsCreator>(MessageHandlerActionsCreator);
    }

    public render(): JSX.Element {
        let repositoryId: string = this.props.repository ? (this.props.repository.id || Utils_String.empty) : Utils_String.empty;
        return (
            <div className="tfgit-build-queue-editor">
                <Label>{Resources.Branch}</Label>
                <BranchFilterComponent
                    repositoryId={repositoryId}
                    onBranchFilterChange={this.props.onBranchChanged}
                    branchFilter={this.props.defaultBranch}
                    allowUnmatchedSelection={true}
                    disableTags={false}
                    onError={this._onError} />

                <div className="commit-container">
                    <StringInputComponent label={Resources.Commit} onValueChanged={this.props.onSourceVersionChanged} />
                </div>
            </div>);
    }

    private _onError = (errorString: string) => {
        this._messageBarActionCreator.addMessage(ErrorMessageParentKeyConstants.Main, errorString);
    }
}
