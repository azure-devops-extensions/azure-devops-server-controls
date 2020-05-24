// Classes that back our interfaces for changelists/shelvesets/git commits but with backing helper code.

import Q = require("q");

import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import Diag = require("VSS/Diag");

export class ChangeList implements VCLegacyContracts.ChangeList {
    // Entity interface
    url: string;
    
    // ChangeList interface
    allChangesIncluded: boolean;
    changeCounts: { [key: string]: number; };
    changes: VCLegacyContracts.Change[];
    comment: string;
    commentTruncated: boolean;
    creationDate: Date;
    notes: VCLegacyContracts.CheckinNote[];
    owner: string;
    ownerDisplayName: string;
    ownerId: string;
    sortDate: Date;
    version: string;

    constructor(private changeList: VCLegacyContracts.ChangeList, private repositoryContext: RepositoryContext) {
        $.extend(this, changeList);
    }

    /** Returns true if this ChangeList is a Git merge commit */
    isGitMergeCommit(): boolean {
        const changeList = <VCLegacyContracts.GitCommit>this.changeList;
        return this.changeList && this.hasParents() && changeList.parents.length > 1;
    }

    hasParents(): boolean {
        const changeList = <VCLegacyContracts.GitCommit>this.changeList;
        return changeList.parents && changeList.parents.length && changeList.parents.length > 0;
    }
    
    getParentsAsGitCommits() {
        const gitCommit = <VCLegacyContracts.GitCommit>this.changeList;
        
        const promises = gitCommit.parents.map(parent => {
            const commitId = parent.objectId.full;
            return <Q.Promise<VCLegacyContracts.GitCommit>>this.repositoryContext.getClient().beginGetChangeListPromise(this.repositoryContext, new VCSpecs.GitCommitVersionSpec(commitId).toVersionString(), 0);
        });
        
        return Q.all<VCLegacyContracts.GitCommit>(promises);
    }

    isGitCommit(): boolean {
        const gitCommit = <VCLegacyContracts.GitCommit>this.changeList;
        return 'commitId' in gitCommit;
    }
    
    getAsGitCommit(): VCLegacyContracts.GitCommit {
        Diag.Debug.assert(this.isGitCommit());
        return <VCLegacyContracts.GitCommit>this.changeList;
    }
}