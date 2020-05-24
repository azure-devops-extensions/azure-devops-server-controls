import * as React from "react";
import * as ReactDom from "react-dom";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { TextField } from "OfficeFabric/TextField";
import { getId } from "OfficeFabric/Utilities";

import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import { KeyCode } from "VSS/Utils/UI";

import { GitTemplate } from "TFS/VersionControl/Contracts";
import * as State from "VersionControl/Scenarios/CreateRepository/CreateRepository";
import {
    ICreateRepositoryDialogProps,
    ICreateRepositoryDialogState,
} from "VersionControl/Scenarios/CreateRepository/Types";
import { GitIgnoreTemplateSelector } from "VersionControl/Scenarios/NewGettingStarted/Components/GitIgnoreTemplateSelector";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export namespace CreateRepoDialog {
    let _createRepositoryDialogNode: HTMLElement = null;
    /**
     * Shows the create repository dialog.
     */
    export function show(props: ICreateRepositoryDialogProps) {
        _createRepositoryDialogNode = document.createElement("div");
        document.body.appendChild(_createRepositoryDialogNode);
        ReactDom.render(<CreateRepositoryDialog {...props} />, _createRepositoryDialogNode);
    }

    /**
     * Closes the create repository dialog.
     */
    export function close() {
        if (_createRepositoryDialogNode) {
            ReactDom.unmountComponentAtNode(_createRepositoryDialogNode);
            _createRepositoryDialogNode.parentElement.removeChild(_createRepositoryDialogNode);
            _createRepositoryDialogNode = null;
        }
    }
}

const HybridProjectMessage = () => {
    const learnMoreLink = "https://go.microsoft.com/fwlink/?LinkId=699398";
    return (
        <div>
            <p>{VCResources.CreateRepoHybridVSMessage}</p>
            <Link
                href={learnMoreLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={VCResources.CreateRepoLearnMoreLabel}>
                {VCResources.LearnMore}
            </Link>
        </div>
    );
};

class CreateRepositoryDialog extends React.Component<ICreateRepositoryDialogProps, ICreateRepositoryDialogState>
{
    private nameTextField: TextField;
    private availableRepoTypes: IDropdownOption[] = [
            { key: RepositoryType.Git, text: VCResources.RepoTypeGitName },
            { key: RepositoryType.Tfvc, text: VCResources.RepoTypeTfvcName },
        ];

    constructor(props: ICreateRepositoryDialogProps) {
        super(props);

        this.state = State.initialize();
    }

    public componentDidMount() {
        if (this.nameTextField) {
            this.nameTextField.focus();
        }
    }

    public render() {
        // Generate derived values.
        const gitSelected = this.state.repoType === RepositoryType.Git;
        const tfvcSelected = !gitSelected;
        const repoName = gitSelected ? this.state.repoName : `$/${this.props.projectInfo.project.name}`;
        const nonEmptyName = this.state.repoName.length > 0;
        const validName = !this.state.nameError;
        const showHybridProjectMessage =
            gitSelected && this.props.projectInfo.supportsTFVC ||
            tfvcSelected && this.props.projectInfo.supportsGit;
        const createLabel = this.state.busy ?
            VCResources.ModalDialogCreatingButton :
            VCResources.ModalDialogCreateButton;

        const dropdownAvailable = !this.props.projectInfo.supportsTFVC;
        const createEnabled = ((gitSelected && nonEmptyName && validName) || tfvcSelected) && !this.state.busy;

        // Actually render.
        return (
            <Dialog
                hidden={false}
                dialogContentProps={{ type: DialogType.close }}
                onDismiss={CreateRepoDialog.close}
                closeButtonAriaLabel={VCResources.DialogClose}
                title={VCResources.CreateNewRepositoryDialogTitle}
                elementToFocusOnDismiss={this.props.elementToFocusOnDismiss}
                modalProps={{ containerClassName: "vc-create-repo-dialog", isBlocking: true }}>

                <Dropdown
                    label={VCResources.CreateRepoTypeLabel}
                    options={this.availableRepoTypes}
                    defaultSelectedKey={RepositoryType.Git}
                    onRenderTitle={renderRepositoryType}
                    onRenderOption={renderRepositoryType}
                    disabled={!dropdownAvailable}
                    onChanged={this.onTypeChanged} />

                <TextField
                    label={VCResources.RepositoryName}
                    placeholder={VCResources.CreateRepoPlaceholder}
                    required={gitSelected}
                    disabled={!gitSelected}
                    value={repoName}
                    onChanged={this.onNameChanged}
                    onKeyDown={this.createOnEnter}
                    errorMessage={this.state.nameError}
                    inputClassName={"vc-repo-name-input"}
                    // tslint:disable-next-line:jsx-no-lambda
                    ref={(item) => { this.nameTextField = item; }} />

                {gitSelected && this.renderGitOptions()}

                {showHybridProjectMessage && <HybridProjectMessage />}

                <DialogFooter>
                    <PrimaryButton
                        className={"vc-create-repo-button"}
                        ariaLabel={createLabel}
                        disabled={!createEnabled}
                        onClick={this.onCreateClicked}>
                        {createLabel}
                    </PrimaryButton>
                    <DefaultButton
                        ariaLabel={VCResources.ModalDialogCancelButton}
                        onClick={CreateRepoDialog.close}>
                        {VCResources.ModalDialogCancelButton}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    protected renderGitOptions(): JSX.Element {
        const popupOptions = {};
        const gitignoreLabelId = getId("gitignore-label");

        return (
            <div className="vc-git-files-container">
                <Checkbox
                    label={VCResources.CreateRepositoryDialog_AddReadMeCheckboxText}
                    onChange={this.onAddReadmeChanged} />

                <Label
                    className="vc-git-ignore-label"
                    id={gitignoreLabelId}>
                    {VCResources.AddGitIgnoreSelector_PrefixText}
                </Label>
                <GitIgnoreTemplateSelector
                    projectName={this.props.projectInfo.project.name}
                    onItemChanged={this.onGitignoreChanged}
                    popupOptions={popupOptions}
                    showInlineLabel={false}
                    ariaLabelledBy={gitignoreLabelId}
                    setPopupWidthToMatchMenu={true} />
            </div>
        );
    }

    protected onTypeChanged = (option: IDropdownOption) => {
        this.setState(State.changeRepositoryType(option.key as RepositoryType));
    }

    protected onNameChanged = (newValue: string) => {
        this.setState(State.changeName(newValue));
    }

    protected createOnEnter = (keyEvent: React.KeyboardEvent<HTMLInputElement>) => {
        if (keyEvent.keyCode === KeyCode.ENTER) {
            this.onCreateClicked();
            keyEvent.preventDefault();
        }
    }

    protected onAddReadmeChanged = (ev?: React.FormEvent<HTMLElement>, isChecked?: boolean) => {
        this.setState(State.changeAddReadme(isChecked));
    }

    protected onGitignoreChanged = (template: GitTemplate) => {
        this.setState(State.changeGitignore(template.name));
    }

    protected onCreateClicked = () => {
        const creationPromise =
            State.createRepository(this.state, this.props, state => {
                this.setState(state);
            }).then(
                createRepoResult => {
                    this.props.onCreated(createRepoResult);
                    CreateRepoDialog.close();
                },
                (error: Error) => {
                    this.nameTextField.focus();
                    this.nameTextField.select();
                });

        ProgressAnnouncer.forPromise(
            creationPromise,
            {
                announceStartMessage: VCResources.CreateRepoStatusStarted,
                announceEndMessage: VCResources.CreateRepoStatusEnded,
                announceErrorMessage: VCResources.CreateRepoStatusFailed,
            });
    }
}

const IconAndText = (props: { icon: string, text: string }) => {
    return (<div className="icon-and-text">
        <span className={`icon bowtie-icon ${props.icon}`} />
        <span>{props.text}</span>
    </div>);
};

function renderRepositoryType(option: IDropdownOption | IDropdownOption[]) {
    if (Array.isArray(option)) {
        option = option[0];
    }

    const iconClassName = option.key === RepositoryType.Git ? "bowtie-git" : "bowtie-tfvc-repo";
    return <IconAndText icon={iconClassName} text={option.text} />;
}
