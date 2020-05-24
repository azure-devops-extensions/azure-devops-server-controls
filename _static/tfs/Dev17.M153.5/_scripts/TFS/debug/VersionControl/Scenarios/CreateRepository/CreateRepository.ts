import * as Q from "q";

import * as Telemetry from "VSS/Telemetry/Services";

import { ProjectNameValidator } from "Admin/Scripts/ProjectNameValidator";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { VersionControlProjectInfo, GitRepository, GitTemplate } from "TFS/VersionControl/Contracts";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";

import {
    ICreateRepositoryDialogState,
    ICreateRepositoryDialogProps,
    CreateRepositoryResult,
} from "VersionControl/Scenarios/CreateRepository/Types";
import { Actions } from "VersionControl/Scripts/Controls/SourceEditingDialogs";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { TfvcClientService } from "VersionControl/Scripts/TfvcClientService";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";

/**
 * Initializes state.
 */
export function initialize(): ICreateRepositoryDialogState {
    return {
        repoType: RepositoryType.Git,
        repoName: "",
        addReadme: false,
        gitignore: null,
        nameError: null,
        busy: false,
    };
}

/**
 * Switch the type of the new repository.
 * @param type New type of the repository
 */
export function changeRepositoryType(repoType: RepositoryType) {
    return (state: ICreateRepositoryDialogState): ICreateRepositoryDialogState => {
        return {
            ...state,
            repoType,
            repoName: "",
            nameError: null,
        };
    };
}

/**
 * Changes the name of the new repository
 */
export function changeName(newName: string) {
    return (state: ICreateRepositoryDialogState): ICreateRepositoryDialogState => {
        if (state.repoType === RepositoryType.Git) {
            const name = newName ? newName.trim() : "";

            let nameError = null;
            if (name.length === 0) {
                nameError = VCResources.CreateRepoNameRequiredMessage;
            }
            else if (!ProjectNameValidator.validate(name)) {
                nameError = VCResources.CreateRepoInvalidNameMessage;
            }

            // Not setting to the trimmed value because it's really weird to mess with input.
            // We'll trim again when we go to create the repository.
            return {
                ...state,
                repoName: newName,
                nameError,
            };
        }
        return state;
    };
}

/**
 * Toggles whether to add a readme to the new repository.
 */
export function changeAddReadme(isChecked: boolean) {
    return (state: ICreateRepositoryDialogState): ICreateRepositoryDialogState => {
        return {
            ...state,
            addReadme: isChecked,
        };
    };
}

/**
 * Changes which gitignore template will be used for the new repository.
 */
export function changeGitignore(gitignore: string) {
    return (state: ICreateRepositoryDialogState): ICreateRepositoryDialogState => {
        return {
            ...state,
            gitignore,
        };
    };
}

/**
 * Executes the creation of the repository.
 * @param state The state held by the create repo dialog
 * @param props The props passed to the create repo dialog
 * @param pushState A callback for forcing state changes into the create repo dialog.
 * @param createRepoAsync [Optional] for testing only.
 */
export function createRepository(
    state: ICreateRepositoryDialogState,
    props: ICreateRepositoryDialogProps,
    pushState: (state: ICreateRepositoryDialogState) => void,
    createRepoAsync?: (state: ICreateRepositoryDialogState,
                      props: ICreateRepositoryDialogProps) => Q.Promise<CreateRepositoryResult>,
): IPromise<CreateRepositoryResult> {

    createRepoAsync = createRepoAsync || createRepositoryAsync;
    pushState({ ...state, busy: true });

    const result = Q.defer<CreateRepositoryResult>();
    const ayncPromise = createRepoAsync(state, props);
    ayncPromise.then(
        createRepoResult => {
            pushState({ ...state, busy: false });
            result.resolve(createRepoResult);
        },
        (error: Error) => {
            pushState({ ...state, busy: false, nameError: error.message });
            result.reject(error);
        }).done();

    return result.promise;
}

/**
 * Sets the gitignore templates.
 */
export function setGitignoreTemplates(gitignoreTemplates: GitTemplate[]) {
    return (state: ICreateRepositoryDialogState): ICreateRepositoryDialogState & { gitignoreTemplates: GitTemplate[] } => {
        return {
            ...state,
            gitignoreTemplates,
        };
    };
}

/**
 * Creates the correct repository based on the state and props
 * @private
 */
export function createRepositoryAsync(
    state: ICreateRepositoryDialogState,
    props: ICreateRepositoryDialogProps,
): Q.Promise<CreateRepositoryResult> {

    if (state.repoType === RepositoryType.Git) {
        return createGitRepository(
            props.projectInfo,
            state.repoName.trim(),
            state.addReadme,
            state.gitignore);
    } else {
        return createTfvcRepository(
            props.projectInfo);
    }
}

/**
 * Creates a git repository.
 * @private
 */
export function createGitRepository(
    projectInfo: VersionControlProjectInfo,
    name: string,
    addReadme: boolean,
    gitignore: string,
): Q.Promise<CreateRepositoryResult> {

    const gitHttpClient = ProjectCollection.getDefaultConnection().getHttpClient<GitHttpClient>(GitHttpClient);
    const projectId = projectInfo.project.id;
    const repositoryToCreate = { name } as GitRepository;

    return Q(gitHttpClient.createRepository(repositoryToCreate, projectId))
        .then(repository => {
            publishCreateRepoTelemetry(addReadme, gitignore);

            if (addReadme || gitignore && gitignore.length) {
                const newRepositoryContext = GitRepositoryContext.create(repository);
                const defaultFilesPushPromise = Q(Actions.createDefaultFilesPush(
                    newRepositoryContext, addReadme, gitignore));

                return defaultFilesPushPromise.then(() => repository, () => repository);
            } else {
                return Q.resolve(repository);
            }
        })
        .then(repository => {
            return {
                repoType: RepositoryType.Git,
                gitRepository: repository,
            } as CreateRepositoryResult;
        });
}

/**
 * Creates a TFVC repository
 * @private
 */
export function createTfvcRepository(
    projectInfo: VersionControlProjectInfo,
): Q.Promise<CreateRepositoryResult> {

    const tfvcClient = TfvcRepositoryContext.create().getClient() as TfvcClientService;
    const projectUri = `vstfs:///Classification/TeamProject/${projectInfo.project.id}`;

    return Q.Promise<CreateRepositoryResult>((resolve, reject) => {
        tfvcClient.beginCreateProjectFolder(
            projectUri,
            () => resolve({ repoType: RepositoryType.Tfvc }), reject);
    });
}

/**
 * Publishes telemetry
 * @private
 */
export function publishCreateRepoTelemetry(
    addReadme: boolean,
    gitignore: string,
): void {

    Telemetry.publishEvent(
        new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.CREATE_REPOSITORY_DIALOG_CREATE_REPOSITORY,
            {
                addReadme,
                gitignore,
            }),
        true);
}
