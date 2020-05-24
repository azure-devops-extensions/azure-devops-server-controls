import Service = require("VSS/Service");
import { WebPageDataService } from "VSS/Contributions/Services";

const deviceTypeDataContributionId = "ms.vss-web.device-type-data";
const isMobileDevice = "isMobileDevice";
const isTabletDevice = "isTabletDevice";

/**
 * This is a client side wrapper for server side data provider contribution, device-type-data.
 */
export class DeviceTypeService extends Service.VssService {
    /**
     * Return true if the current device is mobile. Return false otherwise.
     */
    public isMobileDevice(): boolean {
        const dataService = Service.getService(WebPageDataService);
        const dataProvider = dataService.getPageData<any>(deviceTypeDataContributionId);
        if (dataProvider) {
            return dataProvider[isMobileDevice];
        }
        return false;
    }

    /**
     * Return true if the current device is tablet. Return false otherwise.
     */
    public isTabletDevice(): boolean {
        const dataService = Service.getService(WebPageDataService);
        const dataProvider = dataService.getPageData<any>(deviceTypeDataContributionId);
        if (dataProvider) {
            return dataProvider[isTabletDevice];
        }
        return false;
    }

    /**
     * Return true if the current device is mobile and not tablet. Return false otherwise.
     */
    public isMobile(): boolean {
        return this.isMobileDevice() && !this.isTabletDevice();
    }
}