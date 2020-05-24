import {Action} from "VSS/Flux/Action";
import {Store as FluxStore} from "VSS/Flux/Store";

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import {TeamProjectCapabilitiesConstants} from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import {TfsContext} from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import {SourceControlTypes} from "TFS/Core/Contracts";
import {GitRepository, VersionControlProjectInfo} from "TFS/VersionControl/Contracts";

import {CoreHttpClient3} from "TFS/Core/RestClient";

import {ContractSerializer} from "VSS/Serialization";
import {Debug} from "VSS/Diag";
import {globalProgressIndicator} from "VSS/VSS";
import {VssConnection} from "VSS/Service";

import * as Utils_String from "VSS/Utils/String";

export namespace RepositoryKeys {
    export const PlaceHolder: string = "repo-picker-placeholder-repository";
    export const Tfvc: string = "$/";
}

export interface IOptions {
    tfsContext?: TfsContext;
    coreHttpClient?: CoreHttpClient3;
}

var projectInfoUpdated = new Action<VersionControlProjectInfo>();

class Operations {
    public static refreshProjectInfo = "refreshProjectInfo";
}

export class Store extends FluxStore {
    private _tfsContext: TfsContext;
    private _coreHttpClient: CoreHttpClient3;
    private _projectInfo: VersionControlProjectInfo;

    private _pendingOperations: IDictionaryStringTo<boolean> = {};

    constructor(options?: IOptions) {
        super();
        this._tfsContext = (options && options.tfsContext) ? options.tfsContext : TfsContext.getDefault();

        let connection = new VssConnection(this._tfsContext.contextData);
        this._coreHttpClient = (options && options.coreHttpClient) ? options.coreHttpClient : connection.getHttpClient<CoreHttpClient3>(CoreHttpClient3);

        projectInfoUpdated.addListener((projectInfo) => {
            this._projectInfo = projectInfo;
            this.emitChanged();
        });
    }

    public getVersionControlProjectInfo(): VersionControlProjectInfo {
        if (!this._projectInfo && !this._pendingOperations[Operations.refreshProjectInfo]) {
            this._refreshProjectInfo();
        }

        return this._projectInfo;
    }

    public getTfsContext() {
        return this._tfsContext;
    }

    public getTfvcRepositoryAsGit(): GitRepository {
        let tfvcRepository = null;
        if (this._projectInfo && this._projectInfo.supportsTFVC) {
            // This is how VersionControl shows both tfvc and git in the same control - see /Tfs/Service/WebAccess/VersionControl/Scripts/Views/BaseView.ts
            tfvcRepository = <GitRepository>{ name: RepositoryKeys.Tfvc + this._tfsContext.navigation.project, project: this._projectInfo.project };
        }

        return tfvcRepository;
    }

    public getPlaceHolder(): GitRepository {
        return <GitRepository>{ name: BuildResources.SelectRepositoryPlaceHolder, id: RepositoryKeys.PlaceHolder };
    }

    private _refreshProjectInfo() {
        this._pendingOperations[Operations.refreshProjectInfo] = true;
        this._coreHttpClient.getProject(this._tfsContext.navigation.projectId, true).then((project) => {
            let versionControlCapabilities = project.capabilities[TeamProjectCapabilitiesConstants.VersionControlCapabilityName];

            Debug.assertIsNotNull(versionControlCapabilities, "Project capabilities doesn't include versioncontrol, cannot get project info for repositorypickercontrol");
            Debug.assertIsNotNull(versionControlCapabilities[TeamProjectCapabilitiesConstants.VersionControlCapabilityAttributeName], "Project capabilities doesn't include sourceControlType property, cannot get project info for repositorypickercontrol");
            Debug.assertIsNotNull(versionControlCapabilities[TeamProjectCapabilitiesConstants.VersionControlGitEnabledAttributeName], "Project capabilities doesn't include gitenabled property, cannot get project info for repositorypickercontrol");
            Debug.assertIsNotNull(versionControlCapabilities[TeamProjectCapabilitiesConstants.VersionControlTfvcEnabledAttributeName], "Project capabilities doesn't include tfvcenabled property, cannot get project info for repositorypickercontrol");

            let sourceControlType: SourceControlTypes = ContractSerializer.deserialize(versionControlCapabilities[TeamProjectCapabilitiesConstants.VersionControlCapabilityAttributeName], SourceControlTypes as any);

            this._pendingOperations[Operations.refreshProjectInfo] = false;

            projectInfoUpdated.invoke({
                defaultSourceControlType: sourceControlType,
                project: project,
                supportsGit: Utils_String.equals(versionControlCapabilities[TeamProjectCapabilitiesConstants.VersionControlGitEnabledAttributeName], "true", true),
                supportsTFVC: Utils_String.equals(versionControlCapabilities[TeamProjectCapabilitiesConstants.VersionControlTfvcEnabledAttributeName], "true", true)
            });
        });
    }
}

var _store: Store = null;

export function getStore(options?: IOptions): Store {
    if (!_store) {
        _store = new Store(options);
    }

    return _store;
}