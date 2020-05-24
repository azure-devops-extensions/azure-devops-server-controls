import { first } from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

import { GitConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { getParentPaths } from "VersionControl/Scripts/VersionControlPath";

/**
 * Types of possible refn name errors.
 */
export enum RefNameErrorType {
    None,
    NameTooLong,
    InvalidCharacter,
    InvalidLeadCharacter,
    InvalidTrailCharacter,
    NameEmpty,
    AlreadyExists,
    /**
     * @example Cannot create "a/b" when "a" exists.
     */
    ExistingRefUsedAsFolder,
    /**
     * @example Cannot create "a" when "a/b" exists.
     */
    NewRefIsExistingFolder,
}

/**
 * A result for a ref validation.
 */
export interface RefNameValidationResult {
    error: string;
    allValid: boolean;
}

/**
 * Encapsulation of the ref validation logic
 */
export abstract class RefNameValidator {
    private _existingRefsHash: IDictionaryStringTo<boolean>;
    private _existingFoldersHash: IDictionaryStringTo<string>;
    private _invalidRefNameStrings: string[] = ["~", "^", ":", " ", "?", "*", "[", "\\", "/.", ".lock/", "//", "..", "@{"];
    private _invalidLeadNameStrings: string[] = ["/", "."];
    private _invalidTrailNameStrings: string[] = [".lock", ".", "/"];

    constructor(refNames: string[]) {
        this._updateExistingRefs(refNames);
    }

    /**
     * Check if the given ref name is valid and does not already exist.
     * @param refName The ref name.
     */
    public validate(refName: string): RefNameValidationResult {
        let errType: RefNameErrorType = RefNameErrorType.None;
        let invalidString = null;
        // This validation logic is simillar to IsValidRefName() present 
        // in \Tfs\Service\Git\Server\Utils\RefUtil.cs
        if (refName.length > 0) {
            const fullRefName: string = this.getFullRefName(refName);

            if (fullRefName.length > this.getNameMaxLength()) {
                errType = RefNameErrorType.NameTooLong;
            } else {
                // Check if the ref name contains an invalid git ref character.
                this._invalidRefNameStrings.some((value: string): boolean => {
                    if (refName.indexOf(value) > -1) {
                        invalidString = value;
                        return true;
                    }
                    return false;
                });

                if (invalidString) {
                    errType = RefNameErrorType.InvalidCharacter;
                }
                else {
                    this._invalidLeadNameStrings.some((value: string): boolean => {
                        if (refName.lastIndexOf(value, 0) === 0) {  //functionally identical to ES6's startsWith method
                            invalidString = value;
                            return true;
                        }
                        return false;
                    });

                    if (invalidString) {
                        errType = RefNameErrorType.InvalidLeadCharacter;
                    }
                    else {
                        this._invalidTrailNameStrings.some((value: string): boolean => {
                            const startIndex: number = refName.length - value.length;
                            if (startIndex >= 0 && refName.indexOf(value, startIndex) === startIndex) {
                                invalidString = value;
                                return true;
                            }
                            return false;
                        });

                        if (invalidString) {
                            errType = RefNameErrorType.InvalidTrailCharacter;
                        }
                        else if (this._refExists(refName)) {
                            errType = RefNameErrorType.AlreadyExists;
                        } else {
                            const refUsedAsFolder = this._findRefUsedAsFolder(refName);
                            if (refUsedAsFolder) {
                                errType = RefNameErrorType.ExistingRefUsedAsFolder;
                                invalidString = refUsedAsFolder;
                            } else {
                                const existingBranchInsideNewRef = this._findBranchInsideFolder(refName);
                                if (existingBranchInsideNewRef) {
                                    errType = RefNameErrorType.NewRefIsExistingFolder;
                                    invalidString = existingBranchInsideNewRef;
                                }
                            }
                        }
                    }
                }
            }
        } else {
            errType = RefNameErrorType.NameEmpty;
        }

        return {
            error: this.getErrorString(errType, invalidString),
            allValid: (errType === RefNameErrorType.None)
        };

    }

    protected getNameMaxLength(): number {
        return GitConstants.MaxGitRefNameLength;
    }

    private _updateExistingRefs(refNames: string[]) {
        this._existingRefsHash = {};
        this._existingFoldersHash = {};
        for (const refName of refNames) {
            this._existingRefsHash[refName] = true;

            for (const folder of getParentPaths(refName)) {
                this._existingFoldersHash[folder] = refName;
            }
        }
    }

    private _refExists(refName: string) {
        return !!this._existingRefsHash[refName];
    }

    private _findRefUsedAsFolder(refName: string): string {
        return first(getParentPaths(refName), folderRef => this._existingRefsHash[folderRef]);
    }

    private _findBranchInsideFolder(refName: string): string {
        return this._existingFoldersHash[refName];
    }

    abstract getErrorString(type: RefNameErrorType, invalidString?: string): string;

    abstract getFullRefName(name: string): string;
}

export class BranchNameValidator extends RefNameValidator {

    constructor(branchNames: string[]) {
        super(branchNames);
    }

    public getErrorString(type: RefNameErrorType, invalidString?: string): string {
        switch (type) {
            case RefNameErrorType.None:
                return "";
            case RefNameErrorType.NameEmpty:
                return VCResources.BranchNameCannotBeEmpty;
            case RefNameErrorType.NameTooLong:
                return VCResources.BranchNameTooLong;
            case RefNameErrorType.AlreadyExists:
                return VCResources.CreateBranchDialogBranchExistsMessage;
            case RefNameErrorType.ExistingRefUsedAsFolder:
                return Utils_String.format(VCResources.CreateBranchDialogExistingRefUsedAsFolder, invalidString);
            case RefNameErrorType.NewRefIsExistingFolder:
                return Utils_String.format(VCResources.CreateBranchDialogNewRefIsExistingFolder, invalidString);
            case RefNameErrorType.InvalidTrailCharacter:
                return Utils_String.format(VCResources.CreateBranchDialogInvalidTrailCharacterMessage, invalidString);
            case RefNameErrorType.InvalidLeadCharacter:
                return Utils_String.format(VCResources.CreateBranchDialogInvalidLeadCharacterMessage, invalidString);
            case RefNameErrorType.InvalidCharacter:
                return Utils_String.format(VCResources.CreateBranchDialogInvalidCharacterMessage, invalidString);
            default:
                return "";
        }
    }

    public getFullRefName(name: string): string {
        return GitRefUtility.getFullRefNameFromBranch(name);
    }

    protected getNameMaxLength(): number {
        return GitConstants.MaxGitRefNameLength - "refs/heads/".length;
    }
}

export class TagsNameValidator extends RefNameValidator {

    constructor(tagNames: string[]) {
        super(tagNames);
    }

    public getErrorString(type: RefNameErrorType, invalidString?: string): string {
        switch (type) {
            case RefNameErrorType.None:
                return "";
            case RefNameErrorType.NameEmpty:
                return VCResources.CreateTag_EmptyTagNameError;
            case RefNameErrorType.NameTooLong:
                return VCResources.CreateTag_TagNameTooLong;
            case RefNameErrorType.AlreadyExists:
                return VCResources.CreateTag_TagExistsMessage;
            case RefNameErrorType.InvalidTrailCharacter:
                return Utils_String.format(VCResources.CreateTag_InvalidTrailCharacterMessage, invalidString);
            case RefNameErrorType.InvalidLeadCharacter:
                return Utils_String.format(VCResources.CreateTag_InvalidLeadCharacterMessage, invalidString);
            case RefNameErrorType.InvalidCharacter:
                return Utils_String.format(VCResources.CreateTag_InvalidCharacterMessage, invalidString);
            default:
                return "";
        }
    }

    public getFullRefName(name: string): string {
        return GitRefUtility.getFullRefNameFromTagName(name);
    }

    protected getNameMaxLength(): number {
        return GitConstants.MaxGitRefNameLength - "refs/tags/".length;
    }
}
