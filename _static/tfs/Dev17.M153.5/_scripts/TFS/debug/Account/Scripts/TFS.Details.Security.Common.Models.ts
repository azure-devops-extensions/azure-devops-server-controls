import TFS = require("VSS/VSS");

export class DetailsSecurityActionUrlModel {
    public PersonalAccessToken: PersonalAccessTokenUrlModel;
    public AlternateCredentials: AlternateCredentialsUrlModel;
    public OAuthAuthorizations: OAuthAuthorizationsUrlModel;
    public PublicKey: PublicKeyUrlModel;
}

export class OAuthAuthorizationsUrlModel {
    public Index: string;
    public List: string;
    public RevokeAll: string;
    public Revoke: string;
}

export class AlternateCredentialsUrlModel {
    public Index: string;
    public List: string;
    public UpdateConfiguration: string;
}

export class PersonalAccessTokenUrlModel {
    public Edit: string;
    public Update: string;
    public List: string;
    public Revoke: string;
    public Regenerate: string;
    public GetToken: string;
    public Index: string;
    public RevokeAll: string;
}

///<summary>Encapsulates the list of actions available on the PublicKeyController that are populated in the json island that is constructed in the view.
///The value of each string should be the fully qualified url path to the action.</summary>
export class PublicKeyUrlModel {
    public Index: string;
    public Edit: string;
    public Update: string;
    public List: string;
    public Revoke: string;
    public GetServerFingerprint: string;
}

/// <summary>Return value for detail and list</summary>
export class OAuthAuthorizationsModel {
    public ApplicationId: string;
    public ApplicationName: string;
    public ApplicationImage: string;
    public ApplicationDescription: string;
    public Provider: string;
    public IssueDateDisplay: string;
    public ExpirationDateDisplay: string;
    public IsExpired: string;
    public Token: string;
}

/// <summary>Return value for detail and list</summary>
export class PersonalAccessTokenDetailsModel {
    public AuthorizationId: string;
    public DisplayName: string;
    public Scope: string;
    public Token: string;
    public UserId: string;
    public ValidFrom: string;
    public ValidTo: string;
    public DisplayDate: string;
    public IsExpired: string;
    public IsValid: boolean;
    public Status: string;
    public AccessId: string;
}

export const enum DisplayFilterOptions {
    Active = 1,
    Revoked = 2,
    Expired = 3,
    All = 4
}

export const enum CreatedByOptions {
    VstsWebUi = 1,
    NonVstsWebUi = 2,
    All = 3
}

export const enum SortByOptions {
    DisplayName = 1,
    DisplayDate = 2,
    Status = 3
}

export class PersonalAccessTokenPageData {
    public PersonalAccessTokenDetailsModelList: PersonalAccessTokenDetailsModel[];
    public NextRowNumber: number;
}

export class TokenPageRequest {
    public CreatedByOption: CreatedByOptions;
    public DisplayFilterOption: DisplayFilterOptions;
    public SortByOption: SortByOptions;
    public IsSortAscending: boolean;
    public StartRowNumber: number;
    public PageSize: number;
    public PageRequestTimeStamp: string;
}

/// <summary>Data that gets sent back to the server on token creation</summary>
export class EditTokenData {
    public AuthorizationId: string;
    public Description: string;
    public ExpiresUtc: number; // epoch time
    public SelectedAccounts: string;
    public SelectedExpiration: string;
    public AccountMode: string;
    public SelectedScopes: string;
    public ScopeMode: string;
    public __RequestVerificationToken: any;
}

export class AlternateCredentialsModel {
    public BasicAuthenticationDisabled: boolean;
    public BasicAuthenticationDisabledOnAccount: boolean;
    public BasicAuthenticationHasPassword: boolean;
    public BasicAuthenticationUsername: string;
    public BasicAuthenticationPassword: string;
    public PrimaryUsername: string;
    public __RequestVerificationToken: any;
}

export class PersonalAccessTokenIndexModel {
    public authorizationId: string;
    public accessToken: string;
}

export class PublicKeyModel {
    public AuthorizationId: string; // Guid
    public Description: string;
    public Data: string; // Base64 encoded public key if available, not always sent
    public Fingerprint: string;
    public FormattedCreatedTime: string; // CreatedTime also exists, but is a DateTime (in C#)
    public IsValid: boolean;
}

// TFS plugin model requires this call for each tfs module.
TFS.tfsModuleLoaded("TFS.Details.Security.Common.Models", exports);