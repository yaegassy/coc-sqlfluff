/**
 * System-wide constants.
 *
 * May be read from package.json
 */

// @ts-ignore
import { sqlfluffVersion } from '../package.json';

export const SQLFLUFF_VERSION = sqlfluffVersion;

export const SUPPORT_LANGUAGES = ['sql', 'jinja-sql'];
