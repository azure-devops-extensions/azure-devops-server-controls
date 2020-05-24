import * as Q from "q";

import CommonBase = require("TestManagement/Scripts/TestReporting/Common/Common");
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as TMService from "TestManagement/Scripts/TFS.TestManagement.Service";
import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import BuildContracts = require("TFS/Build/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");
import * as Diag from "VSS/Diag";
import * as VssContext from "VSS/Context";
import * as Utils_Date from "VSS/Utils/Date";
import Utils_String = require("VSS/Utils/String");

export class HistoryViewSource{

    constructor() {
        this._testRun = null;
    }

    public getTestHistory(filter: TCMContracts.TestHistoryQuery): IPromise<TCMContracts.TestHistoryQuery> {
        return TMService.ServiceManager.instance().testResultsServiceLegacy().queryTestHistory(filter);
    }

    public getTestRunById(runId: number): IPromise<TCMContracts.TestRun> {
        let deferred: Q.Deferred<TCMContracts.TestRun> = Q.defer<TCMContracts.TestRun>();
        if (this._testRun != null){
            deferred.resolve(this._testRun);
            return deferred.promise;
        }
        return TMService.ServiceManager.instance().testResultsService().getTestRunById(runId);
    }

    public getBranchList(testCaseResult: TCMContracts.TestCaseResult): IPromise<CommonBase.IItem[]> {
        let deferred: Q.Deferred<CommonBase.IItem[]> = Q.defer<CommonBase.IItem[]>();
        let buildId: number;
        let build: TCMContracts.ShallowReference;
        build = testCaseResult.build;
        if (!build) {
            return Q.resolve([]);
        }
        buildId = parseInt(build.id);

        let promise = TMService.ServiceManager.instance().buildService().getBuild(buildId).then((build: BuildContracts.Build) => {

            switch (build.repository.type) {
                case RepositoryTypes.TfsGit:
                    let repoId: string = build.repository.id;
                    return TMService.ServiceManager.instance().gitService().getRefs(repoId).then((refs: VCContracts.GitRef[]) => {
                        return deferred.resolve(<CommonBase.IItem[]>refs.filter((ref: VCContracts.GitRef) => {
                            return !Utils_String.caseInsensitiveContains(ref.name, "refs/pull");
                        }).map((ref: VCContracts.GitRef) => {
                            return <CommonBase.IItem>{
                                name: ref.name
                            };
                        }));
                    }, (error) => {
                        Diag.logWarning(Utils_String.format("No branches found. error: {0}", error.message || error.toString()));
                        deferred.resolve([]);
                    });
                case RepositoryTypes.TfsVersionControl:
                    return TMService.ServiceManager.instance().tfvcService().getBranches(build.project.name).then((branches: VCContracts.TfvcBranch[]) => {
                        return deferred.resolve(<CommonBase.IItem[]>branches.map((branch: VCContracts.TfvcBranch) => {
                            return <CommonBase.IItem>{
                                name: branch.path
                            };
                        }));
                    }, (error) => {
                        Diag.logWarning(Utils_String.format("No branches found. error: {0}", error.message || error.toString()));
                        return deferred.resolve([]);
                    });
                default:
                    Diag.logWarning(Utils_String.format("Unsupported repository type. RepositoryType: {0}", build.repository.type));
                    return deferred.resolve([]);
            }
        }, (error) => {
            Diag.logWarning(Utils_String.format("No branches found. error: {0}", error.message || error.toString()));
            deferred.resolve([]);
        });

        return deferred.promise;
    }

    private _testRun: TCMContracts.TestRun;
}