import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { IWorkCustomizationHubData } from "WorkCustomization/Scripts/Contracts/WorkCustomizationHubData";
import { IProcess } from "WorkCustomization/Scripts/Contracts/Process";
import * as WorkContracts from "TFS/WorkItemTracking/Contracts";
import Contribution_Services = require("VSS/Contributions/Services");
import Service = require("VSS/Service");

export class PageDataService extends TfsService {
    private static PAGE_DATA_PROVIDER_ID = "ms.vss-work-web.work-customization-hub-data-provider";

    public getAllProcesses(): IProcess[] {
        let dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        return dataSvc.getPageData<IWorkCustomizationHubData>(PageDataService.PAGE_DATA_PROVIDER_ID).processes;
    }

    public getAllowedValues(): IDictionaryStringTo<string[]> {
        let dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        return dataSvc.getPageData<IWorkCustomizationHubData>(PageDataService.PAGE_DATA_PROVIDER_ID).allowedValues;
    }

    public getFields(): WorkContracts.WorkItemField[] {
        let dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        return dataSvc.getPageData<IWorkCustomizationHubData>(PageDataService.PAGE_DATA_PROVIDER_ID).fields;
    }

    public getControlContributionInputLimit(): number {
        let dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        return dataSvc.getPageData<IWorkCustomizationHubData>(PageDataService.PAGE_DATA_PROVIDER_ID).controlContributionInputLimit;
    }

    public beginReloadPageData(): IPromise<IWorkCustomizationHubData> {
        let dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        return dataSvc.invalidateCachedProviderData(PageDataService.PAGE_DATA_PROVIDER_ID, true)
            .then(() => dataSvc.getPageData<IWorkCustomizationHubData>(PageDataService.PAGE_DATA_PROVIDER_ID));
    }

    public getCanCreateProcess(): boolean {
        let dataSvc = Service.getService(Contribution_Services.WebPageDataService);
        return dataSvc.getPageData<IWorkCustomizationHubData>(PageDataService.PAGE_DATA_PROVIDER_ID).canCreateProcess;
    }
}