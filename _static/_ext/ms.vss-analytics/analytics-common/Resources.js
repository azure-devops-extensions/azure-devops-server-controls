// Copyright (C) Microsoft Corporation. All rights reserved.
define("Analytics/Common/Resources", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Exception_PublicUserOnlyAllowsSingleProjectQuery = "Public and anonymous users are only allowed to query single project";
    exports.ConnectionErrorText = "VS403617: Unable to connect to the server. Please check your internet connection or firewall settings, or try again later.";
    exports.NoErrorText = "No error information was recognized from response.";
    exports.ODataResponseNotFoundErrorText = "OData Response was not found.";
    exports.ODataHeaderTypeUnrecognizedErrorText = "OData POST Response has an unrecognized Content-Type header, the response content cannot be parsed";
    exports.ODataHeaderNotFoundErrorText = "OData Response does not contain a Content-Type header.";
    exports.ODataPayloadBodyNotFoundErrorText = "OData Response payload was empty.";
    exports.ODataResponseValueElementNotFoundErrorText = "OData Response Value Element was missing.";
    exports.ODataPageContextMissing = "Analytics Client did not receive pageContext. Valid OData Batch requests addresses could not be determined.";
    exports.ODataCollectionContextNotRecognized = "Analytics Client could not determine Collection Context of this page.";
    exports.ODataProjectContextNotRecognized = "Analytics Client could not determine Project Context of this page.";
});