import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import {TaskAgentHttpClient} from "TFS/DistributedTask/TaskAgentRestClient";

import {OneTimeActionCreator} from "DistributedTaskControls/Actions/OneTimeActionCreator";

import {Action} from "VSS/Flux/Action";
import {Store} from "VSS/Flux/Store";

import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";
import Service = require("VSS/Service");
import PlatformContracts = require("VSS/Common/Contracts/Platform");
import VSSContext = require("VSS/Context");
import Platform_Contracts = require("VSS/Common/Contracts/Platform");

export interface InitializeAgentPackagesStorePayload {
    allPackages: DistributedTaskContracts.PackageMetadata[];
}
export let _initializeAgentPackagesStore = new Action<InitializeAgentPackagesStorePayload>();
export let initializeAgentPackagesStore = new OneTimeActionCreator(_initializeAgentPackagesStore);

export interface IAgentPackagesStoreOptions {
    taskAgentClient?: TaskAgentHttpClient;
}

export interface IAgentLatestPackage {
    version: string;
    package: DistributedTaskContracts.PackageMetadata;
}

export class AgentPackagesStore extends Store {
    private _latestPackagesByPlatform: IDictionaryStringTo<DistributedTaskContracts.PackageMetadata> = {};
    private _isDotnetCoreV21Agent: boolean = false;

    constructor(options?: IAgentPackagesStoreOptions) {
        super();

        _initializeAgentPackagesStore.addListener((payload: InitializeAgentPackagesStorePayload) => {
            this._updatePackages(payload.allPackages);
        });
    }

    public getLatestPackage(platform: string): IAgentLatestPackage {
        let agentPackage: IAgentLatestPackage;

        if (this._latestPackagesByPlatform[platform]) {
            let latestPackage: DistributedTaskContracts.PackageMetadata = this._latestPackagesByPlatform[platform];
            agentPackage = {
                version: getVersion(platform), // this is only used by netcore 1.x agent
                package: latestPackage,
            };
        }

        return agentPackage;
    }
    
    public IsDotnetCoreV2Agent(): boolean {
        return true;
    }

    public IsDotnetCoreV21Agent(): boolean {
        return this._isDotnetCoreV21Agent;
    }

    private _setSupportedV21AgentState(isDotnetCoreV21Agent: boolean) {
        this._isDotnetCoreV21Agent = isDotnetCoreV21Agent;
        this.emitChanged();
    }

    private _updatePackages(packages: DistributedTaskContracts.PackageMetadata[]) {
        this._latestPackagesByPlatform = {};

        let dotnetCoreV2Packages = {};
        let dotnetCoreV21Packages = {};

        for (let agentPackage of packages) {
            if (Utils_String.equals(agentPackage.type, "agent", true)) {
                if (Utils_String.equals(agentPackage.platform, "win-x64", true) || Utils_String.equals(agentPackage.platform, "osx-x64", true) || Utils_String.equals(agentPackage.platform, "linux-x64", true)) {
                    dotnetCoreV2Packages[agentPackage.platform] = agentPackage;
                    dotnetCoreV21Packages[agentPackage.platform] = agentPackage;
                } else if (Utils_String.equals(agentPackage.platform, "win-x86", true) || Utils_String.equals(agentPackage.platform, "linux-arm", true)) {
                    dotnetCoreV21Packages[agentPackage.platform] = agentPackage;
                }
            }
        }
        
        if (dotnetCoreV21Packages["win-x64"] && dotnetCoreV21Packages["win-x86"] && dotnetCoreV21Packages["osx-x64"] && dotnetCoreV21Packages["linux-arm"] && dotnetCoreV21Packages["linux-x64"]) {
            this._setSupportedV21AgentState(true);
            this._latestPackagesByPlatform = dotnetCoreV21Packages;
        }  else {
            this._setSupportedV21AgentState(false);
            this._latestPackagesByPlatform = dotnetCoreV2Packages;
        }

        this.emitChanged();
    }
}
let _store: AgentPackagesStore = null;

export function getStore(options?: IAgentPackagesStoreOptions, autoInitialize: boolean = false): AgentPackagesStore {
    if (!_store) {
        _store = new AgentPackagesStore(options);

        if (autoInitialize) {
            let progressId = VSS.globalProgressIndicator.actionStarted("AgentPackages.getStore", true);
            let distributedTaskClient = (options && options.taskAgentClient) ? options.taskAgentClient : getTaskHttpClient();

            distributedTaskClient.getPackages("agent", null, 1).then((packages: DistributedTaskContracts.PackageMetadata[]) => {
                VSS.globalProgressIndicator.actionCompleted(progressId);
                initializeAgentPackagesStore.invoke(() => {
                    return {
                        allPackages: packages
                    };
                });
            }, (err: any) => {
                VSS.handleError(err);
                VSS.globalProgressIndicator.actionCompleted(progressId);
            });
        }
    }

    return _store;
}

function getVersion(platform: string) {
    // eg: osx.10.11-x64, return "10.11-x64"
    return platform.slice(platform.indexOf(".") + 1, platform.length);
}

function getTaskHttpClient(): TaskAgentHttpClient {
    let webContext: PlatformContracts.WebContext = VSSContext.getDefaultWebContext();
    let vssConnection: Service.VssConnection = new Service.VssConnection(webContext, Platform_Contracts.ContextHostType.Application);
    return vssConnection.getHttpClient(TaskAgentHttpClient);
}