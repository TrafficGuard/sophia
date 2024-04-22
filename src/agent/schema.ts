/**
 * Structured representation of a function declaration as defined by the
 * [OpenAPI 3.0 specification](https://spec.openapis.org/oas/v3.0.3). Included
 * in this declaration are the function name and parameters. This
 * FunctionDeclaration is a representation of a block of code that can be used
 * as a Tool by the model and executed by the client.
 */
export declare interface FunctionDeclaration {
	/**
	 * The name of the function to call. Must start with a letter or an
	 * underscore. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with
	 * a max length of 64.
	 */
	name: string;
	/**
	 * Optional. Description and purpose of the function. Model uses it to decide
	 * how and whether to call the function.
	 */
	description?: string;
	/**
	 * Optional. Describes the parameters to this function in JSON Schema Object
	 * format. Reflects the Open API 3.03 Parameter Object. string Key: the name
	 * of the parameter. Parameter names are case sensitive. Schema Value: the
	 * Schema defining the type used for the parameter. For function with no
	 * parameters, this can be left unset.
	 *
	 * @example with 1 required and 1 optional parameter: type: OBJECT properties:
	 * ```
	 * param1:
	 *
	 *   type: STRING
	 * param2:
	 *
	 *  type: INTEGER
	 * required:
	 *
	 *   - param1
	 * ```
	 */
	parameters?: FunctionDeclarationSchema;
}

export interface FunctionDeclarationSchema {
	/** The type of the parameter. */
	type: FunctionDeclarationSchemaType;
	/** The format of the parameter. */
	properties: { [k: string]: FunctionDeclarationSchemaProperty };
	/** Optional. Description of the parameter. */
	description?: string;
	/** Optional. Array of required parameters. */
	required?: string[];
}

/**
 * Contains the list of OpenAPI data types
 * as defined by https://swagger.io/docs/specification/data-models/data-types/
 */
export enum FunctionDeclarationSchemaType {
	/** String type. */
	STRING = 'STRING',
	/** Number type. */
	NUMBER = 'NUMBER',
	/** Integer type. */
	INTEGER = 'INTEGER',
	/** Boolean type. */
	BOOLEAN = 'BOOLEAN',
	/** Array type. */
	ARRAY = 'ARRAY',
	/** Object type. */
	OBJECT = 'OBJECT',
}

/**
 * Schema for parameters passed to {@link FunctionDeclaration.parameters}.
 */
export interface FunctionDeclarationSchema {
	/** The type of the parameter. */
	type: FunctionDeclarationSchemaType;
	/** The format of the parameter. */
	properties: { [k: string]: FunctionDeclarationSchemaProperty };
	/** Optional. Description of the parameter. */
	description?: string;
	/** Optional. Array of required parameters. */
	required?: string[];
}

/**
 * Schema is used to define the format of input/output data.
 * Represents a select subset of an OpenAPI 3.0 schema object.
 * More fields may be added in the future as needed.
 */
export interface FunctionDeclarationSchemaProperty {
	/**
	 * Optional. The type of the property. {@link
	 * FunctionDeclarationSchemaType}.
	 */
	type?: FunctionDeclarationSchemaType;
	/** Optional. The format of the property. */
	format?: string;
	/** Optional. The description of the property. */
	description?: string;
	/** Optional. Whether the property is nullable. */
	nullable?: boolean;
	/** Optional. The items of the property. {@link FunctionDeclarationSchema} */
	items?: FunctionDeclarationSchema;
	/** Optional. The enum of the property. */
	enum?: string[];
	/** Optional. Map of {@link FunctionDeclarationSchema}. */
	properties?: { [k: string]: FunctionDeclarationSchema };
	/** Optional. Array of required property. */
	required?: string[];
	/** Optional. The example of the property. */
	example?: unknown;
}
