import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { getDefaultWebContext } from "VSS/Context";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import { getBackgroundInstance as getExtensionBackgroundInstance } from "VSS/Contributions/Controls";
import { ExtensionHelper, ExtensionService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";

export class ContributionSource extends SourceBase {
    
    constructor() {
        super();
        this._extensionService = getService(ExtensionService);
    }

    public static getKey(): string {
        return "ContributionSource";
    }

    public getContributions(targetId: string, contributionType?: string): IPromise<Contribution[]> {
        return this._extensionService.getContributionsForTarget(targetId, contributionType);
    }

    public static instance(): ContributionSource {
        return SourceManager.getSource(ContributionSource);
    }

    public getAllEditorExtensions(force?: boolean) {
        if (!this._getAllEditorExtensionsPromise || !!force) {
            let contributionPromise = getService(ExtensionService).getContributionsForTarget("ms.vss-distributed-task.task-input-editors");
            this._getAllEditorExtensionsPromise = contributionPromise.then((contributions: Contributions_Contracts.Contribution[]) => {
                return contributions;
            });
        }
        return this._getAllEditorExtensionsPromise;
    }

    public getContributionResult<T>(contribution: IExtensionContribution, initialConfig?: any): IPromise<T> {
        if (contribution.id) {
            let contributionObjectId = contribution.properties["registeredObjectId"] || contribution.id;
            let context: any = { ...getDefaultWebContext() };
            context.options = initialConfig ? { ...initialConfig } : {};

            return getExtensionBackgroundInstance<T>(contribution, contributionObjectId, context);
        }
    }

    public resolveTemplateString(templateString: string, parsedValue: string): IPromise<string> {
        return ExtensionHelper.resolveTemplateString(templateString, parsedValue);
    }

    private _getAllEditorExtensionsPromise: IPromise<Contributions_Contracts.Contribution[]>;
    private _extensionService: ExtensionService;

}
