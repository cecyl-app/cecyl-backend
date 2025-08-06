import OpenAI from "openai";

const RESPONSE_ERROR = (responseId: string,
    error: OpenAI.Responses.ResponseError,
    errorStatus: OpenAI.Responses.ResponseStatus,
    incompleteDetails?: OpenAI.Responses.Response.IncompleteDetails) => `
OpenAI response with id ${responseId} failed with:
- Status: ${errorStatus}
- Error code: ${error.code}
- Error message: ${error.message}
${incompleteDetails !== undefined ? '- Incomplete details: ' + incompleteDetails.reason + '\n' : ''}`

export class OpenAIResponseError extends Error {
    responseId: string;
    error: OpenAI.Responses.ResponseError;
    errorStatus: OpenAI.Responses.ResponseStatus;
    incompleteDetails?: OpenAI.Responses.Response.IncompleteDetails;

    constructor(
        responseId: string,
        error: OpenAI.Responses.ResponseError,
        errorStatus: OpenAI.Responses.ResponseStatus,
        incompleteDetails?: OpenAI.Responses.Response.IncompleteDetails,
        options?: ErrorOptions
    ) {
        super(RESPONSE_ERROR(responseId, error, errorStatus, incompleteDetails), options);

        this.responseId = responseId
        this.error = error
        this.errorStatus = errorStatus
        this.incompleteDetails = incompleteDetails
    }
}