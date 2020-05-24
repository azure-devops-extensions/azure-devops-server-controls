let _invalidNameChars = /[\u0000-\u001F\"\/\:\<\>\\\|\$\@]/;

// Invalid NTFS characters: \ / : * ? " < > |
//   but allow backslash - \folder1\folder2 is valid
// Invalid characters for path based query: % +
let _invalidFolderChars = /[\u0000-\u001F\"\/\:\<\>\|\*\?\%\+]/;

let _invalidFolderDotPlacement = /[\.]$/;

export function isDefinitionNameValid(name: string): boolean {
    return name && name.length > 0 && name.length <= 260 && !_invalidNameChars.test(name);
}

export function isDefinitionFolderValid(name: string, additionalInvalidChars?: string[]): boolean {
    let isValid = name && name.length > 0 && name.length <= 400 && !_invalidFolderChars.test(name);
    isValid = isValid && !_invalidFolderDotPlacement.test(name);

    if (isValid && additionalInvalidChars && additionalInvalidChars.length > 0) {
        additionalInvalidChars.some((character) => {
            if (name.indexOf(character) > -1) {
                isValid = false;
                return true;
            }

            return false;
        });
    }

    return isValid;
}