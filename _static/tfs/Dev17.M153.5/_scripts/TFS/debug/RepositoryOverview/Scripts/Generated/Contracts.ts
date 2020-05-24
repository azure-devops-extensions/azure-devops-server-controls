/**
 * ---------------------------------------------------------
 * Generated file, DO NOT EDIT
 * ---------------------------------------------------------
 *
 * See following wiki page for instructions on how to regenerate:
 *   https://aka.ms/azure-devops-client-generation
 *
 * Configuration file:
 *   tfs\service\webaccess\repositoryoverview\clientgeneratorconfigs\genclient.json
 */

"use strict";

import SourceControl_WebApi_Contracts = require("TFS/VersionControl/Contracts");
import SourceControl_WebApi_Legacy_Contracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");

export interface RepositoryLanguageInfo {
    name: string;
    percentage: number;
}

export interface RepositoryOverviewData {
    /**
     * For a TFVC repository, this value will be project guid.
     */
    id: string;
    isForkAllowed: boolean;
    name: string;
    projectInfo: RepositoryOverviewProjectInfo;
    readmeContent: string;
    readmeFileItemModel: SourceControl_WebApi_Legacy_Contracts.ItemModel;
}

/**
 * Project info object. It contains the project metadata that is required by repository overview page.
 */
export interface RepositoryOverviewProjectInfo {
    id: string;
    isOrganizationActivated: boolean;
    visibilityText: string;
}

export var TypeInfo = {
    RepositoryOverviewData: <any>{
    },
};

TypeInfo.RepositoryOverviewData.fields = {
    readmeFileItemModel: {
        typeInfo: SourceControl_WebApi_Legacy_Contracts.TypeInfo.ItemModel
    }
};
