import { Artifact } from "VSS/Artifacts/Services";
import { ChangesetArtifact } from "VersionControl/Scripts/ChangesetArtifact";
import { CommitArtifact } from "VersionControl/Scripts/CommitArtifact";
import { ShelvesetArtifact } from "VersionControl/Scripts/ShelvesetArtifact";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

/**
 * Returns Artifact based on version string.
 * Can return undefined if version string is neither Commit, Shelveset or Changeset
 * throws error if version string does not map to any version
 * @param versionString
 * @param projectId
 * @param repoId
 */
export function createArtifactFromVersionString(
    versionString: string,
    projectId?: string,
    repoId?: string): Artifact {
    const versionSpec = VCSpecs.VersionSpec.parse(versionString);
    return createArtifactFromVersion(versionSpec, projectId, repoId);
}

/**
 * Returns Artifact based on version.
 * Can return undefined if version string is neither Commit, Shelveset or Changeset
 * @param versionSpec
 * @param projectId
 * @param repoId
 */
export function createArtifactFromVersion(
    versionSpec: VCSpecs.VersionSpec,
    projectId?: string,
    repoId?: string): Artifact {
    let artifact: Artifact;

    if (versionSpec instanceof VCSpecs.ShelvesetVersionSpec) {
        artifact = new ShelvesetArtifact(versionSpec);
    }
    else if (versionSpec instanceof VCSpecs.GitCommitVersionSpec) {
        artifact = new CommitArtifact($.extend({
            projectGuid: projectId,
            repositoryId: repoId,
        }, versionSpec));
    }
    else if (versionSpec instanceof VCSpecs.ChangesetVersionSpec) {
        artifact = new ChangesetArtifact(versionSpec);
    }

    return artifact;
}