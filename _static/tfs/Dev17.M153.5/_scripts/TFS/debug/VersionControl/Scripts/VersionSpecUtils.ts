import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export function gitVersionStringToVersionDescriptor(versionString: string): VCContracts.GitVersionDescriptor {
    const result = <VCContracts.GitVersionDescriptor>{ versionOptions: VCContracts.GitVersionOptions.None };
    let versionSpec = VCSpecs.VersionSpec.parse(versionString);

    if (versionSpec instanceof VCSpecs.PreviousVersionSpec) {
        result.versionOptions = VCContracts.GitVersionOptions.PreviousChange;
        versionSpec = (<VCSpecs.PreviousVersionSpec>versionSpec).version;
    }

    if (versionSpec instanceof VCSpecs.GitBranchVersionSpec) {
        result.versionType = VCContracts.GitVersionType.Branch;
        result.version = (<VCSpecs.GitBranchVersionSpec>versionSpec).branchName;
    }
    else if (versionSpec instanceof VCSpecs.GitCommitVersionSpec) {
        result.versionType = VCContracts.GitVersionType.Commit;
        result.version = (<VCSpecs.GitCommitVersionSpec>versionSpec).commitId;
    }
    else if (versionSpec instanceof VCSpecs.GitTagVersionSpec) {
        result.versionType = VCContracts.GitVersionType.Tag;
        result.version = (<VCSpecs.GitTagVersionSpec>versionSpec).tagName;
    }

    return result;
}

export function tfvcVersionStringToVersionDescriptor(versionString: string): VCContracts.TfvcVersionDescriptor {
    const versionSpec: VCSpecs.VersionSpec = VCSpecs.VersionSpec.parse(versionString);

    return tfvcVersionSpecToVersionDescriptor(versionSpec);
}

export function tfvcVersionSpecToVersionDescriptor(versionSpec: VCSpecs.VersionSpec): VCContracts.TfvcVersionDescriptor {
    let result: VCContracts.TfvcVersionDescriptor = <VCContracts.TfvcVersionDescriptor>{};

    if (versionSpec instanceof VCSpecs.LatestVersionSpec) {
        result.versionType = VCContracts.TfvcVersionType.Latest;
    }
    else if (versionSpec instanceof VCSpecs.TipVersionSpec) {
        result = tfvcVersionSpecToVersionDescriptor((<VCSpecs.TipVersionSpec>versionSpec).version);
        // Bug 644508: For tip version type of shelvesets server expects the first char to be prefixed ('S')
        if (versionSpec.version instanceof VCSpecs.ShelvesetVersionSpec) {
            result.version = "S" + result.version;
        }
        result.versionType = VCContracts.TfvcVersionType.Tip;
    }
    else if (versionSpec instanceof VCSpecs.PreviousVersionSpec) {
        result = tfvcVersionSpecToVersionDescriptor((<VCSpecs.PreviousVersionSpec>versionSpec).version);
        result.versionOption = VCContracts.TfvcVersionOption.Previous;
    }
    else if (versionSpec instanceof VCSpecs.ChangesetVersionSpec) {
        result.versionType = VCContracts.TfvcVersionType.Changeset;
        result.version = (<VCSpecs.ChangesetVersionSpec>versionSpec).changeset;
    }
    else if (versionSpec instanceof VCSpecs.ChangeVersionSpec) {
        result.versionType = VCContracts.TfvcVersionType.Change;
        result.version = (<VCSpecs.ChangeVersionSpec>versionSpec).changeset;
    }
    else if (versionSpec instanceof VCSpecs.MergeSourceVersionSpec) {
        result.versionType = VCContracts.TfvcVersionType.MergeSource;
        result.version = (<VCSpecs.MergeSourceVersionSpec>versionSpec).changeset.toString();
        result.versionOption = (<VCSpecs.MergeSourceVersionSpec>versionSpec).useRenameSource ? VCContracts.TfvcVersionOption.UseRename : VCContracts.TfvcVersionOption.None;
    }
    else if (versionSpec instanceof VCSpecs.ShelvesetVersionSpec) {
        result.versionType = VCContracts.TfvcVersionType.Shelveset;
        let shelvesetSpec: VCSpecs.ShelvesetVersionSpec = <VCSpecs.ShelvesetVersionSpec>versionSpec;
        result.version = shelvesetSpec.name + (shelvesetSpec.owner ? (";" + shelvesetSpec.owner) : "");
    }
    else if (versionSpec instanceof VCSpecs.DateVersionSpec) {
        result.versionType = VCContracts.TfvcVersionType.Date;
        result.version = (<VCSpecs.DateVersionSpec>versionSpec).date;
    }
    else {
        result.versionType = VCContracts.TfvcVersionType.Latest;
    }

    return result;
}

export function getBranchFullName(versionSpec: VCSpecs.VersionSpec): string {
    if (versionSpec instanceof VCSpecs.GitBranchVersionSpec) {
        return versionSpec.toFullName();
    }
}
