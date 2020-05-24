export interface IAdminProjectHomeData {
    hasRenamePermission: boolean;
    displayName: string;
    processTemplateName?: string;
    isHostedXmlTemplate?: boolean;
    showOrgVisibilityOption?: boolean;
    showPublicVisibilityOption?: boolean;
    projectVisibility: string;
    organizationName?: string;
    identityImageUrl?: string;

    showFeatureEnablementLink: boolean;
    projectFeatureListJson: string;

    editProjectOptionsJson: string;
    projectOverviewOptionsJson: string;

    showTeams: boolean;
    showProjectOverview: boolean;
    usePersonaImage: boolean;
    className?: string;
}

export const AdminProjectHomeDataProviderContributionId = "ms.vss-admin-web.admin-project-home-data-provider";