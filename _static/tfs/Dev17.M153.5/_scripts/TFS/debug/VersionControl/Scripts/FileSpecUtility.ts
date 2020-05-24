import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

let _illegalNtfsChars: { [charCode: number]: boolean; } = null;

function getIllegalNtfsChars() {
    if (!_illegalNtfsChars) {
        _illegalNtfsChars = {};

        // All chars 0-31 are invalid
        for (let i = 0; i <= 31; i++) {
            _illegalNtfsChars[i] = true;
        }
        // The remaining chars are also invalid
        let invalidCharsString = "\"/:<>\\|*?";
        for (let i = 0, l = invalidCharsString.length; i < l; i++) {
            _illegalNtfsChars[invalidCharsString.charCodeAt(i)] = true;
        }
    }
    return _illegalNtfsChars;
}

export function hasIllegalNtfsChars(fileName: string) {
    let illegalChars = getIllegalNtfsChars();
    for (let i = 0, l = fileName.length; i < l; i++) {
        if (illegalChars[fileName.charCodeAt(i)]) {
            return true;
        }
    }
    return false;
}

export function getNonLegalNtfsNameErrorMessage(fileName: string) {
    if (hasIllegalNtfsChars(fileName)) {
        return VCResources.FilePathInvalidCharacter;
    }

    let lastChar = fileName[fileName.length - 1];
    if (lastChar === "." || lastChar === " ") {
        return VCResources.FilePathInvalidEnding;
    }

    return null;
}