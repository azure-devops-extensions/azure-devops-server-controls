import * as Q from "q";


import { Build } from "TFS/Build/Contracts";
import { ReleaseDefinition, Release, ReleaseDefinitionEnvironment } from "ReleaseManagement/Core/Contracts";

import { TestRunHelper } from "TestManagement/Scripts/TFS.TestManagement.TestRunHelper";
import { PermissionsManager } from "TestManagement/Scripts/Services/TFS.SecurityPermissions.Service";
import { TestRun }  from "TFS/TestManagement/Contracts";
import * as Services_LAZY_LOAD from "TestManagement/Scripts/Services/Services.Common";
import * as  TFS_RMService_LAZY_LOAD from "TestManagement/Scripts/Services/TFS.ReleaseManagement.Service";
import { ReleaseManagementSecurityPermissions, SecurityNamespaceIds } from "TestManagement/Scripts/Scenarios/OnDemandTestRun/Constants";

import * as Utils_String  from "VSS/Utils/String";
import * as Utils_Array  from "VSS/Utils/Array";
import * as VSS from "VSS/VSS";

export class AutomatedTestsValidationSource {
    constructor() {
        this._permissionManager = new PermissionsManager();
    }

    public runAutomatedTestPoints(pointIds: number[],
        plan: any,
        selectedBuild: Build,
        releaseDefinition: ReleaseDefinition,
        releaseEnvironmentId: number,
        successCallback: (release: Release, run: TestRun) => void,
        errorCallBack: (errorText: string) => void): void {

        TestRunHelper.runAutomatedTestPointsUsingReleaseEnvironment(
            pointIds,
            plan,
            selectedBuild,
            releaseDefinition,
            releaseEnvironmentId,
            successCallback,
            errorCallBack);
    }

    public hasReleaseEditAndManagePermission(releseDefinitionId: number, environmentId: number, path: string = ''): IPromise<boolean> {
        let acceptablePath = path.substring(1).replace(/\\/g, '\/');
        const enviornmentSecurityToken = AutomatedTestsValidationSource._createEnvironmentSecurityToken(releseDefinitionId, environmentId, acceptablePath);
        const releaseSecurityToken = AutomatedTestsValidationSource._createReleaseSecurityToken(releseDefinitionId, acceptablePath);
        let deferred = Q.defer<boolean>();


        let enviromentLevelPermissionPromise = this._permissionManager.hasPermission(SecurityNamespaceIds.ReleaseManagement, enviornmentSecurityToken,
            AutomatedTestsValidationSource.envRelatedPermission);

        let releaseLevelPermissionPromise = this._permissionManager.hasPermission(SecurityNamespaceIds.ReleaseManagement, releaseSecurityToken,
            AutomatedTestsValidationSource.releaseRelatedPermission);

        Q.all([enviromentLevelPermissionPromise, releaseLevelPermissionPromise]).spread((envResult: boolean, releaseResult: boolean) => {
            deferred.resolve(envResult && releaseResult);
        }, (e: any) => {
            deferred.reject(e);
        });
        return deferred.promise;
    }

    public getEnvironment(releaseDefinitionId: number, environmentId: number): IPromise<ReleaseDefinitionEnvironment> {
        const deferred = Q.defer<ReleaseDefinitionEnvironment>();
        VSS.using(["TestManagement/Scripts/Services/TFS.ReleaseManagement.Service", "TestManagement/Scripts/Services/Services.Common"],
                  (TFS_RMService: typeof TFS_RMService_LAZY_LOAD, Services: typeof Services_LAZY_LOAD) => {
                let releaseService = Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement);
                releaseService
                    .then((service: TFS_RMService_LAZY_LOAD.ReleaseService) => service.getReleaseDefinition(releaseDefinitionId))
                    .then(releaseDefinition => Utils_Array.first(releaseDefinition.environments, environment => environment.id === environmentId))
                    .then(environment => {
                        if (environment) {
                            deferred.resolve(environment);
                        } else {
                            deferred.reject(null);
                        }
                    }, () => {
                        deferred.reject(null);
                    });
            }
        );
        return deferred.promise;
    }

    private static _createEnvironmentSecurityToken(releaseDefinitionId: number, environmentId: number, path: string): string {
        if(!path) {
            return Utils_String.format(AutomatedTestsValidationSource._environmentSecurityTokenFormat, path, releaseDefinitionId, environmentId);
        }
        else {
            return Utils_String.format(AutomatedTestsValidationSource._environmentSecurityTokenFormatWithoutPath, releaseDefinitionId, environmentId);
        }
        
    }

    private static _createReleaseSecurityToken(releaseDefinitionId: number, path: string): string {

        if(!path) {
            return Utils_String.format("{0}/{1}", path, releaseDefinitionId);
        }
        else {
            return releaseDefinitionId.toString();
        }
    }

    private static _environmentSecurityTokenFormat: string = "{0}/{1}/Environment/{2}";
    private static _environmentSecurityTokenFormatWithoutPath: string = "{0}/Environment/{1}";
    private static readonly envRelatedPermission : number =  ReleaseManagementSecurityPermissions.ManageDeployments | ReleaseManagementSecurityPermissions.EditReleaseEnvironment;
    private static readonly releaseRelatedPermission : number =  ReleaseManagementSecurityPermissions.QueueReleases | ReleaseManagementSecurityPermissions.ManageReleases;


    private _permissionManager: PermissionsManager;
}
