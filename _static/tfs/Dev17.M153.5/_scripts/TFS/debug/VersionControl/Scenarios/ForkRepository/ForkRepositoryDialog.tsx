import * as React from "react";
import * as ReactDom from "react-dom";

import { autobind } from "OfficeFabric/Utilities";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";
import { TooltipHost } from "VSSUI/Tooltip";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import URI = require("Presentation/Scripts/URI");

import { GitRepository } from "TFS/VersionControl/Contracts";
import { TeamProjectReference } from "TFS/Core/Contracts";

import { announce } from "VSS/Utils/Accessibility";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import * as CreateRepository from "VersionControl/Scenarios/CreateRepository/CreateRepository";
import { ForkRepositorySource, IForkCreationResult } from "VersionControl/Scenarios/ForkRepository/ForkRepositorySource";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as GitRepositoryContext from "VersionControl/Scripts/GitRepositoryContext";
import { ICreateRepositoryDialogState } from "VersionControl/Scenarios/CreateRepository/Types";
import { ProjectPicker } from "VersionControl/Scenarios/Shared/ProjectPicker";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/ForkRepositoryDialog";

const BranchCopyOptions_DefaultOnly: string = "defaultOnly";
const BranchCopyOptions_All: string = "all";

export namespace ForkRepositoryDialog {
    let _forkRepositoryDialogNode: HTMLElement = null;
    /**
     * Shows the fork repository dialog.
     */
    export function show() {
        const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
        const versionControlViewModel = webPageDataSvc.getPageData<any>(Constants.versionControlDataProviderId);
        const repositoryContext = GitRepositoryContext.GitRepositoryContext.create(versionControlViewModel.gitRepository,
             versionControlViewModel.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault());
        const forkSrc = new ForkRepositorySource(repositoryContext);

        _forkRepositoryDialogNode = document.createElement("div");
        document.body.appendChild(_forkRepositoryDialogNode);
        ReactDom.render(<ForkRepoDialog forkSource={forkSrc} repository={repositoryContext.getRepository()}/>, _forkRepositoryDialogNode);
    }

    /**
     * Closes the fork repository dialog.
     */
    export function hide() {
        if (_forkRepositoryDialogNode) {
            ReactDom.unmountComponentAtNode(_forkRepositoryDialogNode);
            _forkRepositoryDialogNode.parentElement.removeChild(_forkRepositoryDialogNode);
            _forkRepositoryDialogNode = null;
        }
    }
}

export interface IForkRepositoryDialogProps {
    repository: GitRepository;
    forkSource: ForkRepositorySource;
}

interface ForkRepoDialogState extends ICreateRepositoryDialogState {
    errorMessage?: string;
    selectedBranchCopyOption: string;
}

class ForkRepoDialog extends React.PureComponent<IForkRepositoryDialogProps, ForkRepoDialogState> {
    private _selectedProject: TeamProjectReference;

    constructor(props: IForkRepositoryDialogProps) {
        super(props);
        this.state = {
            addReadme: false,
            repoType: RepositoryType.Git,
            busy: false,
            repoName: this.props.forkSource.getDefaultForkName(),
            selectedBranchCopyOption: this.props.repository.defaultBranch ? BranchCopyOptions_DefaultOnly : BranchCopyOptions_All
        } as ForkRepoDialogState;

        this._selectedProject = this.props.repository.project;
    }

    public render(): JSX.Element {
        return (
            <Dialog
                hidden={false}
                onDismiss={ForkRepositoryDialog.hide}
                title={Utils_String.format(VCResources.ForkRepositoryDialogTitle, this.props.repository.name)}
                dialogContentProps={{ type: DialogType.close}}
                modalProps={{containerClassName: "vc-fork-repository-dialog", isBlocking: true}}
                closeButtonAriaLabel={VCResources.Cancel}>
                {this.state.errorMessage &&
                    <MessageBar onDismiss={this._clearErrorMessage} messageBarType={MessageBarType.error}>
                        {this.state.errorMessage}
                    </MessageBar>
                }
                <TextField
                    required={true}
                    onChanged={this._onNameChanged}
                    errorMessage={this.state.nameError}
                    label={VCResources.ForkDialogRepoNameInputLabel}
                    className={"vc-fork-dialog-repo-name-input"}
                    defaultValue={this.props.forkSource.getDefaultForkName()}
                    placeholder={VCResources.ForkDialogForkNamePlaceholder}/>
                <Label htmlFor={"vc-fork-dialog-project-picker-input"}>{VCResources.ForkRepositoryDialogProjectPickerLabel}</Label>
                <ProjectPicker currentProject={this._selectedProject} onProjectChange={this._projectSelected} />
                <Label className={"vc-fork-dialog-branch-copy-options-label"} htmlFor={"vc-fork-dialog-branch-copy-options"}>
                    {VCResources.ForkRepositoryDialogBranchesLabel} 
                    {!this.props.repository.defaultBranch &&
                        <TooltipHost
                            content={VCResources.ForkRepositoryDialogBranchInclusionDisabledTooltip}
                            directionalHint={DirectionalHint.rightCenter}
                            hostClassName="vc-dialog-info-icon">
                            <span
                                tabIndex={0}
                                className="bowtie-icon bowtie-status-info-outline" />
                        </TooltipHost>
                    }
                </Label>
                <ChoiceGroup
                    disabled={this.state.busy || !this.props.repository.defaultBranch}
                    className={"vc-fork-dialog-branch-copy-options"}
                    options={this._getChoiceGroupOptions()}
                    onChange={this._branchCopyOptionChanged}
                    selectedKey={this.state.selectedBranchCopyOption} />
                <DialogFooter>
                    <PrimaryButton onClick={this._createFork} disabled={this.state.busy || Boolean(this.state.nameError) || !this.state.repoName}>
                        {this.state.busy
                            ? <span><span className={"bowtie-icon bowtie-spinner"}/> {VCResources.ForkRepositoryCreating}</span>
                            : <span>{VCResources.ForkRepositoryVerb}</span>
                        }
                    </PrimaryButton>
                    <DefaultButton disabled={this.state.busy} onClick={ForkRepositoryDialog.hide}>{VCResources.Cancel}</DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    @autobind
    private _onNameChanged(newValue: string) {
        this.setState(CreateRepository.changeName(newValue));
    }

    @autobind
    private _clearErrorMessage() {
        this.setState({ errorMessage: null });
    }

    @autobind
    private _projectSelected(project: TeamProjectReference) {
        this._selectedProject = project;
        this.setState({ errorMessage: null });
    }

    @autobind
    private _branchCopyOptionChanged(ev: React.FormEvent<HTMLInputElement>, option: IChoiceGroupOption) {
        this.setState({ selectedBranchCopyOption: option.key });
    }

    @autobind
    private _createFork() {
        if (Boolean(this.state.nameError)) {
            return;
        }

        if (!this._selectedProject) {
            this.setState({ errorMessage: VCResources.ForkRepositoryErrorNoProjectSelected });
            return;
        }

        this.setState({ busy: true }, () => {
            announce(VCResources.ForkRepositoryCreating);
            const refToInclude = this.state.selectedBranchCopyOption === BranchCopyOptions_DefaultOnly ? this.props.repository.defaultBranch : null;
            this.props.forkSource.createFork(this.state.repoName, this.props.repository, this._selectedProject, this._onForkCreationCompleted, refToInclude);
        });
    }

    @autobind
    private _onForkCreationCompleted(forkCreationResult: IForkCreationResult) {
        if (forkCreationResult.success) {
            const forkRepositoryUrl = new URI(forkCreationResult.forkRepository.remoteUrl);
            forkRepositoryUrl.username(""); // remove the username from the URL to avoid origin issues when calling window.history.replacestate
            window.location.href = forkRepositoryUrl.href();
        } else {
            this.setState({ busy: false, errorMessage: forkCreationResult.resultMessage });
        }
    }

    @autobind
    private _getChoiceGroupOptions(): IChoiceGroupOption[] {
        const defaultOnlyLabel = this.props.repository.defaultBranch
            ? Utils_String.format(VCResources.ForkRepositoryDialogIncludeDefaultBranch, GitRefUtility.getRefFriendlyName(this.props.repository.defaultBranch))
            : VCResources.ForkRepositoryDialogIncludeDefaultBranchNotSet;

        return [
            {
                key: BranchCopyOptions_DefaultOnly,
                text: defaultOnlyLabel
            },
            {
                key: BranchCopyOptions_All,
                text: VCResources.ForkRepositoryDialogIncludeAllBranches
            }
        ];
    }
}