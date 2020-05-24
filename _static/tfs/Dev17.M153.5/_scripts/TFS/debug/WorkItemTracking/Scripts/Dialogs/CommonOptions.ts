export function commonDialogOptions(options) {
    return $.extend({
        width: 400,
        minHeight: 300,
        minWidth: 375,
        height: "auto"
    }, options);
}

export function errorDialogOptions(options) {
    return $.extend({
        width: 300,
        height: "auto"
    }, options);
}