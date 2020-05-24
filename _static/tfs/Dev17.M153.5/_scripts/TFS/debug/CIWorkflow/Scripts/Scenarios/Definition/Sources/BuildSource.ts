import { BuildClientService } from "Build.Common/Scripts/ClientServices";

import { BuildSourceHelper } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildSourceHelper";

import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import * as BuildContracts from "TFS/Build/Contracts";

export class BuildSource extends SourceBase {
    
    private _buildClient: BuildClientService;

    constructor() {
        super();
        this._buildClient = BuildSourceHelper.getBuildClient();
    }

    public static getKey(): string {
        return "BuildSource";
    }

    public queueBuild(build: BuildContracts.Build, ignoreWarnings: boolean): IPromise<BuildContracts.Build> {
        return this._buildClient.queueBuild(build, ignoreWarnings);
    }

    public static instance(): BuildSource {
        return SourceManager.getSource(BuildSource);
    }
}
