import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { SecureFile, SecureFileActionFilter } from "TFS/DistributedTask/Contracts";
import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";

import * as VSSContext from "VSS/Context";
import { getCollectionClient } from "VSS/Service";
import { FileInputResult } from "VSSUI/FileInput";

export class SecureFileSource extends SourceBase {
    
    constructor() {
        super();
        this._dtAgentClient = getCollectionClient(TaskAgentHttpClient);
    }

    public static getKey(): string {
        return "SecureFileSource";
    }

    public getSecureFiles(actionFilter?: SecureFileActionFilter): IPromise<SecureFile[]> {
        let projectId: string = VSSContext.getDefaultWebContext().project.id;
        return this._dtAgentClient.getSecureFiles(projectId, null, false, actionFilter);
    }

    public uploadSecureFile(file: FileInputResult): IPromise<SecureFile> {
        let projectId: string = VSSContext.getDefaultWebContext().project.id;
        return this._dtAgentClient.uploadSecureFile(file.file, projectId, file.name);
    }

    public static instance(): SecureFileSource {
        return SourceManager.getSource(SecureFileSource);
    }

    private _dtAgentClient: TaskAgentHttpClient;
}