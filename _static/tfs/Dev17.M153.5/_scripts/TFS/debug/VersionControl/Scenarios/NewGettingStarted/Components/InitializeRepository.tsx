import * as React from "react";
import { Spinner } from "OfficeFabric/Spinner";
import { Checkbox } from "OfficeFabric/Checkbox";
import { DefaultButton } from "OfficeFabric/Button"
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { GitTemplate } from "TFS/VersionControl/Contracts";
import { GitIgnoreTemplateSelector } from "VersionControl/Scenarios/NewGettingStarted/Components/GitIgnoreTemplateSelector";

import "VSS/LoaderPlugins/Css!VersionControl/InitializeRepository";

export interface InitializeRepositoryProps {
    isCreatingFile: boolean;
    lastErrorMessage: string;
    onInitializeClicked(creatingReadMe: boolean, gitignoreselectedItem: GitTemplate): void;
    projectName: string;
}

export interface InitializeRepositoryState {
    createReadMeChecked: boolean;
    gitignoreSelectedItem?: GitTemplate;
}

export class InitializeRepository extends React.Component<InitializeRepositoryProps, InitializeRepositoryState> {
    constructor(props) {
        super(props);
        this.state = {
            createReadMeChecked: true,
        };
    }

    public render(): JSX.Element {
        return (
            <div className="initialize-with-files-section">
                <Checkbox
                    className="add-readme-checkbox"
                    label={VCResources.AddReadMeCheckboxText}
                    defaultChecked={this.state.createReadMeChecked}
                    disabled={this.props.isCreatingFile}
                    onChange={this._onClickCheckBox} />
                <GitIgnoreTemplateSelector
                    projectName={this.props.projectName}
                    onItemChanged={this._onGitIgnoreItemChanged} />
                <div className="initialize-button-container">
                    <DefaultButton
                        ariaLabel={VCResources.InitializeButtonLabel}
                        disabled={this.props.isCreatingFile
                            || (!this.state.createReadMeChecked && this.state.gitignoreSelectedItem == null)}
                        onClick={() => this.props.onInitializeClicked(this.state.createReadMeChecked, this.state.gitignoreSelectedItem)}>
                        {VCResources.InitializeText}
                    </DefaultButton>
                    {
                        this.props.isCreatingFile &&
                        <Spinner className="spinner" />
                    }
                </div>
                {
                    this.props.lastErrorMessage &&
                    <MessageBar messageBarType={MessageBarType.error}>
                        {this.props.lastErrorMessage}
                    </MessageBar>
                }
            </div>
        );
    }

    private _onClickCheckBox = (event): void => {
        this.setState({
            createReadMeChecked: !this.state.createReadMeChecked,
            gitignoreSelectedItem: this.state.gitignoreSelectedItem
        });
    }

    private _onGitIgnoreItemChanged = (item: GitTemplate): void => {
        this.setState({
            createReadMeChecked: this.state.createReadMeChecked,
            gitignoreSelectedItem: item,
        });
    }
}
