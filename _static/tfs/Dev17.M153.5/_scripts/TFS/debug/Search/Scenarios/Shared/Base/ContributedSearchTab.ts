import { SearchSecurityConstants, NewBrandingFeatureFlag } from "Search/Scenarios/Shared/Constants";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getLocalService } from "VSS/Service";
import { SecurityService } from "VSS/Security/Services";
import { IPivotStateService, PivotStateService } from "Search/Scenarios/Shared/Base/PivotStateService";
import { getService } from "VSS/Service";

export interface ISearchUserPermissions {
    isMember: boolean;

    isPermissionIncluded: boolean;
}

export class ContributedSearchTab {
    protected isMember: boolean = false;
    protected readonly tabStateProviderService: IPivotStateService;

    constructor(
        private tabId: string,
        public readonly initializedOnTabSwitch: boolean,
        public readonly pageContext: Object,
        protected providerContributionId: string,
        onFullSCreen?: (isFullScreen: boolean) => void) {
        this.tabStateProviderService = getService<PivotStateService>(PivotStateService);
        this.providerContributionId = providerContributionId;
    }

    public renderNotificationBanner = (): JSX.Element => {
        return this.onRenderNotificationBanner();
    }

    public renderResults = (): JSX.Element => {
        return this.onRenderResults();
    }

    public renderInput = (): JSX.Element => {
        return this.onRenderInput();
    }

    public renderCommands = (): JSX.Element => {
        return this.onRenderCommands();
    }

    public initialize = (): void => {
        this.onInitialize();
    }

    public navigate = (rawState: any): void => {
        this.onNavigate(rawState);
    }

    public dispose = (): void => {
        this.onDispose();
    }

    protected onNavigate(rawState: any): void {
        return;
    }

    protected onDispose(): void {
        return;
    }

    protected onInitialize(): void {
        return;
    }

    protected onRenderNotificationBanner(): JSX.Element {
        return null;
    }

    protected onRenderResults(): JSX.Element {
        return null;
    }

    protected onRenderInput(): JSX.Element {
        return null;
    }

    protected onRenderCommands(): JSX.Element {
        return null;
    }

    private getNewBrandingFeatureFlagValue(): boolean {
        try {
            return FeatureAvailabilityService.isFeatureEnabled(NewBrandingFeatureFlag);
        }
        catch(error) {
            return false;
        }
    }
}

export function getSearchUserPermissions(): ISearchUserPermissions {
    let isMember: boolean = true;
    let isPermissionIncluded = true;

    // This will be executed only after server starts populating permissions which is why we are guarding with a FF.
    // Untill FF is on we do not evaluate permissions instead fallback to false.
    if (FeatureAvailabilityService.isFeatureEnabled(SearchSecurityConstants.SearchEvaluatePermissionsFeatureFlag, false)) {
        // Populating user data by reading the permissions from shared data sent by dataprovider
        const securityService = getLocalService(SecurityService);
        const SearchSecurityToken: string = "";

        if (securityService.isPermissionIncluded(SearchSecurityConstants.SearchSecurityNameSpaceId, SearchSecurityToken)) {
            isMember = securityService.hasPermission(
                SearchSecurityConstants.SearchSecurityNameSpaceId,
                SearchSecurityToken,
                SearchSecurityConstants.SearchSecurityReadPermission /* Read */);
        } else {
            // If there is no permission in the shared data we fall back anonymous user experience.
            isMember = false;
            isPermissionIncluded = false;
        }
    }

    return {
        isMember: isMember,
        isPermissionIncluded: isPermissionIncluded
    };
}