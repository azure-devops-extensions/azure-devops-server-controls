/// <reference path='../References/VSS.SDK.Interfaces.d.ts' />
/// <reference types="q" />

import Context = require("VSS/Context");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Services = require("VSS/Contributions/Services");
import Contributions_Controls_Reference = require("VSS/Contributions/Controls");
import Q = require("q");
import SDK_XDM = require("VSS/SDK/XDM");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

/**
* Service that provides the vss.hostManagement implementation for child iframe-based extensions.
*/
export class HostManagementService {
    private _serviceOptions: IHostManagementServiceOptions;
    constructor(serviceOptions: IHostManagementServiceOptions) {
        this._serviceOptions = serviceOptions;
    }

    /**
    * Get the contribution with the given contribution id.
    *
    * @param contributionId Full id of the service contribution
    */
    public getContribution(contributionId: string): IPromise<Contributions_Contracts.Contribution> {
        return Service.getService(Contributions_Services.ExtensionService).getContribution(contributionId);
    }

    /**
    * Get contributions that target a given contribution id.
    *
    * @param targetContributionId Contributions that target the contribution with this id will be returned
    */
    public getContributionsForTarget(targetContributionId: string): IPromise<Contributions_Contracts.Contribution[]> {
        return Service.getService(Contributions_Services.ExtensionService).getContributionsForTarget(targetContributionId);
    }

    /**
    * Get the contribution with the given contribution id. The returned contribution has a method to get a registered object within that contribution.
    *
    * @param contributionId Id of the contribution to get
    */
    public getServiceContribution<T>(contributionId: string): IPromise<Contributions_Services.IServiceContribution> {

        return this.getContribution(contributionId).then((contribution) => {
            return <Contributions_Services.IServiceContribution>$.extend({
                getInstance: <T>(objectId?: string, context?: any): IPromise<T> => {
                    return this.getBackgroundContributionInstance(contribution, objectId, context);
                }
            }, contribution);
        });
    }

    /**
    * Get contributions that target a given contribution id. The returned contributions have a method to get a registered object within that contribution.
    *
    * @param targetContributionId Contributions that target the contribution with this id will be returned
    */
    public getServiceContributions<T>(targetContributionId: string): IPromise<Contributions_Services.IServiceContribution[]> {
        return this.getContributionsForTarget(targetContributionId).then((contributions) => {
            return $.map(contributions, (contribution) => {
                return <Contributions_Services.IServiceContribution>$.extend({
                    getInstance: <T>(objectId?: string, context?: any): IPromise<T> => {
                        return this.getBackgroundContributionInstance(contribution, objectId, context);
                    }
                }, contribution);
            });
        });
    }

    /**
    * Create an instance of a registered object within the given contribution
    *
    * @param contribution The contribution to get an object from
    * @param objectId Optional id of the registered object (the contribution's id property is used by default)
    * @param contextData Optional context to use when getting the object.
    */
    public getBackgroundContributionInstance<T>(contribution: Contributions_Contracts.Contribution, objectId?: string, contextData?: any): IPromise<T> {
        return VSS.requireModules(["VSS/Contributions/Controls"]).spread((_ContributionControls: typeof Contributions_Controls_Reference) => {
            return _ContributionControls.getBackgroundInstance<T>(
                contribution,
                objectId || contribution.id,
                $.extend(contextData, { hostManagementServiceOptions: this._serviceOptions }),
                Context.getPageContext().webContext);
        });
    }
}