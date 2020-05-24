import { ContractSerializer } from "VSS/Serialization";
import { format } from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as _VCImportStatus from "VersionControl/Scenarios/Import/ImportStatus/ImportStatusView";
import * as _VCNewGettingStarted from "VersionControl/Scenarios/NewGettingStarted/GettingStartedView";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

/**
 * Renders the empty repository experience in the given parent element.
 * If repository is already importing, the import process will be rendered instead.
 */
export function showEmptyRepository(
    parent: HTMLElement,
    document: Document,
    activeImportRequest: VCContracts.GitImportRequest,
    repositoryContext: GitRepositoryContext,
    tfsContext: TfsContext,
    projectInfo: VCContracts.VersionControlProjectInfo,
    sshEnabled: boolean,
    sshUrl: string,
    cloneUrl: string) {

    const experience = document.createElement("meta");
    experience.name = "ms.experiencetype";
    experience.content = "VersionControl-EmptyGitRepository";
    document.getElementsByTagName("head")[0].appendChild(experience);

    if (activeImportRequest) {
        activeImportRequest = ContractSerializer.deserialize(activeImportRequest, VCContracts.TypeInfo.GitImportRequest, true);

        VSS.using(
            ["VersionControl/Scenarios/Import/ImportStatus/ImportStatusView"],
            (vcImportStatus: typeof _VCImportStatus) =>
                vcImportStatus.createIn(parent, {
                    repositoryName: repositoryContext.getRepository().name,
                    repositoryId: repositoryContext.getRepositoryId(),
                    projectId: projectInfo.project.id,
                    importStatus: {
                        statusDetail: activeImportRequest.detailedStatus as VCContracts.GitImportStatusDetail,
                        status: activeImportRequest.status as VCContracts.GitAsyncOperationStatus
                    },
                    importRequestParameters: activeImportRequest.parameters,
                    operationId: activeImportRequest.importRequestId
                }));
    }
    else {
        VSS.using(
            ["VersionControl/Scenarios/NewGettingStarted/GettingStartedView"],
            (vcGettingStarted: typeof _VCNewGettingStarted) =>
                vcGettingStarted.createGettingStartedViewIn(parent, {
                    tfsContext,
                    repositoryContext,
                    sshEnabled,
                    sshUrl,
                    cloneUrl,
                    heading: format(VCResources.EmptyRepoHeader, repositoryContext.getRepository().name),
                    headingLevel: 1,
                    recordPageLoadScenario: true,
                }));
    }

    parent.classList.add("vc-getting-started-parent");
}
