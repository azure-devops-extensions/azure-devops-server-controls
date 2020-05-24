import {
    ISourceInfoProvider,
    RepositoryTypes,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/SourceInfoProviders/common";
import { TfsGit } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/SourceInfoProviders/TfsGit";
import {
    TfsVersionControl,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/SourceInfoProviders/TfsVersionControl";

export class SourceInfoProviderFactory {

    private constructor() {
    }

    public static instance(): SourceInfoProviderFactory {
        if (!this._instance) {
            this._instance = new SourceInfoProviderFactory();
        }

        return this._instance;
    }

    public getSourceInfoProvider(repositoryType: string, repository: string, project: string, sourceBranch: string): ISourceInfoProvider {
        repositoryType = repositoryType.toLowerCase();
        if (!SourceInfoProviderFactory._sourceProviders[repositoryType]) {
            switch (repositoryType) {
                case RepositoryTypes.TfsGit:
                    SourceInfoProviderFactory._sourceProviders[repositoryType] = new TfsGit(repository, project, sourceBranch);
                    break;
                case RepositoryTypes.TfsVersionControl:
                    SourceInfoProviderFactory._sourceProviders[repositoryType] = new TfsVersionControl(project, sourceBranch);
                    break;
                default:
                    break;
            }
        }

        return SourceInfoProviderFactory._sourceProviders[repositoryType];
    }

    private static _sourceProviders: ISourceInfoProvider[] = [];
    private static _instance: SourceInfoProviderFactory;
}