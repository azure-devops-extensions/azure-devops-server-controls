export enum AddUpstreamPanelStage {
    Initial,
    PublicUpstream,
    OrganizationUpstream,
    FinalStageUpstream
}

export class UpstreamConstants {
    public static readonly MaxUpstreamNameLength: number = 30;
}
