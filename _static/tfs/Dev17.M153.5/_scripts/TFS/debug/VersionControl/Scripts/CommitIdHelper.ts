export let SHA1_HASH_LENGTH = 40;
export let EMPTY_OBJECT_ID = "0000000000000000000000000000000000000000";
export let SHORT_HASH_LENGTH = 8;  //Length matches VS

export function isValidPartialId(commitId: string) {
    return commitId && ((/^[\da-fA-F]+$/.test(commitId)) && commitId.length <= SHA1_HASH_LENGTH);
}

export function isValidId(commitId: string) {
    return isValidPartialId(commitId) && commitId.length === SHA1_HASH_LENGTH;
}

export function getStartsWithSearchCriteria(partialCommitId: string) {
    let searchCriteria = {
        fromVersion: "" + partialCommitId,
        toVersion: "" + partialCommitId
    };
    while (searchCriteria.fromVersion.length < SHA1_HASH_LENGTH) {
        searchCriteria.fromVersion += "0";
        searchCriteria.toVersion += "f";
    }
    return searchCriteria;
}

export function isEmptyObjectId(objectId: string): boolean {
    return !objectId || objectId === EMPTY_OBJECT_ID;
}

export function getShortCommitId(objectId: string): string {
    return objectId ? objectId.substr(0, SHORT_HASH_LENGTH) : objectId;
}