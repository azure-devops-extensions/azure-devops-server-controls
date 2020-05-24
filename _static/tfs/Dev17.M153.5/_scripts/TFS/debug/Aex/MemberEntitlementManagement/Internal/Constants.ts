
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.VisualStudio.Services.MemberEntitlementManagement.WebApi.Internal
//----------------------------------------------------------


export module ErrorCodes {
    export var General = 5000;
    export var IdentityNotFound = 5001;
    export var InvalidIdentity = 5002;
    export var InvalidProjectId = 5003;
    export var RemoveUserFromAccountError = 5004;
    export var AssignedLicenseFailed = 5005;
    export var AssignedExtensionFailed = 5006;
    export var UnassignExtensionFailed = 5007;
    export var UnsupportedOperation = 5008;
    export var RemoveIdentityFromSecurityGroupError = 5009;
    export var GroupDoesNotExist = 5010;
    export var MultipleErrors = 5011;
    export var LicenseTypeConversionError = 5012;
    export var ExportCSVFailed = 5013;
    export var MemberNotInProject = 5014;
    export var NotEnoughLicenses = 5015;
    export var CannotDowngradeAccountAdmin = 5016;
    export var InvalidLicenseType = 5017;
    export var ExtensionUnassignable = 5018;
    export var InvalidMemberEntitlement = 5019;
    export var GroupAddJobFailed = 5020;
    export var GroupRemoveOperationFailed = 5021;
    export var GroupCreationFailed = 5022;
    export var IdentityGetOrCreateError = 5023;
    export var GroupGetOrCreateError = 5024;
    export var InvalidGroupDisplayName = 5025;
    export var InvalidGroupId = 5026;
    export var GroupApplyAllOperationFailed = 5028;
    export var GroupUpdateOperationFailed = 5029;
    export var InvalidTeamId = 5030;
    export var TeamsApiUnavailable = 5031;
    export var AccessDenied = 5032;
    export var InvalidEmail = 5033;
    export var CannotChangeGroupAssignment = 5034;
    export var NotEnoughExtensionLicenses = 5035;
    export var SendInviteFailed = 5036;
    export var BuildGroupEntitlementFailed = 5037;
    export var BuildUserEntitlementFailed = 5038;
    export var ExternalGuestAccessDenied = 5101;
    export var GuestAadInviteGenericFailure = 5102;
    export var GuestUserInviterError = 5103;
    export var GuestUsersNotAllowedToPerfomAction = 5104;
    export var InviteeHasSameDomain = 5105;
    export var ValidRefreshTokenNotFound = 5106;
    export var MemberAlreadyInProject = 6001;
    export var SkippedAddInvalidGroup = 6002;
    export var CannotCreateProjectLevelGroup = 6003;
}

export module ExceptionTypeKeys {
    export var UserManagementException = "UserManagementException";
    export var MemberNotFoundException = "UserNotFoundException";
    export var AccountAdminDowngradeLicenseException = "AccountAdminDowngradeLicenseException";
    export var ChangeGroupAssignmentNotAllowedException = "ChangeGroupAssignmentNotAllowedException";
    export var ExtensionUnassignableException = "ExtensionUnassignableException";
    export var AssignLicenseNotAvailableException = "AssignLicenseNotAvailableException";
    export var AssignExtensionsErrorException = "AssignExtensionsErrorException";
    export var AssignExtensionLicenseNotAvailableException = "AssignExtensionLicenseNotAvailableException";
}

export module UsersSummaryPropertyNames {
    export var Projects = "projects";
    export var Extensions = "extensions";
    export var Groups = "groups";
    export var Licenses = "licenses";
    export var AccessLevels = "accesslevels";
}

